import { supabase } from '../lib/supabase'

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

export interface WorkflowAnalyticsSummary {
  id: string
  workflow_id: string
  user_id: string
  date: string
  total_executions: number
  successful_executions: number
  failed_executions: number
  total_events: number
  unique_sessions: number
  avg_execution_time_ms: number
  conversion_count: number
  conversion_rate: number
  created_at: string
  updated_at: string
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

export class AnalyticsService {
  // Get user's workflow statistics
  static async getUserStats(): Promise<UserStats | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase.rpc('get_user_workflow_stats', {
        p_user_id: user.id
      })

      if (error) {
        console.error('Error fetching user stats:', error)
        throw error
      }

      return data && data.length > 0 ? data[0] : null
    } catch (error) {
      console.error('Error in getUserStats:', error)
      throw error
    }
  }

  // Get analytics events for user's workflows
  static async getAnalyticsEvents(
    workflowId?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AnalyticsEvent[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      let query = supabase
        .from('analytics_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (workflowId) {
        query = query.eq('workflow_id', workflowId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching analytics events:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getAnalyticsEvents:', error)
      throw error
    }
  }

  // Get workflow executions for user
  static async getWorkflowExecutions(
    workflowId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WorkflowExecution[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      let query = supabase
        .from('workflow_executions')
        .select('*')
        .eq('user_id', user.id)
        .order('executed_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (workflowId) {
        query = query.eq('workflow_id', workflowId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching workflow executions:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getWorkflowExecutions:', error)
      throw error
    }
  }

  // Get daily analytics summary for user's workflows
  static async getWorkflowAnalyticsSummary(
    workflowId?: string,
    days: number = 30
  ): Promise<WorkflowAnalyticsSummary[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      let query = supabase
        .from('workflow_analytics_summary')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (workflowId) {
        query = query.eq('workflow_id', workflowId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching analytics summary:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getWorkflowAnalyticsSummary:', error)
      throw error
    }
  }

  // Get real-time analytics for user's workflows
  static async getRealtimeAnalytics(): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('workflow_realtime_analytics')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching realtime analytics:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getRealtimeAnalytics:', error)
      throw error
    }
  }

  // Track a workflow execution (for server-side use)
  static async trackWorkflowExecution(
    workflowId: string,
    status: 'success' | 'error' | 'timeout',
    executionTimeMs?: number,
    errorMessage?: string,
    pageUrl?: string,
    sessionId?: string
  ): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase.rpc('track_workflow_execution', {
        p_workflow_id: workflowId,
        p_user_id: user.id,
        p_status: status,
        p_execution_time_ms: executionTimeMs || null,
        p_error_message: errorMessage || null,
        p_page_url: pageUrl || null,
        p_session_id: sessionId || null
      })

      if (error) {
        console.error('Error tracking workflow execution:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in trackWorkflowExecution:', error)
      throw error
    }
  }

  // Track an analytics event (for client-side use)
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
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase.rpc('track_analytics_event', {
        p_user_id: user.id,
        p_workflow_id: workflowId,
        p_workflow_execution_id: workflowExecutionId,
        p_session_id: sessionId,
        p_event_type: eventType,
        p_element_selector: elementSelector || null,
        p_element_text: elementText || null,
        p_page_url: pageUrl || null,
        p_device_type: deviceType || null,
        p_event_data: eventData || {}
      })

      if (error) {
        console.error('Error tracking analytics event:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in trackAnalyticsEvent:', error)
      throw error
    }
  }

  // Get analytics data for dashboard charts
  static async getDashboardAnalytics(days: number = 30) {
    try {
      const [userStats, realtimeData, summaryData] = await Promise.all([
        this.getUserStats(),
        this.getRealtimeAnalytics(),
        this.getWorkflowAnalyticsSummary(undefined, days)
      ])

      return {
        userStats: userStats || {
          total_workflows: 0,
          active_workflows: 0,
          total_executions: 0,
          total_events: 0,
          avg_success_rate: 0
        },
        realtimeData: realtimeData || [],
        summaryData: summaryData || []
      }
    } catch (error) {
      console.error('Error in getDashboardAnalytics:', error)
      throw error
    }
  }
} 