import { apiClient, ApiResponse } from '../lib/apiClient';

export interface AnalyticsEvent {
  id: string
  user_id: string
  workflow_id: string | null
  workflow_execution_id: string | null
  session_id: string
  event_type: string
  element_selector: string | null
  element_text: string | null
  element_attributes: any
  page_url: string | null
  page_title: string | null
  referrer_url: string | null
  device_type: string | null
  browser_info: any
  user_agent: string | null
  viewport_size: any
  screen_size: any
  event_data: any
  created_at: string
}

export interface WorkflowExecution {
  id: string
  workflow_id: string
  user_id: string
  status: 'success' | 'error' | 'timeout'
  execution_time_ms: number | null
  error_message: string | null
  page_url: string | null
  user_agent: string | null
  session_id: string | null
  executed_at: string
}

export interface UserStats {
  total_workflows: number
  active_workflows: number
  total_executions: number
  total_events: number
  avg_success_rate: number
}

/**
 * Simple, reliable AnalyticsService using the new ApiClient
 * No more complex RPC calls or timeout handling - that's in ApiClient
 */
export class AnalyticsService {
  /**
   * Get user's workflow statistics
   */
  static async getUserStats(): Promise<UserStats | null> {
    console.log('📊 Loading user stats...');
    
    const response: ApiResponse = await apiClient.getUserStats();
    
    if (!response.success) {
      console.error('Failed to load user stats:', response.error);
      throw new Error(response.error || 'Failed to load user stats');
    }
    
    console.log('✅ Loaded user stats');
    return response.data;
  }

  /**
   * Get workflow executions for user
   */
  static async getWorkflowExecutions(
    workflowId?: string,
    limit: number = 50
  ): Promise<WorkflowExecution[]> {
    console.log(`📊 Loading workflow executions (limit: ${limit})...`);
    
    const response: ApiResponse = await apiClient.getWorkflowExecutions(workflowId, limit);
    
    if (!response.success) {
      console.error('Failed to load workflow executions:', response.error);
      throw new Error(response.error || 'Failed to load workflow executions');
    }
    
    console.log(`✅ Loaded ${response.data?.length || 0} executions`);
    return response.data || [];
  }

  /**
   * Get analytics events for user's workflows
   * Note: This method is simplified - advanced analytics features can be added later
   */
  static async getAnalyticsEvents(
    workflowId?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AnalyticsEvent[]> {
    console.log(`📊 Loading analytics events (workflowId: ${workflowId}, limit: ${limit})...`);
    
    // For now, return empty array as this would require additional API endpoint
    // Advanced analytics can be implemented later when needed
    console.log('Advanced analytics events not yet implemented in new system');
    return [];
  }

  /**
   * Get daily analytics summary for user's workflows
   * Note: This method is simplified - advanced analytics features can be added later
   */
  static async getWorkflowAnalyticsSummary(
    workflowId?: string,
    days: number = 30
  ): Promise<any[]> {
    console.log(`📊 Loading analytics summary (workflowId: ${workflowId}, days: ${days})...`);
    
    // For now, return empty array as this would require additional API endpoint
    // Advanced analytics can be implemented later when needed
    console.log('Analytics summary not yet implemented in new system');
    return [];
  }

  /**
   * Get real-time analytics for user's workflows
   * Note: This method is simplified - real-time features can be added later
   */
  static async getRealtimeAnalytics(): Promise<any[]> {
    console.log('📊 Loading real-time analytics...');
    
    // For now, return empty array as this would require additional API endpoint
    // Real-time analytics can be implemented later when needed
    console.log('Real-time analytics not yet implemented in new system');
    return [];
  }

  /**
   * Track a workflow execution (for server-side use)
   * Note: This method is simplified - execution tracking can be enhanced later
   */
  static async trackWorkflowExecution(
    workflowId: string,
    status: 'success' | 'error' | 'timeout',
    executionTimeMs?: number,
    errorMessage?: string,
    pageUrl?: string,
    sessionId?: string
  ): Promise<string | null> {
    console.log(`📊 Tracking workflow execution (${workflowId}, ${status})...`);
    
    // For now, just log the execution - server-side tracking can be implemented later
    console.log('Workflow execution tracking not yet implemented in new system');
    return null;
  }

  /**
   * Track an analytics event (for client-side use)
   * Note: This method is simplified - event tracking can be enhanced later
   */
  static async trackAnalyticsEvent(
    workflowId: string | null,
    workflowExecutionId: string | null,
    sessionId: string,
    eventType: string,
    elementSelector?: string,
    elementText?: string,
    pageUrl?: string,
    deviceType?: string,
    eventData?: any
  ): Promise<string | null> {
    console.log(`📊 Tracking analytics event (${eventType})...`);
    
    // For now, just log the event - client-side tracking can be implemented later
    console.log('Analytics event tracking not yet implemented in new system');
    return null;
  }

  /**
   * Get analytics data for dashboard charts
   */
  static async getDashboardAnalytics(days: number = 30) {
    console.log(`📊 Loading dashboard analytics (${days} days)...`);
    
    try {
      // Get user stats (this is implemented)
      const userStats = await this.getUserStats();
      
      // Get workflow executions (this is implemented)
      const executions = await this.getWorkflowExecutions(undefined, 50);
      
      // Return basic analytics data
      const analytics = {
        userStats: userStats || {
          total_workflows: 0,
          active_workflows: 0,
          total_executions: 0,
          total_events: 0,
          avg_success_rate: 0
        },
        realtimeData: [], // Will be implemented later
        summaryData: [], // Will be implemented later
        executions: executions
      };
      
      console.log('✅ Loaded dashboard analytics');
      return analytics;
      
    } catch (error) {
      console.error('Error loading dashboard analytics:', error);
      
      // Return safe defaults on error
      return {
        userStats: {
          total_workflows: 0,
          active_workflows: 0,
          total_executions: 0,
          total_events: 0,
          avg_success_rate: 0
        },
        realtimeData: [],
        summaryData: [],
        executions: []
      };
    }
  }
} 