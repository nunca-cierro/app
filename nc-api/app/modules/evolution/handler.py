"""Evolution API message handler — end-to-end message processing pipeline.

Receives a raw Evolution API webhook event, extracts the text message,
resolves the tenant from the ``PlatformConnection``, saves the message,
generates an AI response via Groq, and sends it back through Evolution API.

This handler follows the exact same pattern as ``telegram/handler.py``
and reuses the same Groq pipeline and conversation logic.
"""

from __future__ import annotations

import re
import typing as t
import uuid as uuid_pkg
from datetime import UTC, datetime, timedelta

from loguru import logger
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.rate_limiter import rate_limiter
from app.modules.conversations.models import Conversation, Message
from app.modules.agents.utils import format_business_config, universal_format_block
from app.modules.integrations.llm.provider import CONTEXT_WINDOW_SIZE, groq_client
from app.modules.platform_connections.models import PlatformConnection
from app.modules.evolution.webhook import (
    extract_evolution_message,
    extract_evolution_connection_update,
)
from app.modules.evolution.adapter import EvolutionAdapter
from app.modules.evolution.anti_spam import _resolve_anti_spam_config, spam_detector
from app.modules.platform_connections.sse import (
    EVENT_CONNECTION_STATE_CHANGED,
    notify_subscribers,
)

# ── Constants ────────────────────────────────────────────────────────────────

# After the admin sends a message, the bot stays silent for this many hours.
# During this cooldown, incoming customer messages are saved but NOT answered
# by the AI, giving the admin space to handle the conversation manually.
ADMIN_COOLDOWN_HOURS: int = 72

PAYMENT_KEYWORDS: list[str] = [
    "pago", "pagar", "qr", "daviplata", "bre-b",
]

# ── Helpers ──────────────────────────────────────────────────────────────────


def _has_payment_keyword(text: str) -> bool:
    """Check if *text* contains any payment-related keyword (case-insensitive)."""
    lower = text.lower().strip()
    return any(kw in lower for kw in PAYMENT_KEYWORDS)


