#!/usr/bin/env python3
"""
scraper_wrapper.py - Real Katom scraper integration
Integrates the main.py scraper into the FastAPI backend
"""

import asyncio
import time
import traceback
import re
from typing import List, Dict, Optional, Tuple
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from fake_useragent import UserAgent
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KatomScraper:
    """Katom.com product scraper"""
    
    def __init__(self):
        self.running = True
        self.progress_callback = None
        
    def set_progress_callback(self, callback):
        """Set callback for progress updates"""
        self.progress_callback = callback
        
    def stop(self):
        """Stop the scraper"""
        self.running = False
        
    def _update_progress(self, current: int, total: int, status: str = ""):
        """Update progress if callback is set"""
        if self.progress_callback:
            progress = int((current / total) * 100) if total > 0 else 0
            self.progress_callback(progress, status)
            
    def extract_table_data(self, driver) -> Tuple[Dict, str]:
        """Extract specifications table data"""
        specs_dict = {}
        specs_html = ""
        
        try:
            # Find specs table
            specs_tables = driver.find_elements(By.CSS_SELECTOR, "table.table.table-condensed.specs-table")
            if not specs_tables:
                specs_tables = driver.find_elements(By.TAG_NAME, "table")
                
            if specs_tables:
                table = specs_tables[0]
                rows = table.find_elements(By.TAG_NAME, "tr")
                
                specs_html = '<table class="specs-table" style="border-collapse:collapse;"><tbody>'
                
                for row in rows:
                    cells = row.find_elements(By.TAG_NAME, "td")
                    if len(cells) >= 2:
                        key = cells[0].text.strip()
                        value = cells[1].text.strip()
                        
                        if key and value:
                            specs_dict[key] = value
                            specs_html += f'<tr><td style="padding:5px;border:1px solid #ddd;"><b>{key}</b></td>'
                            specs_html += f'<td style="padding:5px;border:1px solid #ddd;">{value}</td></tr>'
                
                specs_html += "</tbody></table>"
                
        except Exception as e:
            logger.error(f"Error extracting table data: {e}")
            
        return specs_dict, specs_html
    
    def scrape_katom(self, model_number: str, prefix: str = "", retries: int = 2) -> Dict:
        """
        Scrape a single Katom product
        Returns dict with all scraped data
        """
        # Clean model number
        model_number = ''.join(e for e in model_number if e.isalnum()).upper()
        if model_number.endswith("HC"):
            model_number = model_number[:-2]
            
        url = f"https://www.katom.com/{prefix}-{model_number}.html"
        logger.info(f"Scraping URL: {url}")
        
        # Setup Chrome options
        options = Options()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1920,1080')
        options.add_argument(f'user-agent={UserAgent().random}')
        
        driver = None
        result = {
            "model": model_number,
            "url": url,
            "title": "Title not found",
            "description": "Description not found",
            "specs": {},
            "specs_html": "",
            "price": "",
            "main_image": "",
            "additional_images": [],
            "video_links": "",
            "found": False,
            "error": None
        }
        
        try:
            driver = webdriver.Chrome(options=options)
            driver.set_page_load_timeout(30)
            driver.get(url)
            
            # Check if product exists
            if "404" in driver.title or "not found" in driver.title.lower():
                result["error"] = "Product not found"
                return result
            
            # Wait for page to load
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "h1.product-name.mb-0, h1"))
                )
            except TimeoutException:
                logger.warning("Timeout waiting for page load")
            
            # Extract title
            try:
                title_selectors = ["h1.product-name.mb-0", "h1.product-title", "h1[itemprop='name']", "h1"]
                for selector in title_selectors:
                    elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements and elements[0].text.strip():
                        result["title"] = elements[0].text.strip()
                        result["found"] = True
                        break
            except Exception as e:
                logger.error(f"Error getting title: {e}")
            
            # Only continue if product was found
            if result["found"]:
                # Extract price
                try:
                    price_selectors = [".price-now", ".product-price", "[itemprop='price']", ".price"]
                    for selector in price_selectors:
                        elements = driver.find_elements(By.CSS_SELECTOR, selector)
                        if elements:
                            price_text = elements[0].text.strip()
                            # Extract numeric price
                            price_match = re.search(r'[\d,]+\.\d{2}', price_text)
                            if price_match:
                                result["price"] = price_match.group(0).replace(',', '')
                                break
                except Exception as e:
                    logger.error(f"Error extracting price: {e}")
                
                # Extract main image
                try:
                    img_selectors = [".main-image img", ".product-image img", "#product-image img", ".primary-image img"]
                    for selector in img_selectors:
                        elements = driver.find_elements(By.CSS_SELECTOR, selector)
                        if elements:
                            src = elements[0].get_attribute("src")
                            if src:
                                result["main_image"] = src
                                break
                except Exception as e:
                    logger.error(f"Error extracting main image: {e}")
                
                # Extract description
                try:
                    # Try to find tab content first
                    tab_content = driver.find_elements(By.CLASS_NAME, "tab-content")
                    if tab_content:
                        paragraphs = tab_content[0].find_elements(By.TAG_NAME, "p")
                        filtered = []
                        for p in paragraphs:
                            p_text = p.text.strip()
                            if p_text and not p_text.lower().startswith("*free") and "video" not in p_text.lower():
                                filtered.append(f"<p>{p_text}</p>")
                        if filtered:
                            result["description"] = "".join(filtered)
                    else:
                        # Try alternative selectors
                        desc_selectors = [".product-description", ".description", "[class*='description']"]
                        for selector in desc_selectors:
                            elements = driver.find_elements(By.CSS_SELECTOR, selector)
                            if elements and elements[0].text.strip():
                                result["description"] = f"<p>{elements[0].text.strip()}</p>"
                                break
                except Exception as e:
                    logger.error(f"Error getting description: {e}")
                
                # Extract specifications
                specs_dict, specs_html = self.extract_table_data(driver)
                result["specs"] = specs_dict
                result["specs_html"] = specs_html
                
                # Extract additional images
                try:
                    thumb_selectors = [".additional-images img", ".product-thumbnails img", ".thumb-image"]
                    for selector in thumb_selectors:
                        elements = driver.find_elements(By.CSS_SELECTOR, selector)
                        if elements:
                            for element in elements[:5]:  # Limit to 5 images
                                src = element.get_attribute("src")
                                if src and src != result["main_image"]:
                                    result["additional_images"].append(src)
                            break
                except Exception as e:
                    logger.error(f"Error extracting additional images: {e}")
                
        except Exception as e:
            logger.error(f"Error in scrape_katom: {e}")
            logger.error(traceback.format_exc())
            result["error"] = str(e)
            
            if retries > 0 and self.running:
                if driver:
                    try:
                        driver.quit()
                    except:
                        pass
                time.sleep(2)
                return self.scrape_katom(model_number, prefix, retries - 1)
                
        finally:
            if driver:
                try:
                    driver.quit()
                except:
                    pass
        
        return result
    
    async def scrape_multiple(self, models: List[str], prefix: str = "") -> Dict:
        """
        Scrape multiple models asynchronously
        """
        results = []
        errors = []
        total = len(models)
        
        logger.info(f"Starting to scrape {total} models with prefix: {prefix}")
        
        for i, model in enumerate(models):
            if not self.running:
                logger.info("Scraping stopped by user")
                break
                
            self._update_progress(i + 1, total, f"Scraping {model}")
            
            try:
                # Run scraper in thread pool to avoid blocking
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(None, self.scrape_katom, model, prefix)
                
                if result["found"]:
                    results.append(result)
                    logger.info(f"Successfully scraped {model}")
                else:
                    errors.append({
                        "model": model,
                        "error": result.get("error", "Product not found")
                    })
                    logger.warning(f"Product not found: {model}")
                    
            except Exception as e:
                logger.error(f"Error scraping {model}: {e}")
                errors.append({
                    "model": model,
                    "error": str(e)
                })
            
            # Small delay between requests
            await asyncio.sleep(1)
        
        self._update_progress(total, total, "Completed")
        
        return {
            "successful": len(results),
            "failed": len(errors),
            "total": total,
            "results": results,
            "errors": errors
        }

# Global scraper instance
scraper = KatomScraper()

# Convenience functions for backward compatibility
async def scrape_models(models: List[str], prefix: str = "", progress_callback=None) -> Dict:
    """Main entry point for scraping multiple models"""
    if progress_callback:
        scraper.set_progress_callback(progress_callback)
    return await scraper.scrape_multiple(models, prefix)

def stop_scraper():
    """Stop the scraper"""
    scraper.stop()

# Add the expected function name that backend is looking for
async def scrape_katom_products(job_id: str, models: List[str], prefix: str = "", progress_callback=None) -> Dict:
    """
    Function expected by backend main.py
    """
    logger.info(f"Starting Katom scrape for job {job_id} with {len(models)} models")
    return await scrape_models(models, prefix, progress_callback)
