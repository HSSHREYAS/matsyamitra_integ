from sqlalchemy import Engine, create_engine
from sqlalchemy.exc import SQLAlchemyError

from analytics.config import DatabaseConfig, load_database_config_from_env
from analytics.persistence.exceptions import DatabaseConnectionError
from analytics.persistence.models import Base


def create_database_engine(config: DatabaseConfig | None = None) -> Engine:
    database_config = config or load_database_config_from_env()

    try:
        return create_engine(
            database_config.database_url,
            echo=database_config.echo_sql,
            pool_pre_ping=database_config.pool_pre_ping,
            future=True,
        )
    except (ValueError, SQLAlchemyError) as exc:
        raise DatabaseConnectionError(f"Unable to create database engine: {exc}") from exc


def create_tables(engine: Engine) -> None:
    try:
        Base.metadata.create_all(engine)
    except SQLAlchemyError as exc:
        raise DatabaseConnectionError(f"Unable to create persistence tables: {exc}") from exc


def drop_tables(engine: Engine) -> None:
    try:
        Base.metadata.drop_all(engine)
    except SQLAlchemyError as exc:
        raise DatabaseConnectionError(f"Unable to drop persistence tables: {exc}") from exc
