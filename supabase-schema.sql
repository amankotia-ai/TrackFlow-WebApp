-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  organization TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create node_types table for tracking available node types
CREATE TABLE IF NOT EXISTS public.node_types (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('trigger', 'action', 'condition')),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  default_config JSONB DEFAULT '{}',
  config_fields JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'error')),
  target_url TEXT DEFAULT '*',
  executions INTEGER DEFAULT 0,
  last_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workflow_nodes table for individual nodes
CREATE TABLE IF NOT EXISTS public.workflow_nodes (
  id TEXT NOT NULL,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  node_type_id TEXT REFERENCES public.node_types(id),
  type TEXT NOT NULL CHECK (type IN ('trigger', 'action', 'condition')),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}',
  config JSONB NOT NULL DEFAULT '{}',
  inputs TEXT[] DEFAULT '{}',
  outputs TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, workflow_id)
);

-- Create workflow_connections table
CREATE TABLE IF NOT EXISTS public.workflow_connections (
  id TEXT NOT NULL,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  source_handle TEXT NOT NULL,
  target_handle TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, workflow_id),
  FOREIGN KEY (source_node_id, workflow_id) REFERENCES public.workflow_nodes(id, workflow_id) ON DELETE CASCADE,
  FOREIGN KEY (target_node_id, workflow_id) REFERENCES public.workflow_nodes(id, workflow_id) ON DELETE CASCADE
);

-- Create workflow_executions table for detailed execution tracking
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  execution_time_ms INTEGER,
  error_message TEXT,
  page_url TEXT,
  user_agent TEXT,
  session_id TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create analytics_events table for tracking user interactions
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  workflow_execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view', 'click', 'form_submit', 'field_focus', 'field_blur', 
    'field_change', 'scroll', 'hover', 'custom_workflow_event', 'page_load',
    'element_visible', 'element_hidden', 'time_on_page', 'exit_intent'
  )),
  element_selector TEXT,
  element_text TEXT,
  element_attributes JSONB DEFAULT '{}',
  page_url TEXT,
  page_title TEXT,
  referrer_url TEXT,
  device_type TEXT,
  browser_info JSONB,
  user_agent TEXT,
  viewport_size JSONB,
  screen_size JSONB,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workflow_analytics_summary table for aggregated analytics per workflow
CREATE TABLE IF NOT EXISTS public.workflow_analytics_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,
  avg_execution_time_ms NUMERIC,
  conversion_count INTEGER DEFAULT 0,
  conversion_rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, date)
);

-- Create user_sessions table for tracking active user sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  page_url TEXT,
  device_type TEXT,
  browser_info JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create workflow_templates table for shared templates
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_public BOOLEAN DEFAULT false,
  nodes JSONB NOT NULL DEFAULT '[]',
  connections JSONB NOT NULL DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_api_keys table for API access
