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
  Pause
} from 'lucide-react';
import { Workflow } from '../types/workflow';

interface AnalyticsProps {
  workflows: Workflow[];
}

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ComponentType<any>;
  suffix?: string;
}

const Analytics: React.FC<AnalyticsProps> = ({ workflows }) => {
  const [timeRange, setTimeRange] = useState('7d');

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
        totalExecutions,
        totalWorkflows: workflows.length,
        activeWorkflows,
        avgExecutionsPerWorkflow: workflows.length > 0 ? Math.round(totalExecutions / workflows.length) : 0
      },
      topPlaybooks: sortedWorkflows.map(workflow => ({
        name: workflow.name,
        executions: workflow.executions,
        status: workflow.status,
        lastRun: workflow.lastRun
      }))
    };
  }, [workflows]);

  const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, changeType, icon: Icon, suffix = '' }) => (
    <div className="bg-white rounded-lg p-6 border border-secondary-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-secondary-600 tracking-tight">{title}</p>
          <p className="text-2xl font-bold text-secondary-900 tracking-tight mt-1">
            {value}{suffix}
          </p>
          <div className="flex items-center mt-2">
            {changeType === 'positive' ? (
              <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
              {change}
            </span>
          </div>
        </div>
        <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary-600" />
        </div>
      </div>
    </div>
  );

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

  return (
    <div className="flex-1 bg-secondary-50">
      <div className="max-w-7xl mx-auto">
        {/* Clean Header */}
        <div className="px-8 py-6 pt-12">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {/* Page Title and Description */}
              <div>
                <h1 className="text-3xl font-medium text-secondary-900 tracking-tight">Analytics</h1>
                <p className="text-sm text-secondary-600">Monitor your personalization performance and visitor engagement</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium text-sm">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 text-secondary-700 bg-white border border-secondary-300 hover:bg-secondary-50 transition-colors font-medium text-sm rounded-lg">
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8">
          {/* Overview Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Total Executions"
              value={analyticsData.overview.totalExecutions.toLocaleString()}
              change={analyticsData.overview.totalExecutions > 0 ? "Real data" : "No executions yet"}
              changeType={analyticsData.overview.totalExecutions > 0 ? "positive" : "negative"}
              icon={Activity}
            />
            <MetricCard
              title="Total Playbooks"
              value={analyticsData.overview.totalWorkflows.toString()}
              change={`${analyticsData.overview.activeWorkflows} active`}
              changeType="positive"
              icon={CheckCircle}
            />
            <MetricCard
              title="Active Playbooks"
              value={analyticsData.overview.activeWorkflows.toString()}
              change={`${analyticsData.overview.totalWorkflows - analyticsData.overview.activeWorkflows} inactive`}
              changeType="positive"
              icon={Clock}
            />
            <MetricCard
              title="Avg. per Playbook"
              value={analyticsData.overview.avgExecutionsPerWorkflow.toString()}
              change="executions"
              changeType="positive"
              icon={TrendingUp}
            />
          </div>

          {/* Top Performing Playbooks */}
          <div className="bg-white rounded-lg border border-secondary-200 mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-secondary-200">
              <h3 className="text-lg font-semibold text-secondary-900">Top Performing Playbooks</h3>
            </div>
            <div className="divide-y divide-secondary-100">
              {analyticsData.topPlaybooks.length > 0 ? (
                analyticsData.topPlaybooks.map((playbook, index) => {
                  const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
                  const maxExecutions = Math.max(...analyticsData.topPlaybooks.map(p => p.executions));
                  const executionPercentage = maxExecutions > 0 ? (playbook.executions / maxExecutions) * 100 : 0;
                  
                  return (
                    <div key={index} className="px-6 py-4 hover:bg-secondary-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                          <div className="font-medium text-secondary-900">{playbook.name}</div>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-secondary-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(executionPercentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-secondary-600 min-w-0">
                              {playbook.executions.toLocaleString()} executions
                            </span>
                          </div>
                          <span className={`text-sm px-2 py-1 rounded-full text-xs font-medium ${
                            playbook.status === 'active' ? 'bg-green-100 text-green-800' :
                            playbook.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-secondary-100 text-secondary-800'
                          }`}>
                            {playbook.status}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-secondary-900">
                            {playbook.executions.toLocaleString()}
                          </div>
                          <div className="text-xs text-secondary-500">
                            {playbook.lastRun ? new Date(playbook.lastRun).toLocaleDateString() : 'Never run'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-6 py-8 text-center">
                  <div className="text-secondary-400 text-4xl mb-2">📊</div>
                  <h3 className="text-lg font-medium text-secondary-900 mb-1">No Playbooks Yet</h3>
                  <p className="text-sm text-secondary-600">Create your first playbook to see execution analytics here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 