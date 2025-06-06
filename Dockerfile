FROM python:3.11-slim 
 
WORKDIR /app 
 
COPY backend/requirements/requirements.txt . 
RUN pip install -r requirements.txt 
 
COPY backend/ ./backend/ 
 
EXPOSE 8000 
 
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"] 
