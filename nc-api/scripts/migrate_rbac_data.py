import asyncio
import logging
from sqlalchemy import select
from app.db.session import async_session_factory
import app.db.models # Ensure all models are registered
from app.modules.auth.models import User, UserRole
from app.modules.tenants.models import Tenant
from app.modules.auth.user_tenant import UserTenant

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def migrate_data():
    async with async_session_factory() as session:
        # Fetch all users
        users_result = await session.execute(select(User))
        users = users_result.scalars().all()
        
        # Fetch all tenants
        tenants_result = await session.execute(select(Tenant))
        tenants = tenants_result.scalars().all()
        
        if not users:
            logger.info("No users found to migrate.")
            return
        
        if not tenants:
            logger.info("No tenants found to link users to.")
            return
        
        logger.info(f"Found {len(users)} users and {len(tenants)} tenants.")
        
        for user in users:
            for i, tenant in enumerate(tenants):
                # Check if association already exists
                existing = await session.execute(
                    select(UserTenant).where(
                        UserTenant.user_id == user.id,
                        UserTenant.tenant_id == tenant.id
                    )
                )
                if existing.scalar_one_or_none():
                    logger.info(f"Association already exists for {user.email} and {tenant.slug}")
                    continue
                
                # Create association
                ut = UserTenant(
                    user_id=user.id,
                    tenant_id=tenant.id,
                    role=UserRole.ADMIN,
                    is_primary=(i == 0) # Mark first tenant as primary
                )
                session.add(ut)
                logger.info(f"Linked {user.email} to {tenant.slug} as ADMIN (primary={i==0})")
        
        await session.commit()
        logger.info("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(migrate_data())
