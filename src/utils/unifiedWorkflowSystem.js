/**
 * Unified Workflow System
 * Single, robust system for workflow automation
 * Eliminates the complexity of dual execution paths
 */

(function() {
  'use strict';
  
  class UnifiedWorkflowSystem {
    constructor(config = {}) {
      this.config = {
        apiEndpoint: 'https://trackflow-webapp-production.up.railway.app',
        apiKey: null, // Add API key support
        debug: false,
        retryAttempts: 3,
        executionDelay: 100,
        hideContentDuringInit: true,
        maxInitTime: 5000, // Increased timeout
        elementWaitTimeout: 10000, // How long to wait for elements
        showLoadingIndicator: true, // Show loading spinner
        progressive: true, // Show content progressively as modifications complete
        ...config
      };
      
      this.workflows = new Map();
      this.executedActions = new Set();
      this.pageContext = this.getPageContext();
      this.userContext = this.getUserContext();
      this.contentHidden = false;
      this.initialized = false;
      this.loadingIndicatorShown = false;
      this.elementsToWaitFor = new Set(); // Track elements we're waiting for
      this.completedModifications = new Set(); // Track completed modifications
      
      // Auto-hide content if enabled and anti-flicker script hasn't already done it
      if (this.config.hideContentDuringInit && !window.unifiedWorkflowAntiFlicker?.isContentHidden()) {
        this.safeHideContent();
      }
      
      this.log('🎯 Unified Workflow System: Starting...');
    }

    /**
     * Initialize the workflow system
     */
    async initialize() {
      if (this.initialized) {
        this.log('⚠️ System already initialized', 'warning');
        return;
      }

      try {
        this.log('🚀 Initializing unified workflow system...');
        
        // Fetch all active workflows
        await this.fetchWorkflows();
        
        // Process immediate triggers (page load, device type, etc.)
        await this.processImmediateTriggers();
        
        // Set up event listeners for dynamic triggers
        this.setupEventListeners();
        
        // Wait for all pending element operations to complete
        await this.waitForAllModifications();
        
        // Show content after all modifications are complete
        this.showContent();
        
        this.initialized = true;
        this.log('✅ Unified workflow system ready!', 'success');
        
      } catch (error) {
        this.log(`❌ Initialization failed: ${error.message}`, 'error');
        this.showContent(); // Show content even if initialization fails
      }
    }

    /**
     * Fetch active workflows from the server
     */
    async fetchWorkflows() {
      try {
        const url = `${this.config.apiEndpoint}/api/workflows/active?url=${encodeURIComponent(window.location.href)}`;
        this.log(`📡 Fetching workflows from: ${url}`);
        
        // Prepare headers for API key authentication if available
        const headers = {};
        if (this.config.apiKey) {
          headers['X-API-Key'] = this.config.apiKey;
          this.log('🔑 Using API key authentication');
        }
        
        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.workflows) {
          // Store workflows in Map for efficient lookup
          data.workflows.forEach(workflow => {
            this.workflows.set(workflow.id, workflow);
          });
          
          this.log(`✅ Loaded ${data.workflows.length} active workflows`);
          return data.workflows;
        }
        
        this.log('⚠️ No active workflows found', 'warning');
        return [];
        
      } catch (error) {
        this.log(`❌ Failed to fetch workflows: ${error.message}`, 'error');
        return [];
      }
    }

    /**
     * Process triggers that fire immediately on page load
     */
    async processImmediateTriggers() {
      const eventData = {
        eventType: 'page_load',
        deviceType: this.pageContext.deviceType,
        visitCount: 1,
        timeOnPage: 0,
        scrollPercentage: 0,
        utm: this.pageContext.utm,
        ...this.userContext
      };
      
      await this.processWorkflows(eventData);
    }

    /**
     * Set up event listeners for dynamic triggers
     */
    setupEventListeners() {
      // Scroll depth tracking
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const scrollPercentage = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
          );
          
          this.handleEvent({
            eventType: 'scroll',
            scrollPercentage,
            timestamp: Date.now()
          });
        }, 100);
      });

      // Time on page tracking
      let timeOnPage = 0;
      setInterval(() => {
        timeOnPage += 1;
        this.handleEvent({
          eventType: 'time_on_page',
          timeOnPage,
          timestamp: Date.now()
        });
      }, 1000);

      // Click tracking
      document.addEventListener('click', (event) => {
        const selector = this.generateSelector(event.target);
        this.handleEvent({
          eventType: 'click',
          elementSelector: selector,
          element: event.target,
          timestamp: Date.now()
        });
      });

      // Exit intent detection
      document.addEventListener('mouseleave', (event) => {
        if (event.clientY <= 0) {
          this.handleEvent({
            eventType: 'exit_intent',
            timestamp: Date.now()
          });
        }
      });

      this.log('👂 Event listeners configured');
    }

    /**
     * Handle runtime events
     */
    async handleEvent(eventData) {
      await this.processWorkflows(eventData);
    }

    /**
     * Process all workflows against an event
     */
    async processWorkflows(eventData) {
      if (this.workflows.size === 0) {
        return;
      }

      for (const [workflowId, workflow] of this.workflows) {
        if (!workflow.is_active) continue;

        // Find trigger nodes
        const triggerNodes = workflow.nodes?.filter(node => node.type === 'trigger') || [];
        
        for (const trigger of triggerNodes) {
          if (this.evaluateTrigger(trigger, eventData)) {
            this.log(`🎯 Workflow triggered: ${workflow.name} by ${trigger.name}`);
            
            // Find and execute connected actions
            const actions = this.getConnectedActions(workflow, trigger.id);
            await this.executeActions(actions);
          }
        }
      }
    }

    /**
     * Evaluate if a trigger matches the current event
     */
    evaluateTrigger(trigger, eventData) {
      const { config = {}, name } = trigger;
      
      switch (name) {
        case 'Device Type':
          return this.pageContext.deviceType === config.deviceType;
          
        case 'UTM Parameters':
          if (!this.pageContext.utm) return false;
          const utmValue = this.pageContext.utm[config.parameter];
          switch (config.operator) {
            case 'equals': return utmValue === config.value;
            case 'contains': return utmValue && utmValue.includes(config.value);
            case 'exists': return Boolean(utmValue);
            default: return false;
          }
          
        case 'Page Visits':
          return eventData.visitCount >= (config.visitCount || 3);
          
        case 'Time on Page':
          const thresholdSeconds = config.unit === 'minutes' ? config.duration * 60 : config.duration;
          return eventData.timeOnPage >= thresholdSeconds;
          
        case 'Scroll Depth':
          return eventData.scrollPercentage >= (config.percentage || 50);
          
        case 'Element Click':
          return eventData.eventType === 'click' && 
                 eventData.elementSelector === config.selector;
          
        case 'Exit Intent':
          return eventData.eventType === 'exit_intent';
          
        default:
          this.log(`⚠️ Unknown trigger type: ${name}`, 'warning');
          return false;
      }
    }

    /**
     * Get actions connected to a trigger
     */
    getConnectedActions(workflow, triggerNodeId) {
      const connections = workflow.connections || [];
      const nodes = workflow.nodes || [];
      
      const connectedActionIds = connections
        .filter(conn => conn.sourceNodeId === triggerNodeId)
        .map(conn => conn.targetNodeId);
      
      return nodes.filter(node => 
        node.type === 'action' && connectedActionIds.includes(node.id)
      );
    }

    /**
     * Execute a list of actions
     */
    async executeActions(actions) {
      for (const action of actions) {
        await this.executeAction(action);
        
        // Add delay between actions if configured
        if (this.config.executionDelay > 0) {
          await this.delay(this.config.executionDelay);
        }
      }
    }

    /**
     * Execute a single action
     */
    async executeAction(action) {
      const actionKey = `${action.id}-${Date.now()}`;
      
      // Prevent duplicate executions
      if (this.executedActions.has(actionKey)) {
        return { success: false, reason: 'already_executed' };
      }
      this.executedActions.add(actionKey);
      
      const { config = {}, name } = action;
      this.log(`⚡ Executing: ${name}`, config);

      try {
        let result = { success: false };
        
        switch (name) {
          case 'Replace Text':
            result = await this.replaceText(config);
            break;
            
          case 'Hide Element':
            result = await this.hideElement(config);
            break;
            
          case 'Show Element':
            result = await this.showElement(config);
            break;
            
          case 'Modify CSS':
            result = await this.modifyCSS(config);
            break;
            
          case 'Add Class':
            result = await this.addClass(config);
            break;
            
          case 'Remove Class':
            result = await this.removeClass(config);
            break;
            
          case 'Display Overlay':
            result = await this.displayOverlay(config);
            break;
            
          case 'Redirect Page':
            result = await this.redirectPage(config);
            break;
            
          default:
            this.log(`⚠️ Unknown action: ${name}`, 'warning');
            result = { success: false, error: `Unknown action: ${name}` };
        }
        
        return result;
        
      } catch (error) {
        this.log(`❌ Action failed: ${name} - ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    // Action implementations
    async replaceText(config) {
      try {
        // Wait for elements to be available
        await this.waitForElement(config.selector);
        
        const elements = document.querySelectorAll(config.selector);
        let modifiedCount = 0;
        
        elements.forEach(element => {
          if (config.originalText && element.textContent.includes(config.originalText)) {
            element.textContent = element.textContent.replace(config.originalText, config.newText);
            modifiedCount++;
          } else if (config.newText) {
            element.textContent = config.newText;
            modifiedCount++;
          }
        });
        
        // Mark this modification as complete
        this.completedModifications.add(`replaceText:${config.selector}`);
        this.log(`✅ Text replaced in ${modifiedCount}/${elements.length} elements (${config.selector})`);
        
        return { success: true, modified: modifiedCount, total: elements.length };
        
      } catch (error) {
        this.log(`❌ Text replacement failed for ${config.selector}: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    async hideElement(config) {
      try {
        await this.waitForElement(config.selector);
        
        const elements = document.querySelectorAll(config.selector);
        elements.forEach(element => {
          if (config.animation === 'fade') {
            element.style.transition = 'opacity 0.3s ease';
            element.style.opacity = '0';
            setTimeout(() => element.style.display = 'none', 300);
          } else {
            element.style.display = 'none';
          }
        });
        
        this.completedModifications.add(`hideElement:${config.selector}`);
        this.log(`✅ Hidden ${elements.length} elements (${config.selector})`);
        return { success: true, hidden: elements.length };
        
      } catch (error) {
        this.log(`❌ Hide element failed for ${config.selector}: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    async showElement(config) {
      try {
        await this.waitForElement(config.selector);
        
        const elements = document.querySelectorAll(config.selector);
        elements.forEach(element => {
          element.style.display = 'block';
          if (config.animation === 'fade') {
            element.style.opacity = '0';
            element.style.transition = 'opacity 0.3s ease';
            setTimeout(() => element.style.opacity = '1', 10);
          }
        });
        
        this.completedModifications.add(`showElement:${config.selector}`);
        this.log(`✅ Shown ${elements.length} elements (${config.selector})`);
        return { success: true, shown: elements.length };
        
      } catch (error) {
        this.log(`❌ Show element failed for ${config.selector}: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    async modifyCSS(config) {
      try {
        await this.waitForElement(config.selector);
        
        const elements = document.querySelectorAll(config.selector);
        elements.forEach(element => {
          element.style[config.property] = config.value;
        });
        
        this.completedModifications.add(`modifyCSS:${config.selector}`);
        this.log(`✅ Modified CSS for ${elements.length} elements (${config.selector})`);
        return { success: true, modified: elements.length };
        
      } catch (error) {
        this.log(`❌ CSS modification failed for ${config.selector}: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    async addClass(config) {
      const elements = document.querySelectorAll(config.selector);
      elements.forEach(element => {
        element.classList.add(config.className);
      });
      this.log(`✅ Added class to ${elements.length} elements`);
    }

    async removeClass(config) {
      const elements = document.querySelectorAll(config.selector);
      elements.forEach(element => {
        element.classList.remove(config.className);
      });
      this.log(`✅ Removed class from ${elements.length} elements`);
    }

    async displayOverlay(config) {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        color: white; font-family: Arial, sans-serif;
      `;
      overlay.innerHTML = config.content || '<div>Overlay Content</div>';
      overlay.onclick = () => overlay.remove();
      document.body.appendChild(overlay);
      this.log('✅ Overlay displayed');
    }

    async redirectPage(config) {
      setTimeout(() => {
        if (config.newTab) {
          window.open(config.url, '_blank');
        } else {
          window.location.href = config.url;
        }
      }, config.delay || 0);
      this.log(`✅ Redirect scheduled to: ${config.url}`);
    }

    // Utility methods
    getPageContext() {
      const url = new URL(window.location.href);
      const utm = {};
      
      // Extract UTM parameters
      for (const [key, value] of url.searchParams) {
        if (key.startsWith('utm_')) {
          utm[key] = value;
        }
      }
      
      return {
        url: window.location.href,
        path: window.location.pathname,
        deviceType: window.innerWidth <= 768 ? 'mobile' : 'desktop',
        utm,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      };
    }

    getUserContext() {
      return {
        sessionId: this.getSessionId(),
        visitCount: this.getVisitCount(),
        isReturning: this.isReturningVisitor(),
        browser: this.getBrowser(),
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }

    getSessionId() {
      let sessionId = sessionStorage.getItem('workflow_session_id');
      if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('workflow_session_id', sessionId);
      }
      return sessionId;
    }

    getVisitCount() {
      const count = parseInt(localStorage.getItem('workflow_visit_count') || '0') + 1;
      localStorage.setItem('workflow_visit_count', count.toString());
      return count;
    }

    isReturningVisitor() {
      return localStorage.getItem('workflow_first_visit') !== null;
    }

    getBrowser() {
      const ua = navigator.userAgent;
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      return 'Other';
    }

    generateSelector(element) {
      if (element.id) return `#${element.id}`;
      if (element.className) return `.${element.className.split(' ').join('.')}`;
      return element.tagName.toLowerCase();
    }

    async waitForElement(selector, timeout = null) {
      const actualTimeout = timeout || this.config.elementWaitTimeout;
      
      return new Promise((resolve, reject) => {
        // Add to waiting set for tracking
        this.elementsToWaitFor.add(selector);
        
        // Check if element already exists
        const element = document.querySelector(selector);
        if (element) {
          this.elementsToWaitFor.delete(selector);
          this.log(`✅ Element found immediately: ${selector}`);
          resolve(element);
          return;
        }

        this.log(`⏳ Waiting for element: ${selector} (timeout: ${actualTimeout}ms)`);

        const observer = new MutationObserver(() => {
          const element = document.querySelector(selector);
          if (element) {
            observer.disconnect();
            this.elementsToWaitFor.delete(selector);
            this.log(`✅ Element appeared: ${selector}`);
            resolve(element);
          }
        });

        // Observe with more comprehensive options
        const observeOptions = { 
          childList: true, 
          subtree: true, 
          attributes: true, 
          attributeOldValue: true 
        };

        // Start observing - handle case where body might not exist yet
        if (document.body) {
          observer.observe(document.body, observeOptions);
        } else {
          // If body doesn't exist, wait for it
          const bodyObserver = new MutationObserver(() => {
            if (document.body) {
              bodyObserver.disconnect();
              observer.observe(document.body, observeOptions);
            }
          });
          bodyObserver.observe(document.documentElement, { childList: true });
        }
        
        setTimeout(() => {
          observer.disconnect();
          this.elementsToWaitFor.delete(selector);
          this.log(`❌ Element timeout: ${selector} not found within ${actualTimeout}ms`, 'error');
          reject(new Error(`Element ${selector} not found within ${actualTimeout}ms`));
        }, actualTimeout);
      });
    }

    safeHideContent() {
      // Wait for body to be available
      if (!document.body) {
        // If body not ready, wait a bit and try again
        setTimeout(() => this.safeHideContent(), 10);
        return;
      }
      this.hideContent();
    }

    hideContent() {
      if (this.contentHidden) return;
      
      // Check if document.body exists
      if (!document.body) {
        this.log('⚠️ Document body not ready, skipping content hide', 'warning');
        return;
      }
      
      // Apply comprehensive hiding to prevent FOOC
      document.body.style.visibility = 'hidden';
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 0.3s ease';
      this.contentHidden = true;
      
      // Show loading indicator if enabled
      if (this.config.showLoadingIndicator) {
        this.showLoadingIndicator();
      }
      
      this.log('🙈 Content hidden during workflow initialization');
      
      // Safety timeout to show content regardless
      setTimeout(() => {
        this.log('⏰ Safety timeout reached, showing content', 'warning');
        this.showContent();
      }, this.config.maxInitTime);
    }

    showContent() {
      // Use anti-flicker script if available, otherwise use built-in method
      if (window.unifiedWorkflowAntiFlicker) {
        window.unifiedWorkflowAntiFlicker.showContent();
        this.contentHidden = false;
        this.log('👀 Content revealed via anti-flicker script');
        return;
      }
      
      if (!this.contentHidden) return;
      
      // Check if document.body exists
      if (!document.body) {
        this.log('⚠️ Document body not ready, skipping content show', 'warning');
        this.contentHidden = false; // Reset the flag
        return;
      }
      
      // Hide loading indicator first
      this.hideLoadingIndicator();
      
      // Progressive content reveal with smooth transition
      document.body.style.visibility = 'visible';
      document.body.style.opacity = '1';
      
      this.contentHidden = false;
      this.log('👀 Content revealed after workflow processing');
    }

    async waitForAllModifications(timeout = 5000) {
      this.log('⏳ Waiting for all modifications to complete...');
      
      const startTime = Date.now();
      
      while (this.elementsToWaitFor.size > 0 && (Date.now() - startTime) < timeout) {
        this.log(`⏳ Still waiting for ${this.elementsToWaitFor.size} elements: ${Array.from(this.elementsToWaitFor).join(', ')}`);
        await this.delay(100);
      }
      
      if (this.elementsToWaitFor.size > 0) {
        this.log(`⚠️ Timeout: ${this.elementsToWaitFor.size} elements still pending`, 'warning');
      } else {
        this.log('✅ All modifications completed successfully');
      }
    }

    showLoadingIndicator() {
      if (this.loadingIndicatorShown || !this.config.showLoadingIndicator) return;
      
      const indicator = document.createElement('div');
      indicator.id = 'unified-workflow-loading';
      indicator.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 999999;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          padding: 20px 30px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          gap: 15px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          font-size: 14px;
          color: #333;
        ">
          <div style="
            width: 20px;
            height: 20px;
            border: 2px solid #e3e3e3;
            border-top: 2px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          <span>Personalizing content...</span>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
      
      document.body.appendChild(indicator);
      this.loadingIndicatorShown = true;
      this.log('🔄 Loading indicator shown');
    }

    hideLoadingIndicator() {
      const indicator = document.getElementById('unified-workflow-loading');
      if (indicator) {
        indicator.remove();
        this.loadingIndicatorShown = false;
        this.log('🔄 Loading indicator hidden');
      }
    }

    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    log(message, level = 'info') {
      if (!this.config.debug) return;
      
      const timestamp = new Date().toLocaleTimeString();
      const styles = {
        info: 'color: #2196F3',
        success: 'color: #4CAF50', 
        warning: 'color: #FF9800',
        error: 'color: #F44336'
      };
      
      console.log(`%c[${timestamp}] ${message}`, styles[level] || styles.info);
    }
  }

  // Global API
  window.UnifiedWorkflowSystem = UnifiedWorkflowSystem;

  // Auto-initialize if not already done
  if (!window.workflowSystem) {
    window.workflowSystem = new UnifiedWorkflowSystem();
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.workflowSystem.initialize();
      });
    } else {
      window.workflowSystem.initialize();
    }
  }

})(); 