CREATE TABLE IF NOT EXISTS public.user_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  key_name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON public.workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON public.workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflows_target_url ON public.workflows(target_url);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_workflow_id ON public.workflow_nodes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_type ON public.workflow_nodes(type);
CREATE INDEX IF NOT EXISTS idx_workflow_connections_workflow_id ON public.workflow_connections(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON public.workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_executed_at ON public.workflow_executions(executed_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_workflow_id ON public.analytics_events(workflow_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_workflow_execution_id ON public.analytics_events(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_summary_workflow_id ON public.workflow_analytics_summary(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_summary_date ON public.workflow_analytics_summary(date);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- Create Row Level Security policies

-- Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Node types - everyone can view node types
CREATE POLICY "Everyone can view node types" ON public.node_types
  FOR SELECT USING (true);

-- Workflows - users can only access their own workflows
CREATE POLICY "Users can view own workflows" ON public.workflows
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflows" ON public.workflows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflows" ON public.workflows
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workflows" ON public.workflows
  FOR DELETE USING (auth.uid() = user_id);

-- Workflow nodes - users can access nodes of their own workflows
CREATE POLICY "Users can view nodes of own workflows" ON public.workflow_nodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_nodes.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert nodes in own workflows" ON public.workflow_nodes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_nodes.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update nodes in own workflows" ON public.workflow_nodes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_nodes.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete nodes from own workflows" ON public.workflow_nodes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_nodes.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

-- Workflow connections - users can access connections of their own workflows
CREATE POLICY "Users can view connections of own workflows" ON public.workflow_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_connections.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert connections in own workflows" ON public.workflow_connections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_connections.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update connections in own workflows" ON public.workflow_connections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_connections.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete connections from own workflows" ON public.workflow_connections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_connections.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

-- Workflow executions - users can only access their own execution data
CREATE POLICY "Users can view own workflow executions" ON public.workflow_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflow executions" ON public.workflow_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Analytics events - users can only access their own analytics
CREATE POLICY "Users can view own analytics events" ON public.analytics_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics events" ON public.analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Workflow analytics summary - users can only access their own analytics summaries
CREATE POLICY "Users can view own workflow analytics summary" ON public.workflow_analytics_summary
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflow analytics summary" ON public.workflow_analytics_summary
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflow analytics summary" ON public.workflow_analytics_summary
  FOR UPDATE USING (auth.uid() = user_id);

-- User sessions - users can only access their own sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Workflow templates - users can view public templates and their own
CREATE POLICY "Users can view public templates and own templates" ON public.workflow_templates
  FOR SELECT USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Users can insert own templates" ON public.workflow_templates
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own templates" ON public.workflow_templates
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own templates" ON public.workflow_templates
  FOR DELETE USING (auth.uid() = created_by);

-- User API keys - users can only access their own API keys
CREATE POLICY "Users can view own API keys" ON public.user_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys" ON public.user_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys" ON public.user_api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys" ON public.user_api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Create functions for automatic user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate API keys
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT AS $$
DECLARE
  key TEXT;
BEGIN
  -- Generate a secure random API key
  key := 'wf_' || encode(gen_random_bytes(32), 'hex');
  RETURN key;
END;
$$ LANGUAGE plpgsql;

-- Create function to track analytics event
CREATE OR REPLACE FUNCTION public.track_analytics_event(
  p_user_id UUID,
  p_workflow_id UUID,
  p_workflow_execution_id UUID,
  p_session_id TEXT,
  p_event_type TEXT,
  p_element_selector TEXT,
  p_element_text TEXT,
  p_page_url TEXT,
  p_device_type TEXT,
  p_event_data JSONB
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.analytics_events (
    user_id, workflow_id, workflow_execution_id, session_id, event_type,
    element_selector, element_text, page_url, device_type, event_data
  ) VALUES (
    p_user_id, p_workflow_id, p_workflow_execution_id, p_session_id, p_event_type,
    p_element_selector, p_element_text, p_page_url, p_device_type, p_event_data
  ) RETURNING id INTO v_event_id;
  
  -- Update workflow analytics summary
  INSERT INTO public.workflow_analytics_summary (
    workflow_id, user_id, date, total_events
  ) VALUES (
    p_workflow_id, p_user_id, CURRENT_DATE, 1
  )
  ON CONFLICT (workflow_id, date) DO UPDATE
  SET total_events = workflow_analytics_summary.total_events + 1,
      updated_at = NOW();
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to track workflow execution
CREATE OR REPLACE FUNCTION public.track_workflow_execution(
  p_workflow_id UUID,
  p_user_id UUID,
  p_status TEXT,
  p_execution_time_ms INTEGER,
  p_error_message TEXT,
  p_page_url TEXT,
  p_session_id TEXT
) RETURNS UUID AS $$
DECLARE
  v_execution_id UUID;
BEGIN
  INSERT INTO public.workflow_executions (
    workflow_id, user_id, status, execution_time_ms, 
    error_message, page_url, session_id
  ) VALUES (
    p_workflow_id, p_user_id, p_status, p_execution_time_ms,
    p_error_message, p_page_url, p_session_id
  ) RETURNING id INTO v_execution_id;
  
  -- Update workflow execution count and last run
  UPDATE public.workflows
  SET executions = executions + 1,
      last_run = NOW()
  WHERE id = p_workflow_id;
  
  -- Update analytics summary
  INSERT INTO public.workflow_analytics_summary (
    workflow_id, user_id, date, total_executions,
    successful_executions, failed_executions, avg_execution_time_ms
  ) VALUES (
    p_workflow_id, p_user_id, CURRENT_DATE, 1,
    CASE WHEN p_status = 'success' THEN 1 ELSE 0 END,
    CASE WHEN p_status = 'error' THEN 1 ELSE 0 END,
    p_execution_time_ms
  )
  ON CONFLICT (workflow_id, date) DO UPDATE
  SET total_executions = workflow_analytics_summary.total_executions + 1,
      successful_executions = workflow_analytics_summary.successful_executions + 
        CASE WHEN p_status = 'success' THEN 1 ELSE 0 END,
      failed_executions = workflow_analytics_summary.failed_executions + 
        CASE WHEN p_status = 'error' THEN 1 ELSE 0 END,
      avg_execution_time_ms = (
        (workflow_analytics_summary.avg_execution_time_ms * workflow_analytics_summary.total_executions + p_execution_time_ms) /
        (workflow_analytics_summary.total_executions + 1)
      ),
      updated_at = NOW();
  
  RETURN v_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get active workflows for a URL
CREATE OR REPLACE FUNCTION public.get_active_workflows_for_url(
  p_api_key TEXT,
  p_url TEXT
) RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  nodes JSON,
  connections JSON
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Validate API key and get user
  SELECT user_id INTO v_user_id
  FROM public.user_api_keys
  WHERE api_key = p_api_key 
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired API key';
  END IF;
  
  -- Update API key last used
  UPDATE public.user_api_keys
  SET last_used = NOW()
  WHERE api_key = p_api_key;
  
  -- Return active workflows for the URL
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.description,
    wn.nodes,
    wn.connections
  FROM public.workflows_with_nodes w
  JOIN LATERAL (
    SELECT * FROM public.workflows_with_nodes wn
    WHERE wn.id = w.id
  ) wn ON true
  WHERE w.user_id = v_user_id
    AND w.is_active = true
    AND w.status = 'active'
    AND (w.target_url = '*' OR p_url LIKE '%' || w.target_url || '%');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to manage user sessions
CREATE OR REPLACE FUNCTION public.manage_user_session(
  p_user_id UUID,
  p_session_id TEXT,
  p_page_url TEXT,
  p_device_type TEXT,
  p_browser_info JSONB
) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Check if session exists
  SELECT id INTO v_session_id
  FROM public.user_sessions
  WHERE session_id = p_session_id AND user_id = p_user_id;
  
  IF v_session_id IS NULL THEN
    -- Create new session
    INSERT INTO public.user_sessions (
      user_id, session_id, page_url, device_type, browser_info
    ) VALUES (
      p_user_id, p_session_id, p_page_url, p_device_type, p_browser_info
    ) RETURNING id INTO v_session_id;
  ELSE
    -- Update existing session
    UPDATE public.user_sessions
    SET last_activity = NOW(),
        page_url = p_page_url,
        device_type = COALESCE(p_device_type, device_type),
        browser_info = COALESCE(p_browser_info, browser_info)
    WHERE id = v_session_id;
  END IF;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create analytics aggregation views
CREATE OR REPLACE VIEW public.workflow_performance_daily AS
SELECT 
  w.id as workflow_id,
  w.name as workflow_name,
  w.user_id,
  was.date,
  was.total_executions,
  was.successful_executions,
  was.failed_executions,
  was.total_events,
  was.unique_sessions,
  was.avg_execution_time_ms,
  was.conversion_count,
  was.conversion_rate,
  CASE 
    WHEN was.total_executions > 0 
    THEN (was.successful_executions::NUMERIC / was.total_executions * 100)
    ELSE 0 
  END as success_rate
FROM public.workflows w
JOIN public.workflow_analytics_summary was ON w.id = was.workflow_id
ORDER BY was.date DESC;

-- Grant access to views
GRANT SELECT ON public.workflow_performance_daily TO authenticated;

-- Create view for real-time analytics
CREATE OR REPLACE VIEW public.workflow_realtime_analytics AS
SELECT 
  w.id as workflow_id,
  w.name as workflow_name,
  w.user_id,
  COUNT(DISTINCT ae.session_id) as active_sessions,
  COUNT(ae.id) as events_last_hour,
  COUNT(DISTINCT ae.page_url) as unique_pages,
  COUNT(CASE WHEN ae.event_type = 'click' THEN 1 END) as click_events,
  COUNT(CASE WHEN ae.event_type = 'form_submit' THEN 1 END) as form_submits,
  COUNT(CASE WHEN ae.event_type = 'page_view' THEN 1 END) as page_views
FROM public.workflows w
LEFT JOIN public.analytics_events ae ON w.id = ae.workflow_id 
  AND ae.created_at > NOW() - INTERVAL '1 hour'
GROUP BY w.id, w.name, w.user_id;

-- Grant access to views
GRANT SELECT ON public.workflow_realtime_analytics TO authenticated;

-- Add triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_analytics_summary_updated_at BEFORE UPDATE ON public.workflow_analytics_summary
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON public.workflow_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert node types
INSERT INTO public.node_types (id, type, category, name, description, icon, default_config, config_fields) VALUES
-- Trigger nodes
('page-visit-trigger', 'trigger', 'Visitor Behavior', 'Page Visits', 'Trigger when visitor reaches specific number of page views', 'Eye', 
 '{"visitCount": 3, "timeframe": "session"}',
 '[{"key": "visitCount", "type": "number", "label": "Number of Visits", "required": true, "default": 3}, {"key": "timeframe", "type": "select", "label": "Timeframe", "required": true, "options": [{"value": "session", "label": "Current Session"}, {"value": "day", "label": "Last 24 Hours"}, {"value": "week", "label": "Last 7 Days"}, {"value": "month", "label": "Last 30 Days"}]}]'
),
('time-on-page-trigger', 'trigger', 'Visitor Behavior', 'Time on Page', 'Trigger when visitor spends specific time on page', 'Clock',
 '{"duration": 30, "unit": "seconds"}',
 '[{"key": "duration", "type": "number", "label": "Duration", "required": true, "default": 30}, {"key": "unit", "type": "select", "label": "Time Unit", "required": true, "options": [{"value": "seconds", "label": "Seconds"}, {"value": "minutes", "label": "Minutes"}]}]'
),
('device-type-trigger', 'trigger', 'Device & Browser', 'Device Type', 'Trigger based on visitor device type', 'Smartphone',
 '{"deviceType": "mobile"}',
 '[{"key": "deviceType", "type": "select", "label": "Device Type", "required": true, "options": [{"value": "mobile", "label": "Mobile"}, {"value": "tablet", "label": "Tablet"}, {"value": "desktop", "label": "Desktop"}]}]'
),
('utm-parameters-trigger', 'trigger', 'Traffic Source', 'UTM Parameters', 'Trigger based on incoming UTM parameters', 'Link',
 '{"parameter": "utm_source", "operator": "equals", "value": ""}',
 '[{"key": "parameter", "type": "select", "label": "UTM Parameter", "required": true, "options": [{"value": "utm_source", "label": "utm_source"}, {"value": "utm_medium", "label": "utm_medium"}, {"value": "utm_campaign", "label": "utm_campaign"}]}, {"key": "operator", "type": "select", "label": "Condition", "required": true, "options": [{"value": "equals", "label": "Equals"}, {"value": "contains", "label": "Contains"}]}, {"key": "value", "type": "text", "label": "Value", "required": true}]'
),
-- Action nodes
('replace-text-action', 'action', 'Content Modification', 'Replace Text', 'Replace text content on the page', 'Type',
 '{"selector": "", "newText": "", "originalText": ""}',
 '[{"key": "selector", "type": "css-selector", "label": "Element Selector", "required": true}, {"key": "newText", "type": "text", "label": "New Text", "required": true}, {"key": "originalText", "type": "text", "label": "Original Text", "required": false}]'
),
('show-element-action', 'action', 'User Interface', 'Show Element', 'Show hidden element with animation', 'Eye',
 '{"selector": "", "animation": "fade"}',
 '[{"key": "selector", "type": "css-selector", "label": "Element Selector", "required": true}, {"key": "animation", "type": "select", "label": "Animation", "required": true, "options": [{"value": "none", "label": "No Animation"}, {"value": "fade", "label": "Fade"}, {"value": "slide", "label": "Slide"}]}]'
),
('hide-element-action', 'action', 'User Interface', 'Hide Element', 'Hide element with animation', 'EyeOff',
 '{"selector": "", "animation": "fade"}',
 '[{"key": "selector", "type": "css-selector", "label": "Element Selector", "required": true}, {"key": "animation", "type": "select", "label": "Animation", "required": true, "options": [{"value": "none", "label": "No Animation"}, {"value": "fade", "label": "Fade"}, {"value": "slide", "label": "Slide"}]}]'
),
-- More trigger nodes
('scroll-depth-trigger', 'trigger', 'Visitor Behavior', 'Scroll Depth', 'Trigger when visitor scrolls to specific page depth', 'ArrowDown',
 '{"percentage": 50, "element": ""}',
 '[{"key": "percentage", "type": "number", "label": "Scroll Percentage", "required": true, "default": 50}, {"key": "element", "type": "css-selector", "label": "Target Element", "required": false}]'
),
('exit-intent-trigger', 'trigger', 'Engagement', 'Exit Intent', 'Trigger when user shows intent to leave the page', 'LogOut',
 '{"sensitivity": "medium", "delay": 500}',
 '[{"key": "sensitivity", "type": "select", "label": "Detection Sensitivity", "required": true, "options": [{"value": "low", "label": "Low"}, {"value": "medium", "label": "Medium"}, {"value": "high", "label": "High"}]}, {"key": "delay", "type": "number", "label": "Delay (ms)", "required": true, "default": 500}]'
),
('element-click-trigger', 'trigger', 'Element Interaction', 'Element Click', 'Trigger when specific element is clicked', 'MousePointer',
 '{"selector": "", "eventType": "click"}',
 '[{"key": "selector", "type": "css-selector", "label": "Element Selector", "required": true}, {"key": "eventType", "type": "select", "label": "Event Type", "required": true, "options": [{"value": "click", "label": "Click"}, {"value": "dblclick", "label": "Double Click"}]}]'
),
('geolocation-trigger', 'trigger', 'Location', 'Geolocation', 'Trigger based on visitor geographic location', 'MapPin',
 '{"locationType": "country", "locations": [], "condition": "is_in"}',
 '[{"key": "locationType", "type": "select", "label": "Location Type", "required": true, "options": [{"value": "country", "label": "Country"}, {"value": "state", "label": "State/Region"}, {"value": "city", "label": "City"}]}, {"key": "locations", "type": "textarea", "label": "Target Locations", "required": true}, {"key": "condition", "type": "select", "label": "Condition", "required": true, "options": [{"value": "is_in", "label": "Is in list"}, {"value": "not_in", "label": "Is not in list"}]}]'
),
-- More action nodes
('display-overlay-action', 'action', 'User Interface', 'Display Overlay', 'Show modal or overlay with custom content', 'Square',
 '{"content": "", "animation": "fade", "position": "center"}',
 '[{"key": "content", "type": "textarea", "label": "Overlay Content (HTML)", "required": true}, {"key": "animation", "type": "select", "label": "Animation", "required": true, "options": [{"value": "fade", "label": "Fade"}, {"value": "slide", "label": "Slide"}, {"value": "zoom", "label": "Zoom"}]}, {"key": "position", "type": "select", "label": "Position", "required": true, "options": [{"value": "center", "label": "Center"}, {"value": "top", "label": "Top"}, {"value": "bottom", "label": "Bottom"}]}]'
),
('modify-css-action', 'action', 'Style Modification', 'Modify CSS', 'Modify CSS properties of elements', 'Palette',
 '{"selector": "", "property": "", "value": ""}',
 '[{"key": "selector", "type": "css-selector", "label": "Element Selector", "required": true}, {"key": "property", "type": "text", "label": "CSS Property", "required": true}, {"key": "value", "type": "text", "label": "CSS Value", "required": true}]'
),
('redirect-action', 'action', 'Navigation', 'Redirect', 'Redirect visitor to another page', 'ExternalLink',
 '{"url": "", "delay": 0, "newTab": false}',
 '[{"key": "url", "type": "url", "label": "Redirect URL", "required": true}, {"key": "delay", "type": "number", "label": "Delay (ms)", "required": true, "default": 0}, {"key": "newTab", "type": "boolean", "label": "Open in New Tab", "required": true, "default": false}]'
),
('custom-event-action', 'action', 'Analytics', 'Custom Event', 'Send custom analytics event', 'BarChart',
 '{"eventName": "", "eventData": "{}"}',
 '[{"key": "eventName", "type": "text", "label": "Event Name", "required": true}, {"key": "eventData", "type": "textarea", "label": "Event Data (JSON)", "required": false, "default": "{}"}]'
)
ON CONFLICT (id) DO NOTHING;

-- Note: Demo workflow templates will be created after first user signup
-- You can run this separately after creating your first user:
/*
INSERT INTO public.workflow_templates (created_by, name, description, category, is_public, nodes, connections) VALUES 
(
  (SELECT id FROM auth.users LIMIT 1),
  'Mobile CTA Optimization',
  'Optimize call-to-action buttons for mobile users',
  'Device Optimization',
  true,
  '[
    {
      "id": "trigger-1",
      "type": "trigger",
      "category": "Device & Browser",
      "name": "Device Type",
      "description": "Trigger for mobile devices",
      "icon": "Smartphone",
      "position": {"x": 100, "y": 50},
      "config": {"deviceType": "mobile"},
      "inputs": [],
      "outputs": ["output"]
    },
    {
      "id": "action-1",
      "type": "action",
      "category": "Content Modification",
      "name": "Replace Text",
      "description": "Replace button text for mobile",
      "icon": "Type",
      "position": {"x": 400, "y": 50},
      "config": {
        "selector": ".cta-button, button, .btn",
        "newText": "Tap to Get Started",
        "originalText": "Click to Get Started"
      },
      "inputs": ["input"],
      "outputs": ["output"]
    }
  ]',
  '[
    {
      "id": "conn-1",
      "sourceNodeId": "trigger-1",
      "targetNodeId": "action-1",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ]'
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'UTM Google Personalization',
  'Personalize content for visitors from Google',
  'Traffic Source',
  true,
  '[
    {
      "id": "trigger-2",
      "type": "trigger",
      "category": "Traffic Source",
      "name": "UTM Parameters",
      "description": "Trigger for Google traffic",
      "icon": "Link",
      "position": {"x": 100, "y": 50},
      "config": {
        "parameter": "utm_source",
        "value": "google",
        "operator": "equals"
      },
      "inputs": [],
      "outputs": ["output"]
    },
    {
      "id": "action-2",
      "type": "action",
      "category": "Content Modification",
      "name": "Replace Text",
      "description": "Replace headline for Google traffic",
      "icon": "Type",
      "position": {"x": 400, "y": 50},
      "config": {
        "selector": "h1, .hero-headline",
        "newText": "Welcome from Google! Special offer inside."
      },
      "inputs": ["input"],
      "outputs": ["output"]
    }
  ]',
  '[
    {
      "id": "conn-2",
      "sourceNodeId": "trigger-2",
      "targetNodeId": "action-2",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ]'
);
*/

-- Create views for easier data access
CREATE OR REPLACE VIEW public.workflows_with_nodes AS
SELECT 
  w.*,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', wn.id,
        'type', wn.type,
        'category', wn.category,
        'name', wn.name,
        'description', wn.description,
        'icon', wn.icon,
        'position', wn.position,
        'config', wn.config,
        'inputs', wn.inputs,
        'outputs', wn.outputs
      )
    ) FILTER (WHERE wn.id IS NOT NULL),
    '[]'::json
  ) as nodes,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', wc.id,
        'sourceNodeId', wc.source_node_id,
        'targetNodeId', wc.target_node_id,
        'sourceHandle', wc.source_handle,
        'targetHandle', wc.target_handle
      )
    ) FILTER (WHERE wc.id IS NOT NULL),
    '[]'::json
  ) as connections
