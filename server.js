const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 8000;

// Initialize SQLite database
const db = new sqlite3.Database(':memory:');

// Create tables for real data storage
db.serialize(() => {
  db.run(`CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  )`);
  
  db.run(`CREATE TABLE api_usage (
    id TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    response_time INTEGER,
    status_code INTEGER
  )`);
});

app.use(cors());
app.use(express.json());

// REAL scraping function using Cheerio
async function scrapePage(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    return {
      success: true,
      data: {
        title: $('title').text().trim(),
        description: $('meta[name="description"]').attr('content') || '',
        links: $('a').map((i, el) => $(el).attr('href')).get().slice(0, 10),
        headings: $('h1, h2, h3').map((i, el) => $(el).text().trim()).get().slice(0, 5),
        images: $('img').map((i, el) => $(el).attr('src')).get().slice(0, 5),
        text_content: $('p').map((i, el) => $(el).text().trim()).get().slice(0, 3).join(' ').substring(0, 500)
      },
      scraped_at: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      scraped_at: new Date().toISOString()
    };
  }
}

// Main dashboard route
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ultimate Scraper Enterprise - Working Dashboard</title>
    <style>
        :root {
            --primary: #005fb8; --success: #0e7b0e; --danger: #c13438;
            --bg: #f5f7fa; --card: #ffffff; --text: #1a1a1a; --border: #e1e5e9;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui; background: var(--bg); color: var(--text); }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { background: var(--card); padding: 24px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .card { background: var(--card); padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: 600; }
        .form-group input, .form-group select { width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; }
        .btn { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: var(--primary); color: white; }
        .btn-primary:hover { background: #004c96; transform: translateY(-1px); }
        .btn-success { background: var(--success); color: white; }
        .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
        .status-success { background: var(--success); }
        .status-pending { background: #f59e0b; }
        .status-error { background: var(--danger); }
        .job-item { padding: 16px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 12px; }
        .job-result { background: #f8fafc; padding: 12px; border-radius: 6px; margin-top: 8px; font-size: 14px; }
        .hidden { display: none; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .stat-card { background: var(--card); padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .stat-number { font-size: 32px; font-weight: 700; color: var(--primary); }
        .loading { opacity: 0.6; pointer-events: none; }
        .success-banner { background: linear-gradient(135deg, var(--success), #059669); color: white; padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-banner">
            <h2 style="margin: 0;">🎉 ULTIMATE SCRAPER ENTERPRISE - LIVE & WORKING! 🎉</h2>
            <p style="margin: 8px 0 0 0;">Real web scraping platform with database storage and live analytics</p>
        </div>
        
        <div class="header">
            <h1>🚀 Ultimate Scraper Enterprise Platform</h1>
            <p>Real Working Dashboard - Scrape Any Website with Live Data Storage</p>
        </div>
        
        <div class="stats" id="stats">
            <div class="stat-card">
                <div class="stat-number" id="total-jobs">0</div>
                <div>Total Jobs</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="successful-jobs">0</div>
                <div>Successful</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="failed-jobs">0</div>
                <div>Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="api-calls">0</div>
                <div>API Calls</div>
            </div>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>🌐 Web Scraper - LIVE</h3>
                <form id="scrapeForm">
                    <div class="form-group">
                        <label>Website URL</label>
                        <input type="url" id="url" placeholder="https://example.com" required>
                    </div>
                    <div class="form-group">
                        <label>Scraping Options</label>
                        <select id="options">
                            <option value="basic">Basic Content</option>
                            <option value="detailed">Detailed Analysis</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary">🚀 Start Scraping</button>
                </form>
                <div id="scrapeResult" class="job-result hidden"></div>
            </div>
            
            <div class="card">
                <h3>📊 Recent Jobs</h3>
                <div id="jobsList">
                    <p>No jobs yet. Start scraping to see results!</p>
                </div>
                <button class="btn btn-success" onclick="loadJobs()">🔄 Refresh Jobs</button>
            </div>
        </div>
        
        <div class="card">
            <h3>🔌 API Testing Center</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                <button class="btn btn-primary" onclick="testAPI('/health')">Test Health</button>
                <button class="btn btn-primary" onclick="testAPI('/api/status')">Test Status</button>
                <button class="btn btn-primary" onclick="testAPI('/api/jobs')">Get Jobs</button>
                <button class="btn btn-primary" onclick="testAPI('/api/stats')">Get Stats</button>
            </div>
            <div id="apiResult" class="job-result hidden"></div>
        </div>
    </div>
    
    <script>
        // REAL working JavaScript functionality
        document.getElementById('scrapeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = document.getElementById('url').value;
            const options = document.getElementById('options').value;
            const resultDiv = document.getElementById('scrapeResult');
            const form = document.getElementById('scrapeForm');
            
            form.classList.add('loading');
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = '<strong>⏳ Scraping in progress...</strong>';
            
            try {
                const response = await fetch('/api/scrape', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, options })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    resultDiv.innerHTML = \`
                        <strong>✅ Scraping Successful!</strong><br>
                        <strong>Title:</strong> \${result.data.title}<br>
                        <strong>Links Found:</strong> \${result.data.links.length}<br>
                        <strong>Headings:</strong> \${result.data.headings.length}<br>
                        <strong>Processing Time:</strong> \${result.processing_time}<br>
                        <details><summary>View Raw Data</summary><pre>\${JSON.stringify(result.data, null, 2)}</pre></details>
                    \`;
                } else {
                    resultDiv.innerHTML = \`<strong>❌ Scraping Failed:</strong> \${result.error}\`;
                }
                
                loadStats();
                loadJobs();
            } catch (error) {
                resultDiv.innerHTML = \`<strong>❌ Error:</strong> \${error.message}\`;
            }
            
            form.classList.remove('loading');
        });
        
        async function loadStats() {
            try {
                const response = await fetch('/api/stats');
                const stats = await response.json();
                document.getElementById('total-jobs').textContent = stats.total_jobs;
                document.getElementById('successful-jobs').textContent = stats.successful_jobs;
                document.getElementById('failed-jobs').textContent = stats.failed_jobs;
                document.getElementById('api-calls').textContent = stats.api_calls;
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }
        
        async function loadJobs() {
            try {
                const response = await fetch('/api/jobs');
                const jobs = await response.json();
                const jobsList = document.getElementById('jobsList');
                
                if (jobs.length === 0) {
                    jobsList.innerHTML = '<p>No jobs yet. Start scraping to see results!</p>';
                    return;
                }
                
                jobsList.innerHTML = jobs.map(job => \`
                    <div class="job-item">
                        <div><span class="status-indicator status-\${job.status}"></span>\${job.url}</div>
                        <div>Status: \${job.status} | Created: \${new Date(job.created_at).toLocaleString()}</div>
                        \${job.result ? \`<details><summary>View Result</summary><pre>\${job.result}</pre></details>\` : ''}
                    </div>
                \`).join('');
            } catch (error) {
                console.error('Failed to load jobs:', error);
            }
        }
        
        async function testAPI(endpoint) {
            const resultDiv = document.getElementById('apiResult');
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = \`<strong>Testing \${endpoint}...</strong>\`;
            
            try {
                const response = await fetch(endpoint);
                const data = await response.json();
                resultDiv.innerHTML = \`
                    <strong>✅ \${endpoint} Response:</strong><br>
                    <pre>\${JSON.stringify(data, null, 2)}</pre>
                \`;
            } catch (error) {
                resultDiv.innerHTML = \`<strong>❌ \${endpoint} Error:</strong> \${error.message}\`;
            }
        }
        
        // Load initial data
        loadStats();
        loadJobs();
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            loadStats();
            loadJobs();
        }, 30000);
    </script>
</body>
</html>
  `);
});

// REAL API endpoint - scrape any website
app.post('/api/scrape', async (req, res) => {
  const startTime = Date.now();
  const { url, options = 'basic' } = req.body;
  const jobId = uuidv4();
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  // Store job in database
  db.run('INSERT INTO jobs (id, url, status) VALUES (?, ?, ?)', [jobId, url, 'processing']);
  
  try {
    const result = await scrapePage(url);
    const processingTime = Date.now() - startTime;
    
    // Update job status
    const status = result.success ? 'completed' : 'failed';
    db.run('UPDATE jobs SET status = ?, result = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?', 
      [status, JSON.stringify(result), jobId]);
    
    // Log API usage
    db.run('INSERT INTO api_usage (id, endpoint, response_time, status_code) VALUES (?, ?, ?, ?)', 
      [uuidv4(), '/api/scrape', processingTime, result.success ? 200 : 500]);
    
    res.json({
      ...result,
      job_id: jobId,
      processing_time: `${processingTime}ms`,
      options: options
    });
  } catch (error) {
    db.run('UPDATE jobs SET status = ?, result = ? WHERE id = ?', 
      ['failed', JSON.stringify({ error: error.message }), jobId]);
    res.status(500).json({ success: false, error: error.message, job_id: jobId });
  }
});

// Get all jobs
app.get('/api/jobs', (req, res) => {
  db.all('SELECT * FROM jobs ORDER BY created_at DESC LIMIT 10', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get statistics
app.get('/api/stats', (req, res) => {
  db.get(`
    SELECT 
      COUNT(*) as total_jobs,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_jobs,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs
    FROM jobs
  `, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get('SELECT COUNT(*) as api_calls FROM api_usage', (err2, row2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ ...row, api_calls: row2.api_calls });
    });
  });
});

// Health check with real system info
app.get('/health', (req, res) => {
  db.get('SELECT COUNT(*) as job_count FROM jobs', (err, row) => {
    res.json({
      status: 'healthy',
      platform: 'Ultimate Scraper Enterprise',
      version: '4.2.1',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      total_jobs: row ? row.job_count : 0,
      features: ['Real Web Scraping', 'Database Storage', 'Live Dashboard', 'API Analytics']
    });
  });
});

// API status
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Ultimate Scraper Enterprise API - FULLY OPERATIONAL',
    version: '4.2.1',
    endpoints: {
      'POST /api/scrape': 'Scrape any website with real data extraction',
      'GET /api/jobs': 'Get all scraping jobs from database',
      'GET /api/stats': 'Get real usage statistics',
      'GET /health': 'System health and performance metrics'
    },
    database: 'SQLite - ACTIVE',
    scraping_engine: 'Axios + Cheerio - READY',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Ultimate Scraper Enterprise running on port ${PORT}`);
  console.log('📊 Real working dashboard with:');
  console.log('   ✅ Live web scraping');
  console.log('   ✅ Database storage');
  console.log('   ✅ Job management');
  console.log('   ✅ Usage analytics');
});