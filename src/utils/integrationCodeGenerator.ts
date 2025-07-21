/**
 * Integration Code Generator
 * Generates HTML code snippets for embedding element tracking on websites
 */

import { Workflow } from '../types/workflow';

export interface IntegrationCode {
  headCode: string;
  bodyCode: string;
  instructions: string;
  workflowId: string;
  pageUrl: string;
}

export interface TrackingConfig {
  workflowId: string;
  pageUrl: string;
  apiEndpoint?: string;
  trackingScriptUrl?: string;
  debug?: boolean;
  autoTrack?: boolean;
  customSelectors?: string[];
}

/**
 * Generate HTML integration code for a workflow
 */
export function generateIntegrationCode(
  workflow: Workflow,
  config: Partial<TrackingConfig> = {}
): IntegrationCode {
  // Detect if we should use ngrok URL (when config provides external URLs)
  const baseUrl = config.apiEndpoint && config.apiEndpoint.includes('ngrok') 
    ? config.apiEndpoint.replace('/api/analytics/track', '')
    : 'https://trackflow-webapp-production.up.railway.app';

  const trackingConfig: TrackingConfig = {
    workflowId: workflow.id,
    pageUrl: workflow.targetUrl || '',
    apiEndpoint: `${baseUrl}/api/analytics/track`,
    trackingScriptUrl: `${baseUrl}/tracking-script.js`,
    debug: true,
    autoTrack: true,
    customSelectors: [],
    ...config
  };

  console.log('🎯 Integration: Generating code for workflow:', workflow.name);

  // Generate custom tracking selectors based on workflow nodes
  const customSelectors = extractSelectorsFromWorkflow(workflow);

  // Head code - includes the tracking script and initialization
  const headCode = generateHeadCode(trackingConfig, customSelectors);

  // Body code - includes workflow-specific configurations
  const bodyCode = generateBodyCode(trackingConfig, workflow);

  // Instructions for implementation
  const instructions = generateInstructions(workflow, trackingConfig);

  return {
    headCode,
    bodyCode,
    instructions,
    workflowId: workflow.id,
    pageUrl: trackingConfig.pageUrl
  };
}

/**
 * Extract CSS selectors from workflow trigger and action nodes
 */
function extractSelectorsFromWorkflow(workflow: Workflow): string[] {
  const selectors: string[] = [];

  workflow.nodes.forEach(node => {
    // Extract selectors from trigger nodes
    if (node.type === 'trigger') {
      switch (node.category) {
        case 'Visitor Behavior':
          if (node.name === 'Scroll Depth' && node.config.element) {
            selectors.push(node.config.element);
          }
          break;
      }
    }

    // Extract selectors from action nodes
    if (node.type === 'action') {
      switch (node.category) {
        case 'Content Modification':
          if (node.config.selector) {
            selectors.push(node.config.selector);
          }
          break;
      }
    }
  });

  // Remove duplicates and empty selectors
  return [...new Set(selectors)].filter(selector => selector && selector.trim());
}

/**
 * Generate the <head> section code
 */
function generateHeadCode(config: TrackingConfig, customSelectors: string[]): string {
  const trackingScript = getTrackingScript(config.trackingScriptUrl || 'https://trackflow-webapp-production.up.railway.app/tracking-script.js');
  
  return `<!-- Element Tracking Integration - Add to <head> section -->
<script>
  // Tracking Configuration
  window.ELEMENT_TRACKING_CONFIG = ${JSON.stringify({
    workflowId: config.workflowId,
    pageUrl: config.pageUrl,
    apiEndpoint: config.apiEndpoint,
    debug: config.debug,
    autoTrack: config.autoTrack,
    customSelectors: customSelectors
  }, null, 2)};
</script>

<!-- Element Tracking Script -->
<script>
${trackingScript}
</script>`;
}

/**
 * Generate the body code (usually placed before closing </body> tag)
 */
