from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    opc_dashboard_token: str
    opc_schema_version: str = "1"
    cors_origins: str = "http://localhost:5173"
    host: str = "127.0.0.1"
    port: int = 8000

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
