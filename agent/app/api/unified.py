from fastapi import APIRouter, Depends, HTTPException
from app.config import Settings, get_settings
from app.models.unified import UnifiedPerceptionResponse
from app.perception.client import HttpClient

router = APIRouter()

@router.get("/unified/{shipment_id}", response_model=UnifiedPerceptionResponse)
async def get_unified_data(
    shipment_id: str,
    settings: Settings = Depends(get_settings),
    client: HttpClient = Depends(HttpClient)
):
    """Fetch all perception data in a single request.
    The unified endpoint aggregates the 15 domain services using the
    single `PERCEPTION_API_KEY`. It forwards the request to each
    individual service internally, merges the JSON payloads, and returns
    a composite model that matches :class:`UnifiedPerceptionResponse`.
    """
    base_url = "https://perception.example.com"  # placeholder; replace with real base URL
    headers = {"X-API-KEY": settings.PERCEPTION_API_KEY}

    # Build individual service URLs – note that the shipment_id is used to derive the parameters needed by each service.
    # For demonstration we assume the following query mapping (adjust as needed):
    #   weather: lat/lon come from shipment’s origin coordinates (hard‑coded here)
    #   ais: vessel name obtained from shipment (hard‑coded)
    #   news, social, customs, government, sanctions, geopolitical, infrastructure,
    #   carrier, alt‑port, financial, customer, historical, disruption – all use the shipment_id or related port codes.
    # In a real deployment these would be looked up from the DB.
    try:
        # Example placeholders – replace with actual look‑ups.
        origin_lat, origin_lon = 51.9475, 4.1425
        vessel_name = "VSL987"
        port_code = "RTM"

        weather_url = f"{base_url}/weather?lat={origin_lat}&lon={origin_lon}"
        ais_url = f"{base_url}/ais?vessel={vessel_name}"
        news_url = f"{base_url}/news?port={port_code}"
        social_url = f"{base_url}/social?topic={shipment_id}"
        customs_url = f"{base_url}/customs?port={port_code}"
        government_url = f"{base_url}/government?region=EU"
        sanctions_url = f"{base_url}/sanctions?country=NL"
        geopolitical_url = f"{base_url}/geopolitical?country=NL"
        infrastructure_url = f"{base_url}/infrastructure?segment=SEG123"
        carrier_url = f"{base_url}/carrier?carrier_id=CAR123"
        alt_port_url = f"{base_url}/alt-port?port={port_code}"
        financial_url = f"{base_url}/financial?shipment={shipment_id}"
        customer_url = f"{base_url}/customer?customer_id=CUST123"
        historical_url = f"{base_url}/historical?port={port_code}"
        disruption_url = f"{base_url}/disruption?region=EU"

        # Run all requests concurrently.
        tasks = [
            client.get(weather_url, headers=headers),
            client.get(ais_url, headers=headers),
            client.get(news_url, headers=headers),
            client.get(social_url, headers=headers),
            client.get(customs_url, headers=headers),
            client.get(government_url, headers=headers),
            client.get(sanctions_url, headers=headers),
            client.get(geopolitical_url, headers=headers),
            client.get(infrastructure_url, headers=headers),
            client.get(carrier_url, headers=headers),
            client.get(alt_port_url, headers=headers),
            client.get(financial_url, headers=headers),
            client.get(customer_url, headers=headers),
            client.get(historical_url, headers=headers),
            client.get(disruption_url, headers=headers),
        ]
        responses = await client.gather(*tasks)
        # Unpack in the same order as UnifiedPerceptionResponse fields.
        (
            weather,
            ais,
            news,
            social,
            customs,
            government,
            sanctions,
            geopolitical,
            infrastructure,
            carrier,
            alternative_port,
            financial,
            customer,
            historical,
            disruption,
        ) = responses
        return UnifiedPerceptionResponse(
            weather=weather,
            ais=ais,
            news=news,
            social=social,
            customs=customs,
            government=government,
            sanctions=sanctions,
            geopolitical=geopolitical,
            infrastructure=infrastructure,
            carrier=carrier,
            alternative_port=alternative_port,
            financial=financial,
            customer=customer,
            historical=historical,
            disruption=disruption,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