function generateBodyCode(config: TrackingConfig, workflow: Workflow): string {
  const workflowTriggers = generateWorkflowTriggers(workflow);
  const customTracking = generateCustomTracking(config);

  return `<!-- Element Tracking Initialization - Add before closing </body> tag -->
<script>
  // Wait for elementTracker and config to be ready before initializing workflow logic
  document.addEventListener('DOMContentLoaded', function() {
    function tryInitWorkflow() {
      if (window.elementTracker && window.ELEMENT_TRACKING_CONFIG && window.ELEMENT_TRACKING_CONFIG.workflowId) {
        console.log('🎯 Workflow Integration: Initializing tracking for "${workflow.name}"');
        ${workflowTriggers}
        ${customTracking}
        // Setup workflow trigger checking
        setupWorkflowTriggers('${workflow.id}');
        console.log('✅ Workflow Integration: Setup complete for "${workflow.name}"');
      } else {
        setTimeout(tryInitWorkflow, 100); // Retry every 100ms
      }
    }
    tryInitWorkflow();
  });

  // Function to check workflow triggers
  function setupWorkflowTriggers(workflowId) {
    if (!window.elementTracker) return;
    // Override the event processing to check triggers
    const originalAddEvent = window.elementTracker.addEvent.bind(window.elementTracker);
    window.elementTracker.addEvent = function(event) {
      // Call original event processing
      originalAddEvent(event);
      // Check if this event should trigger any workflows
      checkWorkflowTrigger(event, workflowId);
    };
  }
  
  // Check if an event should trigger workflow actions
  async function checkWorkflowTrigger(event, workflowId) {
    try {
      const response = await fetch('${config.apiEndpoint?.replace('/analytics/track', '/workflows/trigger-check') || 'https://trackflow-webapp-production.up.railway.app/api/workflows/trigger-check'}', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: event,
          workflowId: workflowId
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.triggered && result.actions) {
          console.log('🔄 Workflow Triggered:', result.actions);
          executeWorkflowActions(result.actions);
        }
      }
    } catch (error) {
      console.error('❌ Workflow trigger check failed:', error);
    }
  }
  
  // Execute workflow actions
  function executeWorkflowActions(actions) {
    actions.forEach(action => {
      setTimeout(() => {
        executeAction(action);
      }, action.delay || 0);
    });
  }
  
  // Execute individual action
  function executeAction(action) {
    const elements = document.querySelectorAll(action.target);
    
    if (elements.length === 0) {
      console.warn('⚠️ Action target not found:', action.target);
      return;
    }
    
    console.log(\`🎬 Executing action: \${action.type} on \${elements.length} element(s) - \${action.triggeredBy || 'Unknown trigger'}\`);
    
    elements.forEach(element => {
      switch (action.type) {
        case 'show_element':
          element.style.display = 'block';
          if (action.animation === 'fade') {
            element.style.opacity = '0';
            element.style.transition = 'opacity 0.3s ease';
            setTimeout(() => { element.style.opacity = '1'; }, 10);
          } else if (action.animation === 'slide') {
            element.style.transform = 'translateY(-20px)';
            element.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            element.style.opacity = '0';
            setTimeout(() => { 
              element.style.transform = 'translateY(0)';
              element.style.opacity = '1'; 
            }, 10);
          } else if (action.animation === 'bounce') {
            element.style.transform = 'scale(0.8)';
            element.style.transition = 'transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            setTimeout(() => { element.style.transform = 'scale(1)'; }, 10);
          }
          console.log('✅ Action executed: Show element', action.target);
          break;
          
        case 'hide_element':
          if (action.animation === 'fade') {
            element.style.transition = 'opacity 0.3s ease';
            element.style.opacity = '0';
            setTimeout(() => { element.style.display = 'none'; }, 300);
          } else if (action.animation === 'slide') {
            element.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            element.style.transform = 'translateY(-20px)';
            element.style.opacity = '0';
            setTimeout(() => { element.style.display = 'none'; }, 300);
          } else {
            element.style.display = 'none';
          }
          console.log('✅ Action executed: Hide element', action.target);
          break;
          
        case 'replace_text':
          const oldText = element.textContent;
          if (action.animation === 'fade') {
            element.style.transition = 'opacity 0.2s ease';
            element.style.opacity = '0';
            setTimeout(() => {
              element.textContent = action.newText;
              element.style.opacity = '1';
            }, 200);
          } else {
            element.textContent = action.newText;
          }
          console.log('✅ Action executed: Replace text', { 
            target: action.target, 
            old: oldText, 
            new: action.newText 
          });
          break;
          
        case 'add_class':
          element.classList.add(action.className);
          console.log('✅ Action executed: Add class', { 
            target: action.target, 
            class: action.className 
          });
          break;
          
        case 'remove_class':
          element.classList.remove(action.className);
          console.log('✅ Action executed: Remove class', { 
            target: action.target, 
            class: action.className 
          });
          break;
          
        case 'modify_style':
          Object.assign(element.style, action.styles);
          console.log('✅ Action executed: Modify style', { 
            target: action.target, 
            styles: action.styles 
          });
          break;
          
        case 'track_event':
          // Custom event tracking
          if (window.elementTracker) {
            window.elementTracker.addEvent({
              eventType: 'workflow_action_executed',
              elementSelector: action.target,
              timestamp: Date.now(),
              sessionId: window.elementTracker.sessionId,
              eventData: {
                actionType: action.type,
                triggeredBy: action.triggeredBy,
                customData: action.eventData
              },
              pageContext: window.elementTracker.pageContext,
              userContext: window.elementTracker.userContext
            });
          }
          console.log('✅ Action executed: Track event', action.eventData);
          break;
          
        default:
          console.warn('⚠️ Unknown action type:', action.type);
      }
    });
  }
</script>

<!-- Optional: Add this hidden element for testing triggers -->
<div id="workflow-debug" style="display: none; position: fixed; top: 10px; right: 10px; background: black; color: white; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; z-index: 9999;">
  Workflow: ${workflow.name}<br>
  ID: ${workflow.id}<br>
  <span id="event-count">Events: 0</span>
</div>

<script>
  // Debug counter (only if debug mode is enabled)
  if (window.ELEMENT_TRACKING_CONFIG && window.ELEMENT_TRACKING_CONFIG.debug) {
    let eventCount = 0;
    const debugEl = document.getElementById('workflow-debug');
    const countEl = document.getElementById('event-count');
    
    if (debugEl && window.elementTracker) {
      debugEl.style.display = 'block';
      
      // Override addEvent to update counter
      const originalAddEvent = window.elementTracker.addEvent.bind(window.elementTracker);
      window.elementTracker.addEvent = function(event) {
        originalAddEvent(event);
        eventCount++;
        if (countEl) countEl.textContent = \`Events: \${eventCount}\`;
      };
    }
  }
</script>`;
}

