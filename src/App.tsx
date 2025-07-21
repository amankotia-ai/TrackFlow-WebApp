import React, { useState, useEffect } from 'react';
import { Workflow } from './types/workflow';
import { WorkflowService } from './services/workflowService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import WorkflowList from './components/WorkflowList';
import WorkflowBuilder from './components/WorkflowBuilder';
import Templates from './components/Templates';
import Analytics from './components/Analytics';
import ApiKeyManager from './components/ApiKeyManager';
import Auth from './components/Auth';
import { Loader2, AlertCircle } from 'lucide-react';

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-600" />
        <p className="mt-4 text-secondary-600">Loading TrackFlow...</p>
      </div>
    </div>
  );
}

// Authenticated App Component
function AuthenticatedApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user workflows and templates on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load workflows and templates in parallel
        const [userWorkflows, workflowTemplates] = await Promise.all([
          WorkflowService.getUserWorkflows(),
          WorkflowService.getWorkflowTemplates()
        ]);
        
        setWorkflows(userWorkflows);
        setTemplates(workflowTemplates);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load workflows. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleWorkflowSelect = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
  };

  const handleCreateWorkflow = () => {
    const newWorkflow: Workflow = {
      id: `workflow-${Date.now()}`,
      name: 'New Playbook',
      description: 'A new personalization playbook',
      isActive: false,
      status: 'draft',
      executions: 0,
      nodes: [],
      connections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      targetUrl: ''
    };
    setWorkflows(prev => [...prev, newWorkflow]);
    setSelectedWorkflow(newWorkflow);
  };

  const handleWorkflowSave = async (workflow: Workflow) => {
    try {
      const savedWorkflow = await WorkflowService.saveWorkflow(workflow);
      
      // Update the workflows list
      setWorkflows(prev => {
        const existingIndex = prev.findIndex(w => w.id === workflow.id);
        if (existingIndex >= 0) {
          // Update existing workflow
          const updated = [...prev];
          updated[existingIndex] = savedWorkflow;
          return updated;
        } else {
          // Add new workflow
          return [...prev, savedWorkflow];
        }
      });
      
      setSelectedWorkflow(null);
      setActiveTab('workflows');
    } catch (err) {
      console.error('Error saving workflow:', err);
      setError('Failed to save workflow. Please try again.');
    }
  };

  const handleTemplateUse = (template: Workflow) => {
    const newWorkflow: Workflow = {
      ...template,
      id: `workflow-${Date.now()}`,
      name: `${template.name} (Copy)`,
      isActive: false,
      status: 'draft',
      executions: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setSelectedWorkflow(newWorkflow);
  };

  const handleWorkflowImport = (importedWorkflow: Workflow) => {
    setWorkflows(prev => [...prev, importedWorkflow]);
    setSelectedWorkflow(importedWorkflow);
  };

  const handleWorkflowUpdate = (updatedWorkflow: Workflow) => {
    // Update the workflow in the list
    setWorkflows(prev => {
      const index = prev.findIndex(w => w.id === updatedWorkflow.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = updatedWorkflow;
        return updated;
      }
      return prev;
    });
  };

  const renderContent = () => {
    // Show loading state
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center bg-secondary-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-600" />
            <p className="mt-4 text-secondary-600">Loading your workflows...</p>
          </div>
        </div>
      );
    }

    // Show error state
    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center bg-secondary-50">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-red-600" />
            <p className="mt-4 text-red-600">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    if (selectedWorkflow) {
      return (
        <WorkflowBuilder
          workflow={selectedWorkflow}
          onBack={() => setSelectedWorkflow(null)}
          onSave={handleWorkflowSave}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'workflows':
        return (
          <WorkflowList
            workflows={workflows}
            onWorkflowSelect={handleWorkflowSelect}
            onCreateWorkflow={handleCreateWorkflow}
            onWorkflowImport={handleWorkflowImport}
            onWorkflowUpdate={handleWorkflowUpdate}
          />
        );
      case 'templates':
        return (
          <Templates
            templates={templates}
            onTemplateUse={handleTemplateUse}
          />
        );
      case 'executions':
        return <Analytics workflows={workflows} />;
      case 'settings':
        return (
          <div className="flex-1 bg-secondary-50">
            <div className="max-w-4xl mx-auto p-8">
              <div className="mb-8">
                <h1 className="text-3xl font-medium text-secondary-900 tracking-tight">Settings</h1>
                <p className="text-sm text-secondary-600">Manage your account and integration settings</p>
              </div>
              
              <div className="bg-white border border-secondary-200 rounded-lg p-6">
                <ApiKeyManager />
              </div>
            </div>
          </div>
        );
      case 'profile':
        return <div className="flex-1 p-8 bg-secondary-50">Profile coming soon...</div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-screen bg-secondary-50">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onCreateWorkflow={handleCreateWorkflow}
      />
      <div className="ml-64">
        {renderContent()}
      </div>
    </div>
  );
}

// Main App with Auth Logic
function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Auth />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;