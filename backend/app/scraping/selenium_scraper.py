import asyncio
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import undetected_chromedriver as uc
from selenium_stealth import stealth
from fake_useragent import UserAgent
import logging
from typing import Dict, Any, Optional
from . import BaseScraper

logger = logging.getLogger(__name__)

class SeleniumScraper(BaseScraper):
    '''Selenium-based scraper with anti-detection features'''
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.driver: Optional[webdriver.Chrome] = None
        self.ua = UserAgent()
        
    async def setup_driver(self) -> None:
        '''Setup Chrome driver with stealth mode'''
        options = uc.ChromeOptions()
        
        # Anti-detection measures
        options.add_argument(f'user-agent={self.ua.random}')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # Performance options
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        
        # Headless if configured
        if self.config.get('headless', True):
            options.add_argument('--headless=new')
            
        # Initialize undetected chrome driver
        self.driver = uc.Chrome(options=options)
        
        # Apply stealth techniques
        stealth(self.driver,
                languages=["en-US", "en"],
                vendor="Google Inc.",
                platform="Win32",
                webgl_vendor="Intel Inc.",
                renderer="Intel Iris OpenGL Engine",
                fix_hairline=True)
        
        logger.info("Selenium driver initialized with anti-detection")
        
    async def scrape(self, url: str, **kwargs) -> Dict[str, Any]:
        '''Scrape a URL using Selenium'''
        try:
            if not self.driver:
                await self.setup_driver()
                
            logger.info(f"Scraping {url}")
            
            # Navigate to URL
            await asyncio.get_event_loop().run_in_executor(
                None, self.driver.get, url
            )
            
            # Wait for page load
            wait = WebDriverWait(self.driver, 10)
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            
            # Extract data
            result = {
                'url': url,
                'title': self.driver.title,
                'page_source': self.driver.page_source,
                'timestamp': datetime.now().isoformat(),
                'session_id': self.session_id
            }
            
            # Custom extraction logic if provided
            if 'extract' in kwargs:
                extracted = await self._extract_data(kwargs['extract'])
                result['extracted_data'] = extracted
                
            return result
            
        except Exception as e:
            logger.error(f"Error scraping {url}: {str(e)}")
            raise
            
    async def cleanup(self) -> None:
        '''Close the driver and cleanup'''
        if self.driver:
            self.driver.quit()
        await super().cleanup()
