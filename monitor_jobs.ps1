param([int]$RefreshSeconds = 3)

Write-Host "📊 MK PROCESSOR JOB MONITOR" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to exit`n" -ForegroundColor Gray

while ($true) {
    Clear-Host
    Write-Host "📊 MK PROCESSOR JOB MONITOR" -ForegroundColor Cyan
    Write-Host "Time: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Yellow
    Write-Host "="*50
    
    try {
        $jobs = Invoke-RestMethod -Uri "http://localhost:8000/jobs" -ErrorAction Stop
        
        # Summary
        $running = @($jobs | Where-Object { $_.status -eq "running" }).Count
        $completed = @($jobs | Where-Object { $_.status -eq "completed" }).Count
        $pending = @($jobs | Where-Object { $_.status -eq "pending" }).Count
        $failed = @($jobs | Where-Object { $_.status -eq "failed" }).Count
        
        Write-Host "`nSUMMARY:" -ForegroundColor Green
        Write-Host "Total Jobs: $($jobs.Count)"
        Write-Host "Running: $running | Completed: $completed | Pending: $pending | Failed: $failed"
        
        # Job details
        Write-Host "`nJOBS:" -ForegroundColor Green
        foreach ($job in $jobs | Select-Object -First 10) {
            $statusColor = switch ($job.status) {
                "running" { "Cyan" }
                "completed" { "Green" }
                "failed" { "Red" }
                default { "Yellow" }
            }
            
            Write-Host "`n[$($job.status.ToUpper())]" -ForegroundColor $statusColor -NoNewline
            Write-Host " $($job.name) ($(($job.models).Count) models)"
            Write-Host "  ID: $($job.id)"
            Write-Host "  Progress: $($job.progress)%"
            if ($job.error) {
                Write-Host "  Error: $($job.error)" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "Error fetching jobs: $_" -ForegroundColor Red
    }
    
    Write-Host "`n="*50
    Write-Host "Refreshing in $RefreshSeconds seconds..." -ForegroundColor Gray
    Start-Sleep -Seconds $RefreshSeconds
}
