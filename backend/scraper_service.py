"""
Scraper Service Wrapper for MK Processor
Integrates main.py scraper with FastAPI backend
"""
import sys
import os
import asyncio
import json
import traceback
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging

# Add current directory to path for scraper imports
sys.path.append('/app')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    # Import the main scraper
    from scraper_main import *
    SCRAPER_AVAILABLE = True
    logger.info("✅ Scraper imported successfully")
except ImportError as e:
    SCRAPER_AVAILABLE = False
    logger.error(f"❌ Failed to import scraper: {e}")

class ScraperService:
    def __init__(self):
        self.scraper_available = SCRAPER_AVAILABLE
        self.active_jobs = {}
        
    async def scrape_models(self, job_id: str, models: List[str], prefix: str = "") -> Dict[str, Any]:
        """
        Scrape multiple models and return results
        """
        if not self.scraper_available:
            return {
                "success": False,
                "error": "Scraper not available",
                "results": [],
                "failed": len(models)
            }
        
        results = []
        errors = []
        
        try:
            # Mark job as running
            self.active_jobs[job_id] = {
                "status": "running",
                "progress": 0,
                "total": len(models),
                "current_model": None
            }
            
            for i, model in enumerate(models):
                try:
                    # Update progress
                    self.active_jobs[job_id]["current_model"] = model
                    self.active_jobs[job_id]["progress"] = i
                    
                    logger.info(f"🔍 Scraping model: {model}")
                    
                    # Call your actual scraper function here
                    # This depends on what functions are available in your main.py
                    # Common patterns:
                    # result = scrape_model(model, prefix)
                    # result = main_scraper(model)
                    # result = process_model(model, prefix)
                    
                    # For now, create a placeholder that you can replace
                    result = await self._scrape_single_model(model, prefix)
                    
                    if result:
                        results.append({
                            "model": model,
                            "status": "success",
                            "data": result,
                            "timestamp": datetime.now().isoformat()
                        })
                        logger.info(f"✅ Successfully scraped: {model}")
                    else:
                        errors.append({
                            "model": model,
                            "error": "No data returned",
                            "timestamp": datetime.now().isoformat()
                        })
                        
                except Exception as e:
                    error_msg = f"Error scraping {model}: {str(e)}"
                    logger.error(error_msg)
                    errors.append({
                        "model": model,
                        "error": error_msg,
                        "traceback": traceback.format_exc(),
                        "timestamp": datetime.now().isoformat()
                    })
                
                # Small delay between models
                await asyncio.sleep(0.5)
            
            # Mark job as completed
            self.active_jobs[job_id]["status"] = "completed"
            self.active_jobs[job_id]["progress"] = len(models)
            
        except Exception as e:
            logger.error(f"❌ Job {job_id} failed: {e}")
            self.active_jobs[job_id]["status"] = "failed"
            self.active_jobs[job_id]["error"] = str(e)
        
        return {
            "success": len(errors) == 0,
            "successful": len(results),
            "failed": len(errors),
            "results": results,
            "errors": errors,
            "job_id": job_id
        }
    
        async def _scrape_single_model(self, model: str, prefix: str = "") -> Optional[Dict]:
        """
        Scrape a single model using your actual scraper - UPDATED FOR REAL SCRAPING
        """
        try:
            logger.info(f"🔍 Starting real scrape for model: {model}")
            
            # METHOD 1: If your scraper has a main() function that takes arguments
            if hasattr(sys.modules['scraper_main'], 'main'):
                try:
                    # Try calling main with model name
                    result = sys.modules['scraper_main'].main(model_name=f"{prefix}{model}")
                    if result:
                        return {
                            "model_name": f"{prefix}{model}",
                            "scraped_at": datetime.now().isoformat(),
                            "data": result,
                            "source": "main_function",
                            "method": "main(model_name)"
                        }
                except Exception as e:
                    logger.warning(f"Method 1 failed: {e}")
            
            # METHOD 2: If your scraper has a specific scraping function
            scraper_functions = ['scrape_model', 'process_model', 'download_model', 'fetch_model']
            for func_name in scraper_functions:
                if hasattr(sys.modules['scraper_main'], func_name):
                    try:
                        func = getattr(sys.modules['scraper_main'], func_name)
                        result = func(f"{prefix}{model}")
                        if result:
                            return {
                                "model_name": f"{prefix}{model}",
                                "scraped_at": datetime.now().isoformat(),
                                "data": result,
                                "source": func_name,
                                "method": f"{func_name}(model)"
                            }
                    except Exception as e:
                        logger.warning(f"Method {func_name} failed: {e}")
            
            # METHOD 3: If your scraper uses a class-based approach
            scraper_classes = ['Scraper', 'MKScraper', 'ModelScraper', 'Processor']
            for class_name in scraper_classes:
                if hasattr(sys.modules['scraper_main'], class_name):
                    try:
                        scraper_class = getattr(sys.modules['scraper_main'], class_name)
                        scraper_instance = scraper_class()
                        
                        # Try common method names
                        for method in ['scrape', 'process', 'run', 'execute']:
                            if hasattr(scraper_instance, method):
                                result = getattr(scraper_instance, method)(f"{prefix}{model}")
                                if result:
                                    return {
                                        "model_name": f"{prefix}{model}",
                                        "scraped_at": datetime.now().isoformat(),
                                        "data": result,
                                        "source": f"{class_name}.{method}",
                                        "method": f"class_based"
                                    }
                    except Exception as e:
                        logger.warning(f"Class method {class_name} failed: {e}")
            
            # METHOD 4: Try to call main() without parameters and see what happens
            if hasattr(sys.modules['scraper_main'], 'main'):
                try:
                    # Some scrapers expect model name in a global variable or config
                    result = sys.modules['scraper_main'].main()
                    if result:
                        return {
                            "model_name": f"{prefix}{model}",
                            "scraped_at": datetime.now().isoformat(),
                            "data": result,
                            "source": "main_no_params",
                            "method": "main()"
                        }
                except Exception as e:
                    logger.warning(f"Method main() no params failed: {e}")
            
            # If all methods fail, return diagnostic info
            logger.error(f"❌ All scraping methods failed for {model}")
            available_functions = [name for name in dir(sys.modules['scraper_main']) 
                                 if callable(getattr(sys.modules['scraper_main'], name)) 
                                 and not name.startswith('_')]
            
            return {
                "model_name": f"{prefix}{model}",
                "scraped_at": datetime.now().isoformat(),
                "data": {
                    "status": "scraper_integration_needed",
                    "message": "Real scraper found but integration method unclear",
                    "available_functions": available_functions[:10],  # Limit output
                    "suggestion": "Check available_functions and update _scrape_single_model accordingly"
                },
                "source": "diagnostic",
                "method": "auto_discovery"
            }
            
        except Exception as e:
            logger.error(f"❌ Critical error in _scrape_single_model: {e}")
            return {
                "model_name": f"{prefix}{model}",
                "scraped_at": datetime.now().isoformat(),
                "data": {"error": str(e), "traceback": traceback.format_exc()},
                "source": "error",
                "method": "exception_handler"
            }
    
    def get_job_status(self, job_id: str) -> Optional[Dict]:
        """Get status of a running job"""
        return self.active_jobs.get(job_id)
    
    def is_available(self) -> bool:
        """Check if scraper is available"""
        return self.scraper_available

# Global scraper service instance
scraper_service = ScraperService()

