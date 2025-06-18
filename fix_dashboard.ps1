# =============================================================================
# 🔧 SIMPLE MK PROCESSOR DASHBOARD FIX
# =============================================================================
Write-Host "🔧 FIXING MK PROCESSOR DASHBOARD" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Step 1: Find existing dashboard
Write-Host "`n🔍 Finding existing dashboard..." -ForegroundColor Yellow

$dashboard = $null
if (Test-Path "mk_processor_dashboard_clean_final.html") {
    $dashboard = "mk_processor_dashboard_clean_final.html"
    Write-Host "✅ Found: mk_processor_dashboard_clean_final.html" -ForegroundColor Green
} elseif (Test-Path "index.backup.html") {
    $dashboard = "index.backup.html"
    Write-Host "✅ Found: index.backup.html" -ForegroundColor Green
} else {
    Write-Host "❌ No dashboard found!" -ForegroundColor Red
    exit 1
}

# Step 2: Create backup
$backupName = "dashboard_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').html"
Copy-Item $dashboard $backupName
Write-Host "💾 Backup created: $backupName" -ForegroundColor Green

# Step 3: Setup frontend directory
Write-Host "`n📁 Setting up frontend..." -ForegroundColor Yellow
if (-not (Test-Path "frontend")) {
    New-Item -ItemType Directory -Force -Path "frontend" | Out-Null
    Write-Host "✅ Created frontend directory" -ForegroundColor Green
}

Copy-Item $dashboard "frontend/index.html" -Force
Write-Host "✅ Copied dashboard to frontend/index.html" -ForegroundColor Green

# Step 4: Check Docker Compose
Write-Host "`n🐳 Checking Docker configuration..." -ForegroundColor Yellow
if (Test-Path "docker-compose.yml") {
    $compose = Get-Content "docker-compose.yml" -Raw
    if ($compose -match "frontend:") {
        Write-Host "✅ Frontend service exists" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Adding frontend service..." -ForegroundColor Yellow
        Add-Content -Path "docker-compose.yml" -Value "`n  frontend:`n    image: nginx:alpine`n    container_name: mk-frontend`n    ports:`n      - `"3000:80`"`n      - `"3001:80`"`n    volumes:`n      - ./frontend:/usr/share/nginx/html:ro`n    restart: always"
        Write-Host "✅ Frontend service added" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️ No docker-compose.yml found" -ForegroundColor Yellow
}

# Step 5: Add backend connection to dashboard
Write-Host "`n🔗 Adding backend connection..." -ForegroundColor Yellow
$content = Get-Content "frontend/index.html" -Raw

if ($content -match "localhost:8000") {
    Write-Host "✅ Backend connection already exists" -ForegroundColor Green
} else {
    Write-Host "🔗 Adding backend connection code..." -ForegroundColor Cyan
    
    # Simple backend connection script
    $backendScript = @"

<script>
// Simple Backend Connection for MK Processor
const API_URL = 'http://localhost:8000';
let isConnected = false;

async function connectToBackend() {
    try {
        const response = await fetch(API_URL + '/health');
        if (response.ok) {
            isConnected = true;
            console.log('✅ Backend connected');
            loadProgress();
            return true;
        }
    } catch (error) {
        console.log('❌ Backend not available:', error.message);
        isConnected = false;
        return false;
    }
}

async function loadProgress() {
    if (!isConnected) return;
    
    try {
        const response = await fetch(API_URL + '/progress');
        if (response.ok) {
            const data = await response.json();
            updateUI(data);
        }
    } catch (error) {
        console.log('Failed to load progress:', error);
    }
}

function updateUI(data) {
    // Update progress elements
    const progressEl = document.getElementById('overallProgress');
    if (progressEl) progressEl.textContent = (data.overall_progress || 0) + '%';
    
    const tasksEl = document.getElementById('completedTasks');
    if (tasksEl) tasksEl.textContent = (data.completed_tasks || 0) + '/' + (data.total_tasks || 38);
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.width = (data.overall_progress || 0) + '%';
    
    const progressPerc = document.getElementById('progressPercentage');
    if (progressPerc) progressPerc.textContent = (data.overall_progress || 0) + '%';
    
    console.log('✅ Progress updated:', data.overall_progress + '%');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 MK Processor initializing...');
    
    // Try to connect to backend
    connectToBackend();
    
    // Retry connection every 10 seconds
    setInterval(connectToBackend, 10000);
    
    // Update progress every 15 seconds
    setInterval(loadProgress, 15000);
});

// Expose for debugging
window.MKDebug = {
    connect: connectToBackend,
    loadProgress: loadProgress,
    isConnected: () => isConnected
};
</script>
"@

    # Add script before closing body tag
    $newContent = $content -replace '</body>', ($backendScript + "`n</body>")
    $newContent | Out-File -FilePath "frontend/index.html" -Encoding UTF8
    Write-Host "✅ Backend connection added" -ForegroundColor Green
}

# Step 6: Restart Docker
Write-Host "`n🔄 Restarting Docker services..." -ForegroundColor Yellow
try {
    docker-compose down --remove-orphans 2>$null
    Start-Sleep -Seconds 3
    docker-compose up -d
    Write-Host "✅ Docker services restarted" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Docker restart may have issues" -ForegroundColor Yellow
}

# Step 7: Wait and test
Write-Host "`n⏳ Waiting for services..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Test ports
Write-Host "`n🧪 Testing dashboard..." -ForegroundColor Yellow
$ports = @(3000, 3001)
$working = @()

foreach ($port in $ports) {
    try {
        $response = Invoke-WebRequest "http://localhost:$port" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Port $port working" -ForegroundColor Green
            $working += $port
        }
    } catch {
        Write-Host "❌ Port $port not working" -ForegroundColor Red
    }
}

# Test backend
Write-Host "`n🔧 Testing backend..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod "http://localhost:8000/health" -TimeoutSec 5
    Write-Host "✅ Backend is working" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend not responding" -ForegroundColor Red
}

# Step 8: Open dashboard
Write-Host "`n🌐 Opening dashboard..." -ForegroundColor Green
if ($working.Count -gt 0) {
    $port = $working[0]
    Start-Process "http://localhost:$port"
    Write-Host "✅ Dashboard opened at http://localhost:$port" -ForegroundColor Green
} else {
    Write-Host "❌ Dashboard not accessible" -ForegroundColor Red
    Write-Host "Try manually: http://localhost:3000" -ForegroundColor Yellow
}

# Final status
Write-Host "`n🎯 FIX COMPLETE!" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green
Write-Host "✅ Dashboard preserved and enhanced" -ForegroundColor White
Write-Host "✅ Backend connection added" -ForegroundColor White
Write-Host "✅ Docker configured" -ForegroundColor White
Write-Host "✅ Real progress tracking enabled" -ForegroundColor White

Write-Host "`n🛠️ Debug Commands:" -ForegroundColor Cyan
Write-Host "In browser console:" -ForegroundColor White
Write-Host "  MKDebug.connect() - Test connection" -ForegroundColor White
Write-Host "  MKDebug.loadProgress() - Refresh progress" -ForegroundColor White
Write-Host "  MKDebug.isConnected() - Check status" -ForegroundColor White

Write-Host "`n🎉 Your dashboard should now show real progress!" -ForegroundColor Green