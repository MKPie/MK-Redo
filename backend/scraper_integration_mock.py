# backend/scraper_integration_mock.py
"""
Mock scraper service for testing without actual web scraping
"""
import asyncio
import json
from datetime import datetime
from typing import List, Dict, Optional
import random
import os

class ScraperIntegrationMock:
    def __init__(self):
        self.gc = None  # Mock Google Sheets connection
        print("Mock scraper service initialized")
        
    async def scrape_model(self, model_number: str, prefix: str = "") -> Dict:
        """Mock scrape data for a single model"""
        # Simulate some processing time
        await asyncio.sleep(random.uniform(1, 3))
        
        # Generate mock data
        mock_price = f"${random.randint(100, 9999)}.{random.randint(0, 99):02d}"
        mock_availability = random.choice(["In Stock", "Out of Stock", "Limited Availability"])
        
        return {
            "model": model_number,
            "prefix": prefix,
            "search_query": f"{prefix}{model_number}".strip(),
            "timestamp": datetime.now().isoformat(),
            "status": "success",
            "data": {
                f"Mock Product - {model_number}": {
                    "price": mock_price,
                    "availability": mock_availability,
                    "source": "Mock Data Generator",
                    "description": f"This is a mock product for model {model_number}",
                    "manufacturer": "Mock Corp",
                    "rating": f"{random.randint(3, 5)}.{random.randint(0, 9)}"
                }
            },
            "items_found": 1
        }
        
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
                    await progress_callback(i, total, f"Processing {model} (mock)")
                    
                # Mock scrape the model
                result = await self.scrape_model(model, prefix)
                results.append(result)
                
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
            "timestamp": datetime.now().isoformat(),
            "note": "This is mock data for testing purposes"
        }
        
    def save_to_sheets(self, results: Dict, sheet_name: str = "ULTRATHINK_Results"):
        """Mock save to Google Sheets"""
        return {
            "success": True,
            "sheet_url": f"https://docs.google.com/spreadsheets/d/mock-{sheet_name}",
            "rows_written": len(results.get("results", [])),
            "note": "Mock Google Sheets save"
        }
        
    def export_to_excel(self, results: Dict, filename: str = "ultrathink_results.xlsx"):
        """Mock export to Excel file"""
        # Create outputs directory if it doesn't exist
        output_dir = "/app/outputs"
        os.makedirs(output_dir, exist_ok=True)
        
        # Create a mock JSON file instead of Excel for simplicity
        output_path = os.path.join(output_dir, filename.replace('.xlsx', '_mock.json'))
        
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
            
        return {
            "success": True,
            "path": output_path,
            "rows": len(results.get("results", [])),
            "note": "Mock Excel export (saved as JSON)"
        }

# Global instance
scraper_service = ScraperIntegrationMock()