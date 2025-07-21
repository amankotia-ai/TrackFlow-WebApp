import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://nmnjnofagtcalfnkltqp.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmpub2ZhZ3RjYWxmbmtsdHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NTE4MjIsImV4cCI6MjA1MjUyNzgyMn0.7GBxGTmNhsF0vZNJ-jIBiSvGSMQGLCJq2uO3g6E_0Mo';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔗 Supabase connection initialized');

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
        <title>TrackFlow Web Scraping & Workflow Platform</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 2rem auto; padding: 2rem; }
          .header { text-align: center; color: #333; }
          .endpoint { background: #f5f5f5; padding: 1rem; margin: 1rem 0; border-radius: 8px; }
          .code { background: #000; color: #0f0; padding: 1rem; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🕷️ TrackFlow Platform</h1>
          <p>✅ Online and Ready | Railway Deployment</p>
          <p>Web Scraping + Element Tracking + Workflow Automation</p>
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
          <h3>GET /tracking-script.js</h3>
          <p>Element tracking script for websites</p>
          <div class="code">
&lt;script src="${req.protocol}://${req.get('host')}/tracking-script.js"&gt;&lt;/script&gt;
          </div>
        </div>
        
        <div class="endpoint">
          <h3>POST /api/analytics/track</h3>
          <p>Track user interactions and events</p>
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    platform: 'Railway',
    timestamp: new Date().toISOString(),
    endpoints: {
      scrape: 'POST /api/scrape',
      health: 'GET /api/health',
      tracking_script: 'GET /tracking-script.js',
      analytics: 'POST /api/analytics/track',
      workflows: 'POST /api/workflows/trigger-check'
    }
  });
});

// Serve tracking script endpoint
app.get('/tracking-script.js', (req, res) => {
  try {
    const trackingScript = fs.readFileSync(path.join(__dirname, 'src/utils/elementTracker.js'), 'utf8');
    const callback = req.query.callback;
    
    // Set proper headers for JavaScript with enhanced CORS and ngrok handling
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Enhanced ngrok-specific headers
    res.setHeader('ngrok-skip-browser-warning', 'true');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    
    // Handle ngrok browser warning bypass
    if (req.headers['ngrok-skip-browser-warning'] || req.query['ngrok-skip-browser-warning']) {
      res.setHeader('ngrok-skip-browser-warning', 'any');
    }
    
    console.log('📦 Serving tracking script to:', req.get('origin') || req.ip);
    console.log('📦 JSONP callback:', callback || 'none');
    
    // Ensure the response is treated as JavaScript
    res.type('application/javascript');
    
    // If callback parameter is provided, wrap in JSONP
    if (callback) {
      console.log('🔄 Serving as JSONP with callback:', callback);
      // Escape the script content for safe JSON embedding
      const escapedScript = JSON.stringify(trackingScript);
      const jsonpResponse = `${callback}(${escapedScript});`;
      res.send(jsonpResponse);
    } else {
      // Serve as regular JavaScript
      res.send(trackingScript);
    }
  } catch (error) {
    console.error('❌ Error serving tracking script:', error);
    const callback = req.query.callback;
    if (callback) {
      // Return error via JSONP callback
      res.status(500).type('application/javascript').send(`${callback}("console.error('Failed to load tracking script: ${error.message}');");`);
    } else {
      res.status(500).setHeader('Content-Type', 'application/json').json({ 
        error: 'Failed to load tracking script',
        message: error.message 
      });
    }
  }
});

// Serve enhanced tracking script endpoint
app.get('/enhanced-tracking-script.js', (req, res) => {
  try {
    const enhancedTrackingScript = fs.readFileSync(path.join(__dirname, 'src/utils/elementTrackerEnhanced.js'), 'utf8');
    
    // Set proper headers for JavaScript
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('ngrok-skip-browser-warning', 'true');
    
    console.log('🎯 Serving enhanced tracking script with workflow integration');
    res.send(enhancedTrackingScript);
  } catch (error) {
    console.error('❌ Error serving enhanced tracking script:', error);
    res.status(500).json({ error: 'Failed to load enhanced tracking script' });
  }
});

// Serve workflow executor script
app.get('/workflow-executor.js', (req, res) => {
  try {
    const workflowExecutorScript = fs.readFileSync(path.join(__dirname, 'src/utils/workflowExecutor.js'), 'utf8');
    
    // Set proper headers for JavaScript
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('ngrok-skip-browser-warning', 'true');
    
    console.log('🎯 Serving workflow executor script');
    res.send(workflowExecutorScript);
  } catch (error) {
    console.error('❌ Error serving workflow executor script:', error);
    res.status(500).json({ error: 'Failed to load workflow executor script' });
  }
});

