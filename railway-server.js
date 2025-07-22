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

// Initialize Supabase client - aligned with frontend configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://xlzihfstoqdbgdegqkoi.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsemloZnN0b3FkYmdkZWdxa29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMTUzMDQsImV4cCI6MjA2ODU5MTMwNH0.uE0aEwBJN-sQCesYVjKNJdRyBAaaI_q0tFkSlTBilHw';

const supabase = createClient(supabaseUrl, supabaseKey);

// Service role client for demo workflows (bypasses RLS)
const supabaseServiceRole = createClient(
  supabaseUrl, 
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('🔗 Supabase connection initialized');
console.log('📋 Supabase URL:', supabaseUrl);
console.log('🔑 Supabase Anon Key:', supabaseKey ? 'Set ✅' : 'Missing ❌');
console.log('🔑 Supabase Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set ✅' : 'Missing ❌ (using anon key as fallback)');

// CORS for all origins
app.use(cors({
  origin: '*', // Allow all origins for workflow script delivery
  credentials: false, // Set to false when origin is '*'
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'ngrok-skip-browser-warning', 'X-API-Key']
}));
app.use(express.json({ limit: '10mb' }));

// Handle preflight requests for all routes
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, ngrok-skip-browser-warning, X-API-Key');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.status(200).end();
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Serve test HTML files from root directory
app.use(express.static(__dirname, { 
  extensions: ['html'],
  index: false 
}));

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
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    supabase: {
      url: supabaseUrl,
      connected: !!supabase
    },
    endpoints: {
      workflows: 'GET /api/workflows/active',
      unified_system: 'GET /api/unified-workflow-system.js',
      anti_flicker: 'GET /api/anti-flicker.js',
      analytics: 'POST /api/analytics/track',
      edge_function: 'https://xlzihfstoqdbgdegqkoi.supabase.co/functions/v1/track-execution'
    }
  });
});

