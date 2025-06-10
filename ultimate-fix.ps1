# MK PROCESSOR - ULTIMATE FIX SCRIPT WITH VERIFICATION
# This script fixes all issues and verifies everything works

param(
    [switch]$SkipBackup = $false,
    [switch]$ForceRebuild = $false,
    [switch]$MonitorOnly = $false
)

Write-Host @"
============================================================
     MK PROCESSOR - ULTIMATE FIX & VERIFICATION            
     Fixing all issues and ensuring everything works!      
============================================================
"@ -ForegroundColor Cyan

# Set working directory
$projectPath = "C:\Users\17736\Documents\MK_5\MK-Redo"
Set-Location $projectPath
Write-Host "[INFO] Working in: $projectPath" -ForegroundColor Yellow

# Function to create backup
function Backup-File {
    param($FilePath)
    if (Test-Path $FilePath) {
        $backupPath = "$FilePath.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Copy-Item $FilePath $backupPath
        Write-Host "[BACKUP] Created backup: $backupPath" -ForegroundColor Gray
        return $backupPath
    }
    return $null
}

# Function to verify JSON
function Test-JsonFile {
    param($FilePath)
    try {
        $content = Get-Content $FilePath -Raw
        $null = $content | ConvertFrom-Json
        return $true
    } catch {
        return $false
    }
}

# Function to check if file has BOM
function Test-FileHasBOM {
    param($FilePath)
    $bytes = [System.IO.File]::ReadAllBytes($FilePath)
    if ($bytes.Length -ge 3) {
        return ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    }
    return $false
}

if (-not $MonitorOnly) {
    # PHASE 1: BACKUP
    if (-not $SkipBackup) {
        Write-Host "`n[PHASE 1] Creating backups..." -ForegroundColor Cyan
        $backups = @{
            "package.json" = Backup-File "frontend\package.json"
            "requirements.txt" = Backup-File "backend\requirements\requirements.txt"
        }
    }

    # PHASE 2: FIX FRONTEND PACKAGE.JSON
    Write-Host "`n[PHASE 2] Fixing frontend package.json..." -ForegroundColor Cyan

    # Check current state
    $packageJsonPath = "frontend\package.json"
    $hasBOM = Test-FileHasBOM $packageJsonPath
    $isValidJson = Test-JsonFile $packageJsonPath

    Write-Host "[CHECK] Has BOM: $hasBOM" -ForegroundColor $(if ($hasBOM) { "Red" } else { "Green" })
    Write-Host "[CHECK] Valid JSON: $isValidJson" -ForegroundColor $(if ($isValidJson) { "Green" } else { "Red" })

    # Create clean package.json
    $cleanPackageJson = @{
        name = "mk-processor-frontend"
        version = "4.2.0"
        private = $true
        dependencies = @{
            "react" = "^18.2.0"
            "react-dom" = "^18.2.0"
            "react-scripts" = "5.0.1"
            "web-vitals" = "^3.5.0"
        }
        scripts = @{
            start = "react-scripts start"
            build = "react-scripts build"
            test = "react-scripts test"
            eject = "react-scripts eject"
        }
        eslintConfig = @{
            extends = @("react-app")
        }
        browserslist = @{
            production = @(">0.2%", "not dead", "not op_mini all")
            development = @("last 1 chrome version", "last 1 firefox version", "last 1 safari version")
        }
    }

    # Convert to JSON with proper formatting
    $jsonContent = $cleanPackageJson | ConvertTo-Json -Depth 10

    # Save without BOM
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText("$PWD\$packageJsonPath", $jsonContent, $utf8NoBom)

    # Verify fix
    $fixedHasBOM = Test-FileHasBOM $packageJsonPath
    $fixedIsValidJson = Test-JsonFile $packageJsonPath

    Write-Host "[FIXED] Has BOM: $fixedHasBOM" -ForegroundColor $(if (-not $fixedHasBOM) { "Green" } else { "Red" })
    Write-Host "[FIXED] Valid JSON: $fixedIsValidJson" -ForegroundColor $(if ($fixedIsValidJson) { "Green" } else { "Red" })

    if ($fixedIsValidJson -and -not $fixedHasBOM) {
        Write-Host "[OK] package.json fixed successfully!" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] package.json fix failed!" -ForegroundColor Red
    }

    # PHASE 3: FIX BACKEND REQUIREMENTS
    Write-Host "`n[PHASE 3] Fixing backend requirements..." -ForegroundColor Cyan

    $requirementsContent = @"
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic[email]==2.5.0
pydantic-settings==2.1.0
sqlalchemy==2.0.23
alembic==1.12.1
redis==5.0.1
psycopg2-binary==2.9.9
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
httpx==0.25.2
beautifulsoup4==4.12.2
python-dotenv==1.0.0
email-validator==2.1.0
"@

    $requirementsContent | Out-File -FilePath "backend\requirements\requirements.txt" -Encoding UTF8 -NoNewline
    Write-Host "[OK] Updated requirements.txt with email-validator" -ForegroundColor Green

    # PHASE 4: DOCKER OPERATIONS
    Write-Host "`n[PHASE 4] Docker operations..." -ForegroundColor Cyan

    # Stop existing containers
    Write-Host "[STOP] Stopping all containers..." -ForegroundColor Yellow
    docker-compose down -v

    # Clean up
    Write-Host "[CLEAN] Removing old images..." -ForegroundColor Yellow
    docker system prune -f

    # Rebuild
    if ($ForceRebuild) {
        Write-Host "[BUILD] Force rebuilding all images..." -ForegroundColor Yellow
        docker-compose build --no-cache --pull
    } else {
        Write-Host "[BUILD] Building images..." -ForegroundColor Yellow
        docker-compose build
    }

    # Start services
    Write-Host "[START] Starting services..." -ForegroundColor Yellow
    docker-compose up -d
}

