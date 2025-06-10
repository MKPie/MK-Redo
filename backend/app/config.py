from pydantic_settings import BaseSettings
from typing import Optional, List
import os

class Settings(BaseSettings):
    # App
    APP_NAME: str = 'MK Processor'
    VERSION: str = '4.2.0'
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = os.getenv('DATABASE_URL', 'postgresql://mkuser:mkpass123@localhost:5432/mkprocessor')
    
    # Redis
    REDIS_URL: str = os.getenv('REDIS_URL', 'redis://localhost:6379')
    
    # GitHub
    GITHUB_TOKEN: str = os.getenv('GITHUB_TOKEN', '')
    GITHUB_REPO: str = os.getenv('GITHUB_REPO', 'MKPie/MK-Redo')
    
    # Security
    SECRET_KEY: str = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
    
    class Config:
        env_file = '.env'

settings = Settings()
