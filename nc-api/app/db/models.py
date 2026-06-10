"""Import hub — makes all models visible to Alembic.

Import this file in ``env.py`` so Alembic's autogenerate can detect all tables.
"""

from app.modules.auth.models import User  # noqa: F401
from app.modules.auth.user_tenant import UserTenant  # noqa: F401
from app.modules.tenants.models import Tenant  # noqa: F401
from app.modules.whatsapp.models import WhatsAppNumber  # noqa: F401
from app.modules.agents.models import AiAgent, Prompt  # noqa: F401
from app.modules.agents.template_models import AgentTemplate  # noqa: F401
from app.modules.conversations.models import Conversation, Message  # noqa: F401
from app.modules.platform_connections.models import PlatformConnection  # noqa: F401
from app.modules.auto_reply.models import AutoReply  # noqa: F401
from app.db.base import Base  # noqa: F401 — ensure Base is loaded too