# PHASE 5: MONITORING AND VERIFICATION
Write-Host "`n[PHASE 5] Monitoring and verification..." -ForegroundColor Cyan

$startTime = Get-Date
$timeout = 120  # 2 minutes timeout
$checkInterval = 3
$allHealthy = $false

Write-Host "[MONITOR] Waiting for services to be healthy..." -ForegroundColor Yellow

while (((Get-Date) - $startTime).TotalSeconds -lt $timeout -and -not $allHealthy) {
    $elapsed = [int]((Get-Date) - $startTime).TotalSeconds
    Write-Progress -Activity "Monitoring Services" -Status "Elapsed: $elapsed seconds" -PercentComplete (($elapsed / $timeout) * 100)
    
    # Get container status
    $containers = docker ps --format "json" | ForEach-Object { $_ | ConvertFrom-Json }
    $mkContainers = $containers | Where-Object { $_.Names -like "mk-*" }
    
    # Check each container
    $statusReport = @()
    $allRunning = $true
    
    foreach ($container in @("mk-backend", "mk-frontend", "mk-postgres", "mk-redis")) {
        $found = $mkContainers | Where-Object { $_.Names -eq $container }
        
        if ($found) {
            $status = $found.Status
            if ($status -like "*Up*" -and $status -notlike "*Restarting*") {
                $statusReport += "[OK] $container : Running"
                Write-Host "[OK] $container : Running" -ForegroundColor Green
            } else {
                $statusReport += "[WAIT] $container : $status"
                Write-Host "[WAIT] $container : $status" -ForegroundColor Yellow
                $allRunning = $false
            }
        } else {
            $statusReport += "[ERROR] $container : Not found"
            Write-Host "[ERROR] $container : Not found" -ForegroundColor Red
            $allRunning = $false
        }
    }
    
    # Check backend health endpoint
    if ($allRunning) {
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 3
            if ($health.status -eq "healthy") {
                Write-Host "[OK] Backend API: Healthy" -ForegroundColor Green
                
                # Check frontend
                try {
                    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3
                    if ($frontendResponse.StatusCode -eq 200) {
                        Write-Host "[OK] Frontend: Accessible" -ForegroundColor Green
                        $allHealthy = $true
                    }
                } catch {
                    Write-Host "[WAIT] Frontend: Not ready yet" -ForegroundColor Yellow
                }
            }
        } catch {
            Write-Host "[WAIT] Backend API: Not ready yet" -ForegroundColor Yellow
        }
    }
    
    if (-not $allHealthy) {
        Start-Sleep -Seconds $checkInterval
    }
}