// Quick test endpoint for unified workflow system
app.get('/api/test-unified-system', (req, res) => {
  try {
    const scriptExists = fs.existsSync(path.join(__dirname, 'src/utils/unifiedWorkflowSystem.js'));
    const scriptStats = scriptExists ? fs.statSync(path.join(__dirname, 'src/utils/unifiedWorkflowSystem.js')) : null;
    
    res.json({
      status: 'success',
      unified_system_script: {
        exists: scriptExists,
        size: scriptStats ? scriptStats.size : null,
        modified: scriptStats ? scriptStats.mtime : null
      },
      script_url: `${req.protocol}://${req.get('host')}/api/unified-workflow-system.js`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve unified workflow system endpoint
app.get('/api/unified-workflow-system.js', (req, res) => {
  try {
    // Read both tracking and workflow files
    const elementTracker = fs.readFileSync(path.join(__dirname, 'src/utils/elementTracker.js'), 'utf8');
    const unifiedWorkflow = fs.readFileSync(path.join(__dirname, 'src/utils/unifiedWorkflowSystem.js'), 'utf8');
    
    // Combine them into one script
    const unifiedScript = `
// Unified Workflow System - Production Ready
(function() {
  'use strict';
  
  console.log('🎯 TrackFlow: Initializing Unified Workflow System...');
  
  // Override default config with production endpoints
  window.TRACKFLOW_CONFIG = {
    apiEndpoint: 'https://trackflow-webapp-production.up.railway.app/api/analytics/track',
    workflowEndpoint: 'https://trackflow-webapp-production.up.railway.app',
    debug: true,
    autoTrack: true,
    autoInit: true
  };
  
  ${elementTracker}
  
  ${unifiedWorkflow}
  
  // Auto-initialize after scripts load
  document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 TrackFlow: DOM loaded, initializing system...');
    
    // Initialize element tracker
    if (typeof ElementEventTracker !== 'undefined') {
      window.elementTracker = new ElementEventTracker(window.TRACKFLOW_CONFIG);
      console.log('✅ TrackFlow: Element tracker initialized');
    }
    
    // Initialize unified workflow system
    if (typeof UnifiedWorkflowSystem !== 'undefined') {
      window.workflowSystem = new UnifiedWorkflowSystem({
        ...window.TRACKFLOW_CONFIG,
        elementTracker: window.elementTracker
      });
      console.log('✅ TrackFlow: Workflow system initialized');
    }
    
    // Track initial page load
    if (window.elementTracker && window.elementTracker.addEvent) {
      window.elementTracker.addEvent({
        eventType: 'page_view',
        timestamp: Date.now(),
        pageContext: {
          url: window.location.href,
          title: document.title,
          referrer: document.referrer
        },
        userContext: {
          userAgent: navigator.userAgent,
          deviceType: window.innerWidth > 768 ? 'desktop' : 'mobile',
          viewport: { width: window.innerWidth, height: window.innerHeight },
          screen: { width: screen.width, height: screen.height }
        }
      });
      console.log('📊 TrackFlow: Initial page view tracked');
    }
  });
  
})();
`;
    
    // Set proper headers
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    console.log('📦 Serving unified workflow system to:', req.get('origin') || req.ip);
    res.send(unifiedScript);
    
  } catch (error) {
    console.error('❌ Error serving unified workflow system:', error);
    res.status(500).json({ error: 'Failed to load unified workflow system' });
  }
});

// Serve anti-flicker script
app.get('/api/anti-flicker.js', (req, res) => {
  try {
    const antiFlickerScript = fs.readFileSync(path.join(__dirname, 'src/utils/antiFlickerScript.js'), 'utf8');
    
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    console.log('📦 Serving anti-flicker script to:', req.get('origin') || req.ip);
    res.send(antiFlickerScript);
    
  } catch (error) {
    console.error('❌ Error serving anti-flicker script:', error);
    // Fallback anti-flicker script
    const fallbackScript = `
// Fallback Anti-Flicker Script
(function() {
  console.log('🎯 TrackFlow: Anti-flicker activated');
  document.documentElement.style.opacity = '0';
  
  function showContent() {
    document.documentElement.style.transition = 'opacity 0.3s ease';
    document.documentElement.style.opacity = '1';
    console.log('✅ TrackFlow: Content revealed');
  }
  
  // Show content after workflows load or timeout
  setTimeout(showContent, 3000);
  
  // Listen for workflow system ready
  window.addEventListener('workflowSystemReady', showContent);
})();
`;
    res.send(fallbackScript);
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
app.get('/api/workflow-executor.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  
  const workflowExecutorScript = fs.readFileSync(path.join(__dirname, 'src/utils/workflowExecutor.js'), 'utf8');
  console.log('📦 Serving workflow executor script');
  res.send(workflowExecutorScript);
});

// Legacy endpoint - deprecated, use unified system instead
app.get('/api/element-tracker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  
  const elementTrackerScript = fs.readFileSync(path.join(__dirname, 'src/utils/elementTrackerEnhanced.js'), 'utf8');
  console.log('📦 Serving element tracker script (legacy)');
  res.send(elementTrackerScript);
});

// Handle preflight requests for tracking script
app.options('/tracking-script.js', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

// Enhanced Analytics tracking endpoint with comprehensive tracking
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
    
    // Process events through comprehensive tracking
    if (events && events.length > 0) {
      const processedEvents = [];
      
      for (const event of events) {
        try {
          // Extract comprehensive data from the event
          const pageUrl = event.pageContext?.url || event.pageContext?.pathname || event.url || window?.location?.href;
          const sessionId = event.sessionId || metadata?.sessionId;
          const eventType = event.eventType || event.type;
          
          // Parse UTM parameters from URL
          let utmParams = {};
          if (pageUrl) {
            try {
              const url = new URL(pageUrl);
              utmParams = {
                utm_source: url.searchParams.get('utm_source'),
                utm_medium: url.searchParams.get('utm_medium'),
                utm_campaign: url.searchParams.get('utm_campaign'),
                utm_content: url.searchParams.get('utm_content'),
                utm_term: url.searchParams.get('utm_term')
              };
            } catch (urlError) {
              console.warn('⚠️ Could not parse URL for UTM params:', pageUrl);
            }
          }

          // Extract device and browser info
          const userAgent = event.userContext?.userAgent || req.headers['user-agent'];
          const deviceType = event.userContext?.deviceType || 
            (userAgent && userAgent.match(/Mobile|Android|iPhone|iPad/) ? 'mobile' : 'desktop');

          // Generate visitor ID if not provided
          const visitorId = event.visitorId || 
            `visitor_${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Try comprehensive tracking function, fallback to direct insert if fails
          let eventId = null;
          try {
            const { data, error } = await supabase.rpc('track_visitor_event', {
              p_session_id: sessionId,
              p_visitor_id: visitorId,
              p_user_id: null, // Anonymous for now - could be set if authenticated
              p_event_type: eventType,
              p_page_url: pageUrl,
              p_page_title: event.pageContext?.title || event.element?.title,
              p_referrer_url: event.pageContext?.referrer,
              p_utm_source: utmParams.utm_source,
              p_utm_medium: utmParams.utm_medium,
              p_utm_campaign: utmParams.utm_campaign,
              p_utm_content: utmParams.utm_content,
              p_utm_term: utmParams.utm_term,
              p_device_type: deviceType,
              p_browser_name: event.userContext?.browserName,
              p_browser_version: event.userContext?.browserVersion,
              p_operating_system: event.userContext?.platform || event.userContext?.os,
              p_screen_resolution: event.userContext?.screen ? 
                `${event.userContext.screen.width}x${event.userContext.screen.height}` : null,
              p_viewport_size: event.userContext?.viewport ? 
                `${event.userContext.viewport.width}x${event.userContext.viewport.height}` : null,
                             p_user_agent: userAgent,
               p_ip_address: null, // Skip IP for now due to INET type issues
               p_country_code: req.headers['cf-ipcountry'] || null, // Cloudflare country
              p_city: null, // Could be added with geolocation service
              p_element_selector: event.elementSelector || event.element?.className,
              p_element_text: event.elementText || event.element?.textContent || event.eventData?.elementText,
              p_element_attributes: event.eventData?.elementAttributes || event.element || {},
              p_form_data: event.eventData?.formData || event.eventData?.formFields || {},
              p_scroll_depth: event.eventData?.scrollDepth || 0,
              p_time_on_page: event.eventData?.timeOnPage || 0,
              p_conversion_value: event.eventData?.conversionValue || null,
              p_custom_properties: {
                ...event.eventData,
                originalEvent: event
              }
            });

            if (error) {
              console.warn('⚠️ RPC tracking function failed, falling back to direct insert:', error.message);
              
              // Fallback to direct table insert
              const { data: directInsert, error: directError } = await supabase
                .from('visitor_events')
                .insert({
                  session_id: sessionId,
                  visitor_id: visitorId,
                  event_type: eventType,
                  page_url: pageUrl,
                  page_title: event.pageContext?.title || event.element?.title,
                  referrer_url: event.pageContext?.referrer,
                  utm_source: utmParams.utm_source,
                  utm_medium: utmParams.utm_medium,
                  utm_campaign: utmParams.utm_campaign,
                  utm_content: utmParams.utm_content,
                  utm_term: utmParams.utm_term,
                  device_type: deviceType,
                  browser_name: event.userContext?.browserName,
                  browser_version: event.userContext?.browserVersion,
                  operating_system: event.userContext?.platform || event.userContext?.os,
                  screen_resolution: event.userContext?.screen ? 
                    `${event.userContext.screen.width}x${event.userContext.screen.height}` : null,
                  viewport_size: event.userContext?.viewport ? 
                    `${event.userContext.viewport.width}x${event.userContext.viewport.height}` : null,
                                     user_agent: userAgent,
                   ip_address: null, // Skip IP for now due to INET type issues
                   country_code: req.headers['cf-ipcountry'] || null,
                  element_selector: event.elementSelector || event.element?.className,
                  element_text: event.elementText || event.element?.textContent || event.eventData?.elementText,
                  element_attributes: event.eventData?.elementAttributes || event.element || {},
                  form_data: event.eventData?.formData || event.eventData?.formFields || {},
                  scroll_depth: event.eventData?.scrollDepth || 0,
                  time_on_page: event.eventData?.timeOnPage || 0,
                  conversion_value: event.eventData?.conversionValue || null,
                  custom_properties: {
                    ...event.eventData,
                    originalEvent: event
                  }
                })
                .select('id')
                .single();

              if (directError) {
                console.error('❌ Direct insert also failed:', directError);
              } else {
                eventId = directInsert.id;
                console.log(`✅ Tracked event via direct insert: ${eventId} (${eventType})`);
              }
            } else {
              eventId = data;
              console.log(`✅ Tracked comprehensive event: ${eventId} (${eventType})`);
            }
          } catch (rpcError) {
            console.error('❌ Error with comprehensive tracking:', rpcError);
          }

          if (eventId) {
            processedEvents.push({ eventId, originalEvent: event });
          }

          // Also save to legacy analytics_events table for backward compatibility
          const { error: legacyError } = await supabase
            .from('analytics_events')
            .insert({
              session_id: sessionId,
              event_type: eventType,
              element_selector: event.elementSelector || event.element?.className,
              element_text: event.eventData?.elementText || event.element?.textContent,
              element_attributes: event.eventData?.elementAttributes || event.element || {},
              page_url: pageUrl,
              page_title: event.pageContext?.title || event.element?.title,
              referrer_url: event.pageContext?.referrer,
              device_type: deviceType,
              browser_info: {
                userAgent: userAgent,
                language: event.userContext?.language,
                platform: event.userContext?.platform
              },
              user_agent: userAgent,
              viewport_size: event.userContext?.viewport,
              screen_size: event.userContext?.screen,
              event_data: event.eventData || event
            });

          if (legacyError) {
            console.warn('⚠️ Legacy analytics save warning:', legacyError);
          }

        } catch (eventError) {
          console.error('❌ Error processing individual event:', eventError, event);
        }
      }

      console.log(`✅ Processed ${processedEvents.length}/${events.length} events successfully`);
    }

    // Return success
    res.json({
      success: true,
      processed: events.length,
      timestamp: new Date(),
      sessionId: metadata?.sessionId,
      message: 'Events processed with comprehensive tracking'
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

// Comprehensive analytics endpoint for authenticated users
app.get('/api/analytics/comprehensive', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    console.log(`📊 Fetching comprehensive analytics for last ${days} days`);
    
    // Mock user ID for demo - in production, get from auth
    const mockUserId = '00000000-0000-0000-0000-000000000000';
    
    // Get comprehensive analytics using our new function
    const { data, error } = await supabase.rpc('get_user_comprehensive_analytics', {
      p_user_id: mockUserId,
      p_days: parseInt(days)
    });
    
    if (error) {
      console.error('❌ Error fetching comprehensive analytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics data',
        details: error.message
      });
    }
    
    const analytics = data && data.length > 0 ? data[0] : {
      total_visitors: 0,
      total_pageviews: 0,
      total_sessions: 0,
      total_conversions: 0,
      conversion_rate: 0,
      top_pages: [],
      top_utm_sources: [],
      device_breakdown: [],
      daily_stats: []
    };
    
    res.json({
      success: true,
      data: analytics,
      timeframe: `${days} days`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Comprehensive analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comprehensive analytics',
      timestamp: new Date().toISOString()
    });
  }
});

// Workflow page mappings endpoint
app.get('/api/analytics/workflow-mappings', async (req, res) => {
  try {
    const { page_url } = req.query;
    
    if (!page_url) {
      return res.status(400).json({
        success: false,
        error: 'page_url parameter is required'
      });
    }
    
    console.log(`📊 Finding workflows for page: ${page_url}`);
    
    // Find workflows that match this page URL
    const { data, error } = await supabase.rpc('find_workflows_for_page_url', {
      p_page_url: page_url
    });
    
    if (error) {
      console.error('❌ Error finding workflow mappings:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to find workflow mappings',
        details: error.message
      });
    }
    
    res.json({
      success: true,
      page_url: page_url,
      matching_workflows: data || [],
      count: data ? data.length : 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Workflow mappings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow mappings',
      timestamp: new Date().toISOString()
    });
  }
});

// Get active workflows endpoint
app.get('/api/workflows/active', async (req, res) => {
  try {
    const { url } = req.query;
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    console.log('📋 Fetching active workflows for:', url);
    console.log('🔑 API Key provided:', apiKey ? 'Yes' : 'No');
    console.log('🌐 Origin:', req.get('origin') || 'Not set');
    console.log('🔗 Referer:', req.get('referer') || 'Not set');
    
    if (apiKey) {
      // Use API key authentication for external access
      console.log('🔑 Using API key authentication');
      
      const { data: workflows, error } = await supabase.rpc('get_active_workflows_for_url', {
        p_api_key: apiKey,
        p_url: url || ''
      });
      
      if (error) {
        console.error('❌ API key authentication failed:', error);
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired API key',
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`✅ Found ${workflows.length} workflows via API key`);
      
      return res.json({
        success: true,
        workflows: workflows,
        count: workflows.length,
        url,
        timestamp: new Date().toISOString()
      });
    }
    
    // Fallback to demo workflows using service role (bypasses RLS)
    console.log('⚠️ No API key provided, using service role for demo workflows');
    
    // Use service role client to access demo workflows (bypasses RLS)
    const { data: workflows, error } = await supabaseServiceRole
      .from('workflows_with_nodes')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'active')
      .limit(10); // Limit demo workflows for security
    
    if (error) {
      console.error('❌ Supabase error:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error hint:', error.hint || 'No additional hint');
      
      // Provide specific error message for RLS issues
      let errorMessage = 'Failed to fetch workflows from database';
      if (error.message.includes('RLS') || error.message.includes('policy')) {
        errorMessage = 'Database access blocked by security policies. Please use API key authentication.';
      }
      
      return res.status(500).json({
        success: false,
        error: errorMessage,
        debug: this.config?.debug ? {
          originalError: error.message,
          hint: error.hint,
          details: error.details
        } : undefined,
        timestamp: new Date().toISOString()
      });
    }
    
    // Enhanced URL matching logic
    const activeWorkflows = workflows.filter(workflow => {
      const targetUrl = workflow.target_url;
      
      if (!targetUrl || !url) return false;
      
      try {
        const currentUrl = new URL(url);
        
        // Universal match - runs on all pages
        if (targetUrl === '*') {
          console.log(`✅ Universal match for workflow: ${workflow.name}`);
          return true;
        }
        
        // Exact URL match
        if (targetUrl === url) {
          console.log(`✅ Exact match for workflow: ${workflow.name}`);
          return true;
        }
        
        // Path-based matching
        if (targetUrl.startsWith('/')) {
          const matches = currentUrl.pathname.includes(targetUrl);
          if (matches) {
            console.log(`✅ Path match for workflow: ${workflow.name} (${targetUrl})`);
          }
          return matches;
        }
        
        // Domain-based matching
        if (targetUrl.includes('.')) {
          const matches = currentUrl.hostname.includes(targetUrl);
          if (matches) {
            console.log(`✅ Domain match for workflow: ${workflow.name} (${targetUrl})`);
          }
          return matches;
        }
        
        // Query parameter matching
        if (targetUrl.includes('?') || targetUrl.includes('=')) {
          const targetParams = new URLSearchParams(targetUrl.split('?')[1] || targetUrl);
          const currentParams = currentUrl.searchParams;
          
          for (const [key, value] of targetParams) {
            if (currentParams.get(key) !== value) {
              return false;
            }
          }
          console.log(`✅ Query param match for workflow: ${workflow.name}`);
          return true;
        }
        
        // Regex pattern matching (advanced)
        if (targetUrl.startsWith('regex:')) {
          const pattern = targetUrl.replace('regex:', '');
          const regex = new RegExp(pattern);
          const matches = regex.test(url);
          if (matches) {
            console.log(`✅ Regex match for workflow: ${workflow.name} (${pattern})`);
          }
          return matches;
        }
        
        // Subdomain matching
        if (targetUrl.startsWith('subdomain:')) {
          const subdomain = targetUrl.replace('subdomain:', '');
          const matches = currentUrl.hostname.startsWith(subdomain + '.');
          if (matches) {
            console.log(`✅ Subdomain match for workflow: ${workflow.name} (${subdomain})`);
          }
          return matches;
        }
        
        // Contains matching (fallback)
        const matches = url.includes(targetUrl);
        if (matches) {
          console.log(`✅ Contains match for workflow: ${workflow.name} (${targetUrl})`);
        }
        return matches;
        
      } catch (urlError) {
        console.warn(`⚠️ Invalid URL format: ${url}, using simple string matching`);
        // Fallback to simple string matching if URL parsing fails
        return url.includes(targetUrl);
      }
    });
    
    console.log(`✅ Found ${activeWorkflows.length} active workflows for URL: ${url}`);
    
    // Log which workflows matched for debugging
    activeWorkflows.forEach(workflow => {
      console.log(`📋 Active workflow: ${workflow.name} (target: ${workflow.target_url})`);
    });
    
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

// Test endpoint to create a demo workflow (for debugging only)
app.post('/api/workflows/create-demo', async (req, res) => {
  try {
    console.log('🧪 Creating demo workflow for testing...');
    
    // First, create a test user (or use existing)
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID for testing
    
    const demoWorkflow = {
      id: 'demo-workflow-' + Date.now(),
      user_id: testUserId,
      name: 'Demo Mobile Workflow',
      description: 'Test workflow for mobile devices',
      is_active: true,
      status: 'active',
      target_url: '*', // Works on all pages
      executions: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const demoNodes = [
      {
        id: 'trigger-1',
        type: 'trigger',
        category: 'Device & Browser',
        name: 'Device Type',
        description: 'Trigger for mobile devices',
        icon: 'Smartphone',
        position: { x: 100, y: 50 },
        config: { deviceType: 'mobile' },
        inputs: [],
        outputs: ['output']
      },
      {
        id: 'action-1',
        type: 'action',
        category: 'Content Modification',
        name: 'Replace Text',
        description: 'Replace text for mobile users',
        icon: 'Type',
        position: { x: 400, y: 50 },
        config: {
          selector: 'h1, .hero-title, .main-title',
          newText: 'Mobile-Optimized Title!'
        },
        inputs: ['input'],
        outputs: []
      }
    ];
    
    const demoConnections = [
      {
        id: 'conn-1',
        sourceNodeId: 'trigger-1',
        targetNodeId: 'action-1',
        sourceHandle: 'output',
        targetHandle: 'input'
      }
    ];
    
    // Insert workflow using the save_workflow_complete function
    const { data: workflowId, error } = await supabase.rpc('save_workflow_complete', {
      p_workflow_id: null, // Create new
      p_user_id: testUserId,
      p_name: demoWorkflow.name,
      p_description: demoWorkflow.description,
      p_is_active: demoWorkflow.is_active,
      p_status: demoWorkflow.status,
      p_target_url: demoWorkflow.target_url,
      p_nodes: demoNodes,
      p_connections: demoConnections
    });
    
    if (error) {
      console.error('❌ Failed to create demo workflow:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create demo workflow',
        details: error.message
      });
    }
    
    console.log('✅ Demo workflow created with ID:', workflowId);
    
    res.json({
      success: true,
      workflowId: workflowId,
      message: 'Demo workflow created successfully',
      workflow: {
        ...demoWorkflow,
        id: workflowId,
        nodes: demoNodes,
        connections: demoConnections
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating demo workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create demo workflow',
      details: error.message
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
  console.log(`🔄 Workflows: GET http://localhost:${PORT}/api/workflows/active`);
  console.log(`🌐 Frontend: http://localhost:${PORT}/`);
});

export default app; 