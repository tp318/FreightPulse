import os
from pydantic import BaseSettings, Field

class Settings(BaseSettings):
    # Database configuration (already used elsewhere)
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    # Unified perception API key (single key for all services)
    PERCEPTION_API_KEY: str = Field(default="", env="PERCEPTION_API_KEY")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

def get_settings() -> Settings:
    return Settings()
