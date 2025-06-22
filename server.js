const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('<h1>?? Ultimate Scraper Enterprise</h1><h2>? LIVE AND WORKING!</h2><p>API Endpoints: <a href="/health">/health</a> | <a href="/api/status">/api/status</a></p>');
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', platform: 'Ultimate Scraper Enterprise', timestamp: new Date().toISOString() });
});

app.get('/api/status', (req, res) => {
  res.json({ message: 'Ultimate Scraper API operational!', version: '4.2.1', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`?? Ultimate Scraper running on port ${PORT}`);
});
