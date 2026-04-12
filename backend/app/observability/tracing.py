from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource
from app.config import settings


def configure_tracing():
    resource = Resource(attributes={"service.name": "life-os-api", "deployment.environment": settings.ENVIRONMENT})
    provider = TracerProvider(resource=resource)

    if settings.ENVIRONMENT == "production":
        try:
            from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
            provider.add_span_processor(BatchSpanProcessor(CloudTraceSpanExporter()))
        except Exception:
            pass  # GCP exporter optional in dev

    trace.set_tracer_provider(provider)


def get_tracer(name: str = "life-os"):
    return trace.get_tracer(name)
