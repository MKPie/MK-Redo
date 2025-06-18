from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class BaseScraper(ABC):
    '''Abstract base class for all scrapers'''
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.session_id = datetime.now().isoformat()
        self.results = []
        
    @abstractmethod
    async def scrape(self, url: str, **kwargs) -> Dict[str, Any]:
        '''Main scraping method to be implemented by subclasses'''
        pass
    
    @abstractmethod
    async def setup_driver(self) -> None:
        '''Setup the web driver with anti-detection measures'''
        pass
    
    async def cleanup(self) -> None:
        '''Cleanup resources after scraping'''
        logger.info(f"Cleaning up session {self.session_id}")
