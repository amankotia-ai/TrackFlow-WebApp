import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS for all origins
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Root endpoint with documentation
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>TrackFlow Web Scraping Proxy</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 2rem auto; padding: 2rem; }
          .header { text-align: center; color: #333; }
          .endpoint { background: #f5f5f5; padding: 1rem; margin: 1rem 0; border-radius: 8px; }
          .code { background: #000; color: #0f0; padding: 1rem; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🕷️ TrackFlow Web Scraping Proxy</h1>
          <p>✅ Online and Ready | Railway Deployment</p>
        </div>
        
        <div class="endpoint">
          <h3>POST /api/scrape</h3>
          <p>Extract data from any website</p>
          <div class="code">
curl -X POST ${req.protocol}://${req.get('host')}/api/scrape \\<br>
  -H "Content-Type: application/json" \\<br>
  -d '{"url": "https://example.com"}'
          </div>
        </div>
        
        <div class="endpoint">
          <h3>GET /api/health</h3>
          <p>Check server status</p>
          <div class="code">
curl ${req.protocol}://${req.get('host')}/api/health
          </div>
        </div>
      </body>
    </html>
  `);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'Railway',
    timestamp: new Date().toISOString(),
    endpoints: {
      scrape: 'POST /api/scrape',
      health: 'GET /api/health'
    }
  });
});

// Main scraping endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    console.log(`🕷️ Scraping: ${url}`);

    // Add protocol if missing
    let targetUrl = url;
    if (!url.startsWith('http')) {
      targetUrl = `https://${url}`;
    }

    // Fetch with timeout
    const response = await axios.get(targetUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      maxRedirects: 5
    });

    const html = response.data;
    const $ = cheerio.load(html);
    
    // Remove noise
    $('script, style, noscript').remove();
    
    const elements = [];
    
    // Extract text elements
    $('body *').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 2 && text.length < 500) {
        const tag = el.name;
        const $el = $(el);
        
        elements.push({
          tag,
          text: text.substring(0, 200),
          selector: tag + ($el.attr('class') ? `.${$el.attr('class').split(' ')[0]}` : ''),
          attributes: {
            id: $el.attr('id'),
            class: $el.attr('class'),
            href: $el.attr('href')
          }
        });
      }
    });

    // Remove duplicates
    const uniqueElements = elements
      .filter((el, i, arr) => arr.findIndex(e => e.text === el.text) === i)
      .slice(0, 50);

    console.log(`✅ Extracted ${uniqueElements.length} elements`);

    res.json({
      success: true,
      data: uniqueElements,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      count: uniqueElements.length
    });

  } catch (error) {
    console.error('❌ Scraping error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.code === 'ENOTFOUND' ? 'URL not found' : 'Scraping failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Catch all handler: send back React's index.html file for non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 TrackFlow Proxy running on port ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  console.log(`🕷️ Scrape: POST http://localhost:${PORT}/api/scrape`);
  console.log(`🌐 Frontend: http://localhost:${PORT}/`);
});

export default app; 