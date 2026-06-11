import os
from pydantic import BaseSettings, Field

class Settings(BaseSettings):
    # Database configuration (already used elsewhere)
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    # External perception API keys (optional placeholders)
    WEATHER_API_KEY: str = Field(default="", env="WEATHER_API_KEY")
    AIS_API_KEY: str = Field(default="", env="AIS_API_KEY")
    NEWS_API_KEY: str = Field(default="", env="NEWS_API_KEY")
    CUSTOMS_API_KEY: str = Field(default="", env="CUSTOMS_API_KEY")
    GOVERNMENT_API_KEY: str = Field(default="", env="GOVERNMENT_API_KEY")
    SANCTIONS_API_KEY: str = Field(default="", env="SANCTIONS_API_KEY")
    GEOPOLITICAL_API_KEY: str = Field(default="", env="GEOPOLITICAL_API_KEY")
    INFRASTRUCTURE_API_KEY: str = Field(default="", env="INFRASTRUCTURE_API_KEY")
    CARRIER_API_KEY: str = Field(default="", env="CARRIER_API_KEY")
    FINANCIAL_API_KEY: str = Field(default="", env="FINANCIAL_API_KEY")
    CUSTOMER_API_KEY: str = Field(default="", env="CUSTOMER_API_KEY")
    HISTORICAL_API_KEY: str = Field(default="", env="HISTORICAL_API_KEY")
    DISRUPTION_API_KEY: str = Field(default="", env="DISRUPTION_API_KEY")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

def get_settings() -> Settings:
    return Settings()
