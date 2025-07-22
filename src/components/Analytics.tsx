import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  RefreshCw,
  XCircle,
  Pause,
  Globe,
  Monitor,
  Smartphone,
  ExternalLink,
  Eye,
  Users,
  AlertCircle
} from 'lucide-react';
import { Workflow } from '../types/workflow';
import { AnalyticsService, WorkflowPageMetrics, PageAnalyticsSummary } from '../services/analyticsService';

interface AnalyticsProps {
  workflows: Workflow[];
}

const Analytics: React.FC<AnalyticsProps> = ({ workflows }) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [pageMetrics, setPageMetrics] = useState<WorkflowPageMetrics[]>([]);
  const [pageVisitsData, setPageVisitsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'pages'>('pages');

  // Calculate real analytics from actual workflow data
  const analyticsData = React.useMemo(() => {
    const totalExecutions = workflows.reduce((sum, workflow) => sum + workflow.executions, 0);
    const activeWorkflows = workflows.filter(w => w.status === 'active').length;
    
    // Sort workflows by execution count for top performers
    const sortedWorkflows = [...workflows]
      .sort((a, b) => b.executions - a.executions)
      .slice(0, 5);

    return {
      overview: {
        totalWorkflows: workflows.length,
        activeWorkflows,
        totalExecutions,
        avgExecutions: workflows.length > 0 ? Math.round(totalExecutions / workflows.length) : 0,
        successRate: 95, // This would be calculated from actual execution data
        recentActivity: [
          { date: '2024-01-15', executions: 45 },
          { date: '2024-01-14', executions: 38 },
          { date: '2024-01-13', executions: 52 },
          { date: '2024-01-12', executions: 41 },
        ]
      },
      topPerformers: sortedWorkflows
    };
  }, [workflows]);

  // Load page analytics data
  const loadPageAnalytics = React.useCallback(async () => {
    console.log('📊 loadPageAnalytics called with:', { 
      workflowsLength: workflows.length, 
      timeRange,
      activeTab 
    });
    
    if (workflows.length === 0) {
      console.log('⚠️ No workflows available for page analytics');
      return;
    }
    
    setLoading(true);
    try {
      const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      console.log(`📊 Fetching page analytics summary for ${days} days...`);
      
      const summary = await AnalyticsService.getPageAnalyticsSummary(undefined, days);
      console.log('📊 Page analytics summary received:', summary);
      
      if (summary) {
        // Process metrics for each workflow individually
        const allMetrics: WorkflowPageMetrics[] = [];
        
        for (const workflow of workflows) {
          const workflowMetrics = AnalyticsService.processWorkflowPageMetrics(
            workflow.id, 
            workflow.name, 
            summary
          );
          
          // Only include workflows that have some data
          if (workflowMetrics.totalExecutions > 0 || workflowMetrics.totalPageViews > 0) {
            allMetrics.push(workflowMetrics);
          }
        }
        
        console.log(`📊 Processed metrics for ${allMetrics.length} workflows with data`);
        setPageMetrics(allMetrics);
      }
    } catch (error) {
      console.error('📊 Failed to load page analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [workflows, timeRange]);

  // Load page visits data
  const loadPageVisits = React.useCallback(async () => {
    console.log('📊 loadPageVisits called');
    
    setLoading(true);
    try {
      const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const data = await AnalyticsService.getTotalPageVisits(days);
      
      if (data) {
        console.log('📊 Page visits data loaded:', data);
        setPageVisitsData(data);
      }
    } catch (error) {
      console.error('📊 Failed to load page visits:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // Load page analytics when tab changes or dependencies change
  React.useEffect(() => {
    if (activeTab === 'pages') {
      loadPageAnalytics();
    } else if (activeTab === 'overview') {
      loadPageVisits();
    }
  }, [activeTab, loadPageAnalytics, loadPageVisits]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'desktop':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const formatUrl = (url: string, maxLength: number = 50) => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search;
      if (path.length > maxLength) {
        return path.substring(0, maxLength) + '...';
      }
      return path;
    } catch {
      return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-secondary-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">Analytics</h1>
              <p className="text-sm text-secondary-600 mt-1">
                Track performance and insights across your workflows
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 text-sm border border-secondary-300 rounded-lg bg-white text-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              
              <button className="flex items-center space-x-2 px-4 py-2 text-secondary-700 bg-white border border-secondary-300 hover:bg-secondary-50 transition-colors font-medium text-sm rounded-lg">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button 
                onClick={() => {
                  if (activeTab === 'pages') {
                    loadPageAnalytics();
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 text-secondary-700 bg-white border border-secondary-300 hover:bg-secondary-50 transition-colors font-medium text-sm rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-secondary-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'overview'
                  ? 'bg-white text-secondary-900 shadow-sm'
                  : 'text-secondary-600 hover:text-secondary-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('pages')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'pages'
                  ? 'bg-white text-secondary-900 shadow-sm'
                  : 'text-secondary-600 hover:text-secondary-900'
              }`}
            >
              Page Analytics
            </button>
          </div>

          {activeTab === 'overview' && (
            <>
              {/* Debug Information */}
              {workflows.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                    <span className="text-yellow-800 font-medium">No Workflows Found</span>
                  </div>
                  <p className="text-yellow-700 text-sm mt-1">
                    Create your first workflow to see analytics data. Go to the "Playbooks" tab to get started.
                  </p>
                </div>
              )}

              {workflows.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Eye className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="text-blue-800 font-medium">
                        Found {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="text-blue-600 text-sm">
                      {analyticsData.overview.totalExecutions} total executions
                    </span>
                  </div>
                  
                  <details className="mt-3">
                    <summary className="text-blue-700 text-sm cursor-pointer hover:text-blue-800">
                      Show workflow details
                    </summary>
                    <div className="mt-2 space-y-1">
                      {workflows.map((workflow) => (
                        <div key={workflow.id} className="text-xs text-blue-600 flex justify-between">
                          <span>• {workflow.name}</span>
                          <span>{workflow.status} • {workflow.executions} executions</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Overview Stats */}
              {workflows.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                  <div className="bg-white rounded-lg border border-secondary-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-secondary-600">Total Workflows</p>
                        <p className="text-2xl font-bold text-secondary-900">{analyticsData.overview.totalWorkflows}</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Activity className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-secondary-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-secondary-600">Active Workflows</p>
                        <p className="text-2xl font-bold text-secondary-900">{analyticsData.overview.activeWorkflows}</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-secondary-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-secondary-600">Total Page Visits</p>
                        <p className="text-2xl font-bold text-secondary-900">
                          {pageVisitsData ? pageVisitsData.totalPageVisits.toLocaleString() : '0'}
                        </p>
                        {pageVisitsData && pageVisitsData.todayVisits > 0 && (
                          <p className="text-xs text-green-600 mt-1">+{pageVisitsData.todayVisits} today</p>
                        )}
                      </div>
                      <div className="p-3 bg-cyan-100 rounded-lg">
                        <Eye className="w-6 h-6 text-cyan-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-secondary-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-secondary-600">Total Executions</p>
                        <p className="text-2xl font-bold text-secondary-900">{analyticsData.overview.totalExecutions.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-secondary-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-secondary-600">Unique Sessions</p>
                        <p className="text-2xl font-bold text-secondary-900">
                          {pageVisitsData ? pageVisitsData.uniqueSessions.toLocaleString() : '0'}
                        </p>
                      </div>
                      <div className="p-3 bg-indigo-100 rounded-lg">
                        <Users className="w-6 h-6 text-indigo-600" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Page Visits Detail Table */}
              {pageVisitsData && pageVisitsData.events && pageVisitsData.events.length > 0 && (
                <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-secondary-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-secondary-900">Recent Page Visits</h3>
                      <div className="flex items-center text-sm text-secondary-600">
                        <Eye className="w-4 h-4 mr-1" />
                        {pageVisitsData.events.length} recent visits
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-secondary-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                            Page URL
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                            Event Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                            Session ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                            Time
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-secondary-200">
                        {pageVisitsData.events.slice(0, 20).map((event: any, index: number) => (
                          <tr key={event.id || index} className="hover:bg-secondary-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-secondary-900">
                                {formatUrl(event.page_url || 'Unknown', 60)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                event.event_type === 'page_load' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {event.event_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
                              {event.session_id ? event.session_id.substring(0, 8) + '...' : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
                              {new Date(event.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {pageVisitsData.events.length > 20 && (
                    <div className="px-6 py-3 bg-secondary-50 border-t border-secondary-200">
                      <p className="text-sm text-secondary-600 text-center">
                        Showing 20 of {pageVisitsData.events.length} recent visits
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'pages' && (
            <>
              {/* Page Analytics Loading */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary-600" />
                  <span className="ml-2 text-secondary-600">Loading page analytics...</span>
                </div>
              )}

              {/* Always show workflow containers */}
              {!loading && workflows.length > 0 && (
                <div className="space-y-6">
                  {workflows.map((workflow) => {
                    // Find metrics for this workflow
                    const workflowMetrics = pageMetrics.find(m => m.workflowId === workflow.id);
                    
                    return (
                      <div key={workflow.id} className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
                        {/* Workflow Header */}
                        <div className="bg-secondary-50 px-6 py-4 border-b border-secondary-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-semibold text-secondary-900">{workflow.name}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                workflow.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-secondary-100 text-secondary-600'
                              }`}>
                                {workflow.status}
                              </span>
                            </div>
                            <div className="flex items-center space-x-6 text-sm text-secondary-600">
                              <div>
                                <span className="font-medium">{workflow.executions}</span> executions
                              </div>
                              {workflowMetrics && (
                                <>
                                  <div>
                                    <span className="font-medium">{workflowMetrics.totalPageViews}</span> page views
                                  </div>
                                  <div>
                                    <span className="font-medium">{workflowMetrics.uniquePages}</span> unique pages
                                  </div>
                                  <div>
                                    <span className="font-medium">{workflowMetrics.uniqueSessions}</span> sessions
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="p-6">
                          {workflowMetrics ? (
                            <>
                              {/* Analytics metrics */}
                              <div className="grid grid-cols-4 gap-4 mb-6">
                                <div className="bg-blue-50 p-3 rounded-lg">
                                  <div className="text-sm text-blue-600 font-medium">Page Views</div>
                                  <div className="text-xl font-bold text-blue-900">{workflowMetrics.totalPageViews}</div>
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg">
                                  <div className="text-sm text-green-600 font-medium">Unique Pages</div>
                                  <div className="text-xl font-bold text-green-900">{workflowMetrics.uniquePages}</div>
                                </div>
                                <div className="bg-purple-50 p-3 rounded-lg">
                                  <div className="text-sm text-purple-600 font-medium">Sessions</div>
                                  <div className="text-xl font-bold text-purple-900">{workflowMetrics.uniqueSessions}</div>
                                </div>
                                <div className="bg-orange-50 p-3 rounded-lg">
                                  <div className="text-sm text-orange-600 font-medium">Success Rate</div>
                                  <div className="text-xl font-bold text-orange-900">{workflowMetrics.successRate}%</div>
                                </div>
                              </div>

                              {/* Analytics sections */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Top Pages */}
                                <div className="bg-white p-4 rounded-lg border border-secondary-200">
                                  <h4 className="text-sm font-medium text-secondary-900 mb-3 flex items-center">
                                    <Globe className="w-4 h-4 mr-2" />
                                    Top Pages
                                  </h4>
                                  {workflowMetrics.topPages.length > 0 ? (
                                    <div className="space-y-2">
                                      {workflowMetrics.topPages.map((page, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-secondary-50 rounded">
                                          <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-secondary-900 truncate">
                                              {formatUrl(page.url)}
                                            </div>
                                          </div>
                                          <div className="text-sm text-secondary-600 ml-2">
                                            {page.executions} executions
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-secondary-500 py-4 text-center">
                                      No page data available yet
                                    </div>
                                  )}
                                </div>

                                {/* Device Breakdown */}
                                <div className="bg-white p-4 rounded-lg border border-secondary-200">
                                  <h4 className="text-sm font-medium text-secondary-900 mb-3 flex items-center">
                                    <Monitor className="w-4 h-4 mr-2" />
                                    Device Types
                                  </h4>
                                  {Object.keys(workflowMetrics.deviceBreakdown).length > 0 ? (
                                    <div className="space-y-2">
                                      {Object.entries(workflowMetrics.deviceBreakdown).map(([device, count], index) => (
                                        <div key={index} className="flex items-center justify-between">
                                          <div className="flex items-center">
                                            {getDeviceIcon(device)}
                                            <span className="ml-2 text-sm text-secondary-900 capitalize">{device}</span>
                                          </div>
                                          <span className="text-sm text-secondary-600">{count}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-secondary-500 py-4 text-center">
                                      No device data available yet
                                    </div>
                                  )}
                                </div>

                                {/* Top Referrers */}
                                <div className="bg-white p-4 rounded-lg border border-secondary-200">
                                  <h4 className="text-sm font-medium text-secondary-900 mb-3 flex items-center">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Top Referrers
                                  </h4>
                                  {workflowMetrics.topReferrers.length > 0 ? (
                                    <div className="space-y-2">
                                      {workflowMetrics.topReferrers.map((referrer, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                          <span className="text-sm text-secondary-900">{referrer.source}</span>
                                          <span className="text-sm text-secondary-600">{referrer.visits} visits</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-secondary-500 py-4 text-center">
                                      No referrer data available yet
                                    </div>
                                  )}
                                </div>

                                {/* Recent Executions */}
                                <div className="bg-white p-4 rounded-lg border border-secondary-200">
                                  <h4 className="text-sm font-medium text-secondary-900 mb-3 flex items-center">
                                    <Activity className="w-4 h-4 mr-2" />
                                    Recent Executions
                                  </h4>
                                  {workflowMetrics.recentExecutions.length > 0 ? (
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                      {workflowMetrics.recentExecutions.map((execution, index) => (
                                        <div key={index} className="flex items-center justify-between text-xs">
                                          <div className="flex items-center space-x-2">
                                            {getStatusIcon(execution.status)}
                                            <span className="text-secondary-600 truncate max-w-32">
                                              {formatUrl(execution.pageUrl, 25)}
                                            </span>
                                          </div>
                                          <div className="text-secondary-500">
                                            {execution.executionTime}ms
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-secondary-500 py-4 text-center">
                                      No recent executions
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-8">
                              <div className="text-secondary-400 text-3xl mb-3">📊</div>
                              <h4 className="text-sm font-medium text-secondary-900 mb-2">No Page Analytics Data</h4>
                              <div className="text-xs text-secondary-500 space-y-1">
                                {workflow.status !== 'active' ? (
                                  <>
                                    <p>This workflow is not active yet.</p>
                                    <p>Activate it to start collecting page analytics.</p>
                                  </>
                                ) : workflow.executions === 0 ? (
                                  <>
                                    <p>This workflow hasn't executed on any pages yet.</p>
                                    <p>Deploy it to a website to start collecting data.</p>
                                  </>
                                ) : (
                                  <>
                                    <p>Page analytics will appear here once this workflow</p>
                                    <p>generates page view events and user interactions.</p>
                                  </>
                                )}
                              </div>
                              
                              {workflow.status === 'active' && (
                                <div className="mt-4">
                                  <button 
                                    onClick={() => {
                                      alert('Open workflow integration to get deployment code');
                                    }}
                                    className="text-xs text-primary-600 hover:text-primary-700 underline"
                                  >
                                    Get integration code →
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No Workflows Message */}
              {!loading && workflows.length === 0 && (
                <div className="bg-white rounded-lg border border-secondary-200 p-8 text-center">
                  <div className="text-secondary-400 text-4xl mb-4">📋</div>
                  <h3 className="text-lg font-medium text-secondary-900 mb-2">No Workflows Found</h3>
                  <p className="text-sm text-secondary-600 mb-4">
                    Create your first workflow to see page-level analytics.
                  </p>
                  <p className="text-xs text-secondary-500">
                    Go to the "Playbooks" tab to get started.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics; 