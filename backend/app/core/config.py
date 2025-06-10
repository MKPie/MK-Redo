from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    app_name: str = "MK Processor"
    version: str = "4.2.0"
    debug: bool = True
    
    database_url: str = "postgresql://mkprocessor:password@postgres:5432/mkprocessor"
    redis_url: str = "redis://redis:6379"
    
    secret_key: str = "your-secret-key-here-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    
    proxy_url: Optional[str] = None
    user_agent: str = "MK-Processor/4.2.0"
    
    class Config:
        env_file = ".env"

settings = Settings()
