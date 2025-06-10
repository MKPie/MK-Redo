from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from sqlalchemy.sql import func
from ..database.database import Base

class ScrapingJob(Base):
    __tablename__ = "scraping_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False)
    status = Column(String, default="pending")
    selector = Column(Text)
    result_data = Column(JSON)
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
