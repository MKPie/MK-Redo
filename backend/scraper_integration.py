# backend/scraper_integration.py
import sys
import os
import json
import asyncio
import pandas as pd
import gspread
from datetime import datetime
from typing import List, Dict, Optional
from oauth2client.service_account import ServiceAccountCredentials
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from fake_useragent import UserAgent
import traceback

class ScraperIntegration:
    def __init__(self):
        self.gc = None
        self.setup_google_auth()
        
    def setup_google_auth(self):
        """Initialize Google Sheets authentication"""
        try:
            # Update this path to your credentials
            creds_path = os.environ.get('GOOGLE_CREDS_PATH', '/app/credentials/google-creds.json')
            scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
            
            if os.path.exists(creds_path):
                creds = ServiceAccountCredentials.from_json_keyfile_name(creds_path, scope)
                self.gc = gspread.authorize(creds)
                print("Google Sheets authentication successful")
            else:
                print(f"Warning: Google credentials not found at {creds_path}")
        except Exception as e:
            print(f"Google auth error: {str(e)}")
            
    def setup_selenium_driver(self):
        """Setup headless Chrome driver for scraping"""
        options = Options()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        
        # Use fake user agent
        ua = UserAgent()
        options.add_argument(f'user-agent={ua.random}')
        
        # For Docker environment
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        driver = webdriver.Chrome(options=options)
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        return driver
        
    async def scrape_model(self, model_number: str, prefix: str = "") -> Dict:
        """Scrape data for a single model"""
        driver = None
        try:
            driver = self.setup_selenium_driver()
            
            # Build search URL
            search_query = f"{prefix}{model_number}".strip()
            url = f"https://www.google.com/search?q={search_query}"
            
            driver.get(url)
            await asyncio.sleep(2)  # Wait for page load
            
            # Extract data (simplified for example)
            results = {
                "model": model_number,
                "prefix": prefix,
                "search_query": search_query,
                "timestamp": datetime.now().isoformat(),
                "data": {}
            }
            
            # Try to find product information
            try:
                # Look for shopping results or product info
                product_elements = driver.find_elements(By.CSS_SELECTOR, "[data-docid]")
                
                for element in product_elements[:5]:  # Get first 5 results
                    try:
                        title = element.find_element(By.CSS_SELECTOR, "h3").text
                        price = element.find_element(By.CSS_SELECTOR, "[aria-label*='price']").text
                        
                        results["data"][title] = {
                            "price": price,
                            "source": "Google Shopping"
                        }
                    except:
                        continue
                        
            except Exception as e:
                print(f"Error extracting product data: {str(e)}")
                
            results["status"] = "success"
            results["items_found"] = len(results["data"])
            
            return results
            
        except Exception as e:
            print(f"Scraping error for {model_number}: {str(e)}")
            return {
                "model": model_number,
                "prefix": prefix,
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        finally:
            if driver:
                driver.quit()
                
    async def process_batch(self, models: List[str], prefix: str = "", 
                          progress_callback=None) -> Dict:
        """Process a batch of models"""
        results = []
        errors = []
        
        total = len(models)
        for i, model in enumerate(models):
            try:
                # Update progress
                if progress_callback:
                    await progress_callback(i, total, f"Processing {model}")
                    
                # Scrape the model
                result = await self.scrape_model(model, prefix)
                results.append(result)
                
                # Rate limiting
                await asyncio.sleep(2)
                
            except Exception as e:
                errors.append({
                    "model": model,
                    "error": str(e)
                })
                
        return {
            "total": total,
            "successful": len([r for r in results if r.get("status") == "success"]),
            "failed": len(errors),
            "results": results,
            "errors": errors,
            "timestamp": datetime.now().isoformat()
        }
        
    def save_to_sheets(self, results: Dict, sheet_name: str = "ULTRATHINK_Results"):
        """Save results to Google Sheets"""
        try:
            if not self.gc:
                raise Exception("Google Sheets not authenticated")
                
            # Try to open existing sheet or create new one
            try:
                sheet = self.gc.open(sheet_name)
                worksheet = sheet.sheet1
            except:
                # Create new spreadsheet
                sheet = self.gc.create(sheet_name)
                worksheet = sheet.sheet1
                
            # Prepare data for sheets
            rows = [["Timestamp", "Model", "Prefix", "Status", "Items Found", "Data"]]
            
            for result in results.get("results", []):
                row = [
                    result.get("timestamp", ""),
                    result.get("model", ""),
                    result.get("prefix", ""),
                    result.get("status", ""),
                    result.get("items_found", 0),
                    json.dumps(result.get("data", {}))
                ]
                rows.append(row)
                
            # Clear and update sheet
            worksheet.clear()
            worksheet.update(rows)
            
            return {
                "success": True,
                "sheet_url": sheet.url,
                "rows_written": len(rows) - 1
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
            
    def export_to_excel(self, results: Dict, filename: str = "ultrathink_results.xlsx"):
        """Export results to Excel file"""
        try:
            # Convert results to DataFrame
            data = []
            for result in results.get("results", []):
                base_row = {
                    "Timestamp": result.get("timestamp", ""),
                    "Model": result.get("model", ""),
                    "Prefix": result.get("prefix", ""),
                    "Status": result.get("status", ""),
                    "Items Found": result.get("items_found", 0)
                }
                
                # Add product data if available
                product_data = result.get("data", {})
                if product_data:
                    for product, details in product_data.items():
                        row = base_row.copy()
                        row["Product"] = product
                        row["Price"] = details.get("price", "")
                        row["Source"] = details.get("source", "")
                        data.append(row)
                else:
                    data.append(base_row)
                    
            df = pd.DataFrame(data)
            
            # Save to Excel
            output_path = f"/app/outputs/{filename}"
            os.makedirs("/app/outputs", exist_ok=True)
            
            with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Results', index=False)
                
                # Auto-adjust columns
                worksheet = writer.sheets['Results']
                for column in worksheet.columns:
                    max_length = 0
                    column = [cell for cell in column]
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(cell.value)
                        except:
                            pass
                    adjusted_width = min(max_length + 2, 50)
                    worksheet.column_dimensions[column[0].column_letter].width = adjusted_width
                    
            return {
                "success": True,
                "path": output_path,
                "rows": len(df)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

# Global instance
scraper_service = ScraperIntegration()