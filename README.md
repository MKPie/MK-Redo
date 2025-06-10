# MK Processor 4.2.0 - AI-Powered Dual-Market Intelligence Platform

## Quick Start

1. **Prerequisites**
   - Docker Desktop installed and running
   - Git (optional, for version control)

2. **Launch Everything**
   ```bash
   docker-compose up -d
   ```

3. **Access Services**
   - Frontend: http://localhost:3000
   - Dashboard: http://localhost:3000/dashboard.html
   - API Docs: http://localhost:8000/docs
   - Backend API: http://localhost:8000

## Project Structure

```
MK-Redo/
â”œâ”€â”€ backend/               # FastAPI backend
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ api/          # API routes
â”‚   â”‚   â”œâ”€â”€ core/         # Core configuration
â”‚   â”‚   â”œâ”€â”€ database/     # Database setup
â”‚   â”‚   â”œâ”€â”€ models/       # SQLAlchemy models
â”‚   â”‚   â””â”€â”€ schemas/      # Pydantic schemas
â”‚   â””â”€â”€ requirements/     # Python dependencies
â”œâ”€â”€ frontend/             # React frontend
â”‚   â”œâ”€â”€ public/           # Static files
â”‚   â””â”€â”€ src/              # React components
â”œâ”€â”€ docker-compose.yml    # Docker orchestration
â””â”€â”€ README.md            # This file
```

## Technology Stack

- **Backend**: FastAPI, PostgreSQL, Redis
- **Frontend**: React 18
- **Infrastructure**: Docker, Docker Compose
- **AI Ready**: OpenAI, Anthropic integrations

## Environment Variables

Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your-key-here
ANTHROPIC_API_KEY=your-key-here
SECRET_KEY=your-secret-key
```

## Useful Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build

# Access database
docker exec -it mk-postgres psql -U mkprocessor

# Access Redis
docker exec -it mk-redis redis-cli
```

## Features

- Web Scraping Engine
- AI Integration Layer
- User Authentication
- Real-time Dashboard
- API Documentation
- Docker Containerization
- PostgreSQL Database
- Redis Caching

---

Built with love for the future of AI-powered commerce
