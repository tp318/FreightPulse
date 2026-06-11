import os
from .client import HttpClient

WEATHER_API_URL = os.getenv("WEATHER_API_URL", "https://api.example.com/weather")

async def fetch_weather(location: str) -> dict:
    """Fetch weather data for a given location using the configured API key.
    The real endpoint may differ; this placeholder uses a generic query param.
    """
    client = HttpClient()
    headers = {"Authorization": f"Bearer {client.settings.WEATHER_API_KEY}"} if client.settings.WEATHER_API_KEY else {}
    params = {"location": location}
    result = await client.get(WEATHER_API_URL, params=params, headers=headers)
    await client.close()
    return result
