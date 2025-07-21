import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('🔗 Supabase client initialized:', {
  url: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
  key: process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
});

const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced CORS for external domains (including Webflow)
app.use(cors({
  origin: '*', // Allow all origins for testing (restrict in production)
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Content-Length']
}));

// Add middleware to handle ngrok-specific headers
app.use((req, res, next) => {
  // Set ngrok bypass header for all responses
  res.setHeader('ngrok-skip-browser-warning', 'true');
  res.setHeader('ngrok-skip-browser-warning', 'any');
  res.setHeader('ngrok-skip-browser-warning', '1');
  
  // Ensure proper content type for JavaScript files
  if (req.path.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  }
  
  next();
});

// Special endpoint to serve tracking script with ngrok bypass
app.get('/js/tracker.js', (req, res) => {
  try {
    const trackingScript = fs.readFileSync(path.join(__dirname, 'src/utils/elementTracker.js'), 'utf8');
    
    // Force all ngrok bypass headers
    res.setHeader('ngrok-skip-browser-warning', 'true');
    res.setHeader('ngrok-skip-browser-warning', 'any');
    res.setHeader('ngrok-skip-browser-warning', '1');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    console.log('📦 Serving tracker via bypass endpoint');
    res.send(trackingScript);
  } catch (error) {
    console.error('❌ Error serving bypass tracker:', error);
    res.status(500).json({ error: 'Failed to load tracker' });
  }
});

app.use(express.json());

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Serve test page
app.get('/test', (req, res) => {
  try {
    const testPagePath = path.join(__dirname, 'test-page.html');
    if (fs.existsSync(testPagePath)) {
      res.sendFile(testPagePath);
    } else {
      res.status(404).send('Test page not found');
    }
  } catch (error) {
    console.error('Error serving test page:', error);
    res.status(500).send('Error loading test page');
  }
});

// Serve embedded test page
app.get('/test-embedded', (req, res) => {
  try {
    const testPagePath = path.join(__dirname, 'test-embedded.html');
    if (fs.existsSync(testPagePath)) {
      res.sendFile(testPagePath);
    } else {
      res.status(404).send('Embedded test page not found');
    }
  } catch (error) {
    console.error('Error serving embedded test page:', error);
    res.status(500).send('Error loading embedded test page');
  }
});

// Serve workflow demo page
app.get('/workflow-demo', (req, res) => {
  try {
    const demoPagePath = path.join(__dirname, 'test-workflow-demo.html');
    if (fs.existsSync(demoPagePath)) {
      res.sendFile(demoPagePath);
    } else {
      res.status(404).send('Workflow demo page not found');
    }
  } catch (error) {
    console.error('Error serving workflow demo page:', error);
    res.status(500).send('Error loading workflow demo page');
  }
});

// Serve Webflow integration guide
app.get('/webflow', (req, res) => {
  try {
    const webflowPagePath = path.join(__dirname, 'webflow-integration.html');
    if (fs.existsSync(webflowPagePath)) {
      res.sendFile(webflowPagePath);
    } else {
      res.status(404).send('Webflow integration page not found');
    }
  } catch (error) {
    console.error('Error serving Webflow integration page:', error);
    res.status(500).send('Error loading Webflow integration page');
  }
});

