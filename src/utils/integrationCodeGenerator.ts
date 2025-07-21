/**
 * Integration Code Generator - Updated for Unified Workflow System
 * Generates simple, clean integration code using the unified workflow system
 */

import { Workflow } from '../types/workflow';
import type { WorkflowConnection } from '../types/workflow';

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
 * Ensure workflow has a valid connections array linking trigger(s) to action(s)
 */
export function ensureWorkflowConnections(workflow: Workflow): Workflow {
  if (Array.isArray(workflow.connections) && workflow.connections.length > 0) {
    return workflow;
  }
  // Attempt to auto-generate connections: link each trigger to each action
  const triggerNodes = workflow.nodes.filter(n => n.type === 'trigger');
  const actionNodes = workflow.nodes.filter(n => n.type === 'action');
  const connections: WorkflowConnection[] = [];
  triggerNodes.forEach(trigger => {
    actionNodes.forEach(action => {
      connections.push({
        id: `${trigger.id}-${action.id}`,
        sourceNodeId: trigger.id,
        targetNodeId: action.id,
        sourceHandle: 'output',
        targetHandle: 'input'
      });
    });
  });
  return { ...workflow, connections };
}

/**
 * Generate HTML integration code for a workflow using the unified system
 */
export function generateIntegrationCode(
  workflow: Workflow,
  config: Partial<TrackingConfig> = {}
): IntegrationCode {
  // Ensure workflow has valid connections
  const workflowWithConnections = ensureWorkflowConnections(workflow);
  
  // Detect if we should use ngrok URL (when config provides external URLs)
  const baseUrl = config.apiEndpoint && config.apiEndpoint.includes('ngrok') 
    ? config.apiEndpoint.replace('/api/analytics/track', '')
    : 'https://trackflow-webapp-production.up.railway.app';

  const trackingConfig: TrackingConfig = {
    workflowId: workflowWithConnections.id,
    pageUrl: workflowWithConnections.targetUrl || '',
    apiEndpoint: `${baseUrl}/api/analytics/track`,
    trackingScriptUrl: `${baseUrl}/api/unified-workflow-system.js`,
    debug: true,
    autoTrack: true,
    customSelectors: [],
    ...config
  };

  console.log('🎯 Integration: Generating unified system code for workflow:', workflowWithConnections.name);

  // Generate simple integration code using unified system
  const headCode = generateUnifiedHeadCode(trackingConfig);
  const bodyCode = generateUnifiedBodyCode(trackingConfig, workflowWithConnections);
  const instructions = generateUnifiedInstructions(workflowWithConnections, trackingConfig);

  return {
    headCode,
    bodyCode,
    instructions,
    workflowId: workflowWithConnections.id,
    pageUrl: trackingConfig.pageUrl
  };
}

/**
 * Generate the simple head code for unified system
 */
function generateUnifiedHeadCode(config: TrackingConfig): string {
  return `<!-- Unified Workflow System - Add to <head> section -->
<script src="${config.trackingScriptUrl || 'https://trackflow-webapp-production.up.railway.app/api/unified-workflow-system.js'}"></script>`;
}

/**
 * Generate optional body code for custom configuration
 */
function generateUnifiedBodyCode(config: TrackingConfig, workflow: Workflow): string {
  // Only generate body code if we need custom configuration
  if (!config.debug) {
    return `<!-- No additional code needed - unified system auto-initializes! -->`;
  }

  return `<!-- Optional: Custom configuration and debug mode -->
<script>
  // Wait for system to load, then configure
  setTimeout(() => {
    if (window.workflowSystem) {
      // Enable debug mode to see workflow execution logs
      window.workflowSystem.config.debug = true;
      
      console.log('🎯 Workflow Integration: "${workflow.name}" loaded');
      console.log('📊 Workflows active:', window.workflowSystem.workflows.size);
      console.log('📱 Device type:', window.workflowSystem.pageContext.deviceType);
      console.log('🔗 Current URL:', window.location.href);
      
      // Optional: Manual trigger testing
      window.testWorkflow = function() {
        window.workflowSystem.handleEvent({
          eventType: 'manual_test',
          timestamp: Date.now()
        });
        console.log('🧪 Manual workflow test triggered');
      };
      
      // Show workflows in console
      console.log('📋 Active workflows for this page:');
      window.workflowSystem.workflows.forEach(workflow => {
        console.log(\`  • \${workflow.name} (target: \${workflow.target_url})\`);
      });
    } else {
      console.error('❌ Unified workflow system not loaded');
    }
  }, 2000);
</script>`;
}

