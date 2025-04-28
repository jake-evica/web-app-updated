import logging

from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine, init_db
from app.models import User, UserCreate
from app import crud

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init() -> None:
    with Session(engine) as session:
        init_db(session)
        
        # Check if superuser exists
        user = session.exec(
            select(User).where(User.email == settings.FIRST_SUPERUSER)
        ).first()
        
        if not user:
            logger.info("Creating initial superuser")
            user_in = UserCreate(
                email=settings.FIRST_SUPERUSER,
                password=settings.FIRST_SUPERUSER_PASSWORD,
                is_superuser=True,
            )
            user = crud.create_user(session=session, user_create=user_in)
            logger.info(f"Initial superuser created with email: {user.email}")


def main() -> None:
    logger.info("Creating initial data")
    init()
    logger.info("Initial data created")


if __name__ == "__main__":
    main()
