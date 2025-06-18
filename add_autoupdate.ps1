# Read the dashboard
$content = Get-Content -Path "./original_dashboard.html" -Raw -Encoding UTF8

# Auto-update code to insert
$autoUpdateCode = @"

<!-- Auto-Update System for MK Processor -->
<script>
// Auto-update configuration
const AUTO_UPDATE_CONFIG = {
    enabled: true,
    interval: 5000, // 5 seconds
    maxRetries: 3,
    retryDelay: 2000
};

let autoUpdateTimer = null;
let updateRetries = 0;

async function autoUpdateDashboard() {
    if (!AUTO_UPDATE_CONFIG.enabled) return;
    
    try {
        // Update jobs table
        const jobsResponse = await fetch('http://localhost:8000/jobs');
        if (jobsResponse.ok) {
            const jobs = await jobsResponse.json();
            updateJobsTable(jobs);
        }
        
        updateRetries = 0;
    } catch (error) {
        console.error('Auto-update error:', error);
        updateRetries++;
        
        if (updateRetries >= AUTO_UPDATE_CONFIG.maxRetries) {
            console.warn('Max retries reached, stopping auto-update');
            stopAutoUpdate();
        }
    }
}

function updateJobsTable(jobs) {
    const tbody = document.querySelector('#jobsTable tbody, table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = jobs.map(job => {
        const statusClass = 'status-' + job.status;
        return `
            <tr>
                <td>${job.id}</td>
                <td>${job.scraper_name || 'Katom Scraper'}</td>
                <td><span class="badge bg-${job.status === 'completed' ? 'success' : job.status === 'running' ? 'primary' : 'warning'}">${job.status}</span></td>
                <td>
                    <div class="progress">
                        <div class="progress-bar" style="width: ${job.progress}%">${job.progress}%</div>
                    </div>
                </td>
                <td>${new Date(job.created_at).toLocaleString()}</td>
            </tr>
        `;
    }).join('');
    
    // Update last update time
    const timestamp = document.querySelector('#lastUpdate, .last-update');
    if (timestamp) {
        timestamp.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
    }
}

function startAutoUpdate() {
    if (autoUpdateTimer) return;
    
    AUTO_UPDATE_CONFIG.enabled = true;
    autoUpdateTimer = setInterval(autoUpdateDashboard, AUTO_UPDATE_CONFIG.interval);
    updateAutoUpdateButton(true);
    console.log('Auto-update started');
}

function stopAutoUpdate() {
    AUTO_UPDATE_CONFIG.enabled = false;
    
    if (autoUpdateTimer) {
        clearInterval(autoUpdateTimer);
        autoUpdateTimer = null;
    }
    
    updateAutoUpdateButton(false);
    console.log('Auto-update stopped');
}

function toggleAutoUpdate() {
    if (AUTO_UPDATE_CONFIG.enabled) {
        stopAutoUpdate();
    } else {
        startAutoUpdate();
    }
}

function updateAutoUpdateButton(isActive) {
    const btn = document.querySelector('#autoUpdateToggle');
    if (btn) {
        btn.className = isActive ? 'btn btn-success btn-sm' : 'btn btn-outline-secondary btn-sm';
        btn.textContent = isActive ? 'Auto-update: ON' : 'Auto-update: OFF';
    }
}

// Add auto-update button on load
document.addEventListener('DOMContentLoaded', function() {
    // Find a suitable place for the button
    const navbar = document.querySelector('.navbar, nav, .header, .container h1');
    if (navbar) {
        const btn = document.createElement('button');
        btn.id = 'autoUpdateToggle';
        btn.className = 'btn btn-outline-secondary btn-sm';
        btn.style.float = 'right';
        btn.style.marginTop = '10px';
        btn.textContent = 'Auto-update: OFF';
        btn.onclick = toggleAutoUpdate;
        
        if (navbar.tagName === 'H1') {
            navbar.parentElement.insertBefore(btn, navbar.nextSibling);
        } else {
            navbar.appendChild(btn);
        }
    }
    
    // Start auto-update after 2 seconds
    setTimeout(startAutoUpdate, 2000);
});
</script>
"@

# Insert before </body>
$updatedContent = $content -replace '</body>', "$autoUpdateCode`n</body>"

# Save the updated file
$updatedContent | Out-File -FilePath "dashboard_with_autoupdate.html" -Encoding UTF8

Write-Host "Dashboard updated with auto-update system!" -ForegroundColor Green
