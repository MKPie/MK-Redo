from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from ...database.database import get_db
from ...schemas.scraping_job import ScrapingJob, ScrapingJobCreate
from ...models.scraping_job import ScrapingJob as ScrapingJobModel

router = APIRouter(prefix="/scraping", tags=["scraping"])

@router.post("/jobs", response_model=ScrapingJob)
def create_scraping_job(
    job: ScrapingJobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    db_job = ScrapingJobModel(url=str(job.url), selector=job.selector)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    
    # Add background task for scraping
    background_tasks.add_task(process_scraping_job, db_job.id)
    
    return db_job

@router.get("/jobs", response_model=List[ScrapingJob])
def list_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    jobs = db.query(ScrapingJobModel).offset(skip).limit(limit).all()
    return jobs

@router.get("/jobs/{job_id}", response_model=ScrapingJob)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(ScrapingJobModel).filter(ScrapingJobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

def process_scraping_job(job_id: int):
    # Simple placeholder for scraping logic
    from ...database.database import SessionLocal
    db = SessionLocal()
    try:
        job = db.query(ScrapingJobModel).filter(ScrapingJobModel.id == job_id).first()
        if job:
            job.status = "completed"
            job.result_data = {"message": "Scraping would happen here"}
            db.commit()
    finally:
        db.close()