/**
 * Generate workflow-specific trigger setup code
 */
function generateWorkflowTriggers(workflow: Workflow): string {
  const triggers: string[] = [];

  workflow.nodes.forEach(node => {
    if (node.type !== 'trigger') return;

    switch (node.category) {
      case 'Visitor Behavior':
        if (node.name === 'Page Visits') {
          triggers.push(`// Page visits trigger - already handled by auto-tracking`);
        } else if (node.name === 'Time on Page') {
          const duration = node.config.duration || 30;
          const unit = node.config.unit || 'seconds';
          const ms = unit === 'minutes' ? duration * 60000 : duration * 1000;
          triggers.push(`
      // Time on page trigger: ${duration} ${unit}
      setTimeout(function() {
        window.elementTracker.addEvent({
          eventType: 'time_threshold_reached',
          timestamp: Date.now(),
          sessionId: window.elementTracker.sessionId,
          eventData: { duration: ${duration}, unit: '${unit}' },
          pageContext: window.elementTracker.pageContext,
          userContext: window.elementTracker.userContext
        });
      }, ${ms});`);
        } else if (node.name === 'Scroll Depth') {
          const percentage = node.config.percentage || 50;
          const element = node.config.element || 'body';
          triggers.push(`
      // Scroll depth trigger: ${percentage}%
      let scrollTriggered = false;
      window.addEventListener('scroll', function() {
        if (scrollTriggered) return;
        
        const scrollPercent = Math.round(
          (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
        );
        
        if (scrollPercent >= ${percentage}) {
          scrollTriggered = true;
          window.elementTracker.addEvent({
            eventType: 'scroll_depth_reached',
            timestamp: Date.now(),
            sessionId: window.elementTracker.sessionId,
            eventData: { 
              percentage: scrollPercent, 
              threshold: ${percentage},
              targetElement: '${element}'
            },
            pageContext: window.elementTracker.pageContext,
            userContext: window.elementTracker.userContext
          });
        }
      });`);
        }
        break;

      case 'Device & Browser':
        if (node.name === 'Device Type') {
          const deviceType = node.config.deviceType || 'mobile';
          triggers.push(`
      // Device type trigger: ${deviceType}
      if (window.elementTracker.userContext.deviceType === '${deviceType}') {
        window.elementTracker.addEvent({
          eventType: 'device_type_match',
          timestamp: Date.now(),
          sessionId: window.elementTracker.sessionId,
          eventData: { 
            deviceType: '${deviceType}',
            actualDevice: window.elementTracker.userContext.deviceType
          },
          pageContext: window.elementTracker.pageContext,
          userContext: window.elementTracker.userContext
        });
      }`);
        }
        break;

      case 'Traffic Source':
        if (node.name === 'UTM Parameters') {
          const parameter = node.config.parameter || 'utm_source';
          const value = node.config.value || '';
          const operator = node.config.operator || 'equals';
          triggers.push(`
      // UTM parameter trigger: ${parameter} ${operator} ${value}
      const urlParams = new URLSearchParams(window.location.search);
      const utmValue = urlParams.get('${parameter}');
      let utmMatches = false;
      
      if (utmValue) {
        switch ('${operator}') {
          case 'equals':
            utmMatches = utmValue === '${value}';
            break;
          case 'contains':
            utmMatches = utmValue.includes('${value}');
            break;
          case 'exists':
            utmMatches = true;
            break;
        }
      }
      
      if (utmMatches) {
        window.elementTracker.addEvent({
          eventType: 'utm_parameter_match',
          timestamp: Date.now(),
          sessionId: window.elementTracker.sessionId,
          eventData: { 
            parameter: '${parameter}',
            value: utmValue,
            expectedValue: '${value}',
            operator: '${operator}'
          },
          pageContext: window.elementTracker.pageContext,
          userContext: window.elementTracker.userContext
        });
      }`);
        }
        break;
    }
  });

  return triggers.join('\n');
}

