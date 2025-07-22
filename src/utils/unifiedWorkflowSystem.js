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
        debug: true, // Enable debug by default to help troubleshooting
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
      this.executedActions = new Map(); // Changed to Map to support recent duplicate prevention
      this.executedWorkflows = new Set(); // Track executed workflows to prevent duplicates
      this.triggeredWorkflows = new Map(); // Cache triggered workflows to prevent re-triggering
      this.processingWorkflows = false; // Flag to prevent recursive processWorkflows calls
      this.pageContext = this.getPageContext();
      this.userContext = this.getUserContext();
      this.contentHidden = false;
      this.initialized = false;
      this.loadingIndicatorShown = false;
      this.elementsToWaitFor = new Set(); // Track elements we're waiting for
      this.completedModifications = new Set(); // Track completed modifications
      this.processedSelectors = new Set(); // Track processed selectors to prevent duplicates
      this.selectorRulesMap = new Map(); // Map selectors to rules for efficient processing
      this.mutationObserver = null; // For dynamic content tracking
      this.lastScrollCheck = 0; // Throttle scroll events
      this.lastTimeCheck = 0; // Throttle time-based triggers
      this.initializationPromise = null; // Track initialization state
      
      // Auto-hide content if enabled and anti-flicker script hasn't already done it
      if (this.config.hideContentDuringInit && !window.unifiedWorkflowAntiFlicker?.isContentHidden()) {
        this.safeHideContent();
      }
      
      this.log('🎯 Unified Workflow System: Starting...');
    }

    /**
     * Enhanced logging with proper debug mode check and error handling
     */
    log(message, level = 'info', data = null) {
      try {
        if (!this.config.debug && level !== 'error') return;
        
        const prefix = '🎯 Unified Workflow System:';
        const timestamp = new Date().toLocaleTimeString();
        
        switch (level) {
          case 'error':
            console.error(`${prefix} [${timestamp}] ❌ ${message}`, data || '');
            break;
          case 'warning':
            console.warn(`${prefix} [${timestamp}] ⚠️ ${message}`, data || '');
            break;
          case 'success':
            console.log(`${prefix} [${timestamp}] ✅ ${message}`, data || '');
            break;
          default:
            console.log(`${prefix} [${timestamp}] ${message}`, data || '');
        }
      } catch (logError) {
        // Fallback to basic console.log if enhanced logging fails
        console.log(`[UnifiedWorkflowSystem] ${message}`, data || '');
      }
    }

    /**
     * Initialize the workflow system
     */
    async initialize() {
      // Prevent multiple initializations
      if (this.initializationPromise) {
        this.log('⚠️ Initialization already in progress', 'warning');
        return this.initializationPromise;
      }
      
      if (this.initialized) {
        this.log('⚠️ System already initialized', 'warning');
        return Promise.resolve();
      }

      this.initializationPromise = this._doInitialize();
      return this.initializationPromise;
    }

    /**
     * Internal initialization method
     */
    async _doInitialize() {
      try {
        this.log('🚀 Initializing unified workflow system...');
        
        // Wait for DOM to be ready first
        await this.waitForDOMReady();
        
        // Fetch all active workflows first - this is CRITICAL
        await this.fetchWorkflows();
        this.log(`📊 Workflows loaded: ${this.workflows.size} workflows available`);
        
        // Execute priority actions immediately (like utm-magic.js priority execution)
        await this.executePriorityActions();
        
        // Process all immediate triggers (page load, device type, etc.)
        await this.processImmediateTriggers();
        
        // Set up event listeners for dynamic triggers
        this.setupEventListeners();
        
        // Set up mutation observer for dynamic content (after DOM is ready)
        await this.setupMutationObserver();
        
        // Wait for all pending element operations to complete
        await this.waitForAllModifications();
        
        // Show content after all modifications are complete
        this.showContent();
        
        this.initialized = true;
        this.log('✅ Unified workflow system ready!', 'success');
        
        // Register cleanup for page unload
        window.addEventListener('beforeunload', () => {
          this.cleanup();
        });
        
        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('workflowSystemReady', {
          detail: { system: this }
        }));
        
      } catch (error) {
        this.log(`❌ Initialization failed: ${error.message}`, 'error');
        console.error('Unified Workflow System Error:', error);
        this.showContent(); // Show content even if initialization fails
        throw error;
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
        const headers = {
          'Content-Type': 'application/json'
        };
        if (this.config.apiKey) {
          headers['X-API-Key'] = this.config.apiKey;
          this.log('🔑 Using API key authentication');
        }
        
        let response;
        try {
          response = await fetch(url, { 
            headers,
            method: 'GET',
            credentials: 'omit', // Don't send cookies for CORS
            timeout: 15000 // 15 second timeout
          });
        } catch (fetchError) {
          this.log(`❌ Network error fetching workflows: ${fetchError.message}`, 'error');
          return [];
        }
        
        if (!response) {
          this.log('❌ No response received from workflows endpoint', 'error');
          return [];
        }
        
        if (!response.ok) {
          this.log(`❌ HTTP error fetching workflows: ${response.status} ${response.statusText}`, 'error');
          return [];
        }
        
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          this.log(`❌ Failed to parse workflow response: ${parseError.message}`, 'error');
          return [];
        }
        
        if (!data) {
          this.log('❌ Empty response from workflows endpoint', 'error');
          return [];
        }
        
        if (data.success && Array.isArray(data.workflows)) {
          // Store workflows in Map for efficient lookup
          data.workflows.forEach(workflow => {
            if (workflow && workflow.id) {
              this.workflows.set(workflow.id, workflow);
            } else {
              this.log('⚠️ Skipping invalid workflow (missing id)', 'warning', workflow);
            }
          });
          
          this.log(`✅ Loaded ${data.workflows.length} active workflows`);
          return data.workflows;
        }
        
        this.log('⚠️ No active workflows found or invalid response format', 'warning', data);
        return [];
        
      } catch (error) {
        this.log(`❌ Failed to fetch workflows: ${error.message}`, 'error');
        return [];
      }
    }

    /**
     * Wait for DOM to be ready
     */
    waitForDOMReady() {
      return new Promise((resolve) => {
        if (document.readyState === 'complete') {
          resolve();
          return;
        }
        
        if (document.readyState === 'interactive' || document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', resolve, { once: true });
          return;
        }
        
        // Fallback
        setTimeout(resolve, 100);
      });
    }

    /**
     * Wait for document.body to be available
     */
    waitForBody() {
      return new Promise((resolve) => {
        if (document.body) {
          resolve();
          return;
        }
        
        const checkBody = () => {
          if (document.body) {
            resolve();
          } else {
            requestAnimationFrame(checkBody);
          }
        };
        
        checkBody();
      });
    }

    /**
     * Set up mutation observer for dynamic content
     */
    async setupMutationObserver() {
      // Only set up if we have content replacement rules
      const hasContentRules = Array.from(this.selectorRulesMap.keys()).some(
        selector => selector.includes('button') || selector.includes('input') || selector.includes('a')
      );
      
      if (!hasContentRules) {
        this.log('No content replacement rules found, skipping mutation observer');
        return;
      }
      
      try {
        // Wait for body to be ready
        await this.waitForBody();
        
        if (!document.body) {
          this.log('Document body still not ready after waiting', 'warning');
          return;
        }
        
        this.mutationObserver = new MutationObserver(mutations => {
          // Throttle mutation processing to prevent performance issues
          this.throttledHandleMutations(mutations);
        });
        
        // Start observing with proper validation
        this.mutationObserver.observe(document.body, { 
          childList: true, 
          subtree: true,
          attributes: false // Don't watch attributes to reduce noise
        });
        this.log('Mutation observer setup for dynamic content (content replacement only)');
        
      } catch (error) {
        this.log('Failed to setup mutation observer: ' + error.message, 'error');
        this.mutationObserver = null;
      }
    }

    /**
     * Throttled mutation handler to prevent performance issues
     */
    throttledHandleMutations(mutations) {
      if (this._mutationTimeout) {
        clearTimeout(this._mutationTimeout);
      }
      
      this._mutationTimeout = setTimeout(() => {
        this.handleMutations(mutations);
      }, 250); // 250ms delay to batch mutations
    }

    /**
     * Handle mutations from mutation observer
     */
    handleMutations(mutations) {
      // Prevent mutation observer from triggering workflow processing
      // Only reapply existing content rules, don't trigger new workflows
      let shouldReapply = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return; // Not an element
            
            // Check if this is a relevant element for content replacement only
            if (this.isRelevantElement(node)) {
              shouldReapply = true;
            }
          });
        }
      });
      
      if (shouldReapply) {
        this.log('New relevant elements detected, reapplying content rules only (no workflow triggers)');
        // Only reapply content rules, don't process workflows
        this.reapplyContentRules();
      }
    }

    /**
     * Check if an element is relevant for our rules
     */
    isRelevantElement(node) {
      if (!node.tagName) return false;
      
      const tagName = node.tagName.toLowerCase();
      const relevantTags = ['button', 'input', 'a', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
      
      if (relevantTags.includes(tagName)) return true;
      
      // Check if it contains relevant elements
      if (node.querySelectorAll) {
        return node.querySelectorAll('button, input, a, [class*="btn"], [class*="cta"]').length > 0;
      }
      
      return false;
    }

    /**
     * Reapply content rules to new elements
     */
    reapplyContentRules() {
      if (this.selectorRulesMap.size === 0) return;
      
      let appliedCount = 0;
      
      this.selectorRulesMap.forEach((rule, selector) => {
        // Don't skip already processed selectors for dynamic content
        if (this.applySingleSelector(selector, rule, false)) {
          appliedCount++;
        }
      });
      
      if (appliedCount > 0) {
        this.log(`Reapplied ${appliedCount} rules to new elements`);
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
      
      this.log(`🚀 Processing immediate triggers with data:`, 'info', eventData);
      await this.processWorkflows(eventData);
    }

    /**
     * Priority execution for critical actions that need to run ASAP
     */
    async executePriorityActions() {
      this.log('⚡ Executing priority content replacement actions...');
      
      if (this.workflows.size === 0) {
        this.log('⚠️ No workflows loaded yet, skipping priority execution', 'warning');
        return;
      }
      
      // Execute content replacement actions immediately for visible elements
      const priorityActions = [];
      
      this.log(`🔍 Checking ${this.workflows.size} workflows for priority actions`);
      
      this.workflows.forEach(workflow => {
        // Check both is_active and isActive properties for compatibility
        const isActive = workflow.is_active ?? workflow.isActive ?? true; // Default to true if missing
        this.log(`📋 Checking workflow: ${workflow.name} (active: ${isActive}, is_active: ${workflow.is_active}, isActive: ${workflow.isActive})`);
        
        if (!isActive) {
          this.log(`⏭️ Skipping inactive workflow: ${workflow.name}`);
          return;
        }
        
        const triggerNodes = workflow.nodes?.filter(node => node.type === 'trigger') || [];
        this.log(`🎯 Found ${triggerNodes.length} trigger nodes in workflow: ${workflow.name}`);
        
        triggerNodes.forEach(trigger => {
          // Check immediate triggers (device type, UTM, page load)
          const immediateEventData = {
            eventType: 'page_load',
            deviceType: this.pageContext.deviceType,
            utm: this.pageContext.utm
          };
          
          this.log(`🔍 Evaluating trigger "${trigger.name}" with data:`, 'info', {
            trigger: trigger.config,
            eventData: immediateEventData
          });
          
          const triggerResult = this.evaluateTrigger(trigger, immediateEventData);
          this.log(`📊 Trigger "${trigger.name}" result: ${triggerResult}`);
          
          if (triggerResult) {
            this.log(`✅ Trigger matched! Finding connected actions...`);
            const actions = this.getConnectedActions(workflow, trigger.id);
            const contentActions = actions.filter(action => action.name === 'Replace Text');
            this.log(`🎬 Found ${contentActions.length} content replacement actions`);
            priorityActions.push(...contentActions);
          } else {
            this.log(`❌ Trigger did not match`);
          }
        });
      });
      
      this.log(`🎯 Total priority actions found: ${priorityActions.length}`);
      
      if (priorityActions.length > 0) {
        this.log(`🚀 Executing ${priorityActions.length} priority content actions`, 'success');
        const promises = priorityActions.map(action => this.executeAction(action));
        await Promise.all(promises);
      } else {
        this.log(`⚠️ No priority actions found to execute`, 'warning');
      }
    }

    /**
     * Set up event listeners for dynamic triggers
     */
    setupEventListeners() {
      // Prevent duplicate event listener setup
      if (this._eventListenersSetup) {
        this.log('⚠️ Event listeners already setup, skipping', 'warning');
        return;
      }
      this._eventListenersSetup = true;
      
      // Scroll depth tracking with proper throttling
      let scrollTimeout;
      const scrollHandler = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const now = Date.now();
          // Only check scroll every 5 seconds to prevent spam
          if (now - this.lastScrollCheck < 5000) {
            return;
          }
          this.lastScrollCheck = now;
          
          const scrollTop = window.scrollY || document.documentElement.scrollTop;
          const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
          
          if (scrollHeight <= 0) return; // Prevent division by zero
          
          const scrollPercentage = Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
          
          // Only trigger on meaningful scroll milestones
          if (scrollPercentage >= 25 && scrollPercentage % 25 === 0) {
            this.handleEvent({
              eventType: 'scroll',
              scrollPercentage,
              timestamp: now
            });
          }
        }, 500); // Increased throttle to 500ms
      };
      
      window.addEventListener('scroll', scrollHandler, { passive: true });

      // Time on page tracking - much less frequent and with caching
      let timeOnPage = 0;
      this._timeInterval = setInterval(() => {
        timeOnPage += 10; // Increment by 10 seconds
        const now = Date.now();
        
        // Only check time-based triggers every 30 seconds
        if (now - this.lastTimeCheck < 30000) {
          return;
        }
        this.lastTimeCheck = now;
        
        // Only trigger on meaningful time milestones (30s, 60s, 120s, etc.)
        if (timeOnPage === 30 || timeOnPage === 60 || timeOnPage === 120 || timeOnPage === 300) {
          this.handleEvent({
            eventType: 'time_on_page',
            timeOnPage,
            timestamp: now
          });
        }
      }, 10000); // Check every 10 seconds instead of every second

      // Click tracking - single execution per click with debouncing
      let lastClickTime = 0;
      const clickHandler = (event) => {
        const now = Date.now();
        
        // Debounce rapid clicks
        if (now - lastClickTime < 100) {
          return;
        }
        lastClickTime = now;
        
        const selector = this.generateSelector(event.target);
        const clickKey = `click-${selector}-${Math.floor(now / 1000)}`; // Group by second
        
        // Prevent duplicate click events within same second
        if (this.executedActions.has(clickKey)) {
          return;
        }
        this.executedActions.set(clickKey, now);
        
        this.handleEvent({
          eventType: 'click',
          elementSelector: selector,
          element: event.target,
          timestamp: now
        });
      };
      
      document.addEventListener('click', clickHandler, { passive: true });

      // Exit intent detection - only once per session
      let exitIntentTriggered = false;
      const exitIntentHandler = (event) => {
        if (event.clientY <= 0 && !exitIntentTriggered) {
          exitIntentTriggered = true;
          this.handleEvent({
            eventType: 'exit_intent',
            timestamp: Date.now()
          });
        }
      };
      
      document.addEventListener('mouseleave', exitIntentHandler);

      // Store cleanup function
      this._cleanup = () => {
        window.removeEventListener('scroll', scrollHandler);
        document.removeEventListener('click', clickHandler);
        document.removeEventListener('mouseleave', exitIntentHandler);
        if (this._timeInterval) {
          clearInterval(this._timeInterval);
          this._timeInterval = null;
        }
      };

      this.log('👂 Event listeners configured with proper throttling and cleanup');
    }

    /**
     * Clean up event listeners and intervals
     */
    cleanup() {
      this.log('🧹 Starting cleanup...');
      
      if (this._cleanup) {
        this._cleanup();
        this._cleanup = null;
      }
      
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }
      
      if (this._mutationTimeout) {
        clearTimeout(this._mutationTimeout);
        this._mutationTimeout = null;
      }
      
      if (this._safetyTimeout) {
        clearTimeout(this._safetyTimeout);
        this._safetyTimeout = null;
      }
      
      // Clear all tracking data structures
      this.workflows.clear();
      this.executedActions.clear();
      this.executedWorkflows.clear();
      this.triggeredWorkflows.clear();
      this.elementsToWaitFor.clear();
      this.completedModifications.clear();
      this.processedSelectors.clear();
      this.selectorRulesMap.clear();
      
      // Reset flags
      this.initialized = false;
      this.processingWorkflows = false;
      this.contentHidden = false;
      this.loadingIndicatorShown = false;
      
      this.log('🧹 Cleaned up all listeners, timers, and data structures');
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
        this.log('⚠️ No workflows available to process', 'warning');
        return;
      }

      // Prevent recursive calls to processWorkflows
      if (this.processingWorkflows) {
        this.log('⚠️ Already processing workflows, skipping to prevent recursion', 'warning');
        return;
      }

      this.processingWorkflows = true;
      
      this.log(`🔄 Processing ${this.workflows.size} workflows for event: ${eventData.eventType}`, 'info');

      try {
        for (const [workflowId, workflow] of this.workflows) {
          const isActive = workflow.is_active ?? workflow.isActive ?? true;
          if (!isActive) {
            this.log(`⏭️ Skipping inactive workflow: ${workflow.name}`, 'info');
            continue;
          }

          this.log(`📋 Processing workflow: ${workflow.name} (active: ${isActive})`, 'info');

          // Find trigger nodes
          const triggerNodes = workflow.nodes?.filter(node => node.type === 'trigger') || [];
          this.log(`🎯 Found ${triggerNodes.length} trigger nodes in workflow: ${workflow.name}`, 'info');
          
          for (const trigger of triggerNodes) {
            this.log(`🔍 Evaluating trigger: ${trigger.name || trigger.config?.triggerType}`, 'info');
            
            if (this.evaluateTrigger(trigger, eventData)) {
              this.log(`🎯 Workflow triggered: ${workflow.name} by ${trigger.name}`, 'success');
              
              // Create unique execution key to prevent duplicate tracking
              const executionKey = `${workflow.id}-${trigger.id}-${Date.now()}`;
              
              // Check if this exact execution has already been tracked
              if (this.executedWorkflows.has(executionKey)) {
                this.log(`⚠️ Workflow execution already tracked: ${executionKey}`, 'warning');
                continue;
              }
              
              // Mark this workflow execution as tracked
              this.executedWorkflows.add(executionKey);
              
              // Find and execute connected actions
              const actions = this.getConnectedActions(workflow, trigger.id);
              this.log(`🔗 Found ${actions.length} connected actions for trigger ${trigger.id}`, 'info', actions);
              
              // Store action selectors in our mapping for mutation observer
              actions.forEach(action => {
                if (action.name === 'Replace Text' && action.config?.selector) {
                  this.selectorRulesMap.set(action.config.selector, action.config);
                }
              });
              
              // Track workflow execution start time
              const executionStartTime = performance.now();
              
              // Execute the actions
              const executedActions = await this.executeActions(actions);
              
              // Calculate execution time
              const executionTime = Math.round(performance.now() - executionStartTime);
              
              // Track the workflow execution (only once per execution)
              await this.trackWorkflowExecution(workflow, {
                status: 'success',
                executionTimeMs: executionTime,
                pageUrl: window.location.href,
                deviceType: this.pageContext.deviceType,
                triggerName: trigger.name,
                actionsExecuted: executedActions || [],
                executionKey: executionKey
              });
            } else {
              this.log(`❌ Trigger did not match: ${trigger.name || trigger.config?.triggerType}`, 'info');
            }
          }
        }
      } finally {
        this.processingWorkflows = false;
        this.log(`✅ Finished processing workflows for event: ${eventData.eventType}`, 'info');
      }
    }

    /**
     * Evaluate if a trigger should fire for given event data
     */
    evaluateTrigger(trigger, eventData) {
      try {
        if (!trigger || typeof trigger !== 'object') {
          this.log('⚠️ Invalid trigger provided to evaluateTrigger', 'warning', trigger);
          return false;
        }
        
        if (!eventData || typeof eventData !== 'object') {
          this.log('⚠️ Invalid eventData provided to evaluateTrigger', 'warning', eventData);
          return false;
        }
        
        const { config = {}, name } = trigger;
        
        // Use triggerType from config or name from trigger
        const triggerType = config.triggerType || name;
        
        if (!triggerType) {
          this.log('⚠️ No trigger type found in trigger configuration', 'warning', trigger);
          return false;
        }
        
        this.log(`🔍 Evaluating trigger: ${triggerType} for event: ${eventData.eventType}`, 'info', {
          trigger: trigger,
          eventData: eventData,
          triggerType: triggerType
        });
        
        // Create a cache key for this trigger and event data
        const triggerCacheKey = `${trigger.id || 'unknown'}-${triggerType}-${eventData.eventType || 'unknown'}`;
        
        // For immediate triggers (page_load, device type, UTM), allow re-execution more frequently
        const isImmediateTrigger = eventData.eventType === 'page_load' || 
                                  triggerType === 'Device Type' || 
                                  triggerType === 'UTM Parameters';
        
        // Check if this trigger has already been processed for similar conditions
        if (this.triggeredWorkflows && this.triggeredWorkflows.has(triggerCacheKey) && !isImmediateTrigger) {
          const lastTriggered = this.triggeredWorkflows.get(triggerCacheKey);
          const timeSinceLastTrigger = Date.now() - lastTriggered;
          
          // Prevent re-triggering the same condition within 30 seconds (except immediate triggers)
          if (timeSinceLastTrigger < 30000) {
            this.log(`⏭️ Skipping cached trigger: ${triggerType} (last triggered ${Math.round(timeSinceLastTrigger/1000)}s ago)`, 'info');
            return false;
          }
        }
        
        let shouldTrigger = false;
        
        try {
          switch (triggerType) {
            case 'Device Type':
              shouldTrigger = this.evaluateDeviceTypeTrigger(config, eventData);
              break;
              
            case 'UTM Parameters':
              shouldTrigger = this.evaluateUTMTrigger(config, eventData);
              break;
              
            case 'Page Visits':
              shouldTrigger = this.evaluatePageVisitTrigger(config, eventData);
              break;
              
            case 'Time on Page':
              shouldTrigger = this.evaluateTimeOnPageTrigger(config, eventData);
              break;
              
            case 'Scroll Depth':
              shouldTrigger = this.evaluateScrollDepthTrigger(config, eventData);
              break;
              
            case 'Element Click':
              shouldTrigger = this.evaluateElementClickTrigger(config, eventData);
              break;
              
            case 'Exit Intent':
              shouldTrigger = this.evaluateExitIntentTrigger(config, eventData);
              break;
              
            default:
              this.log(`⚠️ Unknown trigger type: ${triggerType}`, 'warning');
              shouldTrigger = false;
          }
        } catch (evaluationError) {
          this.log(`❌ Error evaluating trigger ${triggerType}: ${evaluationError.message}`, 'error');
          shouldTrigger = false;
        }
        
        this.log(`📊 Trigger evaluation result: ${triggerType} = ${shouldTrigger}`, shouldTrigger ? 'success' : 'info');
        
        // Cache successful triggers to prevent immediate re-triggering (except immediate triggers)
        if (shouldTrigger && !isImmediateTrigger && this.triggeredWorkflows) {
          this.triggeredWorkflows.set(triggerCacheKey, Date.now());
        }
        
        return shouldTrigger;
        
      } catch (error) {
        this.log(`❌ Critical error in evaluateTrigger: ${error.message}`, 'error');
        return false;
      }
    }

    /**
     * Evaluate device type trigger
     */
    evaluateDeviceTypeTrigger(config, eventData) {
      return this.pageContext.deviceType === config.deviceType;
    }

    /**
     * Evaluate UTM parameters trigger
     */
    evaluateUTMTrigger(config, eventData) {
      if (!this.pageContext.utm) return false;
      const utmValue = this.pageContext.utm[config.parameter];
      switch (config.operator) {
        case 'equals': return utmValue === config.value;
        case 'contains': return utmValue && utmValue.includes(config.value);
        case 'exists': return Boolean(utmValue);
        default: return false;
      }
    }

    /**
     * Evaluate page visits trigger
     */
    evaluatePageVisitTrigger(config, eventData) {
      return eventData.visitCount >= (config.visitCount || 3);
    }

    /**
     * Evaluate time on page trigger
     */
    evaluateTimeOnPageTrigger(config, eventData) {
      const thresholdSeconds = config.unit === 'minutes' ? config.duration * 60 : config.duration;
      return eventData.timeOnPage >= thresholdSeconds;
    }

    /**
     * Evaluate scroll depth trigger
     */
    evaluateScrollDepthTrigger(config, eventData) {
      return eventData.scrollPercentage >= (config.percentage || 50);
    }

    /**
     * Evaluate element click trigger
     */
    evaluateElementClickTrigger(config, eventData) {
      return eventData.eventType === 'click' && 
             eventData.elementSelector === config.selector;
    }

    /**
     * Evaluate exit intent trigger
     */
    evaluateExitIntentTrigger(config, eventData) {
      return eventData.eventType === 'exit_intent';
    }

    /**
     * Get actions connected to a trigger
     */
    getConnectedActions(workflow, triggerNodeId) {
      const connections = workflow.connections || [];
      const nodes = workflow.nodes || [];
      
      this.log(`🔍 Finding connected actions for trigger ${triggerNodeId}`, 'info', {
        totalConnections: connections.length,
        totalNodes: nodes.length,
        connections: connections
      });
      
      const connectedActionIds = connections
        .filter(conn => conn.sourceNodeId === triggerNodeId)
        .map(conn => conn.targetNodeId);
        
      this.log(`🔗 Found ${connectedActionIds.length} connected action IDs:`, 'info', connectedActionIds);
      
      const actionNodes = nodes.filter(node => 
        node.type === 'action' && connectedActionIds.includes(node.id)
      );
      
      this.log(`🎯 Returning ${actionNodes.length} action nodes:`, 'info', actionNodes);
      
      return actionNodes;
    }

    /**
     * Execute a list of actions
     */
    async executeActions(actions) {
      if (!actions?.length) {
        this.log('⚠️ No actions to execute', 'warning');
        return [];
      }
      
      this.log(`🎬 Executing ${actions.length} actions`, 'info', actions);
      
      const executedActions = [];
      
      // Execute content replacement actions immediately in parallel for better performance
      const contentActions = actions.filter(action => action.name === 'Replace Text');
      const otherActions = actions.filter(action => action.name !== 'Replace Text');
      
      this.log(`📊 Action breakdown: ${contentActions.length} content actions, ${otherActions.length} other actions`);
      
      // Execute content replacements in parallel for speed
      if (contentActions.length > 0) {
        this.log(`⚡ Executing ${contentActions.length} content replacement actions in parallel`);
        const contentPromises = contentActions.map(async (action) => {
          const startTime = performance.now();
          const result = await this.executeAction(action);
          const executionTime = Math.round(performance.now() - startTime);
          
          if (result.success) {
            executedActions.push({
              name: action.name,
              config: action.config,
              selector: action.config?.selector,
              text: action.config?.newText || action.config?.text,
              executionTimeMs: executionTime
            });
          }
          
          return result;
        });
        await Promise.all(contentPromises);
      }
      
      // Execute other actions sequentially with delay
      for (const action of otherActions) {
        const startTime = performance.now();
        const result = await this.executeAction(action);
        const executionTime = Math.round(performance.now() - startTime);
        
        if (result.success) {
          executedActions.push({
            name: action.name,
            config: action.config,
            selector: action.config?.selector,
            executionTimeMs: executionTime
          });
        }
        
        // Add delay between actions if configured
        if (this.config.executionDelay > 0) {
          await this.delay(this.config.executionDelay);
        }
      }
      
      return executedActions;
    }

    /**
     * Execute a single action
     */
    async executeAction(action) {
      // Create a more specific action key to prevent unnecessary duplicates
      const actionKey = `${action.id}-${action.name}-${JSON.stringify(action.config)}`;
      
      // Check for recent duplicate executions (within last 5 seconds)
      const recentKey = `recent-${actionKey}`;
      const now = Date.now();
      const lastExecution = this.executedActions.get(recentKey);
      
      if (lastExecution && (now - lastExecution) < 5000) {
        this.log(`⚠️ Skipping recent duplicate action: ${action.name}`, 'warning');
        return { success: false, reason: 'recent_duplicate', lastExecution };
      }
      
      // Mark action as being executed
      this.executedActions.set(recentKey, now);
      
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
          case 'Redirect User':
            result = await this.redirectPage(config);
            break;
            
          default:
            this.log(`⚠️ Unknown action: ${name}`, 'warning');
            result = { success: false, error: `Unknown action: ${name}` };
        }
        
        if (result.success) {
          this.log(`✅ Action completed: ${name}`, 'success');
        } else {
          this.log(`⚠️ Action unsuccessful: ${name} - ${result.error || 'Unknown reason'}`, 'warning');
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
        if (!config.selector) {
          return { success: false, error: 'No selector provided' };
        }
        
        // Wait for elements to be available (but don't fail if timeout)
        const element = await this.waitForElement(config.selector);
        
        // Try to find elements even if waitForElement timed out
        const elements = document.querySelectorAll(config.selector);
        
        if (!elements || elements.length === 0) {
          this.log(`⚠️ No elements found for selector: ${config.selector}`, 'warning');
          return { success: false, error: 'No elements found' };
        }
        
        // Use the robust replacement logic
        const success = this.applySingleSelector(config.selector, {
          newText: config.newText,
          originalText: config.originalText
        });
        
        if (success) {
          this.completedModifications.add(`replaceText:${config.selector}`);
          this.log(`✅ Text replaced successfully (${config.selector})`, 'success');
          return { success: true, elementsModified: elements.length };
        } else {
          this.log(`⚠️ Text replacement failed (${config.selector})`, 'warning');
          return { success: false, error: 'Replacement operation failed' };
        }
        
      } catch (error) {
        this.log(`❌ Text replacement failed for ${config.selector}: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    /**
     * Robust content replacement function adapted from utm-magic.js
     * Handles different element types properly
     */
    replaceContent(element, config) {
      if (!element || (!config.newText && config.newText !== '')) return false;
      
      try {
        const tagName = element.tagName.toLowerCase();
        const newText = config.newText;
        const originalText = config.originalText;
        
        this.log(`🔄 Replacing content in ${tagName} element`, 'info', { newText, originalText });
        
        // Handle buttons
        if (tagName === 'button' || (tagName === 'input' && (element.type === 'submit' || element.type === 'button'))) {
          if (originalText && element.textContent.includes(originalText)) {
            element.textContent = element.textContent.replace(originalText, newText);
          } else {
            element.textContent = newText;
          }
        }
        // Handle inputs
        else if (tagName === 'input') {
          if (element.type === 'text' || element.type === 'email' || element.type === 'tel' || element.type === 'number') {
            element.value = newText || '';
            element.setAttribute('placeholder', newText || '');
          }
        }
        // Handle links
        else if (tagName === 'a') {
          if (newText && (newText.startsWith('http') || newText.startsWith('/') || newText.includes('://'))) {
            element.setAttribute('href', newText);
          } else {
            if (originalText && element.innerHTML.includes(originalText)) {
              element.innerHTML = element.innerHTML.replace(originalText, newText || '');
            } else {
              element.innerHTML = newText || '';
            }
          }
        }
        // Default for div, span, p, h1-h6, etc.
        else {
          if (originalText && element.innerHTML.includes(originalText)) {
            element.innerHTML = element.innerHTML.replace(originalText, newText || '');
          } else {
            element.innerHTML = newText || '';
          }
        }
        
        return true;
      } catch (e) {
        this.log(`Error replacing content: ${e.message}`, 'error');
        return false;
      }
    }

    /**
     * Apply a single selector efficiently (adapted from utm-magic.js)
     */
    applySingleSelector(selector, config, preventDuplicates = true) {
      const selectorKey = `${selector}-${JSON.stringify(config)}`;
      
      if (preventDuplicates && this.processedSelectors.has(selectorKey)) {
        this.log(`Skipping already processed selector: ${selector}`);
        return true; // Already processed
      }
      
      try {
        const elements = document.querySelectorAll(selector);
        if (!elements?.length) {
          this.log(`No elements found for selector: ${selector}`, 'warning');
          // Add explicit browser console warning:
          console.warn(`No elements found for selector: ${selector}`);
          return false;
        }
        
        let successCount = 0;
        
        elements.forEach(element => {
          if (this.replaceContent(element, config)) {
            successCount++;
          }
        });
        
        if (successCount > 0) {
          if (preventDuplicates) {
            this.processedSelectors.add(selectorKey);
          }
          this.log(`✅ Applied content replacement to ${successCount}/${elements.length} elements (${selector})`, 'success');
          return true;
        }
        
        return false;
      } catch (e) {
        this.log(`Error applying selector ${selector}: ${e.message}`, 'error');
        return false;
      }
    }

    async hideElement(config) {
      try {
        await this.waitForElement(config.selector);
        
        const elements = document.querySelectorAll(config.selector);
        if (!elements?.length) {
          this.log(`⚠️ No elements found to hide: ${config.selector}`, 'warning');
          return { success: false, error: 'No elements found' };
        }
        
        let hiddenCount = 0;
        elements.forEach(element => {
          if (config.animation === 'fade') {
            element.style.transition = 'opacity 0.3s ease';
            element.style.opacity = '0';
            setTimeout(() => {
              element.style.display = 'none';
              this.log(`🫥 Element faded out: ${element.tagName}.${element.className}`);
            }, 300);
          } else {
            element.style.display = 'none';
            this.log(`🫥 Element hidden: ${element.tagName}.${element.className}`);
          }
          hiddenCount++;
        });
        
        this.completedModifications.add(`hideElement:${config.selector}`);
        this.log(`✅ Hidden ${hiddenCount} elements (${config.selector})`, 'success');
        return { success: true, hidden: hiddenCount };
        
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
      // Validate URL
      if (!config.url || typeof config.url !== 'string') {
        this.log('⚠️ Redirect action: Invalid or missing URL', 'error');
        return { success: false, error: 'Invalid or missing URL' };
      }

      // Prevent redirect loops - check if we're redirecting to the same page
      const currentUrl = window.location.href;
      const targetUrl = new URL(config.url, window.location.origin).href;
      
      if (currentUrl === targetUrl) {
        this.log('⚠️ Redirect action: Prevented redirect to same page to avoid infinite loop', 'warning');
        return { success: false, error: 'Same page redirect prevented' };
      }

      // Check if we've already redirected recently (within last 10 seconds)
      const redirectKey = `redirect_${targetUrl}`;
      const lastRedirectTime = sessionStorage.getItem(redirectKey);
      const now = Date.now();
      
      if (lastRedirectTime && (now - parseInt(lastRedirectTime)) < 10000) {
        this.log('⚠️ Redirect action: Prevented rapid consecutive redirects to prevent loop', 'warning');
        return { success: false, error: 'Rapid redirect prevented' };
      }

      // Store redirect timestamp
      sessionStorage.setItem(redirectKey, now.toString());

      const delay = (config.delay || 0) * 1000; // Convert seconds to milliseconds
      
      this.log(`🔄 Redirect scheduled: ${config.url} (delay: ${config.delay || 0}s, newTab: ${config.newTab || false})`);
      
      setTimeout(() => {
        try {
          if (config.newTab) {
            window.open(config.url, '_blank', 'noopener,noreferrer');
          } else {
            window.location.href = config.url;
          }
        } catch (error) {
          this.log(`❌ Redirect failed: ${error.message}`, 'error');
        }
      }, delay);
      
      this.log(`✅ Redirect scheduled to: ${config.url}`);
      return { success: true };
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

        let observer = null;
        let timeoutId = null;
        let bodyObserver = null;
        
        const cleanup = () => {
          if (observer) {
            observer.disconnect();
            observer = null;
          }
          if (bodyObserver) {
            bodyObserver.disconnect();
            bodyObserver = null;
          }
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          this.elementsToWaitFor.delete(selector);
        };

        const checkElement = () => {
          const element = document.querySelector(selector);
          if (element) {
            cleanup();
            this.log(`✅ Element appeared: ${selector}`);
            resolve(element);
            return true;
          }
          return false;
        };

        observer = new MutationObserver((mutations) => {
          // Throttle mutation checking to prevent performance issues
          if (!checkElement()) {
            // If element still not found, check if any relevant nodes were added
            let hasRelevantChanges = false;
            mutations.forEach(mutation => {
              if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                hasRelevantChanges = true;
              }
            });
            
            if (!hasRelevantChanges) return; // Skip if no relevant changes
          }
        });

        // Observe with minimal options for better performance
        const observeOptions = { 
          childList: true, 
          subtree: true
        };

        // Start observing - handle case where body might not exist yet
        if (document.body) {
          observer.observe(document.body, observeOptions);
        } else {
          // If body doesn't exist, wait for it with timeout
          bodyObserver = new MutationObserver(() => {
            if (document.body) {
              bodyObserver.disconnect();
              bodyObserver = null;
              if (observer && !checkElement()) {
                observer.observe(document.body, observeOptions);
              }
            }
          });
          
          try {
            bodyObserver.observe(document.documentElement, { childList: true });
          } catch (bodyError) {
            this.log(`❌ Failed to observe documentElement: ${bodyError.message}`, 'error');
            cleanup();
            reject(new Error(`Failed to setup element waiting for ${selector}`));
            return;
          }
        }
        
        // Set timeout
        timeoutId = setTimeout(() => {
          cleanup();
          this.log(`❌ Element timeout: ${selector} not found within ${actualTimeout}ms`, 'warning');
          // Don't reject - resolve with null to allow workflow to continue
          resolve(null);
        }, actualTimeout);
      });
    }

    safeHideContent() {
      // Check if anti-flicker script already handled this
      if (window.unifiedWorkflowAntiFlicker?.isContentHidden()) {
        this.contentHidden = true;
        this.log('🙈 Content already hidden by anti-flicker script');
        return;
      }
      
      // Wait for body to be available
      if (!document.body) {
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => this.safeHideContent());
        return;
      }
      this.hideContent();
    }

    hideContent() {
      if (this.contentHidden) return;
      
      // Check if anti-flicker script already handled this
      if (window.unifiedWorkflowAntiFlicker?.isContentHidden()) {
        this.contentHidden = true;
        this.log('🙈 Content already hidden by anti-flicker script');
        return;
      }
      
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
      
      // Show loading indicator if enabled and not already shown
      if (this.config.showLoadingIndicator && !window.unifiedWorkflowAntiFlicker?.isLoadingIndicatorShown()) {
        this.showLoadingIndicator();
      }
      
      this.log('🙈 Content hidden during workflow initialization');
      
      // Safety timeout to show content regardless
      this._safetyTimeout = setTimeout(() => {
        this.log('⏰ Safety timeout reached, showing content', 'warning');
        this.showContent();
      }, this.config.maxInitTime);
    }

    showContent() {
      // Clear safety timeout
      if (this._safetyTimeout) {
        clearTimeout(this._safetyTimeout);
        this._safetyTimeout = null;
      }
      
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

    /**
     * Track workflow execution to analytics endpoint
     */
    async trackWorkflowExecution(workflow, executionData) {
      try {
        // Don't track if no API endpoint configured
        if (!this.config.apiEndpoint) {
          this.log('⚠️ No API endpoint configured for execution tracking', 'warning');
          return;
        }

        const trackingPayload = {
          workflowId: workflow.id,
          userId: workflow.user_id || null, // May be null for public workflows
          status: executionData.status || 'success',
          executionTimeMs: executionData.executionTimeMs,
          pageUrl: executionData.pageUrl || window.location.href,
          sessionId: this.generateSessionId(),
          userAgent: navigator.userAgent,
          deviceType: executionData.deviceType,
          actions: executionData.actionsExecuted || [],
          executionKey: executionData.executionKey // Add executionKey to payload
        };

        this.log(`📊 Tracking execution for workflow: ${workflow.name}`, 'info', trackingPayload);

        const response = await fetch(`https://xlzihfstoqdbgdegqkoi.supabase.co/functions/v1/track-execution`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(trackingPayload)
        });

        if (response.ok) {
          const result = await response.json();
          this.log(`✅ Execution tracked successfully: ${result.executionId}`, 'success');
        } else {
          const error = await response.text();
          this.log(`❌ Failed to track execution: ${response.status} - ${error}`, 'error');
        }
      } catch (error) {
        this.log(`❌ Error tracking workflow execution: ${error.message}`, 'error');
        // Don't throw - tracking failure shouldn't break workflow execution
      }
    }

    /**
     * Generate a simple session ID for tracking
     */
    generateSessionId() {
      if (!this._sessionId) {
        this._sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      return this._sessionId;
    }

    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // Global API - Make sure it's available immediately
  if (typeof window !== 'undefined') {
    window.UnifiedWorkflowSystem = UnifiedWorkflowSystem;
  }

  // Prevent multiple instances and conflicts with legacy systems
  if (window.workflowSystem && window.workflowSystem.initialized) {
    console.log('🎯 Unified Workflow System: Instance already exists and initialized, skipping initialization');
  } else if (window.DISABLE_LEGACY_WORKFLOWS && window.workflowSystem) {
    console.log('🎯 Unified Workflow System: Instance exists but not initialized, will initialize');
  } else {
    // Auto-initialize only if not explicitly disabled and no existing functional instance
    if (!window.DISABLE_LEGACY_WORKFLOWS) {
      // Set the flag first to prevent conflicts
      window.DISABLE_LEGACY_WORKFLOWS = true;
      console.log('🎯 Unified Workflow System: Setting DISABLE_LEGACY_WORKFLOWS to prevent conflicts');
    }
    
    console.log('🎯 Unified Workflow System: Initializing new instance...');
    
    // Ensure UnifiedWorkflowSystem is available
    if (typeof UnifiedWorkflowSystem === 'undefined') {
      console.error('❌ UnifiedWorkflowSystem class not available');
    } else {
      // Check if configuration is available from the Railway server integration
      const config = window.TRACKFLOW_CONFIG || {};
      
      // Create instance
      if (!window.workflowSystem) {
        window.workflowSystem = new UnifiedWorkflowSystem(config);
        console.log('✅ Unified Workflow System instance created');
      }
      
      // Initialize immediately if DOM is ready, otherwise wait
      const initializeSystem = async () => {
        try {
          if (!window.workflowSystem.initialized) {
            console.log('🎯 Starting unified workflow system initialization...');
            await window.workflowSystem.initialize();
            console.log('✅ Unified workflow system initialized successfully');
            
            // Dispatch ready event
            if (typeof CustomEvent !== 'undefined') {
              window.dispatchEvent(new CustomEvent('unifiedWorkflowSystemReady', {
                detail: { system: window.workflowSystem }
              }));
            }
          } else {
            console.log('🎯 Unified workflow system already initialized');
          }
        } catch (error) {
          console.error('❌ Unified workflow system initialization failed:', error);
          
          // Ensure content is shown even if initialization fails
          try {
            if (window.workflowSystem && typeof window.workflowSystem.showContent === 'function') {
              window.workflowSystem.showContent();
            } else if (window.unifiedWorkflowAntiFlicker && typeof window.unifiedWorkflowAntiFlicker.showContent === 'function') {
              window.unifiedWorkflowAntiFlicker.showContent();
            } else {
              // Fallback content reveal
              if (document.body) {
                document.body.style.visibility = 'visible';
                document.body.style.opacity = '1';
              }
            }
          } catch (fallbackError) {
            console.error('❌ Failed to show content after initialization failure:', fallbackError);
          }
        }
      };
      
      // Initialize based on DOM state
      if (document.readyState === 'loading') {
        // DOM still loading - wait for DOMContentLoaded
        document.addEventListener('DOMContentLoaded', initializeSystem, { once: true });
        console.log('🎯 Waiting for DOMContentLoaded to initialize system');
      } else {
        // DOM already loaded - initialize immediately
        console.log('🎯 DOM already loaded, initializing system immediately');
        setTimeout(initializeSystem, 0);
      }
      
      // Safety timeout to ensure content is shown even if everything fails
      setTimeout(() => {
        if (!window.workflowSystem || !window.workflowSystem.initialized) {
          console.warn('🎯 Unified Workflow System: Safety timeout reached, forcing content reveal');
          try {
            if (window.workflowSystem && typeof window.workflowSystem.showContent === 'function') {
              window.workflowSystem.showContent();
            } else if (window.unifiedWorkflowAntiFlicker && typeof window.unifiedWorkflowAntiFlicker.showContent === 'function') {
              window.unifiedWorkflowAntiFlicker.showContent();
            } else {
              // Fallback content reveal
              if (document.body) {
                document.body.style.visibility = 'visible';
                document.body.style.opacity = '1';
              }
            }
          } catch (fallbackError) {
            console.error('❌ Safety timeout fallback failed:', fallbackError);
          }
        }
      }, 10000); // 10 second safety timeout
    }
  }

  // Log that unified system is active
  console.log('🎯 Unified Workflow System: Script loaded and ready');
  console.log('🎯 DISABLE_LEGACY_WORKFLOWS:', window.DISABLE_LEGACY_WORKFLOWS);

})(); 