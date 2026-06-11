import httpx
from datetime import datetime

KNOWN_PORTS = [
    "Rotterdam", "Hamburg", "Felixstowe", "Antwerp",
    "Nhava Sheva", "Mumbai", "Chennai", "Mundra", "Kolkata"
]

DISRUPTION_KEYWORDS = [
    "strike", "protest", "disruption", "congestion",
    "block", "delay", "closure", "stoppage"
]
GDELT_URL = (
    "https://api.gdeltproject.org/api/v2/doc/doc?query=port+strike+disruption+labor&mode=artlist&maxrecords=10&format=json"
)

def extract_location(title: str) -> str:
    for port in KNOWN_PORTS:
        if port.lower() in title.lower():
            return port
    return ""

async def fetch_gdelt() -> dict:
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        async with httpx.AsyncClient(timeout=20, headers=headers) as client:
            response = await client.get(GDELT_URL)
            response.raise_for_status()
            data = response.json()
            articles = data.get("articles", [])
            for article in articles:
                title = article.get("title", "")
                has_keyword = any(kw in title.lower() for kw in DISRUPTION_KEYWORDS)
                if not has_keyword or not title:
                    continue
                location = extract_location(title) or article.get("sourcecountry", "")
                return {
                    "article_id": f"gdelt_{datetime.utcnow().timestamp()}",
                    "source": "GDELT",
                    "author": "GDELT Feed",
                    "title": title,
                    "content": article.get("url", ""),
                    "url": article.get("url", ""),
                    "published_at": datetime.utcnow().isoformat(),
                    "language": article.get("language", "en"),
                    "region": article.get("sourcecountry", ""),
                    "sentiment": -0.5,
                    "credibility_score": 0.75,
                    "location": location,
                }
    except Exception as e:
        print(f"GDELT error: {e}")
    return {}