FROM public.workflows w
LEFT JOIN public.workflow_nodes wn ON w.id = wn.workflow_id
LEFT JOIN public.workflow_connections wc ON w.id = wc.workflow_id
GROUP BY w.id;

-- Grant access to the view
GRANT SELECT ON public.workflows_with_nodes TO authenticated;

-- Create function to save workflow with nodes and connections
CREATE OR REPLACE FUNCTION public.save_workflow_complete(
  p_workflow_id UUID,
  p_user_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_is_active BOOLEAN,
  p_status TEXT,
  p_target_url TEXT,
  p_nodes JSONB,
  p_connections JSONB
) RETURNS UUID AS $$
DECLARE
  v_workflow_id UUID;
BEGIN
  -- Insert or update workflow
  IF p_workflow_id IS NULL THEN
    INSERT INTO public.workflows (user_id, name, description, is_active, status, target_url)
    VALUES (p_user_id, p_name, p_description, p_is_active, p_status, p_target_url)
    RETURNING id INTO v_workflow_id;
  ELSE
    UPDATE public.workflows
    SET name = p_name,
        description = p_description,
        is_active = p_is_active,
        status = p_status,
        target_url = p_target_url,
        updated_at = NOW()
    WHERE id = p_workflow_id AND user_id = p_user_id
    RETURNING id INTO v_workflow_id;
    
    -- Delete existing nodes and connections
    DELETE FROM public.workflow_connections WHERE workflow_id = v_workflow_id;
    DELETE FROM public.workflow_nodes WHERE workflow_id = v_workflow_id;
  END IF;
  
  -- Insert nodes
  IF p_nodes IS NOT NULL AND jsonb_array_length(p_nodes) > 0 THEN
    INSERT INTO public.workflow_nodes (id, workflow_id, node_type_id, type, category, name, description, icon, position, config, inputs, outputs)
    SELECT 
      (node->>'id')::TEXT,
      v_workflow_id,
      NULL, -- node_type_id can be set if needed
      (node->>'type')::TEXT,
      (node->>'category')::TEXT,
      (node->>'name')::TEXT,
      (node->>'description')::TEXT,
      (node->>'icon')::TEXT,
      (node->'position')::JSONB,
      (node->'config')::JSONB,
      ARRAY(SELECT jsonb_array_elements_text(node->'inputs')),
      ARRAY(SELECT jsonb_array_elements_text(node->'outputs'))
    FROM jsonb_array_elements(p_nodes) AS node;
  END IF;
  
  -- Insert connections
  IF p_connections IS NOT NULL AND jsonb_array_length(p_connections) > 0 THEN
    INSERT INTO public.workflow_connections (id, workflow_id, source_node_id, target_node_id, source_handle, target_handle)
    SELECT 
      (conn->>'id')::TEXT,
      v_workflow_id,
      (conn->>'sourceNodeId')::TEXT,
      (conn->>'targetNodeId')::TEXT,
      (conn->>'sourceHandle')::TEXT,
      (conn->>'targetHandle')::TEXT
    FROM jsonb_array_elements(p_connections) AS conn;
  END IF;
  
  RETURN v_workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('user-assets', 'user-assets', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('workflow-exports', 'workflow-exports', false, 10485760, ARRAY['application/json', 'text/csv'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload their own assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'user-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'user-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own exports" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'workflow-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own exports" ON storage.objects
  FOR SELECT USING (bucket_id = 'workflow-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own exports" ON storage.objects
  FOR DELETE USING (bucket_id = 'workflow-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_workflow_session ON public.analytics_events(workflow_id, session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON public.user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_api_key ON public.user_api_keys(api_key);

-- Create function to clean up old sessions
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  UPDATE public.user_sessions
  SET is_active = false
  WHERE last_activity < NOW() - INTERVAL '24 hours'
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's workflow statistics
CREATE OR REPLACE FUNCTION public.get_user_workflow_stats(p_user_id UUID)
RETURNS TABLE (
  total_workflows INTEGER,
  active_workflows INTEGER,
  total_executions INTEGER,
  total_events INTEGER,
  avg_success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT w.id)::INTEGER as total_workflows,
    COUNT(DISTINCT CASE WHEN w.is_active THEN w.id END)::INTEGER as active_workflows,
    COALESCE(SUM(was.total_executions), 0)::INTEGER as total_executions,
    COALESCE(SUM(was.total_events), 0)::INTEGER as total_events,
    CASE 
      WHEN SUM(was.total_executions) > 0 
      THEN (SUM(was.successful_executions)::NUMERIC / SUM(was.total_executions) * 100)
      ELSE 0 
    END as avg_success_rate
  FROM public.workflows w
  LEFT JOIN public.workflow_analytics_summary was ON w.id = was.workflow_id
  WHERE w.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.save_workflow_complete TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_analytics_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_workflow_execution TO authenticated;
GRANT EXECUTE ON FUNCTION public.manage_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_workflow_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_api_key TO authenticated;

-- Note: get_active_workflows_for_url should be accessible via API key, not auth
GRANT EXECUTE ON FUNCTION public.get_active_workflows_for_url TO anon, authenticated;

/*
=============================================================================
SCHEMA DOCUMENTATION
=============================================================================

This schema provides a complete workflow automation system with:

1. USER MANAGEMENT
   - users: Extended auth.users with profile data
   - user_api_keys: API keys for external access

2. WORKFLOW SYSTEM
   - workflows: Main workflow definitions
   - workflow_nodes: Individual nodes within workflows
   - workflow_connections: Connections between nodes
   - node_types: Available node types and their configurations
   - workflow_templates: Shareable workflow templates

3. ANALYTICS & TRACKING
   - analytics_events: All user interaction events
   - workflow_executions: Workflow execution history
   - workflow_analytics_summary: Aggregated daily analytics
   - user_sessions: Active user sessions

4. VIEWS
   - workflows_with_nodes: Complete workflow data with nodes/connections
   - workflow_performance_daily: Daily performance metrics
   - workflow_realtime_analytics: Real-time analytics data

5. KEY FUNCTIONS
   - save_workflow_complete(): Save workflow with all nodes/connections
   - get_active_workflows_for_url(): Get workflows for external sites
   - track_analytics_event(): Track user interactions
   - track_workflow_execution(): Track workflow runs
   - manage_user_session(): Manage user sessions
   - get_user_workflow_stats(): Get user statistics

6. SECURITY
   - Row Level Security (RLS) enabled on all tables
   - Users can only access their own data
   - API key authentication for external access
   - Public templates with proper access control

7. STORAGE BUCKETS
   - user-assets: User uploaded images/assets
   - workflow-exports: Workflow export files

USAGE NOTES:
- All timestamps are in UTC
- Workflow nodes and connections are stored separately for flexibility
- Analytics are aggregated daily for performance
- API keys use the format: wf_[32-byte-hex]
- Sessions expire after 24 hours of inactivity

=============================================================================
*/ 