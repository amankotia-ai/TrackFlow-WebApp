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

// Initialize Supabase client with error handling
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    console.log('🔗 Supabase client initialized successfully');
  } else {
    console.warn('⚠️ Supabase credentials missing - running without database');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase:', error.message);
}

console.log('🔗 Environment check:', {
  url: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
  key: process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
  nodeEnv: process.env.NODE_ENV || 'undefined'
});

const app = express();

// Enhanced CORS for external domains
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Content-Length']
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
    endpoints: {
      analytics: '/api/analytics/track',
      scraping: '/api/scrape',
      workflows: '/api/workflows/active'
    }
  });
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

    // Extract elements with hierarchy
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

    console.log(`📊 Analytics: Received batch of ${events.length} events`);
    
    // Save to Supabase using production schema (if available)
    if (events && events.length > 0) {
      if (supabase) {
        try {
          const { error } = await supabase
            .from('analytics_events')
            .insert(events.map(event => ({
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
          } else {
            console.log(`✅ Saved ${events.length} events to Supabase`);
          }
        } catch (error) {
          console.error('❌ Analytics database error:', error);
        }
      } else {
        console.log(`📊 Analytics: Received ${events.length} events (Supabase not available)`);
      }
    }

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

// Handle all other routes
app.get('*', (req, res) => {
  res.json({
    message: 'TrackFlow Web Scraping Proxy Server',
    status: 'online',
    timestamp: new Date(),
    endpoints: [
      'POST /api/scrape - Web scraping proxy',
      'POST /api/analytics/track - Analytics tracking',
      'GET /api/health - Health check'
    ]
  });
});

// Export the Express app for Vercel
export default app; 