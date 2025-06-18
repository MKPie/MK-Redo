# Enhanced endpoints with real functionality
import os
from datetime import datetime, timedelta

# Track file changes
file_change_cache = {}

@app.get("/files/changes")
async def get_file_changes():
    """Return files created/modified in last 5 minutes"""
    changes = []
    
    # Check backend and frontend directories
    for root_dir in ["./backend", "./frontend"]:
        if os.path.exists(root_dir):
            for root, dirs, files in os.walk(root_dir):
                for file in files:
                    if file.endswith(('.py', '.js', '.html', '.css')):
                        filepath = os.path.join(root, file)
                        try:
                            mtime = os.path.getmtime(filepath)
                            if datetime.fromtimestamp(mtime) > datetime.now() - timedelta(minutes=5):
                                relative_path = os.path.relpath(filepath, ".")
                                if relative_path not in file_change_cache or file_change_cache[relative_path] < mtime:
                                    file_change_cache[relative_path] = mtime
                                    changes.append({
                                        "path": relative_path,
                                        "type": "created" if relative_path not in file_change_cache else "modified",
                                        "timestamp": datetime.fromtimestamp(mtime).isoformat()
                                    })
                        except:
                            pass
    
    return {"changes": changes, "timestamp": datetime.now().isoformat()}

@app.get("/github/files")  
async def get_github_files():
    """Return actual files in project"""
    files = []
    
    for root, dirs, filenames in os.walk("."):
        # Skip hidden and cache directories
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != '__pycache__']
        
        for filename in filenames:
            if not filename.startswith('.') and filename.endswith(('.py', '.html', '.js', '.css', '.yml', '.txt', '.md')):
                filepath = os.path.join(root, filename)
                try:
                    size = os.path.getsize(filepath)
                    files.append({
                        "path": os.path.relpath(filepath, "."),
                        "size": size,
                        "status": "created"
                    })
                except:
                    pass
    
    return {
        "files": files,
        "repo": "MKPie/MK-Redo",
        "branch": "main",
        "total": len(files)
    }

@app.get("/progress")
async def get_progress():
    """Calculate actual progress based on jobs and files"""
    total_tasks = 64
    
    # Count completed tasks based on:
    # 1. Number of Python files created
    # 2. Number of successful jobs
    # 3. Number of HTML files
    
    file_count = len([f for f in os.listdir(".") if f.endswith(('.py', '.html', '.js'))])
    job_count = len([j for j in jobs_db if j.get("status") == "completed"])
    
    # Rough calculation
    completed_tasks = min(total_tasks, file_count + (job_count * 5))
    
    return {
        "overall": int((completed_tasks / total_tasks) * 100),
        "completed": completed_tasks,
        "total": total_tasks,
        "phase": 1,
        "files_created": file_count,
        "jobs_completed": job_count,
        "updated_at": datetime.now().isoformat()
    }