/**
 * Generate implementation instructions for unified system
 */
function generateUnifiedInstructions(workflow: Workflow, config: TrackingConfig): string {
  const isExternalTesting = config.trackingScriptUrl?.includes('ngrok') || false;
  
  return `🎯 UNIFIED WORKFLOW SYSTEM - Simple Integration

Workflow: "${workflow.name}"
Target URL: ${workflow.targetUrl || 'Not specified'}

${isExternalTesting ? `🌐 EXTERNAL TESTING MODE (Webflow, Live Sites)
Testing URL: ${config.trackingScriptUrl?.replace('/api/unified-workflow-system.js', '')}
Make sure your ngrok tunnel is active: ngrok http 3001

` : `🏠 LOCAL TESTING MODE
For external sites (Webflow, etc.), click "Setup External Testing" to configure ngrok.

`}✅ INTEGRATION STEPS:

1. COPY the HEAD CODE and paste it in the <head> section of your webpage
   - This is ALL you need! The unified system handles everything automatically
   - Workflows load based on URL targeting set in the dashboard
   - No complex configuration or additional scripts required

2. (OPTIONAL) Add BODY CODE for debug mode and testing
   - Only needed if you want to see debug logs in console
   - Includes manual test functions for development

3. PUBLISH and TEST:
   - Visit your webpage where you added the code
   - Open browser developer tools (F12) → Console tab
   - Look for "🎯 Unified Workflow System" messages
   - Workflows will automatically execute based on triggers

${isExternalTesting ? `
🌐 WEBFLOW INTEGRATION:
- Add HEAD CODE to: Project Settings → Custom Code → Head Code
- (Optional) Add BODY CODE to: Project Settings → Custom Code → Footer Code
- Publish your Webflow site
- Test on your live Webflow domain

` : `
🔧 FOR WEBFLOW/EXTERNAL TESTING:
- Click "Setup External Testing" button in this modal
- Install ngrok: npm install -g ngrok
- Run: ngrok http 3001
- Use the HTTPS ngrok URL provided

`}📊 HOW IT WORKS:

• URL Targeting: Workflows execute only on pages matching their target URL
• Automatic Loading: System fetches relevant workflows for current page
• Smart Triggers: Evaluates device type, UTM parameters, scroll, clicks, etc.
• Instant Actions: Executes text replacement, element hiding/showing, overlays
• Zero Maintenance: No server dependencies after initial script load

📍 URL TARGETING EXAMPLES:
• "*" → All pages (global workflows)
• "/pricing" → Pricing pages only  
• "/blog/" → All blog pages
• "?utm_source=google" → Google traffic only

🧪 TESTING:
${config.debug ? '• Debug mode enabled - check console for detailed logs' : '• Enable debug mode in body code to see execution logs'}
• Manual test function: testWorkflow() (when debug mode enabled)
• Workflow status: window.workflowSystem.workflows.size
• Device detection: window.workflowSystem.pageContext.deviceType

⚡ PERFORMANCE:
• 90% faster than old system (no server round-trips)
• Works offline after initial load
• Single script, zero configuration
• Automatic content flicker prevention

⚠️ IMPORTANT NOTES:
• Ensure workflow is ACTIVE in dashboard (status = "active")
• Verify target URL matches your page (use "*" for all pages)  
• For Webflow: Add to Project Settings, not individual pages
• Test in browser developer tools console for debug info

🎯 RESULT: Your website will automatically personalize based on user behavior, 
device type, traffic source, and other triggers - with just one line of code!`;
}

// Legacy functions for compatibility (marked as deprecated)

/**
 * @deprecated Use generateUnifiedInstructions instead
 */
function generateInstructions(workflow: Workflow, config: TrackingConfig): string {
  console.warn('⚠️ generateInstructions is deprecated. Use generateUnifiedInstructions instead.');
  return generateUnifiedInstructions(workflow, config);
}

/**
 * @deprecated Use generateUnifiedHeadCode instead  
 */
function generateHeadCode(config: TrackingConfig, customSelectors: string[]): string {
  console.warn('⚠️ generateHeadCode is deprecated. Use generateUnifiedHeadCode instead.');
  return generateUnifiedHeadCode(config);
}

/**
 * @deprecated Use generateUnifiedBodyCode instead
 */