Write-Progress -Activity "Monitoring Services" -Completed

# PHASE 6: FINAL REPORT
Write-Host "`n[PHASE 6] Final Status Report" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ($allHealthy) {
    Write-Host "`n[SUCCESS] ALL SERVICES ARE RUNNING SUCCESSFULLY!" -ForegroundColor Green
    
    Write-Host "`n[ENDPOINTS]" -ForegroundColor Cyan
    Write-Host "  Frontend:    http://localhost:3000" -ForegroundColor Yellow
    Write-Host "  Dashboard:   http://localhost:3000/dashboard.html" -ForegroundColor Yellow
    Write-Host "  Backend API: http://localhost:8000" -ForegroundColor Yellow
    Write-Host "  API Docs:    http://localhost:8000/docs" -ForegroundColor Yellow
    
    Write-Host "`n[DATABASE]" -ForegroundColor Cyan
    Write-Host "  PostgreSQL:  localhost:5432 (user: mkprocessor, pass: password)" -ForegroundColor Gray
    Write-Host "  Redis:       localhost:6379" -ForegroundColor Gray
    
    # Open browser
    Write-Host "`n[BROWSER] Opening application..." -ForegroundColor Yellow
    Start-Process "http://localhost:3000"
    
} else {
    Write-Host "`n[ERROR] Some services failed to start properly!" -ForegroundColor Red
    
    Write-Host "`n[DIAGNOSTICS] Recent logs:" -ForegroundColor Yellow
    docker-compose logs --tail=100
    
    Write-Host "`n[TROUBLESHOOTING]" -ForegroundColor Yellow
    Write-Host "  1. Check Docker Desktop is running properly" -ForegroundColor White
    Write-Host "  2. Ensure ports 3000, 8000, 5432, 6379 are free" -ForegroundColor White
    Write-Host "  3. Try: docker-compose down -v && docker-compose up --build" -ForegroundColor White
    Write-Host "  4. Check Docker resources (Settings > Resources)" -ForegroundColor White
    
    if ($backups) {
        Write-Host "`n[ROLLBACK] To restore backups:" -ForegroundColor Yellow
        foreach ($file in $backups.Keys) {
            if ($backups[$file]) {
                Write-Host "  Copy-Item '$($backups[$file])' -Destination '$file' -Force" -ForegroundColor Gray
            }
        }
    }
}

# Keep monitoring if requested
if ($MonitorOnly -or (Read-Host "`nKeep monitoring? (Y/N)") -eq 'Y') {
    Write-Host "`n[MONITOR] Continuous monitoring active (Ctrl+C to stop)..." -ForegroundColor Cyan
    
    while ($true) {
        Clear-Host
        Write-Host "MK PROCESSOR - LIVE MONITOR | $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Cyan
        Write-Host "============================================================" -ForegroundColor Cyan
        
        # Container status
        $containers = docker ps --format "json" | ForEach-Object { $_ | ConvertFrom-Json }
        $mkContainers = $containers | Where-Object { $_.Names -like "mk-*" }
        
        Write-Host "`n[CONTAINERS]" -ForegroundColor Yellow
        foreach ($container in $mkContainers) {
            $color = if ($container.Status -like "*Up*" -and $container.Status -notlike "*Restarting*") { "Green" } else { "Red" }
            Write-Host "  $($container.Names): $($container.Status)" -ForegroundColor $color
        }
        
        # API Health
        Write-Host "`n[HEALTH CHECKS]" -ForegroundColor Yellow
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 1
            Write-Host "  Backend API: $($health.status) (v$($health.version))" -ForegroundColor Green
        } catch {
            Write-Host "  Backend API: Not responding" -ForegroundColor Red
        }
        
        try {
            $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 1
            Write-Host "  Frontend: OK (Status $($frontendResponse.StatusCode))" -ForegroundColor Green
        } catch {
            Write-Host "  Frontend: Not responding" -ForegroundColor Red
        }
        
        Write-Host "`n[LOGS] Recent activity:" -ForegroundColor Yellow
        docker-compose logs --tail=5 --no-log-prefix 2>&1 | Select-Object -Last 10 | ForEach-Object {
            Write-Host "  $_" -ForegroundColor Gray
        }
        
        Start-Sleep -Seconds 5
    }
}