from pydantic import BaseModel
from .pydantic_schemas import (
    WeatherModel,
    AISModel,
    NewsModel,
    SocialModel,
    CustomsModel,
    GovernmentModel,
    SanctionsModel,
    GeopoliticalModel,
    InfrastructureModel,
    CarrierModel,
    AlternativePortModel,
    FinancialModel,
    CustomerModel,
    HistoricalModel,
    DisruptionModel,
)

class UnifiedPerceptionResponse(BaseModel):
    weather: WeatherModel
    ais: AISModel
    news: NewsModel
    social: SocialModel
    customs: CustomsModel
    government: GovernmentModel
    sanctions: SanctionsModel
    geopolitical: GeopoliticalModel
    infrastructure: InfrastructureModel
    carrier: CarrierModel
    alternative_port: AlternativePortModel
    financial: FinancialModel
    customer: CustomerModel
    historical: HistoricalModel
    disruption: DisruptionModel
