# Add these endpoints to your main.py file before @app.on_event("startup")

# File tracking endpoints
@app.get("/files/changes")
async def get_file_changes():
    """Return list of recently changed files"""
    return {
        "changes": [],
        "timestamp": datetime.now().isoformat()
    }

@app.get("/github/files")  
async def get_github_files():
    """Return files from GitHub repo"""
    return {
        "files": [
            {"path": "backend/main.py", "size": 5234, "status": "modified"},
            {"path": "frontend/public/dashboard.html", "size": 149297, "status": "created"}, 
            {"path": "frontend/public/scraper.html", "size": 3714, "status": "created"}
        ],
        "repo": "MKPie/MK-Redo",
        "branch": "main"
    }

@app.get("/progress")
async def get_progress():
    """Return overall project progress"""
    total_tasks = 64
    completed_tasks = 10
    
    return {
        "overall": int((completed_tasks / total_tasks) * 100),
        "completed": completed_tasks,
        "total": total_tasks,
        "phase": 1,
        "updated_at": datetime.now().isoformat()
    }
