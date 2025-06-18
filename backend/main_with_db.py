# backend/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import asyncpg
from datetime import datetime
import json
import os
from typing import List

# Import jobs router
from jobs import router as jobs_router, active_connections

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mkuser:mkpass@postgres:5432/mkprocessor")
db_pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL)
    
    # Initialize database tables
    async with db_pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS scraping_jobs (
                id UUID PRIMARY KEY,
                name TEXT,
                models JSONB,
                prefix TEXT,
                status TEXT,
                progress INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                results JSONB,
                error TEXT
            );
            
            CREATE TABLE IF NOT EXISTS scraping_results (
                id SERIAL PRIMARY KEY,
                job_id UUID REFERENCES scraping_jobs(id),
                model TEXT,
                data JSONB,
                scraped_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_jobs_status ON scraping_jobs(status);
            CREATE INDEX IF NOT EXISTS idx_results_job_id ON scraping_results(job_id);
        """)
    
    yield
    
    # Shutdown
    await db_pool.close()

app = FastAPI(
    title="MK Processor Backend",
    version="4.2.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:80"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(jobs_router)

@app.get("/")
async def root():
    return {
        "message": "MK Processor Backend Running",
        "version": "4.2.0",
        "endpoints": {
            "jobs": "/api/jobs",
            "websocket": "/ws",
            "health": "/health",
            "stats": "/api/stats"
        }
    }

@app.get("/health")
async def health_check():
    try:
        async with db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        db_status = "healthy"
    except:
        db_status = "unhealthy"
    
    return {
        "status": "running",
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/stats")
async def get_stats():
    """Get system statistics"""
    async with db_pool.acquire() as conn:
        total_jobs = await conn.fetchval("SELECT COUNT(*) FROM scraping_jobs")
        running_jobs = await conn.fetchval("SELECT COUNT(*) FROM scraping_jobs WHERE status = 'running'")
        completed_jobs = await conn.fetchval("SELECT COUNT(*) FROM scraping_jobs WHERE status = 'completed'")
        total_results = await conn.fetchval("SELECT COUNT(*) FROM scraping_results")
    
    return {
        "total_jobs": total_jobs or 0,
        "running_jobs": running_jobs or 0,
        "completed_jobs": completed_jobs or 0,
        "total_results": total_results or 0,
        "active_connections": len(active_connections)
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        # Send initial connection message
        await websocket.send_json({
            "type": "connection",
            "message": "Connected to MK Processor",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Keep connection alive
        while True:
            # Wait for messages from client
            data = await websocket.receive_text()
            
            # Echo back (or handle commands)
            if data == "ping":
                await websocket.send_json({"type": "pong"})
            else:
                # Broadcast to all connections
                for conn in active_connections:
                    if conn != websocket:
                        await conn.send_text(data)
                        
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print(f"Client disconnected. Active connections: {len(active_connections)}")

# GitHub webhook endpoint
@app.post("/api/github/webhook")
async def github_webhook(payload: dict):
    """Handle GitHub webhooks for progress tracking"""
    if payload.get("ref") == "refs/heads/main":
        # Update progress based on commits
        commits = payload.get("commits", [])
        for commit in commits:
            files = commit.get("added", []) + commit.get("modified", [])
            
            # Broadcast update to all connections
            for conn in active_connections:
                await conn.send_json({
                    "type": "github_update",
                    "files": files,
                    "message": commit.get("message", ""),
                    "timestamp": datetime.utcnow().isoformat()
                })
    
    return {"status": "received"}