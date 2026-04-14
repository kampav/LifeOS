from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Life OS API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Auth / Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_AI_API_KEY: str = ""
    MEM0_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # GCP
    GCP_PROJECT_ID: str = "life-os-prod"
    GCP_REGION: str = "europe-west2"
    GCS_BUCKET: str = "life-os-user-files-prod"

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://lifeos.ai",
        "https://staging.lifeos.ai",
        "https://life-os-frontend-574662870196.europe-west2.run.app",
    ]

    # Rate limits (per hour for free tier)
    RATE_LIMIT_FREE_API: int = 100
    RATE_LIMIT_FREE_AI_DAILY: int = 10

    # MCP
    MEM0_MCP_URL: str = ""
    LIFE_OS_API_TOKEN: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Token budgets per PRD §13
TOKEN_BUDGETS = {
    "supervisor_input": 2200,
    "supervisor_output": 500,
    "domain_agent_input": 1800,
    "domain_agent_output": 400,
    "personalisation_block": 80,
    "expertise_block": 120,
    "system_prompt": 500,
    "domain_context": 800,
    "memory_block": 200,
    "conv_history": 600,
}
