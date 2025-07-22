-- Drop RLS for Analytics Tables
-- This will allow unrestricted access to analytics tables for debugging

-- Disable RLS on visitor_events table
ALTER TABLE public.visitor_events DISABLE ROW LEVEL SECURITY;

-- Disable RLS on analytics_events table  
ALTER TABLE public.analytics_events DISABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Users can access their own visitor events" ON public.visitor_events;
DROP POLICY IF EXISTS "Users can insert their own visitor events" ON public.visitor_events;
DROP POLICY IF EXISTS "Users can access their own analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Users can insert their own analytics events" ON public.analytics_events;

-- Grant public access for testing
GRANT ALL ON public.visitor_events TO anon;
GRANT ALL ON public.analytics_events TO anon;
GRANT ALL ON public.visitor_events TO authenticated;
GRANT ALL ON public.analytics_events TO authenticated;

-- Also disable RLS on workflows table temporarily for debugging
ALTER TABLE public.workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_nodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_connections DISABLE ROW LEVEL SECURITY;

-- Grant access to workflows tables
GRANT ALL ON public.workflows TO anon;
GRANT ALL ON public.workflow_nodes TO anon;
GRANT ALL ON public.workflow_connections TO anon;
GRANT ALL ON public.workflows TO authenticated;
GRANT ALL ON public.workflow_nodes TO authenticated;
GRANT ALL ON public.workflow_connections TO authenticated;

-- Enable access to the view
GRANT SELECT ON public.workflows_with_nodes TO anon;
GRANT SELECT ON public.workflows_with_nodes TO authenticated;

SELECT 'RLS disabled for analytics and workflow tables' as status; 