/**
 * Generate custom tracking setup based on configuration
 */
function generateCustomTracking(config: TrackingConfig): string {
  const customCode: string[] = [];

  if (config.customSelectors && config.customSelectors.length > 0) {
    config.customSelectors.forEach(selector => {
      customCode.push(`
      // Track custom selector: ${selector}
      window.elementTracker.track('${selector}', ['click', 'hover']);`);
    });
  }

  return customCode.join('\n');
}

/**
 * Generate implementation instructions
 */
function generateInstructions(workflow: Workflow, config: TrackingConfig): string {
  const isExternalTesting = config.trackingScriptUrl?.includes('ngrok') || false;
  
  return `Implementation Instructions for "${workflow.name}":

${isExternalTesting ? `🌐 EXTERNAL TESTING MODE (Webflow, Live Sites)
You're using ngrok for external testing. Make sure:
- Your local server is running (npm run dev:server)
- Ngrok tunnel is active (ngrok http 3001)
- Using the HTTPS ngrok URL: ${config.trackingScriptUrl?.replace('/tracking-script.js', '')}

` : `🏠 LOCAL TESTING MODE
For external sites (Webflow, etc.), click "Setup External Testing" to configure ngrok.

`}1. COPY the HEAD CODE and paste it in the <head> section of your webpage
   - This loads the tracking script and configuration
   ${isExternalTesting ? '- Uses your ngrok tunnel for external access' : '- Works for localhost testing only'}

2. COPY the BODY CODE and paste it just before the closing </body> tag
   - This initializes workflow-specific tracking and triggers
   - Sets up real-time workflow trigger evaluation

3. TEST the integration:
   - Open browser developer tools (F12) 
   - Look for console messages starting with "🎯 Element Tracker"
   - Interact with elements on your page to see tracking in action

4. VERIFY workflow triggers:
   - Perform actions that should trigger your workflow
   - Check the console for "🔄 Workflow Triggered" messages
   - Look for action execution messages with trigger attribution

5. MONITOR tracking events:
   - Debug panel shows in top-right corner (if debug enabled)
   - Real-time event counting and session tracking
   - Server logs show detailed analytics data

${isExternalTesting ? `
🌐 EXTERNAL TESTING TIPS:
- For Webflow: Use enhanced integration guide at ${config.trackingScriptUrl?.replace('/tracking-script.js', '')}/webflow
- Test on your actual Webflow site or external domain
- Check Network tab in DevTools to see API calls to ngrok
- Make sure HTTPS ngrok URL is being used (not HTTP)
- Ngrok free tier has usage limits - upgrade if needed

` : `
🔧 FOR WEBFLOW/EXTERNAL TESTING:
- For Webflow: Access enhanced integration guide at https://trackflow-webapp-production.up.railway.app/webflow
- Click "Setup External Testing" button above
- Install and run ngrok to create public tunnel
- Use the generated HTTPS URL for external sites

`}TARGET PAGE: ${config.pageUrl || 'Not specified'}
WORKFLOW NODES: ${workflow.nodes.length}
TRIGGERS: ${workflow.nodes.filter(n => n.type === 'trigger').length}
ACTIONS: ${workflow.nodes.filter(n => n.type === 'action').length}
${isExternalTesting ? `EXTERNAL URL: ${config.trackingScriptUrl?.replace('/tracking-script.js', '')}` : ''}

⚠️  IMPORTANT: This integration is for the page "${workflow.targetUrl || 'specified in workflow'}".
Make sure to implement it on the correct page for the workflow to function properly.`;
}

