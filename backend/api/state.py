"""
Shared in-memory state for the FreightPulse backend.
Extended to include WebSocket client set and TwiML store.
"""
state = {
    "latest_news":    {},
    "latest_weather": {},
    "active_signals": [],
    "alerts":         [],
    "shipments":      [],
}