// Scraping endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL is required' 
      });
    }

    console.log(`Scraping request for: ${url}`);

    // Ensure URL has protocol
    let targetUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      targetUrl = `https://${url}`;
    }

    // Fetch HTML from the URL
    const response = await axios.get(targetUrl, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      },
      maxRedirects: 10,
      validateStatus: (status) => status < 400
    });

    const html = response.data;
    const $ = cheerio.load(html);

    console.log(`HTML received, length: ${html.length}`);

    const textElements = [];

    // Remove noise elements
    $('script, style, noscript, iframe, embed, object, meta, link, head').remove();

    // Strategy 1: Focus on semantic content areas
    const semanticSelectors = [
      'main', 'article', 'section', '.content', '.main', '.container', 
      '.wrapper', '#content', '#main', '.page-content', '.post-content',
      '.entry-content', '.article-content', '.text-content'
    ];

    let mainContentSelector = 'body';
    for (const selector of semanticSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        mainContentSelector = selector;
        console.log(`Found main content area: ${selector}`);
        break;
      }
    }

    // Strategy 2: Extract from main content area with hierarchy
    function extractElementsWithHierarchy($, container, parentPath = '') {
      const elements = [];
      
      container.children().each((_, el) => {
        const tag = el.type === 'tag' ? el.name : 'unknown';
        const text = $(el).text().trim();
        const element = $(el);
        
        // Get element attributes
        const attributes = {};
        const id = element.attr('id');
        const className = element.attr('class');
        const href = element.attr('href');
        const src = element.attr('src');
        const alt = element.attr('alt');
        const title = element.attr('title');
        
        if (id) attributes.id = id;
        if (className) attributes.class = className;
        if (href) attributes.href = href;
        if (src) attributes.src = src;
        if (alt) attributes.alt = alt;
        if (title) attributes.title = title;

        // Generate selector
        let selector = tag;
        if (id) {
          selector = `#${id}`;
        } else if (className) {
          const classes = className.split(' ').filter(c => c.trim()).join('.');
          selector = `${tag}.${classes}`;
        }

        // Create element object
        const elementObj = {
          tag,
          text: text || '',
          selector,
          attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
          children: [],
          level: parentPath.split('>').length - 1
        };

        // Only add if it has meaningful content or is a container
        if (text && text.length > 1) {
          elements.push(elementObj);
        } else if (element.children().length > 0) {
          // It's a container element, add it but mark as container
          elementObj.isContainer = true;
          elements.push(elementObj);
        }

        // Recursively process children
        if (element.children().length > 0) {
          const childPath = parentPath ? `${parentPath} > ${tag}` : tag;
          const children = extractElementsWithHierarchy($, element, childPath);
          elementObj.children = children;
        }
      });

      return elements;
    }

    // Extract elements with hierarchy
    const mainContent = $(mainContentSelector);
    const hierarchicalElements = extractElementsWithHierarchy($, mainContent, mainContentSelector);
    
    // Flatten the hierarchy for backward compatibility
    function flattenHierarchy(elements, result = []) {
      elements.forEach(element => {
        if (element.text && element.text.length > 1) {
          result.push({
            tag: element.tag,
            text: element.text,
            selector: element.selector,
            attributes: element.attributes,
            level: element.level
          });
        }
        if (element.children && element.children.length > 0) {
          flattenHierarchy(element.children, result);
        }
      });
      return result;
    }

    textElements.push(...flattenHierarchy(hierarchicalElements));

    console.log(`Strategy 2 extracted ${textElements.length} elements`);

    // Strategy 3: If not enough content, try entire body
    if (textElements.length < 10) {
      console.log('Strategy 3: Scraping entire body');
      $('body *').each((_, el) => {
        const tag = el.type === 'tag' ? el.name : 'unknown';
        const text = $(el).text().trim();

        if (text && text.length > 2) {
          const element = $(el);
          const attributes = {};
          
          const id = element.attr('id');
          const className = element.attr('class');
          const href = element.attr('href');
          
          if (id) attributes.id = id;
          if (className) attributes.class = className;
          if (href) attributes.href = href;

          let selector = tag;
          if (id) {
            selector = `#${id}`;
          } else if (className) {
            const classes = className.split(' ').filter(c => c.trim()).join('.');
            selector = `${tag}.${classes}`;
          }

          textElements.push({
            tag,
            text,
            selector,
            attributes: Object.keys(attributes).length > 0 ? attributes : undefined
          });
        }
      });
    }

    // Strategy 4: Extract all visible text as fallback
    if (textElements.length < 5) {
      console.log('Strategy 4: Extracting all visible text');
      const allText = $('body').text().trim();
      if (allText && allText.length > 10) {
        const lines = allText.split('\n').filter(line => line.trim().length > 3);
        lines.forEach((line, index) => {
          textElements.push({
            tag: 'p',
            text: line.trim(),
            selector: `body > p:nth-of-type(${index + 1})`,
            attributes: undefined
          });
        });
      }
    }

    // Strategy 5: Look for specific content patterns
    if (textElements.length < 3) {
      console.log('Strategy 5: Looking for specific content patterns');
      
      // Look for headings
      $('h1, h2, h3, h4, h5, h6').each((_, el) => {
        const text = $(el).text().trim();
        if (text) {
          textElements.push({
            tag: el.name,
            text,
            selector: el.name,
            attributes: undefined
          });
        }
      });

      // Look for paragraphs
      $('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 10) {
          textElements.push({
            tag: 'p',
            text,
            selector: 'p',
            attributes: undefined
          });
        }
      });

      // Look for links
      $('a').each((_, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href');
        if (text && href) {
          textElements.push({
            tag: 'a',
            text,
            selector: 'a',
            attributes: { href }
          });
        }
      });
    }

    // Remove duplicates and filter noise
    const uniqueElements = textElements.filter((element, index, self) => {
      const isDuplicate = self.findIndex(e => e.text === element.text) !== index;
      const noiseTags = ['script', 'style', 'meta', 'link', 'head', 'html', 'body'];
      return !isDuplicate && !noiseTags.includes(element.tag);
    });

    console.log(`Final result: ${uniqueElements.length} unique elements`);

    res.json({
      success: true,
      data: uniqueElements,
      hierarchy: hierarchicalElements,
      url: targetUrl,
      timestamp: new Date(),
      debugInfo: {
        htmlLength: html.length,
        mainContentSelector,
        totalElements: textElements.length,
        filteredElements: uniqueElements.length
      }
    });

  } catch (error) {
    console.error('Scraping error:', error);
    
    let errorMessage = 'Failed to scrape webpage';
    if (error.response) {
      errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'URL not found. Please check the URL and try again.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. Please check the URL and try again.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Request timed out. Please try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      url: req.body.url,
      timestamp: new Date()
    });
  }
});

