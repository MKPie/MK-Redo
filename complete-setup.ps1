# MK PROCESSOR 4.2.0 - MASTER SETUP SCRIPT
# This script creates ALL files and launches everything!

Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║                  MK PROCESSOR 4.2.0                          ║
║         ULTIMATE PROJECT SETUP & LAUNCH SCRIPT               ║
╚══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host "`n🚀 Starting complete project setup..." -ForegroundColor Yellow

# 1. Save the three scripts from artifacts
Write-Host "`n📝 Step 1: Creating setup scripts..." -ForegroundColor Cyan

# Save backend script
$backendScript = @'
# PASTE THE ENTIRE CONTENT FROM "Create Backend Files Script" ARTIFACT HERE
'@

# Save frontend script  
$frontendScript = @'
# PASTE THE ENTIRE CONTENT FROM "Create Frontend Files Script" ARTIFACT HERE
'@

# Save launch script
$launchScript = @'
# PASTE THE ENTIRE CONTENT FROM "MK Processor - PowerShell Launch Script" ARTIFACT HERE
'@

# Create scripts directory
New-Item -ItemType Directory -Path "scripts" -Force | Out-Null

# Save scripts
$backendScript | Out-File -FilePath "scripts/create-backend.ps1" -Encoding UTF8
$frontendScript | Out-File -FilePath "scripts/create-frontend.ps1" -Encoding UTF8
$launchScript | Out-File -FilePath "launch.ps1" -Encoding UTF8

Write-Host "✅ Scripts created" -ForegroundColor Green

# 2. Create additional configuration files
Write-Host "`n📝 Step 2: Creating configuration files..." -ForegroundColor Cyan

# Create alembic.ini for database migrations
$alembicIni = @'
[alembic]
script_location = backend/alembic
prepend_sys_path = .
sqlalchemy.url = postgresql://mkprocessor:password@localhost:5432/mkprocessor

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
'@
$alembicIni | Out-File -FilePath "alembic.ini" -Encoding UTF8
Write-Host "✅ alembic.ini" -ForegroundColor Green

# Create pytest.ini
$pytestIni = @'
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short
'@
$pytestIni | Out-File -FilePath "pytest.ini" -Encoding UTF8
Write-Host "✅ pytest.ini" -ForegroundColor Green

# Create .dockerignore
$dockerIgnore = @'
__pycache__
*.pyc
*.pyo
*.pyd
.Python
*.so
*.egg
*.egg-info
dist
build
.git
.gitignore
.vscode
.idea
.pytest_cache
.env
.env.*
.venv
env/
venv/
node_modules/
npm-debug.log
yarn-error.log
.DS_Store
*.log
'@
$dockerIgnore | Out-File -FilePath ".dockerignore" -Encoding UTF8
Write-Host "✅ .dockerignore" -ForegroundColor Green

# Create GitHub Actions workflow
New-Item -ItemType Directory -Path ".github/workflows" -Force | Out-Null
$githubWorkflow = @'
name: MK Processor CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: mkprocessor
          POSTGRES_PASSWORD: password
          POSTGRES_DB: mkprocessor_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r backend/requirements/requirements.txt
        pip install pytest pytest-cov
    
    - name: Run tests
      env:
        DATABASE_URL: postgresql://mkprocessor:password@localhost:5432/mkprocessor_test
      run: |
        pytest tests/ -v --cov=backend

  build:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker images
      run: |
        docker-compose build
    
    - name: Log in to Docker Hub
      if: github.event_name == 'push' && github.ref == 'refs/heads/main'
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Push Docker images
      if: github.event_name == 'push' && github.ref == 'refs/heads/main'
      run: |
        docker-compose push
'@
$githubWorkflow | Out-File -FilePath ".github/workflows/main.yml" -Encoding UTF8
Write-Host "✅ GitHub Actions workflow" -ForegroundColor Green

# 3. Create test files
Write-Host "`n📝 Step 3: Creating test structure..." -ForegroundColor Cyan

$testInit = ""
$testInit | Out-File -FilePath "tests/__init__.py" -Encoding UTF8
$testInit | Out-File -FilePath "tests/unit/__init__.py" -Encoding UTF8
$testInit | Out-File -FilePath "tests/integration/__init__.py" -Encoding UTF8

$basicTest = @'
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "MK Processor" in response.json()["message"]

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
'@
$basicTest | Out-File -FilePath "tests/unit/test_main.py" -Encoding UTF8
Write-Host "✅ Test files created" -ForegroundColor Green

# 4. Run the backend creation script
Write-Host "`n🔧 Step 4: Creating backend files..." -ForegroundColor Cyan
Write-Host "⚠️  IMPORTANT: Copy the ENTIRE content from the 'Create Backend Files Script' artifact" -ForegroundColor Yellow
Write-Host "    and replace the placeholder in scripts/create-backend.ps1" -ForegroundColor Yellow
Write-Host "    Then run: .\scripts\create-backend.ps1" -ForegroundColor White

# 5. Run the frontend creation script
Write-Host "`n🎨 Step 5: Creating frontend files..." -ForegroundColor Cyan
Write-Host "⚠️  IMPORTANT: Copy the ENTIRE content from the 'Create Frontend Files Script' artifact" -ForegroundColor Yellow
Write-Host "    and replace the placeholder in scripts/create-frontend.ps1" -ForegroundColor Yellow
Write-Host "    Then run: .\scripts\create-frontend.ps1" -ForegroundColor White

# 6. Final setup
Write-Host "`n🏁 Step 6: Final setup..." -ForegroundColor Cyan

# Create .env file from template if it doesn't exist
if (!(Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Created .env from template" -ForegroundColor Green
    }
}

# Create data directories
$dataDirs = @("data", "logs", "uploads", "exports")
foreach ($dir in $dataDirs) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}
Write-Host "✅ Created data directories" -ForegroundColor Green

Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "              SETUP COMPLETE! NEXT STEPS:" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`n1️⃣  Copy script contents from artifacts:" -ForegroundColor Yellow
Write-Host "    - Copy 'Create Backend Files Script' → scripts/create-backend.ps1" -ForegroundColor White
Write-Host "    - Copy 'Create Frontend Files Script' → scripts/create-frontend.ps1" -ForegroundColor White
Write-Host "    - Copy 'PowerShell Launch Script' → launch.ps1" -ForegroundColor White

Write-Host "`n2️⃣  Run the scripts in order:" -ForegroundColor Yellow
Write-Host "    .\scripts\create-backend.ps1" -ForegroundColor White
Write-Host "    .\scripts\create-frontend.ps1" -ForegroundColor White

Write-Host "`n3️⃣  Launch the application:" -ForegroundColor Yellow
Write-Host "    .\launch.ps1" -ForegroundColor White

Write-Host "`n4️⃣  Access your services:" -ForegroundColor Yellow
Write-Host "    Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "    Dashboard: http://localhost:3000/dashboard.html" -ForegroundColor White
Write-Host "    API Docs:  http://localhost:8000/docs" -ForegroundColor White

Write-Host "`n5️⃣  Configure integrations in dashboard:" -ForegroundColor Yellow
Write-Host "    - Connect GitHub repository" -ForegroundColor White
Write-Host "    - Connect HubSpot (optional)" -ForegroundColor White
Write-Host "    - Add AI API keys in .env file" -ForegroundColor White

Write-Host "`n✨ You're ready to build something amazing! ✨" -ForegroundColor Magenta
Write-Host ""
