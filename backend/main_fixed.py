from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncpg
import redis.asyncio as redis
import os
from datetime import datetime
# from backend.app.api import scraping
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="MK Processor Backend")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global connections
db_pool = None
redis_client = None

@app.on_event("startup")
async def startup():
    global db_pool, redis_client
    
    logger.info("Starting up MK Processor Backend...")
    
    try:
        # Database connection
        DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mkuser:mkpass123@postgres:5432/mkprocessor")
        logger.info(f"Connecting to database: {DATABASE_URL}")
        
        db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)
        logger.info("? Connected to PostgreSQL")
        
        # Redis connection
        REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
        logger.info(f"Connecting to Redis: {REDIS_URL}")
        
        redis_client = await redis.from_url(REDIS_URL, decode_responses=True)
        await redis_client.ping()
        logger.info("? Connected to Redis")
        
        # Create initial tables
        async with db_pool.acquire() as conn:
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS project_status (
                    id SERIAL PRIMARY KEY,
                    project_name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    phase INTEGER NOT NULL,
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            ''')
            logger.info("? Database tables created")
            
    except Exception as e:
        logger.error(f"? Startup error: {str(e)}")
        logger.exception("Full traceback:")

@app.on_event("shutdown")
async def shutdown():
    if db_pool:
        await db_pool.close()
    if redis_client:
        await redis_client.close()

# app.include_router(scraping.router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "MK Processor Backend",
        "version": "4.2.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    checks = {
        "api": "healthy",
        "timestamp": datetime.now().isoformat()
    }
    
    # Check database
    try:
        if db_pool:
            async with db_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            checks["database"] = "healthy"
        else:
            checks["database"] = "unhealthy - no connection pool"
    except Exception as e:
        checks["database"] = f"unhealthy - {str(e)}"
    
    # Check Redis
    try:
        if redis_client:
            await redis_client.ping()
            checks["redis"] = "healthy"
        else:
            checks["redis"] = "unhealthy - no client"
    except Exception as e:
        checks["redis"] = f"unhealthy - {str(e)}"
    
    # Overall status
    all_healthy = all("healthy" in str(v) for k, v in checks.items() if k not in ["timestamp"])
    
    if not all_healthy:
        raise HTTPException(status_code=503, detail=checks)
    
    return checks

@app.get("/api/projects")
async def get_projects():
    """Get all projects from Phase 1"""
    projects = [
        {"id": "dev-env", "name": "Development Environment", "status": "in-progress", "progress": 25},
        {"id": "scraping", "name": "Web Scraping MVP", "status": "not-started", "progress": 0},
        {"id": "ai", "name": "AI Integration", "status": "not-started", "progress": 0},
        {"id": "frontend", "name": "Frontend Dashboard", "status": "not-started", "progress": 0}
    ]
    return {"projects": projects}



# ULTRATHINK Integration
try:
    from main_scraper import *
    print('? Main scraper loaded!')
except Exception as e:
    print(f'?? Scraper load error: {e}')

jobs_storage = []

@app.get('/jobs')
async def get_jobs():
    return jobs_storage

@app.post('/jobs')
async def create_job(job: dict):
    job['id'] = f'job_{len(jobs_storage)+1}'
    job['status'] = 'pending'
    job['created_at'] = datetime.now().isoformat()
    jobs_storage.append(job)
    return job

@app.get('/progress')
async def get_progress():
    return {'total': len(jobs_storage), 'completed': 0}

