from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import List, Dict
import json
import uuid

app = FastAPI(title="MK Processor Backend", version="4.2.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (no database needed)
jobs_store = []
active_connections = []

@app.get("/")
async def root():
    return {
        "message": "MK Processor Backend Running",
        "version": "4.2.0",
        "status": "operational"
    }

@app.get("/health")
async def health():
    return {
        "status": "running",
        "database": "in-memory",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/jobs/")
async def create_job(job_data: dict):
    """Create a new job"""
    job = {
        "id": str(uuid.uuid4()),
        "name": job_data.get("name", "MK Scraping Job"),
        "models": job_data.get("models", []),
        "prefix": job_data.get("prefix", ""),
        "status": "pending",
        "progress": 0,
        "total_models": len(job_data.get("models", [])),
        "created_at": datetime.utcnow().isoformat()
    }
    jobs_store.append(job)
    
    # Notify WebSocket clients
    await notify_clients({"type": "job_created", "job": job})
    
    return job

@app.get("/api/jobs/")
async def get_jobs():
    """Get all jobs"""
    return jobs_store

@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    """Get specific job"""
    for job in jobs_store:
        if job["id"] == job_id:
            return job
    return {"error": "Job not found"}

@app.get("/api/stats")
async def get_stats():
    """Get system statistics"""
    return {
        "total_jobs": len(jobs_store),
        "running_jobs": len([j for j in jobs_store if j["status"] == "running"]),
        "completed_jobs": len([j for j in jobs_store if j["status"] == "completed"]),
        "active_connections": len(active_connections)
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        await websocket.send_json({
            "type": "connection",
            "message": "Connected to MK Processor"
        })
        
        while True:
            data = await websocket.receive_text()
            # Echo back for now
            await websocket.send_text(f"Echo: {data}")
            
    except WebSocketDisconnect:
        active_connections.remove(websocket)

async def notify_clients(message: dict):
    """Send message to all connected WebSocket clients"""
    for connection in active_connections:
        try:
            await connection.send_json(message)
        except:
            # Remove dead connections
            active_connections.remove(connection)

# Add the jobs router functionality directly
@app.post("/api/jobs/start/{job_id}")
async def start_job(job_id: str):
    """Start a job (mock implementation)"""
    for job in jobs_store:
        if job["id"] == job_id:
            job["status"] = "running"
            await notify_clients({"type": "job_update", "job": job})
            return job
    return {"error": "Job not found"}
