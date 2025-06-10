from fastapi import APIRouter
from .v1 import auth, scraping

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/api/v1")
api_router.include_router(scraping.router, prefix="/api/v1")
