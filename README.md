# FreightPulse

FreightPulse is an AI-powered logistics disruption intelligence platform. It monitors shipping routes, detects disruptions (like port strikes or severe weather), and uses an AI pipeline to recommend alternative routing and immediately notify freight forwarders.

## 📂 Repository Structure

The project is split into two main directories:

- `/frontend` — The interactive web interface.
  - Built with React, Vite, and Tailwind CSS.
  - Contains the Command Dashboard (maps, metrics) and the Engine View (real-time 10-stage AI pipeline visualisation).
- `/backend` — The core engine and API layer.
  - Built with Python and FastAPI.
  - Includes ingestion workers, the AI decision engine (with Anthropic Claude integration), graph query layers (Neo4j), and WebSocket broadcasters for real-time frontend updates.

## 🚀 Setup Instructions

### 1. Environment Variables
Create a `.env` file in the root of the project. You can copy `.env.example` if it exists, or set the following basic keys:

```env
# Optional: Enable real AI reasoning and phone calls
ANTHROPIC_API_KEY=your_api_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token

# Local Development Overrides
KAFKA_BROKERS=none
NEO4J_URI=none
TIMESCALE_DATABASE_URL=none
```
*(Note: Setting the databases to `none` allows the backend to run in a standalone "mock/demo mode" without needing Docker containers for Kafka or Neo4j).*

### 2. Run the Backend
You will need Python 3.9+ installed.

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
The backend will start on `http://localhost:8000`.

### 3. Run the Frontend
You will need Node.js installed.

```bash
cd frontend
npm install
npm run dev
```
The frontend will start on `http://localhost:5173`. Open this URL in your browser to explore the dashboard and start simulating disruptions!

## 🐳 Running the Full Stack (Optional)
If you want to run the full architecture including the Redpanda (Kafka) event bus, Neo4j graph database, and TimescaleDB, you can use Docker:

```bash
docker-compose up --build
```
