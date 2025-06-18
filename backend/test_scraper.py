import asyncio
from scraper_wrapper import scrape_models

async def test():
    models = ["TEST001", "TEST002"]
    prefix = "123"
    
    def progress_callback(progress, status):
        print(f"Progress: {progress}% - {status}")
    
    result = await scrape_models(models, prefix, progress_callback)
    print(f"Results: {result}")

asyncio.run(test())
