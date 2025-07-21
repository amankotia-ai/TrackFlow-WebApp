import React, { useState } from 'react';
import { 
  Plus, 
  Play, 
  Pause, 
  Edit, 
  Activity, 
  MoreHorizontal,
  Download,
  RefreshCw,
  Upload,
  Trash2
} from 'lucide-react';
import { Workflow } from '../types/workflow';
import { StorageService } from '../services/storageService';

interface WorkflowListProps {
  workflows: Workflow[];
  onWorkflowSelect: (workflow: Workflow) => void;
  onCreateWorkflow: () => void;
  onWorkflowImport?: (workflow: Workflow) => void;
}

const WorkflowList: React.FC<WorkflowListProps> = ({ 
  workflows, 
  onWorkflowSelect, 
  onCreateWorkflow,
  onWorkflowImport
}) => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [exportingWorkflow, setExportingWorkflow] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-secondary-100 text-secondary-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-secondary-100 text-secondary-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-3 h-3 mr-1" />;
      case 'paused': return <Pause className="w-3 h-3 mr-1" />;
      case 'draft': return <Edit className="w-3 h-3 mr-1" />;
      case 'error': return <Activity className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  const handleExportWorkflow = async (workflow: Workflow) => {
    try {
      setExportingWorkflow(workflow.id);
      await StorageService.exportWorkflow(workflow);
      // You could show a success message here
    } catch (error) {
      console.error('Error exporting workflow:', error);
      // You could show an error message here
    } finally {
      setExportingWorkflow(null);
    }
  };

  const handleImportWorkflow = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const importedWorkflow = await StorageService.importWorkflow(file);
      
      // Create a new workflow with imported data
      const newWorkflow: Workflow = {
        ...importedWorkflow,
        id: `workflow-${Date.now()}`,
        name: `${importedWorkflow.name} (Imported)`,
        isActive: false,
        status: 'draft',
        executions: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (onWorkflowImport) {
        onWorkflowImport(newWorkflow);
      }
    } catch (error) {
      console.error('Error importing workflow:', error);
      // You could show an error message here
    } finally {
      setImporting(false);
      // Reset the input
      event.target.value = '';
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
                <h1 className="text-3xl font-medium text-secondary-900 tracking-tight">Personalization Playbooks</h1>
                <p className="text-sm text-secondary-600">Create and manage website personalization rules for different visitor segments</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Import Button */}
              <label className="flex items-center space-x-2 px-4 py-2 text-secondary-700 bg-white border border-secondary-300 hover:bg-secondary-50 transition-colors font-medium text-sm rounded-lg cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{importing ? 'Importing...' : 'Import'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportWorkflow}
                  className="hidden"
                  disabled={importing}
                />
              </label>
              <button
                onClick={onCreateWorkflow}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white hover:bg-primary-600 transition-colors font-medium text-sm rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Create Playbook</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8">
          {workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-6">
                <Activity className="w-10 h-10 text-primary-500" />
              </div>
              <h2 className="text-2xl font-semibold text-secondary-900 mb-2">No Playbooks Yet</h2>
              <p className="text-secondary-600 mb-6 text-center max-w-md">
                Create your first personalization playbook to start automating website experiences for your visitors.
              </p>
              <button
                onClick={onCreateWorkflow}
                className="flex items-center space-x-2 px-6 py-3 bg-primary-500 text-white hover:bg-primary-600 transition-colors font-medium text-base rounded-lg shadow"
              >
                <Plus className="w-5 h-5" />
                <span>Create Playbook</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="bg-white p-6 rounded-lg border border-secondary-200 hover:border-secondary-300 transition-colors cursor-pointer"
                  onClick={() => onWorkflowSelect(workflow)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-secondary-900 tracking-tight">{workflow.name}</h3>
                        <p className="text-sm text-secondary-600">{workflow.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(workflow.status)}`}>
                        {getStatusIcon(workflow.status)}
                        {workflow.status}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportWorkflow(workflow);
                        }}
                        disabled={exportingWorkflow === workflow.id}
                        className="p-2 hover:bg-secondary-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Export workflow"
                      >
                        <Download className="w-4 h-4 text-secondary-400" />
                      </button>
                      <button className="p-2 hover:bg-secondary-100 rounded-lg transition-colors">
                        <MoreHorizontal className="w-5 h-5 text-secondary-400" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-secondary-600">
                    <div className="flex items-center space-x-6">
                      <span>{workflow.nodes.length} nodes</span>
                      <span>{workflow.executions} executions</span>
                      <span>Updated {workflow.updatedAt.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-secondary-500">•</span>
                      <span>View details</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowList;