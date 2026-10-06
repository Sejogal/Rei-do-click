from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TypeArena API"
    debug: bool = True
    database_url: str
    secret_key: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()