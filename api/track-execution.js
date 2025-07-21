import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for direct database access
const supabaseUrl = process.env.SUPABASE_URL || 'https://nmnjnofagtcalfnkltqp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required for execution tracking');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const {
      workflowId,
      userId,
      status = 'success',
      executionTimeMs,
      pageUrl,
      sessionId,
      errorMessage,
      userAgent,
      deviceType,
      actions = []
    } = req.body;

    // Validate required fields
    if (!workflowId) {
      return res.status(400).json({
        success: false,
        error: 'workflowId is required'
      });
    }

    // If no userId provided, try to extract from auth header or use anonymous tracking
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      // For anonymous tracking, we'll still log but won't update user-specific counts
      console.log('No userId provided for workflow execution tracking');
    }

    console.log(`📊 Tracking execution for workflow ${workflowId}:`, {
      status,
      executionTimeMs,
      pageUrl,
      actionsExecuted: actions.length
    });

    // Track the workflow execution
    const { data: executionId, error: executionError } = await supabase.rpc('track_workflow_execution', {
      p_workflow_id: workflowId,
      p_user_id: effectiveUserId,
      p_status: status,
      p_execution_time_ms: executionTimeMs || null,
      p_error_message: errorMessage || null,
      p_page_url: pageUrl || null,
      p_session_id: sessionId || null,
      p_user_agent: userAgent || null
    });

    if (executionError) {
      console.error('Failed to track workflow execution:', executionError);
      return res.status(500).json({
        success: false,
        error: 'Failed to track execution',
        details: executionError.message
      });
    }

    // Update workflow execution count (increment by 1)
    if (effectiveUserId) {
      const { error: countError } = await supabase
        .from('workflows')
        .update({ 
          executions: supabase.raw('executions + 1'),
          last_run: new Date().toISOString()
        })
        .eq('id', workflowId)
        .eq('user_id', effectiveUserId);

      if (countError) {
        console.error('Failed to update workflow execution count:', countError);
        // Don't fail the request - execution was tracked, count update is secondary
      } else {
        console.log(`✅ Updated execution count for workflow ${workflowId}`);
      }
    }

    // Track individual action executions if provided
    if (actions.length > 0 && executionId) {
      const actionPromises = actions.map(async (action) => {
        return supabase.rpc('track_analytics_event', {
          p_user_id: effectiveUserId,
          p_workflow_id: workflowId,
          p_workflow_execution_id: executionId,
          p_session_id: sessionId || null,
          p_event_type: 'action_executed',
          p_element_selector: action.selector || null,
          p_element_text: action.text || null,
          p_page_url: pageUrl || null,
          p_device_type: deviceType || null,
          p_event_data: {
            action_name: action.name,
            action_config: action.config,
            execution_time_ms: action.executionTimeMs || null
          }
        });
      });

      await Promise.allSettled(actionPromises);
      console.log(`📈 Tracked ${actions.length} action executions`);
    }

    return res.status(200).json({
      success: true,
      executionId,
      message: 'Workflow execution tracked successfully',
      data: {
        workflowId,
        status,
        actionsTracked: actions.length
      }
    });

  } catch (error) {
    console.error('Error in track-execution endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
} 