// Analytics tracking endpoint
app.post('/api/analytics/track', async (req, res) => {
  try {
    const { events, metadata } = req.body;
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Events array is required' 
      });
    }

    console.log(`📊 Analytics: Received batch of ${events.length} events from session ${metadata?.sessionId}`);
    
    // Save to Supabase using production schema
    if (events && events.length > 0) {
      const { error } = await supabase
        .from('analytics_events')
        .insert(events.map(event => ({
          // user_id: null, // Would be set if user is authenticated
          // workflow_id: null, // Would be set if associated with a workflow
          session_id: event.sessionId,
          event_type: event.eventType,
          element_selector: event.elementSelector,
          element_text: event.eventData?.elementText,
          element_attributes: event.eventData?.elementAttributes || {},
          page_url: event.pageContext?.pathname || event.pageContext?.url,
          page_title: event.pageContext?.title,
          referrer_url: event.pageContext?.referrer,
          device_type: event.userContext?.deviceType,
          browser_info: {
            userAgent: event.userContext?.userAgent,
            language: event.userContext?.language,
            platform: event.userContext?.platform
          },
          user_agent: event.userContext?.userAgent,
          viewport_size: event.userContext?.viewport,
          screen_size: event.userContext?.screen,
          event_data: event.eventData || {}
        })));
      
      if (error) {
        console.error('❌ Analytics save error:', error);
        // Don't fail the request, just log the error
      } else {
        console.log(`✅ Saved ${events.length} events to Supabase`);
      }
    }

    // Return success
    res.json({
      success: true,
      processed: events.length,
      timestamp: new Date(),
      sessionId: metadata?.sessionId,
      message: 'Events processed successfully'
    });

  } catch (error) {
    console.error('❌ Analytics tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process analytics events',
      timestamp: new Date()
    });
  }
});

