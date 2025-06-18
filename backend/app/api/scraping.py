from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, HttpUrl
from typing import Dict, Any, Optional, List
from ..scraping.selenium_scraper import SeleniumScraper
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/scraping", tags=["scraping"])

class ScrapeRequest(BaseModel):
    url: HttpUrl
    strategy: str = "selenium"  # selenium, playwright, requests
    headless: bool = True
    proxy: Optional[str] = None
    extract: Optional[Dict[str, Any]] = None

class ScrapeResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]]
    error: Optional[str]
    session_id: str

@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_url(request: ScrapeRequest, background_tasks: BackgroundTasks):
    '''Scrape a single URL'''
    try:
        config = {
            'headless': request.headless,
            'proxy': request.proxy
        }
        
        # Initialize appropriate scraper
        if request.strategy == "selenium":
            scraper = SeleniumScraper(config)
        else:
            raise HTTPException(400, f"Strategy {request.strategy} not implemented yet")
            
        # Perform scraping
        result = await scraper.scrape(str(request.url), extract=request.extract)
        
        # Cleanup in background
        background_tasks.add_task(scraper.cleanup)
        
        return ScrapeResponse(
            success=True,
            data=result,
            error=None,
            session_id=scraper.session_id
        )
        
    except Exception as e:
        logger.error(f"Scraping error: {str(e)}")
        return ScrapeResponse(
            success=False,
            data=None,
            error=str(e),
            session_id="error"
        )

@router.get("/status")
async def scraping_status():
    '''Get scraping service status'''
    return {
        "status": "operational",
        "available_strategies": ["selenium"],
        "features": {
            "anti_detection": True,
            "proxy_rotation": False,  # To be implemented
            "concurrent_scraping": False  # To be implemented
        }
    }