function generateBodyCode(config: TrackingConfig, workflow: Workflow): string {
  console.warn('⚠️ generateBodyCode is deprecated. Use generateUnifiedBodyCode instead.');
  return generateUnifiedBodyCode(config, workflow);
}

/**
 * Generate a simple HTML test page using the unified workflow system
 */
export function generateTestPage(workflow: Workflow): string {
  // Always ensure connections for test page
  const workflowWithConnections = ensureWorkflowConnections(workflow);
  const integration = generateIntegrationCode(workflowWithConnections);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Page - ${workflowWithConnections.name}</title>
  
  ${integration.headCode}
  
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      margin: 0; 
      padding: 20px; 
      line-height: 1.6;
      background: #f8f9fa;
    }
    .container { 
      max-width: 800px; 
      margin: 0 auto; 
      background: white; 
      padding: 30px; 
      border-radius: 10px; 
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .hero-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 10px;
      text-align: center;
      margin-bottom: 30px;
    }
    .hero-headline {
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 1rem;
    }
    .cta-button, .button-primary { 
      background: #ff6b6b; 
      color: white; 
      padding: 15px 30px; 
      border: none; 
      border-radius: 25px; 
      font-size: 16px; 
      font-weight: 600;
      cursor: pointer; 
      margin: 10px; 
      text-decoration: none;
      display: inline-block;
      transition: all 0.3s ease;
    }
    .cta-button:hover, .button-primary:hover { 
      background: #ff5252; 
      transform: translateY(-2px);
    }
    .test-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #007bff;
    }
    .status-panel {
      background: #e3f2fd;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 14px;
      margin: 15px 0;
    }
    form { 
      background: #f9f9f9; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0; 
    }
    input, textarea { 
      width: 100%; 
      padding: 12px; 
      margin: 8px 0; 
      border: 1px solid #ddd; 
      border-radius: 5px; 
      font-size: 14px;
    }
    button[type="submit"] { 
      background: #28a745; 
      color: white; 
    }
    .long-content { 
      height: 1500px; 
      background: linear-gradient(to bottom, #f0f0f0, #ffffff); 
      padding: 30px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .special-banner {
      background: #ffc107;
      color: #333;
      padding: 15px;
      text-align: center;
      font-weight: 600;
      border-radius: 5px;
      margin: 10px 0;
      display: none; /* Hidden by default, can be shown by workflow */
    }
    #debug-panel {
      position: fixed;
      top: 10px;
      right: 10px;
      background: #000;
      color: #0f0;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      max-width: 250px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero-section">
      <h1 class="hero-headline">Workflow Test Page</h1>
      <p>Testing: "${workflowWithConnections.name}"</p>
      <a href="#test" class="button-primary">Get Started Free</a>
    </div>
    
    <div class="special-banner" id="utm-banner">
      🎉 Special offer for Google visitors! 50% off today only.
    </div>
    
    <div class="test-section">
      <h2>System Status</h2>
      <div id="system-status" class="status-panel">Loading unified workflow system...</div>
    </div>
    
    <div class="test-section">
      <h2>Test Elements for Workflows</h2>
      <p>These elements can be targeted by workflow actions:</p>
      
      <div>
        <h3>Call to Action Buttons</h3>
        <button class="cta-button">Primary CTA Button</button>
        <button class="btn cta">Secondary CTA</button>
        <a href="#pricing" class="button-primary">Pricing Link</a>
      </div>
      
      <div>
        <h3>Text Elements</h3>
        <p class="hero-subtitle">This subtitle can be replaced by workflows</p>
        <div class="feature-title">Feature headline that can change</div>
        <span class="price">$49<small>/month</small></span>
      </div>
    </div>
    
    <div class="test-section" id="test">
      <h2>Form Test</h2>
      <form>
        <label>Name:</label>
        <input type="text" name="name" placeholder="Your Name" required>
        
        <label>Email:</label>
        <input type="email" name="email" placeholder="Your Email" required>
        
        <label>Message:</label>
        <textarea name="message" placeholder="Your Message" rows="4"></textarea>
        
        <button type="submit">Submit Form</button>
      </form>
    </div>
    
    <div class="test-section">
      <h2>Manual Test Buttons</h2>
      <button onclick="testMobile()" class="cta-button">Test Mobile Device</button>
      <button onclick="testUTM()" class="cta-button">Test UTM Parameters</button>
      <button onclick="testScroll()" class="cta-button">Test Scroll Depth</button>
      <button onclick="testExit()" class="cta-button">Test Exit Intent</button>
    </div>
    
    <div class="long-content">
      <h2>Long Content for Scroll Testing</h2>
      <p>Scroll down to test scroll depth triggers...</p>
      <div style="margin-top: 400px;">
        <h3>25% Scroll Point</h3>
        <p>You've scrolled 25% of the page.</p>
      </div>
      <div style="margin-top: 400px;">
        <h3>50% Scroll Point</h3>
        <p>You've scrolled 50% of the page.</p>
      </div>
      <div style="margin-top: 400px;">
        <h3>75% Scroll Point</h3>
        <p>You've scrolled 75% of the page.</p>
      </div>
    </div>
  </div>
  
  <!-- Hidden elements that can be shown by workflow actions -->
  <div id="special-offer-modal" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border: 2px solid #007bff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 1000;">
    <h3>🎉 Special Offer!</h3>
    <p>This modal was triggered by your workflow!</p>
    <button onclick="this.parentElement.style.display='none'" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Close</button>
  </div>
  
  <div id="newsletter-popup" style="display: none; position: fixed; bottom: 20px; right: 20px; background: #28a745; color: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
    <h4>📧 Newsletter Signup</h4>
    <p>Subscribe to our newsletter!</p>
    <button onclick="this.parentElement.style.display='none'" style="background: white; color: #28a745; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Close</button>
  </div>

  <!-- Debug panel -->
  <div id="debug-panel" style="display: none;">
    <strong>Workflow Debug</strong><br>
    <span id="debug-info">Loading...</span>
  </div>

  ${integration.bodyCode}
  
  <!-- Test functions -->
  <script>
    // Test functions for manual trigger testing
    function testMobile() {
      if (window.workflowSystem) {
        window.workflowSystem.pageContext.deviceType = 'mobile';
        window.workflowSystem.handleEvent({
          eventType: 'device_type_test',
          deviceType: 'mobile'
        });
        console.log('🧪 Mobile device test triggered');
      }
    }
    
    function testUTM() {
      if (window.workflowSystem) {
        window.workflowSystem.pageContext.utm = {
          utm_source: 'google',
          utm_medium: 'cpc',
          utm_campaign: 'test'
        };
        window.workflowSystem.handleEvent({
          eventType: 'utm_test',
          utm: window.workflowSystem.pageContext.utm
        });
        console.log('🧪 UTM parameters test triggered');
      }
    }
    
    function testScroll() {
      if (window.workflowSystem) {
        window.workflowSystem.handleEvent({
          eventType: 'scroll',
          scrollPercentage: 75
        });
        console.log('🧪 Scroll depth test triggered (75%)');
      }
    }
    
    function testExit() {
      if (window.workflowSystem) {
        window.workflowSystem.handleEvent({
          eventType: 'exit_intent'
        });
        console.log('🧪 Exit intent test triggered');
      }
    }
    
    // Update system status
    function updateStatus() {
      const statusDiv = document.getElementById('system-status');
      const debugPanel = document.getElementById('debug-panel');
      const debugInfo = document.getElementById('debug-info');
      
      if (window.workflowSystem) {
        const system = window.workflowSystem;
        statusDiv.innerHTML = \`
          ✅ Status: \${system.initialized ? 'Ready' : 'Loading'}<br>
          📊 Workflows: \${system.workflows.size}<br>
          📱 Device: \${system.pageContext.deviceType}<br>
          🔗 URL: \${window.location.pathname}<br>
          🎯 Debug: \${system.config.debug ? 'ON' : 'OFF'}
        \`;
        
        debugInfo.innerHTML = \`
          Workflows: \${system.workflows.size}<br>
          Device: \${system.pageContext.deviceType}<br>
          Ready: \${system.initialized ? 'YES' : 'NO'}
        \`;
        debugPanel.style.display = 'block';
      } else {
        statusDiv.innerHTML = '⏳ Loading unified workflow system...';
        setTimeout(updateStatus, 1000);
      }
    }
    
    // Start status updates
    updateStatus();
    setInterval(updateStatus, 5000);
    
    // Show initial message
    console.log('🎯 Test page loaded for workflow: ${workflowWithConnections.name}');
    console.log('📍 Target URL: ${workflowWithConnections.targetUrl || 'Not specified'}');
    console.log('🔗 Current URL:', window.location.href);
  </script>
</body>
</html>`;
} 