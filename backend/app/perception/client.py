import httpx
import asyncio
from typing import Any, Dict
from .config import get_settings

class HttpClient:
    def __init__(self):
        self.settings = get_settings()
        self.client = httpx.AsyncClient(timeout=10)

    async def get(self, url: str, params: Dict[str, Any] = None, headers: Dict[str, str] = None) -> Dict[str, Any]:
        if headers is None:
            headers = {}
        # Merge API key header if applicable
        # Caller should include needed auth header via params or headers
        response = await self.client.get(url, params=params, headers=headers)
        response.raise_for_status()
        return response.json()

    async def post(self, url: str, json: Dict[str, Any] = None, headers: Dict[str, str] = None) -> Dict[str, Any]:
        if headers is None:
            headers = {}
        response = await self.client.post(url, json=json, headers=headers)
        response.raise_for_status()
        return response.json()

    async def close(self):
        await self.client.aclose()
