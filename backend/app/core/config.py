from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://todoist:todoist@db:5432/todoist"
    jwt_secret_key: str = "change-me-dev-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    require_email_verification: bool = False

    # Reminder delivery. Email needs SMTP_HOST; push needs the VAPID pair
    # (python scripts/generate_vapid_keys.py). Unset = that channel is off.
    reminder_worker_enabled: bool = True
    reminder_poll_seconds: int = 30
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = "Todoist Clone <no-reply@localhost>"
    smtp_starttls: bool = True
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "mailto:admin@localhost"


settings = Settings()
