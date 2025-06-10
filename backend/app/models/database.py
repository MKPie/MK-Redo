from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON, Float, Boolean, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://mkuser:mkpass123@localhost:5432/mkprocessor')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Core Models
class Job(Base):
    __tablename__ = 'jobs'
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String, unique=True, index=True)
    name = Column(String)
    type = Column(String)
    status = Column(String, default='pending')
    config = Column(JSON)
    result = Column(JSON)
    error = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)

class ScrapedData(Base):
    __tablename__ = 'scraped_data'
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id'))
    url = Column(String)
    domain = Column(String, index=True)
    raw_html = Column(Text)
    extracted_data = Column(JSON)
    metadata = Column(JSON)
    quality_score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

# Create all tables
Base.metadata.create_all(bind=engine)
