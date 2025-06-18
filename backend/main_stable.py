from fastapi import FastAPI, WebSocket, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import json
import uuid
import asyncio

app = FastAPI(title="MK Processor Backend", version="4.2.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
jobs_store = {}
active_connections = []

@app.get("/")
def root():
    return {"message": "MK Processor Backend Running", "version": "4.2.0"}

@app.get("/health")
def health():
    return {
        "status": "running",
        "database": "in-memory",
        "scraper": "ready",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/jobs/")
async def create_job(job_data: dict, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    
    job = {
        "id": job_id,
        "name": job_data.get("name", "MK Scraping Job"),
        "models": job_data.get("models", []),
        "prefix": job_data.get("prefix", ""),
        "status": "pending",
        "progress": 0,
        "total_models": len(job_data.get("models", [])),
        "created_at": datetime.utcnow().isoformat()
    }
    
    jobs_store[job_id] = job
    
    # Start mock scraping in background
    background_tasks.add_task(mock_scrape, job_id)
    
    return job

@app.get("/api/jobs/")
def get_jobs():
    return list(jobs_store.values())

@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    return jobs_store.get(job_id, {"error": "Job not found"})

@app.get("/api/stats")
def get_stats():
    jobs = list(jobs_store.values())
    return {
        "total_jobs": len(jobs),
        "running_jobs": len([j for j in jobs if j["status"] == "running"]),
        "completed_jobs": len([j for j in jobs if j["status"] == "completed"]),
        "active_connections": len(active_connections)
    }

async def mock_scrape(job_id: str):
    """Simple mock scraping that won't crash"""
    if job_id in jobs_store:
        job = jobs_store[job_id]
        job["status"] = "running"
        
        # Simulate progress
        for i in range(5):
            await asyncio.sleep(1)
            job["progress"] = (i + 1) * 20
        
        job["status"] = "completed"
        job["progress"] = 100
        job["completed_at"] = datetime.utcnow().isoformat()
