from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://todoist:todoist@db:5432/todoist"
    jwt_secret_key: str = "change-me-dev-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    require_email_verification: bool = False


settings = Settings()
