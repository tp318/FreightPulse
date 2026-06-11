from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://user:pass@postgres:5432/lrie"
    NEO4J_URI: str = "bolt://neo4j:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password123"
    REDIS_URL: str = "redis://redis:6379/0"
    GDELT_API_URL: str = "https://api.gdeltproject.org/api/v2/doc/doc"
    OPEN_METEO_URL: str = "https://marine-api.open-meteo.com/v1/marine"
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    ANTHROPIC_API_KEY: str | None = None
    API_KEY: str = "dev-secret"
    NOTIFICATIONS_ENABLED: bool = False
    DEMURRAGE_DAILY_RATE: float = 125.0
    DETENTION_DAILY_RATE: float = 95.0
    STORAGE_DAILY_RATE: float = 70.0
    SLA_PENALTY_PER_DAY: float = 500.0
    DECISION_WEIGHTS: str = "0.4,0.3,0.2,0.1"
    PATH_TIME_WEIGHT: float = Field(default=0.6, ge=0, le=1)
    PATH_COST_WEIGHT: float = Field(default=0.4, ge=0, le=1)

    def decision_weights(self) -> tuple[float, float, float, float]:
        values = [float(x.strip()) for x in self.DECISION_WEIGHTS.split(",")]
        if len(values) != 4 or sum(values) <= 0:
            return (0.4, 0.3, 0.2, 0.1)
        total = sum(values)
        return tuple(v / total for v in values)  # type: ignore[return-value]


@lru_cache
def get_settings() -> Settings:
    return Settings()