async def _insert_message_dedup(
    session: AsyncSession, **values: t.Any
) -> uuid_pkg.UUID | None:
    """Insert a Message row honoring ``uq_messages_conn_external_msg``.

    Write-time dedup: ``INSERT ... ON CONFLICT DO NOTHING`` is atomic, so
    concurrent deliveries of the same external message (webhook retries,
    two uvicorn workers) cannot both persist it — the old SELECT-then-INSERT
    guard raced under concurrency.

    Returns the new ``Message.id``, or ``None`` when a message with the same
    ``(platform_connection_id, external_message_id)`` already exists —
    callers must treat ``None`` as a REPLAY and exit without replying.
    """
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    stmt = (
        pg_insert(Message)
        .values(**values)
        .on_conflict_do_nothing(constraint="uq_messages_conn_external_msg")
        .returning(Message.id)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


# ── Text-matching helpers (programmed responses) ──────────────────────────────
# Basic/trial plans lack CAP_AI — programmed keyword/FAQ responses are their
# ONLY reply path, so matching quality here IS product quality for those plans.
# All matchers normalize Spanish accents and ignore function words; the ORIGINAL
# text is always kept for sending — normalization only happens for scoring.

# Accent folding map: á→a, é→e, í→i, ó→o, ú→u, ü→u, ñ→n (upper + lower).
_ACCENT_FOLD: dict[int, int] = str.maketrans(
    "áéíóúüñÁÉÍÓÚÜÑ",
    "aeiouunAEIOUUN",
)

# Function words that must never count as a match — prevents "dónde"+"están"
# from falsely matching unrelated messages and lets short questions like
# "Precios" match their FAQ entry. Includes the interrogative pronouns
# (cuál/cómo/dónde/cuándo) AND the present-tense copula "estar" forms
# (esta/estas/estan/estamos/estoy/hay) — a question like "¿Dónde están?"
# is reduced to zero significant words and therefore never false-matches a
# message that merely happens to contain those words.
SPANISH_STOPWORDS: frozenset[str] = frozenset(
    {
        "de", "la", "el", "los", "las", "y", "o", "a", "en", "que",
        "cual", "cuál", "como", "cómo", "donde", "dónde", "cuando", "cuándo",
        "para", "por", "con", "es", "un", "una", "al", "del", "mi", "su",
        "me", "se", "te",
        "esta", "estas", "estan", "estamos", "estoy", "hay",
    }
)

# Word tokenizer — after accent folding everything is ASCII, so a simple
# [a-z0-9]+ pass cleanly strips punctuation (¿ ? ¡ ! , hyphens, etc).
_WORD_RE: re.Pattern[str] = re.compile(r"[a-z0-9]+")


def _fold_accents(text: str) -> str:
    """Return *text* lowercased with Spanish accents folded.

    "atención" → "atencion", "¿Dónde están?" → "¿donde estan?". Only used for
    matching — the original text is kept for sending.
    """
    return text.translate(_ACCENT_FOLD).lower()


def _significant_words(text: str) -> set[str]:
    """Accent-folded, punctuation-stripped, stopword-free word set.

    This is the token space for FAQ scoring and escalation phrase matching.
    """
    return set(_WORD_RE.findall(_fold_accents(text))) - SPANISH_STOPWORDS


def _faq_answer_for(user_text: str, faq: list[dict]) -> str | None:
    """Best FAQ answer for *user_text*, or None when nothing matches.

    Matching rule (deterministic, unit-tested):
    - User text and each FAQ question are reduced to their significant words
      (accent-folded, punctuation stripped, stopwords removed).
    - A question with 1 significant word matches when that word appears in the
      user message (score >= 1) — "Precios" hits the "precios" FAQ.
    - A question with 2+ significant words matches when at least 2 words
      overlap OR the overlap covers >= 50% of the question's significant
      words — so a 2-word question like "¿Cuál es el horario de atención?"
      (significant words: horario, atencion) matches a one-word query like
      "atencion", while longer questions still need a real 2-word overlap.
    - Questions reduced to zero significant words (pure function words, e.g.
      "¿Dónde están?") NEVER match — avoids stopword-collision false positives.
    - Ties broken by highest overlap; equal scores keep the first entry.
      The answer is returned verbatim (original spelling, not folded).
    """
    if not faq:
        return None
    user_words = _significant_words(user_text)
    best_answer: str | None = None
    best_score = 0

    for item in faq:
        if not isinstance(item, dict):
            continue
        q = item.get("question") or item.get("q", "")
        a = item.get("answer") or item.get("a", "")
        if not q or not a:
            continue
        q_words = _significant_words(q)
        if not q_words:
            continue
        overlap = len(user_words & q_words)
        # 1 word → 1; 2+ words → at least 2, unless 50% of the question words
        # is lower (a 2-word question matches on a single overlap).
        required = 1 if len(q_words) == 1 else min(2, (len(q_words) + 1) // 2)
        if overlap >= required and overlap > best_score:
            best_score = overlap
            best_answer = a

    return best_answer


def _matches_escalation_keyword(user_text: str, keyword: str) -> bool:
    """True when *user_text* triggers the escalation *keyword*.

    - Single-word keywords match on word boundaries (accent-folded), so
      "queja" hits "tengo una queja" but not "quejarnos".
    - Multi-word phrase keywords match when EVERY significant word of the
      phrase appears as a whole word in the user text, so "hablar con asesor"
      (significant words: hablar, asesor) matches "quiero hablar un asesor"
      but NOT "hablar de fútbol".
    - A keyword made only of function words falls back to a word-boundary
      match of the full folded phrase.
    """
    if not isinstance(keyword, str):
        return False
    folded_user = _fold_accents(user_text)
    kw_words = _significant_words(keyword)
    if kw_words:
        return all(
            re.search(rf"\b{re.escape(w)}\b", folded_user) is not None
            for w in kw_words
        )
    return re.search(
        rf"\b{re.escape(_fold_accents(keyword).strip())}\b", folded_user
    ) is not None


# ── Types ───────────────────────────────────────────────────────────────────

EvolutionEventT = dict[str, t.Any]


async def handle_evolution_connection_update(
    event: EvolutionEventT,
    connection: PlatformConnection | None,
    session: AsyncSession,
) -> None:
    """Process a ``connection.update`` event from Evolution API.

    When the user scans the QR and WhatsApp connects, Evolution sends
    a ``connection.update`` with ``state: "open"``. We update the
    connection's ``extra_data.connection_status`` so the dashboard
    can reflect the new state without polling Evolution directly.
    """
    parsed = extract_evolution_connection_update(event)
    if parsed is None:
        return

    if connection is None:
        logger.warning("Connection update event but no connection found")
        return

    state = parsed["connection_state"]

    # Map Evolution state to our status vocabulary
    status_map = {
        "open": "connected",
        "connecting": "connecting",
        "close": "disconnected",
    }
    mapped = status_map.get(state, state)

    extra = dict(connection.extra_data or {})
    extra["connection_status"] = mapped
    connection.extra_data = extra

    # If connected, also set connection status to active
    if mapped == "connected":
        connection.status = "active"

    session.add(connection)
    # Persist the change — without this, the state update is rolled back
    # when the webhook request's session closes and the dashboard never
    # sees the new status.
    await session.commit()

    # Push to any SSE subscribers so the dashboard updates instantly
    # instead of polling.
    await notify_subscribers(
        str(connection.id),
        EVENT_CONNECTION_STATE_CHANGED,
        {
            "connection_id": str(connection.id),
            "state": state,
            "status": mapped,
        },
    )

    logger.info(
        "Evolution connection {id} | state={state} → status={status}",
        id=connection.id,
        state=state,
        status=mapped,
    )


async def handle_evolution_incoming(
    event: EvolutionEventT,
    connection: PlatformConnection | None,
    session: AsyncSession,
) -> None:
    """Process a raw Evolution API webhook event.

    Pipeline (race-condition-safe order):
    1. Route ``connection.update`` events to separate handler
    2. Extract message
    3. PostgreSQL advisory lock — serialize concurrent webhooks per chat
       (deterministic ``hashtext`` key shared by ALL workers)
    4. Admin message (``from_me``) → save, mark 72h cooldown, return
    5. **Admin cooldown check** (BEFORE conversation creation) → silent save
    6. Find or create conversation
    7. Escalation gate → if escalated+responded, silent save and stop
    8. Anti-spam, rate limiting
    9. Inbound insert — write-time dedup (conflict → replay, exit early)
       then EARLY COMMIT before any external I/O
    10. Escalation check → if keyword matched, send fallback and stop
    11. Build system prompt, generate via LLM, send, save outbound
    """
    # ── 0. Route connection.update events ───────────────────────────────
    if event.get("event") == "connection.update":
        await handle_evolution_connection_update(event, connection, session)
        return

    # ── 1. Extract message ──────────────────────────────────────────────
    parsed = extract_evolution_message(event)
    if parsed is None:
        logger.info("No text message to process in Evolution event")
        return

    if connection is None:
        logger.warning(
            "No connection provided for Evolution event — skipping"
        )
        return

    # ── 1b. Advisory lock — serialize concurrent webhooks per chat ─────
    # Prevents the race condition where client webhook creates a conversation
    # BEFORE the admin webhook sets admin_last_active_at. The key is hashed
    # SQL-side (``hashtext``) so both uvicorn workers derive the SAME lock
    # for a chat — a Python ``hash()`` is per-process randomized and would
    # let the two workers process the same chat concurrently.
    tenant_id = connection.tenant_id
    lock_key = f"{connection.id}:{parsed['external_user_id']}"
    await session.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": lock_key}
    )

    logger.info(
        "Processing Evolution message | conn={conn} | from={user} | text={text}",
        conn=connection.id,
        user=parsed["external_user_id"],
        text=parsed["content"][:80],
    )

    # ── 2. Admin message handler (from_me) ──────────────────────────────
    # Messages sent FROM the business number. Need to differentiate:
    #   - Bot messages → Evolution fires a webhook for messages the bot
    #     itself sent via the API. These already have a matching Message
    #     row in DB → skip them.
    #   - Admin messages → manually written from the WhatsApp app → no
    #     matching row → save and mark 72h cooldown.
    if parsed.get("from_me"):
        # Look up existing conversation (or create one)
        conv_result = await session.execute(
            select(Conversation).where(
                Conversation.tenant_id == tenant_id,
                Conversation.platform_connection_id == connection.id,
                Conversation.external_user_id == parsed["external_user_id"],
                Conversation.status.in_(["open", "escalated"]),
            )
        )
        conversation = conv_result.scalar_one_or_none()
        if conversation is None:
            conversation = Conversation(
                tenant_id=tenant_id,
                platform_connection_id=connection.id,
                external_user_id=parsed["external_user_id"],
                status="open",
            )
            session.add(conversation)
            await session.flush()

        # Write-time dedup: if this message_id already exists, the row is
        # the bot echoing its own API send (or a concurrent duplicate
        # delivery) — the INSERT conflicts and we skip without double-
        # marking the admin cooldown.
        admin_msg_id = await _insert_message_dedup(
            session,
            tenant_id=tenant_id,
            conversation_id=conversation.id,
            platform_connection_id=connection.id,
            direction="out",
            external_user_id=parsed["external_user_id"],
            external_message_id=parsed["external_message_id"],
            platform="evolution",
            message_type="text",
            content=parsed["content"],
            status="sent",
            payload={"source": "admin"},
        )
        if admin_msg_id is None:
            logger.debug(
                "Skipping bot's own fromMe message | id={mid}",
                mid=parsed["external_message_id"],
            )
            return

        extra = dict(conversation.extra_data or {})
        extra["admin_last_active_at"] = datetime.now(UTC).isoformat()
        conversation.extra_data = extra

        conversation.last_message_at = datetime.now(UTC)
        await session.commit()
        logger.info(
            "Admin message saved — bot cooldown 72h | conv={cid}",
            cid=conversation.id,
        )
        return

    # ── 3. Admin cooldown check (BEFORE conversation creation) ──────────
    # This MUST run before find-or-create to prevent the race condition
    # where client webhook creates a new conversation and the bot responds
    # before the admin webhook arrives to set the cooldown.
    conv_result = await session.execute(
        select(Conversation).where(
            Conversation.tenant_id == tenant_id,
            Conversation.platform_connection_id == connection.id,
            Conversation.external_user_id == parsed["external_user_id"],
            Conversation.status.in_(["open", "escalated"]),
        )
    )
    conversation = conv_result.scalar_one_or_none()

    if conversation is not None:
        conv_extra = conversation.extra_data or {}
        admin_last_active = conv_extra.get("admin_last_active_at")
        if admin_last_active:
            try:
                admin_time = datetime.fromisoformat(admin_last_active)
                elapsed = datetime.now(UTC) - admin_time
                if elapsed < timedelta(hours=ADMIN_COOLDOWN_HOURS):
                    remaining_h = int(
                        (timedelta(hours=ADMIN_COOLDOWN_HOURS) - elapsed).total_seconds() / 3600
                    )
                    silent_inbound_id = await _insert_message_dedup(
                        session,
                        tenant_id=tenant_id,
                        conversation_id=conversation.id,
                        platform_connection_id=connection.id,
                        direction="in",
                        external_user_id=parsed["external_user_id"],
                        external_message_id=parsed["external_message_id"],
                        platform="evolution",
                        message_type="text",
                        content=parsed["content"],
                        status="received",
                    )
                    if silent_inbound_id is None:
                        # Replay of an already-stored message — nothing to do
                        return
                    conversation.last_message_at = datetime.now(UTC)
                    await session.commit()
                    logger.info(
                        "Admin cooldown — silent save ({h}h remaining) | conv={cid}",
                        h=remaining_h,
                        cid=conversation.id,
                    )
                    return
            except (ValueError, TypeError):
                pass

    # ── 4. Find or create conversation ──────────────────────────────────
    if conversation is None:
        conversation = Conversation(
            tenant_id=tenant_id,
            platform_connection_id=connection.id,
            external_user_id=parsed["external_user_id"],
            status="open",
        )
        session.add(conversation)
        await session.flush()

    # ── 5. Escalation silence gate ──────────────────────────────────────
    if conversation.status == "escalated":
        extra = conversation.extra_data or {}
        if extra.get("escalation_responded"):
            silent_inbound_id = await _insert_message_dedup(
                session,
                tenant_id=tenant_id,
                conversation_id=conversation.id,
                platform_connection_id=connection.id,
                direction="in",
                external_user_id=parsed["external_user_id"],
                external_message_id=parsed["external_message_id"],
                platform="evolution",
                message_type="text",
                content=parsed["content"],
                status="received",
            )
            if silent_inbound_id is None:
                # Replay of an already-stored message — nothing to do
                return
            conversation.last_message_at = datetime.now(UTC)
            await session.commit()
            logger.info(
                "Escalated conversation — silent save | conv={cid}",
                cid=conversation.id,
            )
            return

    # ── 2. Anti-spam check (auto-reply + flood) ─────────────────────────
    spam_payload: dict | None = None
    conn_spam_config = (connection.extra_data or {}).get("anti_spam", {})

    spam_result = spam_detector.full_check(
        text=parsed["content"],
        user_id=parsed["external_user_id"],
        conn_id=str(connection.id),
        config=conn_spam_config,
    )

    if spam_result.is_spam and spam_result.action == "block":
        blocked_inbound_id = await _insert_message_dedup(
            session,
            tenant_id=tenant_id,
            conversation_id=conversation.id,
            platform_connection_id=connection.id,
            direction="in",
            external_user_id=parsed["external_user_id"],
            external_message_id=parsed["external_message_id"],
            platform="evolution",
            message_type="text",
            content=parsed["content"],
            status="received",
            payload=spam_result.to_dict(),
        )
        if blocked_inbound_id is None:
            # Replay of an already-stored (blocked) message — nothing to do
            return
        conversation.last_message_at = datetime.now(UTC)
        await session.commit()
        logger.info(
            "Spam blocked (auto_reply/flood) | reason={reason} | score={score}",
            reason=spam_result.spam_reason,
            score=spam_result.spam_score,
        )
        return

    if spam_result.is_spam:
        spam_payload = spam_result.to_dict()
        logger.info(
            "Spam logged (auto_reply/flood) | reason={reason} | score={score}",
            reason=spam_result.spam_reason,
            score=spam_result.spam_score,
        )

    # ── Rate limiting check ─────────────────────────────────────────────
    rl_key = f"{parsed['external_user_id']}:{connection.id}"
    if not rate_limiter.is_allowed(rl_key):
        logger.warning(
            "Rate limit exceeded | user={user} | conn={conn}",
            user=parsed["external_user_id"],
            conn=connection.id,
        )
        await session.commit()
        return

    # ── 4. Save inbound message (write-time dedup) ──────────────────────
    # The INSERT ... ON CONFLICT DO NOTHING against
    # ``uq_messages_conn_external_msg`` is the authoritative dedup: a
    # conflict means this message was already processed — REPLAY: exit
    # early with success (no Groq call, no send).
    inbound_msg_id = await _insert_message_dedup(
        session,
        tenant_id=tenant_id,
        conversation_id=conversation.id,
        platform_connection_id=connection.id,
        direction="in",
        external_user_id=parsed["external_user_id"],
        external_message_id=parsed["external_message_id"],
        platform="evolution",
        message_type="text",
        content=parsed["content"],
        status="received",
        payload=spam_payload,
    )
    if inbound_msg_id is None:
        logger.info(
            "Replay — message already processed, skipping | id={mid}",
            mid=parsed["external_message_id"],
        )
        return

    # ── 4a. Commit EARLY — before Groq and Evolution send ───────────────
    # External I/O must not run inside the transaction holding the
    # advisory lock: this commit persists the inbound message and releases
    # the lock, so concurrent webhooks for the same chat are not blocked
    # for the whole duration of the LLM call + platform send. It also
    # makes the stored message immediately visible to the other worker,
    # so webhook retries hit the replay exit above.
    await session.commit()

    # ── 4b. Load conversation history ──────────────────────────────────
    history_result = await session.execute(
        select(Message)
        .where(
            Message.conversation_id == conversation.id,
            Message.id != inbound_msg_id,
        )
        .order_by(Message.created_at.desc())
        .limit(CONTEXT_WINDOW_SIZE)
    )
    past_messages = list(reversed(history_result.scalars().all()))
    # Filter out admin-sent messages from LLM context — the LLM should not
    # see manually-written admin messages as "assistant" responses, since it
    # never generated them and would hallucinate context.
    conversation_history = [
        {
            "role": "user" if m.direction == "in" else "assistant",
            "content": m.content or "",
        }
        for m in past_messages
        if not (m.direction == "out" and (m.payload or {}).get("source") == "admin")
    ]

    # ── First message detection ────────────────────────────────────
    is_first_message = len(past_messages) == 0

    # ── 4c. Repetitive check ───────────────────────────────────────────
    rep_result = spam_detector.check_repetitive(
        text=parsed["content"],
        history=[m.content or "" for m in past_messages],
    )
    if rep_result.is_spam:
        # The inbound row is already committed — merge the repetitive
        # detection into its payload via UPDATE (the dedup insert is a
        # Core INSERT, so there is no ORM instance to mutate).
        merged_payload = dict(spam_payload) if spam_payload else {}
        merged_payload.update(rep_result.to_dict())
        # Merge detection layers (deduplicate)
        all_layers = merged_payload.get("detection_layers", [])
        merged_payload["detection_layers"] = list(dict.fromkeys(all_layers))
        await session.execute(
            update(Message)
            .where(Message.id == inbound_msg_id)
            .values(payload=merged_payload)
        )

        # Resolve mode for this connection
        rep_mode_config = _resolve_anti_spam_config(conn_spam_config)
        if rep_mode_config.get("mode") == "block" and rep_mode_config.get("enabled", True):
            conversation.last_message_at = datetime.now(UTC)
            await session.commit()
            logger.info(
                "Spam blocked (repetitive) | score={score}",
                score=rep_result.spam_score,
            )
            return

        logger.info(
            "Spam logged (repetitive) | score={score}",
            score=rep_result.spam_score,
        )

    # ── 4d. Load tenant (early, needed for payment guard + escalation) ──
    from app.modules.tenants.models import Tenant

    tenant = await session.get(Tenant, tenant_id)
    if tenant is None:
        logger.warning(
            "Tenant {tid} not found for Evolution message", tid=tenant_id
        )
        await session.commit()
        return

    # ── 4d2. Status guard — inactive/suspended tenants never reply ────────
    # A suspended/inactive business must not keep auto-responding to
    # WhatsApp. The inbound message was already persisted; we halt the reply
    # with a clear log. Connections are NOT disconnected or deleted here —
    # only message processing is skipped.
    if tenant.status in ("inactive", "suspended"):
        logger.info(
            "Inbound ignored | tenant={tid} | status={status} | user={user}",
            tid=tenant_id,
            status=tenant.status,
            user=parsed["external_user_id"],
        )
        await session.commit()
        return

    # ── 4e. Payment keyword pre-processing ───────────────────────────────
    # The platform's own payment info (Bre-B account, dashboard) is sent ONLY
    # in conversations of the internal tenant (Settings.internal_tenant_slug,
    # default "nuncacierro"). It must NEVER leak to end customers of client
    # tenants — their payment keywords flow through their own FAQ/AI pipeline.
    from app.modules.tenants.internal import is_internal_tenant

    if is_internal_tenant(tenant.slug, settings.internal_tenant_slug) and _has_payment_keyword(
        parsed["content"]
    ):
        payment_msg = (
            "¡Claro! Puedes pagar tu plan por:\n"
            f"• Bre-B: {settings.payment_breb_number}\n"
            f"Titular: {settings.payment_account_holder}\n\n"
            "También puedes ver los QR y gestionar tu pago desde el dashboard:\n"
            f"{settings.payment_dashboard_url}\n\n"
            "Envíame el comprobante por aquí cuando hayas pagado y activo tu plan enseguida."
        )

        adapter = EvolutionAdapter()
        try:
            evo_response = await adapter.send_message(
                connection=connection,
                to=parsed["remote_jid"],
                text=payment_msg,
            )
            evo_msg_id = evo_response.get("key", {}).get("id") or evo_response.get("id")
            outbound_status = "sent"
        except Exception:
            evo_msg_id = None
            outbound_status = "failed"

        outbound_msg = Message(
            tenant_id=tenant_id,
            conversation_id=conversation.id,
            platform_connection_id=connection.id,
            direction="out",
            external_user_id=parsed["external_user_id"],
            external_message_id=evo_msg_id,
            platform="evolution",
            message_type="text",
            content=payment_msg,
            status=outbound_status,
        )
        session.add(outbound_msg)

        # Mark escalation as responded ONLY if the courtesy credit was actually
        # delivered — a failed send must not silence the bot.
        if conversation.status == "escalated" and outbound_status == "sent":
            extra = dict(conversation.extra_data or {})
            extra["escalation_responded"] = True
            conversation.extra_data = extra

        conversation.last_message_at = datetime.now(UTC)
        await session.commit()
        logger.info(
            "Payment info sent | conn={conn} | user={user} | matched_keyword={kw}",
            conn=connection.id,
            user=parsed["external_user_id"],
            kw=parsed["content"][:80],
        )
        return

    # ── 5a. Resolve agent (needed for both AI and programmed plans) ────
    from app.modules.agents.models import AiAgent

    agent = None
    if connection.agent_id:
        agent_result = await session.execute(
            select(AiAgent).where(
                AiAgent.id == connection.agent_id,
                AiAgent.tenant_id == tenant.id,
                AiAgent.enabled == True,
            )
        )
        agent = agent_result.scalar_one_or_none()

    if agent is None:
        # Fallback must be DETERMINISTIC: scalar_one_or_none() raises
        # MultipleResultsFound with 2+ enabled agents (every webhook 500s).
        agent_result = await session.execute(
            select(AiAgent)
            .where(
                AiAgent.tenant_id == tenant.id,
                AiAgent.enabled == True,
            )
            .order_by(AiAgent.created_at, AiAgent.id)
            .limit(2)
        )
        candidates = list(agent_result.scalars().all())
        if len(candidates) > 1:
            logger.warning(
                "Tenant {tid} has {n} enabled agents — no connection link, "
                "using oldest (created_at, id). Link the connection to an "
                "agent for deterministic routing.",
                tid=tenant.id,
                n=len(candidates),
            )
        agent = candidates[0] if candidates else None

    # ── 5b. Trial expiration check ──────────────────────────────────────
    from app.modules.plans.capabilities import CAP_AI, TRIAL_DAYS, plan_has_capability

    if tenant.plan == "trial":
        trial_end = tenant.created_at.replace(tzinfo=UTC) + timedelta(days=TRIAL_DAYS)
        if datetime.now(UTC) >= trial_end:
            if tenant.status != "inactive":
                tenant.status = "inactive"
                session.add(tenant)
            await session.commit()
            logger.info("Trial expired for tenant {tid}, message ignored", tid=tenant_id)
            return

    # ── 5c. Programmed responses for plans without AI capability ───────────
    if not plan_has_capability(tenant.plan, CAP_AI):
        # Use agent's business_config FAQ + keywords for matching
        biz_config = (agent.business_config or {}) if agent else {}
        faq = biz_config.get("faq") or []
        keywords_to_escalate = biz_config.get("keywords_to_escalate") or []
        user_text = parsed["content"]
        matched_answer = None

        # 1. Check FAQ: match user message against FAQ questions
        # Accent-folded + stopword-free scoring — see _faq_answer_for.
        if faq:
            matched_answer = _faq_answer_for(user_text, faq)

        # 2. Check escalate keywords (human handoff)
        if not matched_answer and keywords_to_escalate:
            if any(
                _matches_escalation_keyword(user_text, kw)
                for kw in keywords_to_escalate
            ):
                conversation.status = "escalated"
                matched_answer = (
                    "Un asesor nuestro revisará tu mensaje y te contactará "
                    "pronto. Mientras tanto, ¿hay algo más en lo que pueda ayudarte?"
                )

        # 3. Default response
        if not matched_answer:
            # First message → welcome, subsequent → short helper
            if is_first_message:
                matched_answer = (
                    "¡Hola! 👋 Bienvenido/a a {name}. "
                    "Soy su asistente automático y estoy aquí para atenderle. "
                    "Puedo ayudarle con información sobre horarios, "
                    "productos, precios y servicios. "
                    "¿En qué puedo servirle hoy?"
                )
            else:
                matched_answer = (
                    "¡Hola! 👋 Soy el asistente de {name}. "
                    "¿En qué más puedo ayudarle?"
                )
            matched_answer = matched_answer.format(name=tenant.name)

        # Send and return
        adapter = EvolutionAdapter()
        try:
            evo_response = await adapter.send_message(
                connection=connection,
                to=parsed["remote_jid"],
                text=matched_answer,
            )
            evo_msg_id = evo_response.get("key", {}).get("id") or evo_response.get("id")
            outbound_status = "sent"
        except Exception:
            evo_msg_id = None
            outbound_status = "failed"

        outbound_msg = Message(
            tenant_id=tenant_id,
            conversation_id=conversation.id,
            platform_connection_id=connection.id,
            direction="out",
            external_user_id=parsed["external_user_id"],
            external_message_id=evo_msg_id,
            platform="evolution",
            message_type="text",
            content=matched_answer,
            status=outbound_status,
        )
        session.add(outbound_msg)

        # Mark escalation as responded ONLY if the courtesy credit was actually
        # delivered — a failed send must not silence the bot.
        if conversation.status == "escalated" and outbound_status == "sent":
            extra = dict(conversation.extra_data or {})
            extra["escalation_responded"] = True
            conversation.extra_data = extra

        conversation.last_message_at = datetime.now(UTC)
        await session.commit()
        logger.info(
            "Programmed response sent | tenant={t} | plan={p}",
            t=tenant_id, p=tenant.plan,
        )
        return

    # ── 6. Build system prompt from tenant config ──────────────────────
    from app.modules.agents.models import Prompt

    # agent already resolved in step 5a — reused here

    prompts_result = await session.execute(
        select(Prompt).where(
            Prompt.tenant_id == tenant.id,
            Prompt.active == True,
        )
    )
    prompts = list(prompts_result.scalars().all())

    # Priority: business_config (instructions + data) > custom prompt > default
    system_prompt = (
        f"Eres un asistente de atención al cliente para {tenant.name}."
    )

    model = None
    temperature = None
    max_tokens = None
    if agent:
        model = agent.model
        temperature = agent.temperature
        max_tokens = agent.max_tokens

        biz_text = format_business_config(agent.business_config)
        if biz_text:
            system_prompt = f"{system_prompt}\n\n{biz_text}"
        elif prompts:
            # Backward compat: custom prompt when no business_config
            system_prompt = prompts[0].content

    # ── First message hint (subordinate to business instructions) ─────
    if is_first_message:
        first_message_hint = (
            "\n\n---\n"
            "Si las instrucciones del negocio no indican otra cosa: este es el "
            "primer mensaje del usuario — saluda breve y cálido, preséntate como "
            f"asistente de {tenant.name} y haz una sola pregunta abierta. "
            "Si las instrucciones del negocio dicen algo distinto (por ejemplo, "
            "no presentarte en conversaciones de outreach), sigue las "
            "instrucciones del negocio."
        )
        system_prompt += first_message_hint

    # ── Universal formatting fallbacks (business instructions win) ─────
    system_prompt += f"\n\n{universal_format_block()}"

    # ── 6a. Escalation check — BEFORE AI (Professional+ plans) ─────────────
    # If the incoming message matches escalation keywords, send the
    # fallback message immediately and stop — don't let the AI respond.
    if agent and agent.business_config:
        esc_keywords = agent.business_config.get("keywords_to_escalate") or []
        fallback = agent.business_config.get("fallback_message") or (
            "Un asesor humano te atenderá en breve. "
            "Por favor espera mientras te conectamos."
        )
        if any(
            _matches_escalation_keyword(parsed["content"], kw)
            for kw in esc_keywords
        ):
            conversation.status = "escalated"

            adapter = EvolutionAdapter()
            try:
                evo_response = await adapter.send_message(
                    connection=connection,
                    to=parsed["remote_jid"],
                    text=fallback,
                )
                evo_msg_id = evo_response.get("key", {}).get("id") or evo_response.get("id")
                outbound_status = "sent"
            except Exception:
                evo_msg_id = None
                outbound_status = "failed"

            outbound_msg = Message(
                tenant_id=tenant_id,
                conversation_id=conversation.id,
                platform_connection_id=connection.id,
                direction="out",
                external_user_id=parsed["external_user_id"],
                external_message_id=evo_msg_id,
                platform="evolution",
                message_type="text",
                content=fallback,
                status=outbound_status,
            )
            session.add(outbound_msg)

            # Mark escalation as responded ONLY if the courtesy credit was
            # actually delivered — a failed send must not silence the bot.
            if conversation.status == "escalated" and outbound_status == "sent":
                extra = dict(conversation.extra_data or {})
                extra["escalation_responded"] = True
                conversation.extra_data = extra

            conversation.last_message_at = datetime.now(UTC)
            await session.commit()
            logger.info(
                "Escalation — fallback sent, AI skipped | conv={cid} | tenant={tid}",
                cid=conversation.id, tid=tenant_id,
            )
            return

    # ── 6. Generate response via LLM ────────────────────────────────────
    try:
        response = await groq_client.generate(
            system_prompt=system_prompt,
            user_message=f"<user_query>\n{parsed['content']}\n</user_query>",
            conversation_history=conversation_history,
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
        )
    except RuntimeError:
        response = (
            "En este momento tengo problemas técnicos. "
            "Por favor intenta de nuevo en unos minutos. ¡Gracias!"
        )

    # ── 6b. Empty-response guard ─────────────────────────────────────────
    # Groq occasionally returns an empty/whitespace-only completion. Sending
    # blank text to Evolution fails with 400 "Text is required" and the
    # customer receives NO reply. Substitute a fallback so the outbound
    # message always carries content.
    if not response.strip():
        logger.warning(
            "LLM returned empty response — using fallback | conn={conn}",
            conn=connection.id,
        )
        response = (
            "Disculpa, no pude procesar tu mensaje. "
            "¿Podrías intentarlo de nuevo?"
        )

    # ── 7. Send via EvolutionAdapter (composing + delay + text) ─────────
    adapter = EvolutionAdapter()
    try:
        evo_response = await adapter.send_message(
            connection=connection,
            to=parsed["remote_jid"],
            text=response,
        )
        # Evolution API returns the message key in the response
        evo_msg_id = (
            evo_response.get("key", {}).get("id", None)
        )
        if evo_msg_id is None:
            evo_msg_id = evo_response.get("id", None)
        outbound_status = "sent"
    except Exception:
        evo_msg_id = None
        outbound_status = "failed"

    # ── 8. Save outbound message ────────────────────────────────────────
    outbound_msg = Message(
        tenant_id=tenant_id,
        conversation_id=conversation.id,
        platform_connection_id=connection.id,
        direction="out",
        external_user_id=parsed["external_user_id"],
        external_message_id=evo_msg_id,
        platform="evolution",
        message_type="text",
        content=response,
        status=outbound_status,
    )
    session.add(outbound_msg)

    # Mark escalation as responded ONLY if the courtesy credit was actually
    # delivered — a failed send must not silence the bot.
    if conversation.status == "escalated" and outbound_status == "sent":
        extra = dict(conversation.extra_data or {})
        extra["escalation_responded"] = True
        conversation.extra_data = extra

    # ── Update conversation ─────────────────────────────────────────────
    conversation.last_message_at = datetime.now(UTC)
    if conversation.status != "escalated":
        conversation.status = "open"

    await session.commit()
