from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from api.routes import router
from api.state import state
from signals.gdelt import fetch_gdelt
from signals.weather import fetch_weather

async def polling_loop():
    while True:
        try:
            news = await fetch_gdelt()
            weather = await fetch_weather("Rotterdam")
            if news:
                state["latest_news"] = news
                state["active_signals"].append(news)
            if weather:
                state["latest_weather"] = weather
        except Exception as e:
            print(f"Polling error: {e}")
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(polling_loop())
    yield
    task.cancel()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def root():
    return {"status": "FreightPulse backend running"}