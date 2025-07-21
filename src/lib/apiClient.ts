/**
 * Simple, reliable API client for TrackFlow
 * Handles all backend communication with proper error handling
 */

import { supabase } from './supabase';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  
  constructor(message: string, status: number = 500, code: string = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

class ApiClient {
  private readonly baseTimeout = 15000; // 15 seconds
  private readonly maxRetries = 2;
  
  /**
   * Make a simple HTTP request with timeout and retry logic
   */
  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {}, 
    timeout: number = this.baseTimeout
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          'HTTP_ERROR'
        );
      }
      
      const data = await response.json();
      return data;
      
         } catch (error: any) {
       clearTimeout(timeoutId);
       
       if (error instanceof ApiError) {
         throw error;
       }
       
       if (error.name === 'AbortError') {
         throw new ApiError('Request timed out', 408, 'TIMEOUT');
       }
       
       throw new ApiError(
         error.message || 'Network request failed',
         0,
         'NETWORK_ERROR'
       );
     }
  }
  
  /**
   * Make request with automatic retries
   */
     private async requestWithRetry<T>(
     url: string,
     options: RequestInit = {},
     retries: number = this.maxRetries
   ): Promise<T> {
     let lastError: Error = new ApiError('Request failed', 500, 'UNKNOWN_ERROR');
     
     for (let attempt = 0; attempt <= retries; attempt++) {
       try {
         return await this.makeRequest<T>(url, options);
       } catch (error: any) {
         lastError = error;
         
         // Don't retry on client errors (4xx)
         if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
           throw error;
         }
         
         // Don't retry on last attempt
         if (attempt === retries) {
           break;
         }
         
         // Wait before retry (exponential backoff)
         await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
       }
     }
     
     throw lastError;
   }
  
  /**
   * Authenticate user and return session
   */
  async signIn(email: string, password: string): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      return {
        success: true,
        data: data.user,
        timestamp: new Date().toISOString(),
      };
         } catch (error: any) {
       return {
         success: false,
         error: error.message || 'Authentication failed',
         timestamp: new Date().toISOString(),
       };
     }
  }
  
  /**
   * Register new user
   */
  async signUp(email: string, password: string, metadata?: any): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {}
        }
      });
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      return {
        success: true,
        data: data.user,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Registration failed',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Sign out user
   */
  async signOut(): Promise<ApiResponse> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Sign out failed',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Get current user session
   */
  async getCurrentSession(): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      return {
        success: true,
        data: data.session,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get session',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Get user workflows - direct table query
   */
  async getUserWorkflows(): Promise<ApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString(),
        };
      }
      
      // Simple direct query - no complex views or RPC calls
      const { data, error } = await supabase
        .from('workflows')
        .select(`
          *,
          workflow_nodes (*),
          workflow_connections (*)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
             // Transform data to frontend format
       const workflows = data.map((workflow: any) => ({
         id: workflow.id,
         name: workflow.name,
         description: workflow.description || '',
         isActive: workflow.is_active,
         status: workflow.status,
         targetUrl: workflow.target_url || '*',
         executions: workflow.executions || 0,
         lastRun: workflow.last_run ? new Date(workflow.last_run) : null,
         createdAt: new Date(workflow.created_at),
         updatedAt: new Date(workflow.updated_at),
         nodes: workflow.workflow_nodes.map((node: any) => ({
           id: node.id,
           type: node.type,
           category: node.category,
           name: node.name,
           description: node.description,
           icon: node.icon,
           position: node.position,
           config: node.config,
           inputs: node.inputs,
           outputs: node.outputs,
         })),
         connections: workflow.workflow_connections.map((conn: any) => ({
           id: conn.id,
           sourceNodeId: conn.source_node_id,
           targetNodeId: conn.target_node_id,
           sourceHandle: conn.source_handle,
           targetHandle: conn.target_handle,
         })),
       }));
      
      return {
        success: true,
        data: workflows,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to load workflows',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Save workflow - simple approach
   */
  async saveWorkflow(workflow: any): Promise<ApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString(),
        };
      }
      
      // Determine if this is create or update
      const isNewWorkflow = workflow.id.startsWith('workflow-');
      
      let workflowData;
      
      if (isNewWorkflow) {
        // Create new workflow
        const { data, error } = await supabase
          .from('workflows')
          .insert({
            user_id: user.id,
            name: workflow.name,
            description: workflow.description || null,
            is_active: workflow.isActive,
            status: workflow.status,
            target_url: workflow.targetUrl || '*',
          })
          .select()
          .single();
        
        if (error) {
          return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
          };
        }
        
        workflowData = data;
      } else {
        // Update existing workflow
        const { data, error } = await supabase
          .from('workflows')
          .update({
            name: workflow.name,
            description: workflow.description || null,
            is_active: workflow.isActive,
            status: workflow.status,
            target_url: workflow.targetUrl || '*',
            updated_at: new Date().toISOString(),
          })
          .eq('id', workflow.id)
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) {
          return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
          };
        }
        
        workflowData = data;
        
        // Delete existing nodes and connections
        await supabase
          .from('workflow_connections')
          .delete()
          .eq('workflow_id', workflow.id);
        
        await supabase
          .from('workflow_nodes')
          .delete()
          .eq('workflow_id', workflow.id);
      }
      
      // Insert nodes
      if (workflow.nodes && workflow.nodes.length > 0) {
        const nodes = workflow.nodes.map(node => ({
          id: node.id,
          workflow_id: workflowData.id,
          type: node.type,
          category: node.category,
          name: node.name,
          description: node.description || null,
          icon: node.icon,
          position: node.position,
          config: node.config,
          inputs: node.inputs || [],
          outputs: node.outputs || [],
        }));
        
        const { error: nodesError } = await supabase
          .from('workflow_nodes')
          .insert(nodes);
        
        if (nodesError) {
          return {
            success: false,
            error: `Failed to save nodes: ${nodesError.message}`,
            timestamp: new Date().toISOString(),
          };
        }
      }
      
      // Insert connections
      if (workflow.connections && workflow.connections.length > 0) {
        const connections = workflow.connections.map(conn => ({
          id: conn.id,
          workflow_id: workflowData.id,
          source_node_id: conn.sourceNodeId,
          target_node_id: conn.targetNodeId,
          source_handle: conn.sourceHandle,
          target_handle: conn.targetHandle,
        }));
        
        const { error: connectionsError } = await supabase
          .from('workflow_connections')
          .insert(connections);
        
        if (connectionsError) {
          return {
            success: false,
            error: `Failed to save connections: ${connectionsError.message}`,
            timestamp: new Date().toISOString(),
          };
        }
      }
      
      return {
        success: true,
        data: {
          ...workflow,
          id: workflowData.id,
          updatedAt: new Date(workflowData.updated_at),
        },
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to save workflow',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId: string): Promise<ApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString(),
        };
      }
      
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId)
        .eq('user_id', user.id);
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to delete workflow',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Get workflow templates
   */
  async getWorkflowTemplates(): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false });
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      const templates = data.map(template => ({
        id: `template-${template.id}`,
        name: template.name,
        description: template.description || '',
        isActive: false,
        status: 'draft',
        executions: 0,
        createdAt: new Date(template.created_at),
        updatedAt: new Date(template.updated_at),
        targetUrl: '*',
        nodes: template.nodes || [],
        connections: template.connections || [],
      }));
      
      return {
        success: true,
        data: templates,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to load templates',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Get user analytics stats
   */
  async getUserStats(): Promise<ApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString(),
        };
      }
      
      // Simple aggregation queries instead of complex RPC
      const [workflowsResult, executionsResult] = await Promise.all([
        supabase
          .from('workflows')
          .select('id, is_active, executions')
          .eq('user_id', user.id),
        supabase
          .from('workflow_executions')
          .select('status')
          .eq('user_id', user.id)
      ]);
      
      if (workflowsResult.error) {
        return {
          success: false,
          error: workflowsResult.error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      const workflows = workflowsResult.data || [];
      const executions = executionsResult.data || [];
      
      const stats = {
        total_workflows: workflows.length,
        active_workflows: workflows.filter(w => w.is_active).length,
        total_executions: workflows.reduce((sum, w) => sum + (w.executions || 0), 0),
        total_events: executions.length,
        avg_success_rate: executions.length > 0 
          ? (executions.filter(e => e.status === 'success').length / executions.length) * 100 
          : 0,
      };
      
      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to load user stats',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Get workflow executions
   */
  async getWorkflowExecutions(workflowId?: string, limit: number = 50): Promise<ApiResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString(),
        };
      }
      
      let query = supabase
        .from('workflow_executions')
        .select('*')
        .eq('user_id', user.id)
        .order('executed_at', { ascending: false })
        .limit(limit);
      
      if (workflowId) {
        query = query.eq('workflow_id', workflowId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      
      return {
        success: true,
        data: data || [],
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to load executions',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  /**
   * Scrape website content
   */
  async scrapeWebsite(url: string): Promise<ApiResponse> {
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api/scrape'
        : 'https://trackflow-webapp-production.up.railway.app/api/scrape';
      
      const data = await this.requestWithRetry(apiUrl, {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to scrape website',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient(); 