// Mock Supabase Edge Function endpoint for workflow triggers
app.post('/api/workflows/trigger-check', async (req, res) => {
  try {
    const { event, workflowId } = req.body;
    
    console.log(`🔄 Workflow Trigger Check: Event "${event.eventType}" for workflow "${workflowId}"`);
    
    // Mock trigger evaluation logic
    // In real implementation, this would:
    // 1. Query active workflows for the page
    // 2. Check trigger conditions against the event
    // 3. Execute matching workflows
    // 4. Return personalization actions
    
    const mockTriggeredActions = [];
    
    // Enhanced trigger logic for element-based events
    console.log(`🔍 Evaluating trigger for event: ${event.eventType}, element: ${event.elementSelector}`);
    
    // Element Click Triggers
    if (event.eventType === 'click') {
      // CTA button clicks
      if (event.elementSelector?.includes('.cta') || event.elementSelector?.includes('.btn')) {
        mockTriggeredActions.push({
          type: 'show_element',
          target: '#special-offer-modal',
          animation: 'fade',
          delay: 0,
          triggeredBy: 'Element Click Trigger'
        });
      }
    }
    
    // Form Interaction Triggers  
    if (event.eventType === 'field_focus') {
      // Email field focus - progressive form
      if (event.eventData?.fieldType === 'email' || event.elementSelector?.includes('email')) {
        mockTriggeredActions.push({
          type: 'show_element',
          target: '#progressive-fields',
          animation: 'slide',
          delay: 500,
          triggeredBy: 'Form Interaction Trigger'
        });
      }
    }
    
    // Form submission
    if (event.eventType === 'form_submit') {
      mockTriggeredActions.push({
        type: 'replace_text',
        target: 'h1',
        newText: 'Thank you for your submission!',
        animation: 'fade',
        triggeredBy: 'Form Submit Trigger'
      });
    }
    
    // Element Visibility Triggers
    if (event.eventType === 'element_visible' && event.eventData?.visibilityPercentage >= 75) {
      // Content section visibility - newsletter popup
      if (event.elementSelector?.includes('.content') || event.elementSelector?.includes('article')) {
        mockTriggeredActions.push({
          type: 'show_element',
          target: '#newsletter-popup',
          animation: 'slide',
          delay: 2000,
          triggeredBy: 'Element Visibility Trigger'
        });
      }
    }
    
    // Element Hover Triggers
    if (event.eventType === 'mouseenter' || event.eventType === 'hover') {
      // Product card hover - show details
      if (event.elementSelector?.includes('.product') || event.elementSelector?.includes('.feature')) {
        mockTriggeredActions.push({
          type: 'show_element',
          target: '.product-details-overlay',
          animation: 'fade',
          delay: 0,
          triggeredBy: 'Element Hover Trigger'
        });
      }
    }
    
    // Custom workflow trigger events
    if (event.eventType === 'time_threshold_reached') {
      mockTriggeredActions.push({
        type: 'show_element',
        target: '#engagement-popup',
        animation: 'bounce',
        delay: 1000,
        triggeredBy: 'Time on Page Trigger'
      });
    }
    
    if (event.eventType === 'scroll_depth_reached') {
      mockTriggeredActions.push({
        type: 'show_element',
        target: '#scroll-reward',
        animation: 'slide',
        delay: 0,
        triggeredBy: 'Scroll Depth Trigger'
      });
    }
    
    if (event.eventType === 'device_type_match') {
      mockTriggeredActions.push({
        type: 'add_class',
        target: 'body',
        className: `device-${event.eventData?.deviceType}`,
        triggeredBy: 'Device Type Trigger'
      });
    }
    
    if (event.eventType === 'utm_parameter_match') {
      mockTriggeredActions.push({
        type: 'replace_text',
        target: '.hero-headline',
        newText: `Welcome from ${event.eventData?.value}! Special offer just for you.`,
        animation: 'fade',
        triggeredBy: 'UTM Parameter Trigger'
      });
    }

    res.json({
      success: true,
      triggered: mockTriggeredActions.length > 0,
      actions: mockTriggeredActions,
      workflowId: workflowId,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Workflow trigger check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check workflow triggers',
      timestamp: new Date()
    });
  }
});

