from fastapi import FastAPI, WebSocket, BackgroundTasks, HTTPException, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
import json
import uuid
import asyncio
import sys
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the current directory to Python path for imports
sys.path.append('/app')

# Try to import the real scraper
try:
    from scraper_wrapper import MKWebScraper  # Import from our wrapper
    logger.info("✅ Successfully imported scraper_wrapper.py")
except ImportError as e:
    logger.warning(f"⚠️ Could not import scraper_wrapper.py: {e}")
    logger.warning("Using mock scraper for testing")
    MKWebScraper = None

# Initialize FastAPI app
app = FastAPI(
    title="MK Processor Backend", 
    version="4.2.0",
    description="ULTRATHINK Scraping System"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (will be replaced with PostgreSQL later)
jobs_db = []
active_websockets = []

# Pydantic models
class JobCreate(BaseModel):
    models: List[str]
    prefix: Optional[str] = ""
    name: Optional[str] = "ULTRATHINK Scrape"

class JobResponse(BaseModel):
    id: str
    name: str
    models: List[str]
    prefix: str
    status: str
    progress: int
    created_at: str
    completed_at: Optional[str] = None
    results: Optional[Dict] = None
    error: Optional[str] = None
    total_models: int

# Root endpoint
@app.get("/")
def root():
    return {
        "message": "MK Processor Backend Running",
        "version": "4.2.0",
        "scraper_available": MKWebScraper is not None,
        "endpoints": {
            "health": "/health",
            "create_job": "POST /jobs",
            "list_jobs": "GET /jobs",
            "job_details": "GET /jobs/{job_id}",
            "download_results": "GET /jobs/{job_id}/download",
            "websocket": "WS /ws",
            "stats": "GET /api/stats"
        }
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": "in-memory",
        "jobs_count": len(jobs_db),
        "active_jobs": sum(1 for j in jobs_db if j["status"] == "running"),
        "scraper_available": MKWebScraper is not None
    }

# Create new scraping job
@app.post("/jobs", response_model=JobResponse)
async def create_job(job: JobCreate, background_tasks: BackgroundTasks):
    """Create a new scraping job"""
    job_id = f"job_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
    
    job_data = {
        "id": job_id,
        "name": job.name,
        "models": job.models,
        "prefix": job.prefix,
        "status": "pending",
        "progress": 0,
        "created_at": datetime.now().isoformat(),
        "completed_at": None,
        "results": None,
        "error": None,
        "total_models": len(job.models)
    }
    
    jobs_db.append(job_data)
    logger.info(f"📋 Created job {job_id} with {len(job.models)} models")
    
    # Start scraping in background
    background_tasks.add_task(run_scraper_job, job_id, job.models, job.prefix)
    
    return JobResponse(**job_data)

# Get all jobs
@app.get("/jobs", response_model=List[JobResponse])
async def get_jobs():
    """Get all jobs"""
    return [JobResponse(**job) for job in jobs_db]

# Get specific job
@app.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    """Get specific job details"""
    for job in jobs_db:
        if job["id"] == job_id:
            return JobResponse(**job)
    raise HTTPException(status_code=404, detail="Job not found")

# Download job results
@app.get("/jobs/{job_id}/download")
async def download_job_results(job_id: str):
    """Download job results as JSON"""
    for job in jobs_db:
        if job["id"] == job_id:
            if job["status"] != "completed":
                raise HTTPException(status_code=400, detail="Job not completed")
            
            return JSONResponse(
                content={
                    "job_id": job_id,
                    "results": job["results"],
                    "metadata": {
                        "models": job["models"],
                        "prefix": job["prefix"],
                        "created_at": job["created_at"],
                        "completed_at": job["completed_at"]
                    }
                },
                headers={
                    "Content-Disposition": f"attachment; filename=job_{job_id}_results.json"
                }
            )
    raise HTTPException(status_code=404, detail="Job not found")

# Stats endpoint (for compatibility with existing code)
@app.get("/api/stats")
def get_stats():
    jobs = jobs_db
    return {
        "total_jobs": len(jobs),
        "running_jobs": len([j for j in jobs if j["status"] == "running"]),
        "completed_jobs": len([j for j in jobs if j["status"] == "completed"]),
        "failed_jobs": len([j for j in jobs if j["status"] == "failed"]),
        "pending_jobs": len([j for j in jobs if j["status"] == "pending"]),
        "active_connections": len(active_websockets),
        "scraper_available": MKWebScraper is not None
    }

# WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time job updates"""
    await websocket.accept()
    active_websockets.append(websocket)
    logger.info(f"📡 WebSocket connected. Total connections: {len(active_websockets)}")
    
    try:
        while True:
            # Send current jobs status
            data = {
                "type": "status",
                "jobs": len(jobs_db),
                "active": sum(1 for j in jobs_db if j["status"] == "running"),
                "completed": sum(1 for j in jobs_db if j["status"] == "completed"),
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_json(data)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        active_websockets.remove(websocket)
        logger.info(f"📡 WebSocket disconnected. Total connections: {len(active_websockets)}")

# Broadcast updates to all connected websockets
async def broadcast_job_update(job_data):
    """Broadcast job updates to all connected websockets"""
    message = {
        "type": "job_update",
        "job": job_data,
        "timestamp": datetime.now().isoformat()
    }
    
    disconnected = []
    for websocket in active_websockets:
        try:
            await websocket.send_json(message)
        except:
            disconnected.append(websocket)
    
    # Remove disconnected websockets
    for ws in disconnected:
        active_websockets.remove(ws)

# Main scraping function
async def run_scraper_job(job_id: str, models: List[str], prefix: str):
    """Run the actual scraping job"""
    logger.info(f"🚀 Starting job {job_id}")
    
    # Update job status to running
    for job in jobs_db:
        if job["id"] == job_id:
            job["status"] = "running"
            await broadcast_job_update(job)
            break
    
    try:
        # Initialize results
        results = {
            "successful": [],
            "failed": [],
            "data": {}
        }
        
        # Check if we have the real scraper
        if MKWebScraper:
            logger.info(f"🔧 Using real MKWebScraper for job {job_id}")
            
            try:
                # Initialize the scraper
                scraper = MKWebScraper()
                
                for i, model in enumerate(models):
                    try:
                        # Update progress
                        progress = int((i / len(models)) * 100)
                        for job in jobs_db:
                            if job["id"] == job_id:
                                job["progress"] = progress
                                await broadcast_job_update(job)
                                break
                        
                        # Prepare model number with prefix
                        full_model = f"{prefix}{model}" if prefix else model
                        logger.info(f"🔍 Scraping model: {full_model}")
                        
                        # Call the scraper
                        # Adjust method name based on your scraper's actual method
                        scraped_data = await asyncio.to_thread(
                            scraper.scrape_katom,  # or scraper.scrape, scraper.process_model, etc.
                            full_model
                        )
                        
                        results["successful"].append(model)
                        results["data"][model] = scraped_data
                        logger.info(f"✅ Successfully scraped: {full_model}")
                        
                    except Exception as e:
                        logger.error(f"❌ Error scraping {model}: {e}")
                        results["failed"].append({
                            "model": model,
                            "error": str(e)
                        })
                        
            except Exception as e:
                logger.error(f"❌ Failed to initialize scraper: {e}")
                raise
                
        else:
            # Mock scraper for testing
            logger.warning(f"⚠️ Using mock scraper for job {job_id}")
            
            for i, model in enumerate(models):
                await asyncio.sleep(2)  # Simulate work
                
                # Update progress
                progress = int(((i + 1) / len(models)) * 100)
                for job in jobs_db:
                    if job["id"] == job_id:
                        job["progress"] = progress
                        await broadcast_job_update(job)
                        break
                
                # Mock data
                full_model = f"{prefix}{model}" if prefix else model
                results["successful"].append(model)
                results["data"][model] = {
                    "title": f"Product {full_model}",
                    "price": "$999.99",
                    "description": f"Description for {full_model}",
                    "specs": {
                        "feature1": "value1",
                        "feature2": "value2",
                        "model": full_model
                    },
                    "scraped_at": datetime.now().isoformat()
                }
                logger.info(f"🎭 Mock scraped: {full_model}")
        
        # Mark job as completed
        for job in jobs_db:
            if job["id"] == job_id:
                job["status"] = "completed"
                job["progress"] = 100
                job["completed_at"] = datetime.now().isoformat()
                job["results"] = results
                await broadcast_job_update(job)
                break
        
        logger.info(f"✅ Job {job_id} completed. Success: {len(results['successful'])}, Failed: {len(results['failed'])}")
                
    except Exception as e:
        # Mark job as failed
        logger.error(f"❌ Job {job_id} failed: {e}")
        for job in jobs_db:
            if job["id"] == job_id:
                job["status"] = "failed"
                job["error"] = str(e)
                await broadcast_job_update(job)
                break

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 MK Processor Backend starting up...")
    logger.info(f"✅ Scraper available: {MKWebScraper is not None}")
    logger.info("📡 Ready to accept connections")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("👋 MK Processor Backend shutting down...")
    # Close all websocket connections
    for ws in active_websockets:
        try:
            await ws.close()
        except:
            pass