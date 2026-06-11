import httpx
from datetime import datetime

PORTS = [
    {"name": "Rotterdam", "lat": 51.9475, "lon": 4.1425},
    {"name": "Hamburg", "lat": 53.5, "lon": 10.0},
    {"name": "Felixstowe", "lat": 51.96, "lon": 1.35},
    {"name": "Antwerp", "lat": 51.23, "lon": 4.40},
]

async def fetch_weather(port_name: str = "Rotterdam") -> dict:
    port = next((p for p in PORTS if p["name"] == port_name), PORTS[0])
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            url = (
                f"https://api.open-meteo.com/v1/forecast"
                f"?latitude={port['lat']}&longitude={port['lon']}"
                f"&current_weather=true"
                f"&timezone=UTC"
            )
            response = await client.get(url)
            data = response.json()
            current = data.get("current_weather", {})
            wind = current.get("windspeed", 0)
            return {
                "location": f"Port of {port['name']}",
                "latitude": port["lat"],
                "longitude": port["lon"],
                "wind_speed_kmh": round(wind * 3.6, 1),
                "wind_direction": current.get("winddirection", 0),
                "wave_height_m": round(wind * 0.07, 1),
                "sea_state_index": 3 if wind > 10 else 1,
                "visibility_km": 15.0,
                "precipitation_mm": 0,
                "storm_probability": round(min(wind / 30, 1.0), 2),
                "cyclone_probability": 0.0,
                "flood_probability": 0.02,
                "temperature": current.get("temperature", 15),
                "humidity": 78,
                "pressure": 1015,
                "lightning_probability": 0.0,
                "timestamp": current.get("time", datetime.utcnow().isoformat() + "Z")
            }
    except Exception as e:
        print(f"Weather error: {e}")
    return {}