// Helper function to validate API key and get user
async function validateApiKey(apiKey) {
  if (!apiKey) return null;
  
  try {
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('user_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();
    
    if (error || !data) return null;
    
    // Update last used timestamp
    await supabase
      .from('user_api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('api_key', apiKey);
    
    return data.user_id;
  } catch (error) {
    console.error('API key validation error:', error);
    return null;
  }
}

// Get active workflows using your production schema
app.get('/api/workflows/active', async (req, res) => {
  try {
    const requestUrl = req.query.url || '';
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    console.log(`🎯 Fetching active workflows for URL: ${requestUrl}`);
    
    // For demo purposes, let's get workflows without API key validation initially
    // In production, you'd use the get_active_workflows_for_url function
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
        timestamp: new Date()
      });
    }
    
    // Filter workflows that match the URL
    const activeWorkflows = workflows.filter(workflow => {
      // Simple URL matching - in production, use more sophisticated matching
      if (workflow.target_url === '*') return true;
      if (workflow.target_url && requestUrl.includes(workflow.target_url)) return true;
      return false;
    });
    
    console.log(`🎯 Found ${activeWorkflows.length} active workflows`);
    
    res.json({
      success: true,
      workflows: activeWorkflows,
      count: activeWorkflows.length,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Error fetching active workflows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active workflows',
      timestamp: new Date()
    });
  }
});

// Simplified demo endpoint (for testing without auth)
app.get('/api/workflows/demo', async (req, res) => {
  try {
    const requestUrl = req.query.url || '';
    console.log(`🎯 Fetching demo workflows for: ${requestUrl}`);
    
    const { data: workflows, error } = await supabase
      .from('workflows_with_nodes')
      .select('*')
      .eq('is_active', true);
    
    if (error) throw error;
    
    console.log(`🎯 Found ${workflows.length} demo workflows`);
    
    res.json({
      success: true,
      workflows: workflows,
      count: workflows.length,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Demo workflows error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch demo workflows',
      timestamp: new Date()
    });
  }
});

// Handle preflight requests for tracking script
app.options('/tracking-script.js', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
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
    console.log('📦 Query params:', JSON.stringify(req.query, null, 2));
    
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    endpoints: {
      analytics: '/api/analytics/track',
      triggers: '/api/workflows/trigger-check', 
      tracking_script: '/tracking-script.js',
      scraping: '/api/scrape',
      test_page: '/test'
    }
  });
});

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`🚀 Workflow server running on http://localhost:${PORT}`);
  console.log(`📊 Analytics endpoint: http://localhost:${PORT}/api/analytics/track`);
  console.log(`🎯 Tracking script: http://localhost:${PORT}/tracking-script.js`);
  console.log(`⚡ Enhanced tracking: http://localhost:${PORT}/enhanced-tracking-script.js`);
  console.log(`🔧 Workflow executor: http://localhost:${PORT}/workflow-executor.js`);
  console.log(`🔄 Active workflows: http://localhost:${PORT}/api/workflows/active`);
  console.log(`🔄 Trigger check: http://localhost:${PORT}/api/workflows/trigger-check`);
  console.log(`💡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`\n🎯 Demo Pages:`);
  console.log(`   Basic test: http://localhost:${PORT}/test`);
  console.log(`   Workflow demo: http://localhost:${PORT}/workflow-demo`);
  console.log(`   Embedded test: http://localhost:${PORT}/test-embedded`);
  console.log(`\n🌐 For external testing (Webflow, etc.):
  1. Install ngrok: npm install -g ngrok
  2. Run: ngrok http 3001
  3. Use the https:// URL provided by ngrok
  4. Update integration code to use ngrok URL`);
}); 