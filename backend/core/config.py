"""Backend configuration using pydantic-settings — reads from .env"""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    # Neo4j
    neo4j_uri: str = Field(default="bolt://localhost:7687", env="NEO4J_URI")
    neo4j_user: str = Field(default="neo4j", env="NEO4J_USER")
    neo4j_password: str = Field(default="password123", env="NEO4J_PASSWORD")

    # Kafka / Redpanda
    kafka_brokers: str = Field(default="localhost:19092", env="KAFKA_BROKERS")

    # TimescaleDB
    timescale_database_url: str = Field(
        default="postgresql://freightpulse:freightpulse123@localhost:5432/freightpulse",
        env="TIMESCALE_DATABASE_URL",
    )

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")

    # External APIs
    anthropic_api_key: Optional[str] = Field(default=None, env="ANTHROPIC_API_KEY")
    news_api_key: Optional[str] = Field(default=None, env="NEWS_API_KEY")
    weather_api_key: Optional[str] = Field(default=None, env="WEATHER_API_KEY")
    ais_api_key: Optional[str] = Field(default=None, env="AIS_API_KEY")

    # Twilio
    twilio_account_sid: Optional[str] = Field(default=None, env="TWILIO_ACCOUNT_SID")
    twilio_auth_token: Optional[str] = Field(default=None, env="TWILIO_AUTH_TOKEN")
    twilio_phone_number: Optional[str] = Field(default=None, env="TWILIO_PHONE_NUMBER")
    user_phone_number: Optional[str] = Field(default=None, env="USER_PHONE_NUMBER")
    twiml_base_url: str = Field(default="http://localhost:8000", env="TWIML_BASE_URL")

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