// Handle preflight requests for tracking script
app.options('/tracking-script.js', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

// Analytics endpoint for tracking events
app.post('/api/analytics/track', async (req, res) => {
  try {
    const { events } = req.body;
    
    console.log('📊 Received analytics events:', events?.length || 0);
    
    if (events && events.length > 0) {
      // Log the events for now (in production, save to database)
      events.forEach(event => {
        console.log('📊 Event:', event.eventType, event.elementSelector, event.pageContext?.pathname);
      });
    }
    
    res.json({ 
      success: true, 
      received: events?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to save analytics' });
  }
});

// Workflow trigger check endpoint
app.post('/api/workflows/trigger-check', async (req, res) => {
  try {
    const { event, workflowId } = req.body;
    
    console.log('🔄 Workflow trigger check:', workflowId, event?.type);
    
    if (!workflowId || !event) {
      return res.status(400).json({
        success: false,
        error: 'Missing workflowId or event data',
        timestamp: new Date().toISOString()
      });
    }
    
    // Fetch the workflow from database
    const { data: workflow, error: fetchError } = await supabase
      .from('workflows_with_nodes')
      .select('*')
      .eq('id', workflowId)
      .eq('is_active', true)
      .eq('status', 'active')
      .single();
    
    if (fetchError || !workflow) {
      console.log('❌ Workflow not found or inactive:', workflowId);
      return res.json({
        triggered: false,
        actions: [],
        workflowId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Parse nodes and connections
    const nodes = workflow.nodes || [];
    const connections = workflow.connections || [];
    
    console.log('📊 Workflow data:', {
      workflowId,
      name: workflow.name,
      nodeCount: nodes.length,
      connectionCount: connections.length,
      nodes: nodes.map(n => ({ id: n.id, type: n.type, name: n.name, config: n.config }))
    });
    
    console.log('📨 Event data received:', {
      type: event.type || event.eventType,
      deviceType: event.deviceType,
      utm: event.utm,
      visitCount: event.visitCount,
      timeOnPage: event.timeOnPage,
      scrollPercentage: event.scrollPercentage,
      elementSelector: event.elementSelector || event.element
    });
    
    // Find trigger nodes
    const triggerNodes = nodes.filter(node => node.type === 'trigger');
    let triggeredActions = [];
    
    // Evaluate each trigger
    for (const trigger of triggerNodes) {
      let isTriggered = false;
      
      console.log(`🔍 Evaluating trigger: ${trigger.name}`, trigger.config);
      
      // Evaluate trigger based on type
      switch (trigger.name) {
        case 'Device Type':
          isTriggered = event.deviceType === trigger.config.deviceType;
          console.log(`  Device check: ${event.deviceType} === ${trigger.config.deviceType} = ${isTriggered}`);
          break;
          
        case 'UTM Parameters':
          if (event.utm) {
            const { parameter, value, operator } = trigger.config;
            const utmValue = event.utm[parameter];
            
            console.log(`  UTM check: ${parameter}=${utmValue}, operator=${operator}, expected=${value}`);
            
            switch (operator) {
              case 'equals':
                isTriggered = utmValue === value;
                break;
              case 'contains':
                isTriggered = utmValue && utmValue.includes(value);
                break;
              case 'exists':
                isTriggered = Boolean(utmValue);
                break;
              default:
                isTriggered = false;
            }
          }
          break;
          
        case 'Page Visits':
          const visitThreshold = trigger.config.visitCount || 3;
          isTriggered = event.visitCount >= visitThreshold;
          console.log(`  Page visits check: ${event.visitCount} >= ${visitThreshold} = ${isTriggered}`);
          break;
          
        case 'Time on Page':
          const duration = trigger.config.duration || 30;
          const unit = trigger.config.unit || 'seconds';
          const thresholdMs = unit === 'minutes' ? duration * 60000 : duration * 1000;
          const timeOnPageMs = event.timeOnPage * 1000; // Convert seconds to ms
          isTriggered = timeOnPageMs >= thresholdMs;
          console.log(`  Time on page check: ${event.timeOnPage}s >= ${duration}${unit} = ${isTriggered}`);
          break;
          
        case 'Scroll Depth':
          const scrollThreshold = trigger.config.percentage || 50;
          isTriggered = event.scrollPercentage >= scrollThreshold;
          console.log(`  Scroll depth check: ${event.scrollPercentage}% >= ${scrollThreshold}% = ${isTriggered}`);
          break;
          
        case 'Element Click':
          const eventType = event.type || event.eventType;
          const elementSelector = event.elementSelector || event.element;
          isTriggered = eventType === 'click' && elementSelector === trigger.config.selector;
          console.log(`  Element click check: type=${eventType}, selector=${elementSelector} === ${trigger.config.selector} = ${isTriggered}`);
          break;
          
        case 'Exit Intent':
          const exitEventType = event.type || event.eventType;
          isTriggered = exitEventType === 'exit_intent';
          console.log(`  Exit intent check: ${exitEventType} === 'exit_intent' = ${isTriggered}`);
          break;
          
        default:
          console.warn('Unknown trigger type:', trigger.name);
      }
      
      // If triggered, find connected actions
      if (isTriggered) {
        console.log(`✅ Trigger matched: ${trigger.name}`);
        
        // Find all actions connected to this trigger
        const connectedActionIds = connections
          .filter(conn => conn.sourceNodeId === trigger.id)
          .map(conn => conn.targetNodeId);
        
        const connectedActions = nodes
          .filter(node => node.type === 'action' && connectedActionIds.includes(node.id))
          .map(action => transformActionForClient(action, trigger.name));
        
        triggeredActions = [...triggeredActions, ...connectedActions];
      }
    }
    
    // Remove duplicates
    const uniqueActions = Array.from(new Map(
      triggeredActions.map(action => [`${action.type}-${action.target}`, action])
    ).values());
    
    console.log(`🎯 Workflow ${workflowId}: ${uniqueActions.length} actions triggered`);
    
    res.json({
      success: true,
      triggered: uniqueActions.length > 0,
      actions: uniqueActions,
      workflowId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Workflow trigger check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check workflow triggers',
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function to transform database action to client format
function transformActionForClient(action, triggerName) {
  const baseAction = {
    delay: 0,
    triggeredBy: triggerName
  };
  
  switch (action.name) {
    case 'Replace Text':
      return {
        ...baseAction,
        type: 'replace_text',
        target: action.config.selector,
        newText: action.config.newText,
        originalText: action.config.originalText,
        animation: 'fade'
      };
      
    case 'Hide Element':
      return {
        ...baseAction,
        type: 'hide_element',
        target: action.config.selector,
        animation: action.config.animation || 'fade'
      };
      
    case 'Show Element':
      return {
        ...baseAction,
        type: 'show_element',
        target: action.config.selector,
        animation: action.config.animation || 'fade'
      };
      
    case 'Modify CSS':
      return {
        ...baseAction,
        type: 'modify_css',
        target: action.config.selector,
        property: action.config.property,
        value: action.config.value
      };
      
    case 'Add Class':
      return {
        ...baseAction,
        type: 'add_class',
        target: action.config.selector,
        className: action.config.className
      };
      
    case 'Remove Class':
      return {
        ...baseAction,
        type: 'remove_class',
        target: action.config.selector,
        className: action.config.className
      };
      
    case 'Display Overlay':
      return {
        ...baseAction,
        type: 'display_overlay',
        content: action.config.content,
        animation: action.config.animation || 'fade',
        position: action.config.position || 'center'
      };
      
    case 'Redirect':
      return {
        ...baseAction,
        type: 'redirect',
        url: action.config.url,
        delay: action.config.delay || 0,
        newTab: action.config.newTab || false
      };
      
    case 'Custom Event':
      return {
        ...baseAction,
        type: 'custom_event',
        eventName: action.config.eventName,
        eventData: action.config.eventData
      };
      
    default:
      console.warn('Unknown action type:', action.name);
      return {
        ...baseAction,
        type: action.name.toLowerCase().replace(/ /g, '_'),
        target: action.config.selector || '',
        config: action.config
      };
  }
}

// Get active workflows endpoint
app.get('/api/workflows/active', async (req, res) => {
  try {
    const { url } = req.query;
    
    console.log('📋 Fetching active workflows for:', url);
    
    // Query Supabase for active workflows
    const { data: workflows, error } = await supabase
      .from('workflows_with_nodes')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'active');
    
    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch workflows from database',
        timestamp: new Date().toISOString()
      });
    }
    
    // Filter workflows that match the URL
    const activeWorkflows = workflows.filter(workflow => {
      // Match all pages with wildcard
      if (workflow.target_url === '*') return true;
      // Match specific URLs
      if (workflow.target_url && url && url.includes(workflow.target_url)) return true;
      return false;
    });
    
    console.log(`✅ Found ${activeWorkflows.length} active workflows for URL: ${url}`);
    
    res.json({
      success: true,
      workflows: activeWorkflows,
      count: activeWorkflows.length,
      url,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching workflows:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch workflows',
      timestamp: new Date().toISOString()
    });
  }
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

    // Remove duplicates - no limit on results
    const uniqueElements = elements
      .filter((el, i, arr) => arr.findIndex(e => e.text === el.text) === i);

    console.log(`✅ Extracted ${uniqueElements.length} elements`);

    res.json({
      success: true,
      data: uniqueElements,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      count: uniqueElements.length
    });

  } catch (error) {
    console.error('❌ Scraping error:', error);
    
    let errorMessage = 'Failed to scrape webpage';
    if (error.code === 'ENOTFOUND') {
      errorMessage = 'URL not found';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Request timed out';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      url: req.body?.url,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 TrackFlow Platform running on port ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  console.log(`🕷️ Scrape: POST http://localhost:${PORT}/api/scrape`);
  console.log(`🎯 Tracking: http://localhost:${PORT}/tracking-script.js`);
  console.log(`📊 Analytics: POST http://localhost:${PORT}/api/analytics/track`);
  console.log(`🔄 Workflows: POST http://localhost:${PORT}/api/workflows/trigger-check`);
  console.log(`🌐 Frontend: http://localhost:${PORT}/`);
});

export default app; 