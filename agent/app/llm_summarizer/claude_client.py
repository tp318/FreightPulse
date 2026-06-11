from app.core.config import get_settings


async def create_forwarder_brief(shipment, explanation: dict) -> str:
    settings = get_settings()
    template = (
        f"Shipment {shipment.id}: recommended action is {explanation.get('chosen_scenario')}. "
        f"{explanation.get('reason', '')}"
    )
    if not settings.ANTHROPIC_API_KEY:
        return template
    try:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        msg = await client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=300,
            messages=[{"role": "user", "content": f"Create a concise forwarder brief for the shipment: {shipment.id} using this decision explanation: {explanation}"}],
        )
        return msg.content[0].text
    except Exception:
        return template
