from pydantic import BaseModel, HttpUrl
from datetime import datetime
from typing import Optional, Dict, Any

class ScrapingJobBase(BaseModel):
    url: HttpUrl
    selector: Optional[str] = None

class ScrapingJobCreate(ScrapingJobBase):
    pass

class ScrapingJob(ScrapingJobBase):
    id: int
    status: str
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
