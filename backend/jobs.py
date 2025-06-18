# backend/jobs.py
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
import asyncio
import uuid
from enum import Enum

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

# Job Status Enum
class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

# Job Models
class JobCreate(BaseModel):
    models: List[str]
    prefix: Optional[str] = ""
    name: Optional[str] = "MK Scraping Job"
    webhook_url: Optional[str] = None

class Job(BaseModel):
    id: str
    name: str
    models: List[str]
    prefix: str
    status: JobStatus
    progress: int = 0
    total_models: int
    current_model: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    results: Optional[Dict] = None
    error: Optional[str] = None

# In-memory job storage
jobs_store: Dict[str, Job] = {}

# WebSocket connections
active_connections = []

@router.post("/", response_model=Job)
async def create_job(job_data: JobCreate, background_tasks: BackgroundTasks):
    """Create a new scraping job"""
    job_id = str(uuid.uuid4())
    
    job = Job(
        id=job_id,
        name=job_data.name,
        models=job_data.models,
        prefix=job_data.prefix,
        status=JobStatus.PENDING,
        total_models=len(job_data.models),
        created_at=datetime.utcnow()
    )
    
    jobs_store[job_id] = job
    background_tasks.add_task(run_scraping_job, job_id)
    
    return job

@router.get("/", response_model=List[Job])
async def get_all_jobs():
    """Get all jobs"""
    return list(jobs_store.values())

@router.get("/{job_id}", response_model=Job)
async def get_job(job_id: str):
    """Get specific job details"""
    if job_id not in jobs_store:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs_store[job_id]

async def run_scraping_job(job_id: str):
    """Background task to run scraping"""
    job = jobs_store[job_id]
    
    try:
        job.status = JobStatus.RUNNING
        job.started_at = datetime.utcnow()
        
        for i, model in enumerate(job.models):
            job.current_model = model
            job.progress = int((i / job.total_models) * 100)
            
            # Simulate scraping
            await asyncio.sleep(2)
        
        job.status = JobStatus.COMPLETED
        job.progress = 100
        job.completed_at = datetime.utcnow()
        
    except Exception as e:
        job.status = JobStatus.FAILED
        job.error = str(e)
