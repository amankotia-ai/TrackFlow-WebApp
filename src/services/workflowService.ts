import { supabase } from '../lib/supabase'
import { Workflow, WorkflowNode, WorkflowConnection } from '../types/workflow'
import { ensureWorkflowConnections } from '../utils/integrationCodeGenerator';

export interface WorkflowData {
  id: string
  user_id: string
  name: string
  description: string | null
  is_active: boolean
  status: 'draft' | 'active' | 'paused' | 'error'
  target_url: string
  executions: number
  last_run: string | null
  created_at: string
  updated_at: string
  nodes?: any[]
  connections?: any[]
}

// Convert Supabase workflow data to frontend Workflow type
function convertToWorkflow(data: WorkflowData): Workflow {
  // Parse nodes and connections if they're strings
  let nodes = data.nodes || [];
  let connections = data.connections || [];
  
  // Handle case where nodes/connections might be JSON strings
  if (typeof nodes === 'string') {
    try {
      nodes = JSON.parse(nodes);
    } catch (e) {
      console.error('Failed to parse nodes:', e);
      nodes = [];
    }
  }
  
  if (typeof connections === 'string') {
    try {
      connections = JSON.parse(connections);
    } catch (e) {
      console.error('Failed to parse connections:', e);
      connections = [];
    }
  }
  
  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    isActive: data.is_active,
    status: data.status,
    targetUrl: data.target_url || '*',
    nodes: nodes,
    connections: connections,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    executions: data.executions || 0,
    lastRun: data.last_run ? new Date(data.last_run) : undefined
  }
}

// Convert frontend Workflow type to Supabase format
function convertFromWorkflow(workflow: Workflow, userId: string) {
  return {
    id: workflow.id.startsWith('workflow-') ? undefined : workflow.id, // Let DB generate ID for new workflows
    user_id: userId,
    name: workflow.name,
    description: workflow.description || null,
    is_active: workflow.isActive,
    status: workflow.status,
    target_url: workflow.targetUrl || '*',
    nodes: workflow.nodes,
    connections: workflow.connections
  }
}

export class WorkflowService {
  // Get all workflows for the current user
  static async getUserWorkflows(): Promise<Workflow[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('workflows_with_nodes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching workflows:', error)
        throw error
      }

      return (data || []).map(convertToWorkflow)
    } catch (error) {
      console.error('Error in getUserWorkflows:', error)
      throw error
    }
  }

  // Save a workflow (create or update)
  static async saveWorkflow(workflow: Workflow): Promise<Workflow> {
    // Ensure workflow has valid connections before saving
    const workflowWithConnections = ensureWorkflowConnections(workflow);
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Use the save_workflow_complete function
      const { data, error } = await supabase.rpc('save_workflow_complete', {
        p_workflow_id: workflow.id.startsWith('workflow-') ? null : workflow.id,
        p_user_id: user.id,
        p_name: workflow.name,
        p_description: workflow.description || null,
        p_is_active: workflow.isActive,
        p_status: workflow.status,
        p_target_url: workflow.targetUrl || '*',
        p_nodes: workflowWithConnections.nodes,
        p_connections: workflowWithConnections.connections
      })

      if (error) {
        console.error('Error saving workflow:', error)
        throw error
      }

      // Return the updated workflow with the new ID
      return {
        ...workflowWithConnections,
        id: data,
        updatedAt: new Date()
      }
    } catch (error) {
      console.error('Error in saveWorkflow:', error)
      throw error
    }
  }

  // Delete a workflow
  static async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId)
        .eq('user_id', user.id) // Ensure user can only delete their own workflows

      if (error) {
        console.error('Error deleting workflow:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in deleteWorkflow:', error)
      throw error
    }
  }

  // Get workflow templates (public templates)
  static async getWorkflowTemplates(): Promise<Workflow[]> {
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false })

      if (error) {
        console.error('Error fetching templates:', error)
        throw error
      }

      // Convert templates to workflow format
      return (data || []).map(template => ({
        id: `template-${template.id}`,
        name: template.name,
        description: template.description || '',
        isActive: false,
        status: 'draft' as const,
        executions: 0,
        createdAt: new Date(template.created_at),
        updatedAt: new Date(template.updated_at),
        targetUrl: '*',
        nodes: template.nodes || [],
        connections: template.connections || []
      }))
    } catch (error) {
      console.error('Error in getWorkflowTemplates:', error)
      // Return empty array if templates can't be loaded
      return []
    }
  }

  // Generate API key for user
  static async generateApiKey(keyName: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Generate API key
      const { data: apiKey, error: keyError } = await supabase.rpc('generate_api_key')
      
      if (keyError) {
        console.error('Error generating API key:', keyError)
        throw keyError
      }

      // Save API key to database
      const { error: saveError } = await supabase
        .from('user_api_keys')
        .insert({
          user_id: user.id,
          key_name: keyName,
          api_key: apiKey,
          is_active: true
        })

      if (saveError) {
        console.error('Error saving API key:', saveError)
        throw saveError
      }

      return apiKey
    } catch (error) {
      console.error('Error in generateApiKey:', error)
      throw error
    }
  }

  // Get user's API keys
  static async getUserApiKeys() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching API keys:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getUserApiKeys:', error)
      throw error
    }
  }

  // Get a workflow by its ID (with nodes and connections)
  static async getWorkflowById(workflowId: string): Promise<Workflow | null> {
    try {
      const { data, error } = await supabase
        .from('workflows_with_nodes')
        .select('*')
        .eq('id', workflowId)
        .single();
      if (error || !data) {
        console.error('Error fetching workflow by ID:', error);
        return null;
      }
      return convertToWorkflow(data);
    } catch (error) {
      console.error('Error in getWorkflowById:', error);
      return null;
    }
  }
} 