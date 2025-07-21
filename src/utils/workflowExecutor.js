/**
 * Workflow Execution Engine
 * Handles fetching, evaluating, and executing workflow operations
 */

(function() {
  'use strict';
  
  class WorkflowExecutor {
    constructor(config = {}) {
      this.config = {
        apiEndpoint: 'http://localhost:3001',
        debug: true,
        retryAttempts: 3,
        executionDelay: 100,
        hideContentDuringInit: true,
        maxInitTime: 3000, // Maximum time to wait for workflows before showing content
        ...config
      };
      
      this.workflows = new Map();
      this.executedActions = new Set();
      this.pageContext = this.getPageContext();
      this.userContext = this.getUserContext();
      this.contentHidden = false;
      this.initializationComplete = false;
      
      // Hide content immediately if enabled
      if (this.config.hideContentDuringInit) {
        this.hideContentDuringInitialization();
      }
      
      console.log('🎯 Workflow Executor: Initialized');
    }

    getPageContext() {
      return {
        url: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        title: document.title,
        referrer: document.referrer,
        userAgent: navigator.userAgent
      };
    }

    getUserContext() {
      return {
        deviceType: this.getDeviceType(),
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled
      };
    }

    getDeviceType() {
      const width = window.innerWidth;
      if (width <= 768) return 'mobile';
      if (width <= 1024) return 'tablet';
      return 'desktop';
    }

    /**
     * Fetch active workflows for the current page
     */
    async fetchWorkflows() {
      try {
        const response = await fetch(`${this.config.apiEndpoint}/api/workflows/active?url=${encodeURIComponent(window.location.href)}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.workflows) {
          data.workflows.forEach(workflow => {
            this.workflows.set(workflow.id, workflow);
          });
          
          console.log(`🎯 Workflow Executor: Loaded ${data.workflows.length} active workflows`);
          return data.workflows;
        }
        
        return [];
      } catch (error) {
        console.error('🎯 Workflow Executor: Failed to fetch workflows:', error);
        return [];
      }
    }

    /**
     * Evaluate trigger conditions
     */
    evaluateTrigger(trigger, eventData = {}) {
      const { config, name } = trigger;
      
      if (this.config.debug) {
        console.log(`🔍 Evaluating trigger: ${name}`, config, eventData);
      }

      switch (name) {
        case 'Device Type':
          return this.evaluateDeviceTrigger(config, eventData);
        
        case 'UTM Parameters':
          return this.evaluateUTMTrigger(config, eventData);
        
        case 'Page Visits':
          return this.evaluatePageVisitTrigger(config, eventData);
        
        case 'Time on Page':
          return this.evaluateTimeOnPageTrigger(config, eventData);
        
        case 'Scroll Depth':
          return this.evaluateScrollDepthTrigger(config, eventData);
        
        case 'Element Click':
          return this.evaluateElementClickTrigger(config, eventData);
        
        case 'Repeat Visitor':
          return this.evaluateRepeatVisitorTrigger(config, eventData);
        
        default:
          console.warn(`🎯 Unknown trigger type: ${name}`);
          return false;
      }
    }

    evaluateDeviceTrigger(config, eventData) {
      const currentDevice = this.userContext.deviceType;
      return config.deviceType === currentDevice;
    }

    evaluateUTMTrigger(config, eventData) {
      const urlParams = new URLSearchParams(window.location.search);
      const utmValue = urlParams.get(config.parameter);
      
      if (!utmValue) return false;
      
      switch (config.operator || 'equals') {
        case 'equals':
          return utmValue === config.value;
        case 'contains':
          return utmValue.includes(config.value);
        case 'starts_with':
          return utmValue.startsWith(config.value);
        case 'exists':
          return Boolean(utmValue);
        default:
          return false;
      }
    }

    evaluatePageVisitTrigger(config, eventData) {
      // This would normally check stored visit count
      // For now, return true if we have session data
      return eventData.sessionVisits >= (config.visitCount || 1);
    }

    evaluateTimeOnPageTrigger(config, eventData) {
      const timeOnPage = eventData.timeOnPage || 0;
      const threshold = config.unit === 'minutes' ? config.duration * 60 : config.duration;
      return timeOnPage >= threshold;
    }

    evaluateScrollDepthTrigger(config, eventData) {
      const scrollPercentage = eventData.scrollPercentage || 0;
      return scrollPercentage >= (config.scrollPercentage || 50);
    }

    evaluateElementClickTrigger(config, eventData) {
      if (eventData.eventType !== 'click') return false;
      
      const element = document.querySelector(config.selector);
      return element && eventData.element === config.selector;
    }

    evaluateRepeatVisitorTrigger(config, eventData) {
      // This would check stored visit history
      return eventData.visitCount >= (config.minimumVisitCount || 2);
    }

    /**
     * Execute workflow actions
     */
    async executeAction(action, context = {}) {
      const actionKey = `${action.id}-${Date.now()}`;
      
      // Prevent duplicate executions
      if (this.executedActions.has(actionKey)) {
        return;
      }
      
      this.executedActions.add(actionKey);
      
      if (this.config.debug) {
        console.log(`⚡ Executing action: ${action.name}`, action.config);
      }

      try {
        switch (action.name) {
          case 'Replace Text':
            await this.executeReplaceText(action.config);
            break;
          
          case 'Hide Element':
            await this.executeHideElement(action.config);
            break;
          
          case 'Show Element':
            await this.executeShowElement(action.config);
            break;
          
          case 'Modify CSS':
            await this.executeModifyCSS(action.config);
            break;
          
          case 'Add Class':
            await this.executeAddClass(action.config);
            break;
          
          case 'Remove Class':
            await this.executeRemoveClass(action.config);
            break;
          
          case 'Display Overlay':
            await this.executeDisplayOverlay(action.config);
            break;
          
          case 'Redirect Page':
            await this.executeRedirectPage(action.config);
            break;
          
          case 'Custom Event':
            await this.executeCustomEvent(action.config);
            break;
          
          case 'Progressive Form':
            await this.executeProgressiveForm(action.config);
            break;
          
          case 'Dynamic Content':
            await this.executeDynamicContent(action.config);
            break;
          
          default:
            console.warn(`⚡ Unknown action type: ${action.name}`);
        }
      } catch (error) {
        console.error(`⚡ Error executing action ${action.name}:`, error);
      }
    }

    // Action Executors
    async executeReplaceText(config) {
      await this.waitForElement(config.selector);
      
      const elements = document.querySelectorAll(config.selector);
      elements.forEach(element => {
        if (config.originalText && element.textContent.includes(config.originalText)) {
          element.textContent = element.textContent.replace(config.originalText, config.newText);
        } else {
          element.textContent = config.newText;
        }
      });
      
      this.logActionExecution('Replace Text', config.selector, `Text changed to: ${config.newText}`);
    }

    async executeHideElement(config) {
      await this.waitForElement(config.selector);
      
      const elements = document.querySelectorAll(config.selector);
      elements.forEach(element => {
        if (config.animation === 'fade') {
          element.style.transition = 'opacity 0.3s ease';
          element.style.opacity = '0';
          setTimeout(() => {
            element.style.display = 'none';
          }, 300);
        } else if (config.animation === 'slide') {
          element.style.transition = 'transform 0.3s ease';
          element.style.transform = 'translateY(-100%)';
          setTimeout(() => {
            element.style.display = 'none';
          }, 300);
        } else {
          element.style.display = 'none';
        }
      });
      
      this.logActionExecution('Hide Element', config.selector);
    }

    async executeShowElement(config) {
      const elements = document.querySelectorAll(config.selector);
      elements.forEach(element => {
        element.style.display = '';
        
        if (config.animation === 'fade') {
          element.style.opacity = '0';
          element.style.transition = 'opacity 0.3s ease';
          setTimeout(() => {
            element.style.opacity = '1';
          }, 10);
        } else if (config.animation === 'slide') {
          element.style.transform = 'translateY(-100%)';
          element.style.transition = 'transform 0.3s ease';
          setTimeout(() => {
            element.style.transform = 'translateY(0)';
          }, 10);
        }
      });
      
      this.logActionExecution('Show Element', config.selector);
    }

    async executeModifyCSS(config) {
      await this.waitForElement(config.selector);
      
      const elements = document.querySelectorAll(config.selector);
      const property = config.customProperty || config.property;
      
      elements.forEach(element => {
        element.style[property] = config.value;
      });
      
      this.logActionExecution('Modify CSS', config.selector, `${property}: ${config.value}`);
    }

    async executeAddClass(config) {
      await this.waitForElement(config.selector);
      
      const elements = document.querySelectorAll(config.selector);
      elements.forEach(element => {
        element.classList.add(config.className);
      });
      
      this.logActionExecution('Add Class', config.selector, config.className);
    }

    async executeRemoveClass(config) {
      await this.waitForElement(config.selector);
      
      const elements = document.querySelectorAll(config.selector);
      elements.forEach(element => {
        element.classList.remove(config.className);
      });
      
      this.logActionExecution('Remove Class', config.selector, config.className);
    }

    async executeDisplayOverlay(config) {
      // Create overlay element
      const overlay = document.createElement('div');
      overlay.id = 'workflow-overlay-' + Date.now();
      overlay.innerHTML = config.content || '<div>Overlay Content</div>';
      
      // Style overlay
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-family: Arial, sans-serif;
      `;
      
      // Add close functionality
      overlay.addEventListener('click', () => {
        overlay.remove();
      });
      
      document.body.appendChild(overlay);
      this.logActionExecution('Display Overlay');
    }

    async executeRedirectPage(config) {
      const delay = config.delay || 0;
      
      setTimeout(() => {
        if (config.newTab) {
          window.open(config.url, '_blank');
        } else {
          window.location.href = config.url;
        }
      }, delay);
      
      this.logActionExecution('Redirect Page', config.url);
    }

    async executeCustomEvent(config) {
      // Send custom event to analytics
      if (window.elementTracker) {
        const customEvent = {
          eventType: 'custom_workflow_event',
          eventName: config.eventName,
          eventData: config.eventData,
          timestamp: Date.now(),
          sessionId: window.elementTracker.sessionId,
          pageContext: this.pageContext,
          userContext: this.userContext
        };
        
        window.elementTracker.addEvent(customEvent);
      }
      
      this.logActionExecution('Custom Event', config.eventName);
    }

    async executeProgressiveForm(config) {
      await this.waitForElement(config.triggerField);
      
      const triggerField = document.querySelector(config.triggerField);
      const additionalFields = document.querySelector(config.additionalFields);
      
      if (triggerField && additionalFields) {
        triggerField.addEventListener('focus', () => {
          additionalFields.style.display = 'block';
          if (config.animation === 'slide') {
            additionalFields.style.transform = 'translateY(-20px)';
            additionalFields.style.transition = 'transform 0.3s ease';
            setTimeout(() => {
              additionalFields.style.transform = 'translateY(0)';
            }, 10);
          }
        });
      }
      
      this.logActionExecution('Progressive Form', config.triggerField);
    }

    async executeDynamicContent(config) {
      await this.waitForElement(config.targetContainer);
      
      const container = document.querySelector(config.targetContainer);
      if (container) {
        // Replace placeholders in template with actual data
        let content = config.contentTemplate;
        
        // Simple placeholder replacement
        content = content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return this.userContext[key] || this.pageContext[key] || match;
        });
        
        container.innerHTML = content;
      }
      
      this.logActionExecution('Dynamic Content', config.targetContainer);
    }

    // Utility methods
    async waitForElement(selector, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }

        const observer = new MutationObserver((mutations, obs) => {
          const element = document.querySelector(selector);
          if (element) {
            obs.disconnect();
            resolve(element);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        setTimeout(() => {
          observer.disconnect();
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
      });
    }

    logActionExecution(actionName, target = '', details = '') {
      if (this.config.debug) {
        console.log(`⚡ Executed: ${actionName}${target ? ' on ' + target : ''}${details ? ' - ' + details : ''}`);
      }
    }

    /**
     * Process workflows and execute matching actions
     */
    async processWorkflows(eventData = {}) {
      if (this.workflows.size === 0) {
        return;
      }

      for (const [workflowId, workflow] of this.workflows) {
        if (!workflow.isActive) continue;

        // Find trigger node
        const triggerNode = workflow.nodes.find(node => node.type === 'trigger');
        if (!triggerNode) continue;

        // Evaluate trigger
        const triggerMatches = this.evaluateTrigger(triggerNode, eventData);
        
        if (triggerMatches) {
          console.log(`🎯 Workflow triggered: ${workflow.name}`);
          
          // Find connected action nodes
          const actionNodes = this.getConnectedActions(workflow, triggerNode.id);
          
          // Execute actions in sequence
          for (const actionNode of actionNodes) {
            await this.executeAction(actionNode, { workflow, trigger: triggerNode });
            
            // Add delay between actions if configured
            if (this.config.executionDelay > 0) {
              await new Promise(resolve => setTimeout(resolve, this.config.executionDelay));
            }
          }
        }
      }
    }

    getConnectedActions(workflow, triggerNodeId) {
      const actionNodes = [];
      const visited = new Set();
      
      const findConnectedNodes = (nodeId) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        
        const connections = workflow.connections.filter(conn => conn.sourceNodeId === nodeId);
        
        for (const connection of connections) {
          const targetNode = workflow.nodes.find(node => node.id === connection.targetNodeId);
          if (targetNode && targetNode.type === 'action') {
            actionNodes.push(targetNode);
            findConnectedNodes(targetNode.id); // Support chained actions
          }
        }
      };
      
      findConnectedNodes(triggerNodeId);
      return actionNodes;
    }

    /**
     * Hide content during initialization to prevent FOUC
     */
    hideContentDuringInitialization() {
      if (this.contentHidden) return;
      
      // Create and inject CSS to hide content
      const style = document.createElement('style');
      style.id = 'workflow-init-hide';
      style.textContent = `
        body {
          visibility: hidden !important;
          opacity: 0 !important;
          transition: opacity 0.3s ease-in-out !important;
        }
        
        .workflow-loading-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: rgba(255, 255, 255, 0.95) !important;
          z-index: 999999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: Arial, sans-serif !important;
          font-size: 16px !important;
          color: #333 !important;
        }
      `;
      
      // Add to head as early as possible
      if (document.head) {
        document.head.appendChild(style);
      } else {
        // If head doesn't exist yet, add to document
        document.documentElement.appendChild(style);
      }
      
      // Add loading overlay when DOM is ready
      if (document.body) {
        this.addLoadingOverlay();
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          this.addLoadingOverlay();
        });
      }
      
      this.contentHidden = true;
      
      // Safety timeout to show content even if workflows fail
      setTimeout(() => {
        if (!this.initializationComplete) {
          console.warn('🎯 Workflow Executor: Initialization timeout, showing content anyway');
          this.showContent();
        }
      }, this.config.maxInitTime);
      
      if (this.config.debug) {
        console.log('🎯 Workflow Executor: Content hidden during initialization');
      }
    }

    addLoadingOverlay() {
      const overlay = document.createElement('div');
      overlay.className = 'workflow-loading-overlay';
      overlay.id = 'workflow-loading-overlay';
      overlay.innerHTML = `
        <div style="text-align: center;">
          <div style="margin-bottom: 15px;">
            <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
          </div>
          <div>🎯 Personalizing your experience...</div>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
      
      document.body.appendChild(overlay);
    }

    /**
     * Show content after workflow initialization
     */
    showContent() {
      if (!this.contentHidden) return;
      
      // Remove hiding styles
      const hideStyle = document.getElementById('workflow-init-hide');
      if (hideStyle) {
        hideStyle.remove();
      }
      
      // Remove loading overlay
      const overlay = document.getElementById('workflow-loading-overlay');
      if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
        }, 300);
      }
      
      // Show body with transition
      document.body.style.visibility = 'visible';
      document.body.style.opacity = '1';
      
      this.contentHidden = false;
      this.initializationComplete = true;
      
      if (this.config.debug) {
        console.log('🎯 Workflow Executor: Content revealed after workflow initialization');
      }
    }

    /**
     * Initialize workflow execution on page load
     */
    async initialize() {
      try {
        // Fetch workflows
        await this.fetchWorkflows();
        
        // Process immediate triggers (device type, UTM, etc.)
        const immediateEventData = {
          eventType: 'page_load',
          sessionVisits: 1,
          visitCount: 1,
          timeOnPage: 0,
          scrollPercentage: 0,
          ...this.pageContext,
          ...this.userContext
        };
        
        await this.processWorkflows(immediateEventData);
        
        // Small delay to ensure all DOM modifications are complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Show content after workflow operations are complete
        this.showContent();
        
        console.log('🎯 Workflow Executor: Initialization complete');
        
        return true;
      } catch (error) {
        console.error('🎯 Workflow Executor: Initialization failed:', error);
        
        // Show content even if initialization failed
        this.showContent();
        
        return false;
      }
    }

    /**
     * Handle runtime events from element tracker
     */
    async handleEvent(eventData) {
      await this.processWorkflows(eventData);
    }
  }

  // Global API
  window.WorkflowExecutor = WorkflowExecutor;

  // Auto-initialize
  if (!window.workflowExecutor) {
    window.workflowExecutor = new WorkflowExecutor();
    
    // Initialize after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.workflowExecutor.initialize();
      });
    } else {
      window.workflowExecutor.initialize();
    }
  }

})(); 