/**
 * Get the tracking script loading code
 */
function getTrackingScript(trackingScriptUrl: string): string {
  return `
// Element Tracker Script - Dynamically loaded from server
(function() {
  // Prevent double loading
  if (window.ElementTracker || window.elementTracker) {
    console.log('🎯 Element Tracker already loaded');
    return;
  }
  
  console.log('🎯 Loading Element Tracker from: ${trackingScriptUrl}');
  
  const script = document.createElement('script');
  script.src = '${trackingScriptUrl}';
  script.async = true;
  script.crossOrigin = 'anonymous';
  
  script.onload = function() {
    console.log('✅ Element Tracker script loaded successfully');
  };
  
  script.onerror = function() {
    console.error('❌ Failed to load Element Tracker script');
  };
  
  document.head.appendChild(script);
})();
`;
}

/**
 * Generate a simple HTML test page for testing the integration
 */
export function generateTestPage(workflow: Workflow): string {
  const integration = generateIntegrationCode(workflow);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Page - ${workflow.name}</title>
  
  ${integration.headCode}
  
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    .cta-button { background: #007cba; color: white; padding: 15px 30px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; margin: 10px; }
    .cta-button:hover { background: #005a87; }
    #special-offer-modal { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border: 2px solid #007cba; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 1000; }
    .long-content { height: 2000px; background: linear-gradient(to bottom, #f0f0f0, #ffffff); }
    form { background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; }
    input, textarea { width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 3px; }
    button[type="submit"] { background: #28a745; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Workflow Test Page: ${workflow.name}</h1>
    
    <p>This page is for testing the "${workflow.name}" workflow integration.</p>
    
    <!-- Test Elements -->
    <section>
      <h2>Call to Action Buttons</h2>
      <button class="cta-button">Primary CTA Button</button>
      <button class="btn cta">Secondary CTA</button>
      <a href="#" class="cta-button">CTA Link</a>
    </section>
    
    <section>
      <h2>Form Test</h2>
      <form>
        <input type="text" name="name" placeholder="Your Name" required>
        <input type="email" name="email" placeholder="Your Email" required>
        <textarea name="message" placeholder="Your Message"></textarea>
        <button type="submit">Submit Form</button>
      </form>
    </section>
    
    <section class="long-content">
      <h2>Long Content for Scroll Testing</h2>
      <p>Scroll down to test scroll depth triggers...</p>
      <div style="margin-top: 1000px;">
        <h3>75% Scroll Point</h3>
        <p>If you can see this, you've scrolled 75% of the page.</p>
      </div>
    </section>
  </div>
  
  <!-- Hidden elements that can be shown by workflow actions -->
  <div id="special-offer-modal">
    <h3>🎉 Special Offer!</h3>
    <p>This modal was triggered by your workflow!</p>
    <button onclick="this.parentElement.style.display='none'">Close</button>
  </div>
  
  <div id="newsletter-popup" style="display: none; position: fixed; bottom: 20px; right: 20px; background: #007cba; color: white; padding: 20px; border-radius: 5px;">
    <h4>📧 Newsletter</h4>
    <p>Subscribe to our newsletter!</p>
    <button onclick="this.parentElement.style.display='none'" style="background: white; color: #007cba; border: none; padding: 5px 10px; border-radius: 3px;">Close</button>
  </div>

  ${integration.bodyCode}
</body>
</html>`;
} 