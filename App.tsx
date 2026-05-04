
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PageView, ProcessNode, Connection, NodeInsights, NodeDraft } from './types';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import Insights from './components/Insights';
import Report from './components/Report';
import Simulation from './components/Simulation';

export interface AppSettings {
  language: string;
  titleFontSize: number;
  headingFontSize: number;
  textFontSize: number;
}

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 
  'Korean', 'Portuguese', 'Italian', 'Russian', 'Arabic', 'Hindi'
];

const CURRENCIES = {
  USD: { symbol: '$', rate: 1, label: 'USD', name: 'US Dollar' },
  EUR: { symbol: '€', rate: 0.92, label: 'EUR', name: 'Euro' },
  GBP: { symbol: '£', rate: 0.79, label: 'GBP', name: 'British Pound' },
  JPY: { symbol: '¥', rate: 150.5, label: 'JPY', name: 'Japanese Yen' },
  INR: { symbol: '₹', rate: 83.2, label: 'INR', name: 'Indian Rupee' },
  CAD: { symbol: 'C$', rate: 1.35, label: 'CAD', name: 'Canadian Dollar' },
  KES: { symbol: 'KSh', rate: 129.5, label: 'KES', name: 'Kenyan Shilling' },
};

type CurrencyCode = keyof typeof CURRENCIES;

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm transition-all animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 transform scale-100 transition-all border border-slate-100">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Start New Project?</h3>
            <p className="text-xs font-medium text-slate-500 mt-2 leading-relaxed">
              All unsaved progress will be permanently lost.
            </p>
          </div>
          <div className="flex w-full gap-3 pt-2">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}> = ({ isOpen, onClose, settings, setSettings }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">System Configuration</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-8 space-y-8">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Output Language (AI Prompt)</label>
            <select 
              value={settings.language}
              onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Report Typography</label>
              <span className="text-[10px] text-slate-300 font-medium">Pixels (px)</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-bold text-slate-600 w-24">Main Titles</span>
                <input 
                  type="range" min="20" max="64" step="1"
                  value={settings.titleFontSize}
                  onChange={(e) => setSettings(prev => ({ ...prev, titleFontSize: parseInt(e.target.value) }))}
                  className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-xs font-mono font-bold text-slate-500 w-8 text-right">{settings.titleFontSize}</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-bold text-slate-600 w-24">Headings</span>
                <input 
                  type="range" min="14" max="40" step="1"
                  value={settings.headingFontSize}
                  onChange={(e) => setSettings(prev => ({ ...prev, headingFontSize: parseInt(e.target.value) }))}
                  className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-xs font-mono font-bold text-slate-500 w-8 text-right">{settings.headingFontSize}</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-bold text-slate-600 w-24">Body Text</span>
                <input 
                  type="range" min="10" max="24" step="1"
                  value={settings.textFontSize}
                  onChange={(e) => setSettings(prev => ({ ...prev, textFontSize: parseInt(e.target.value) }))}
                  className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-xs font-mono font-bold text-slate-500 w-8 text-right">{settings.textFontSize}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // Add a projectId state to force remount of key components on reset
  const [projectId, setProjectId] = useState<string>(() => Date.now().toString());
  const [activePage, setActivePage] = useState<PageView>('editor');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [projectTitle, setProjectTitle] = useState('Process Strategy Master Plan');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  
  const [settings, setSettings] = useState<AppSettings>({
    language: 'English',
    titleFontSize: 48,
    headingFontSize: 24,
    textFontSize: 12,
  });
  
  const [nodes, setNodes] = useState<ProcessNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [insightsMap, setInsightsMap] = useState<Record<string, NodeInsights>>({});
  
  // Initialize nodeDrafts from Local Storage if available
  const [nodeDrafts, setNodeDrafts] = useState<Record<string, NodeDraft>>(() => {
    try {
      const saved = localStorage.getItem('ppmp_drafts');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to load drafts from local storage", e);
      return {};
    }
  });

  // Persist nodeDrafts to Local Storage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('ppmp_drafts', JSON.stringify(nodeDrafts));
    } catch (e) {
      console.error("Failed to save drafts to local storage (likely quota exceeded)", e);
    }
  }, [nodeDrafts]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const formatCost = useCallback((amount: number) => {
    const { symbol, rate } = CURRENCIES[currency];
    const converted = amount * rate;
    return `${symbol}${converted.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }, [currency]);

  const saveProject = useCallback(() => {
    const projectData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      projectTitle,
      currency,
      settings,
      nodes,
      connections,
      insightsMap,
      // We now save the files in the JSON since they are Base64 encoded strings
      nodeDrafts
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectTitle, currency, nodes, connections, insightsMap, nodeDrafts, settings]);

  const loadProject = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.version && data.nodes) {
          setProjectTitle(data.projectTitle || 'Untitled Project');
          setCurrency(data.currency || 'USD');
          if (data.settings) setSettings(data.settings);
          setNodes(data.nodes || []);
          setConnections(data.connections || []);
          setInsightsMap(data.insightsMap || {});
          
          if (data.nodeDrafts) {
            setNodeDrafts(data.nodeDrafts);
          } else {
             setNodeDrafts({});
          }
          
          setProjectId(Date.now().toString()); // Force refresh on load
          alert('Project loaded successfully!');
        } else {
          throw new Error('Invalid project file format');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to load project. Please check the file format.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const triggerLoad = () => fileInputRef.current?.click();
  
  const resetProject = useCallback(() => {
    setIsResetConfirmOpen(true);
  }, []);

  const performReset = useCallback(() => {
    setProjectTitle('Process Strategy Master Plan');
    setCurrency('USD');
    setNodes([]);
    setConnections([]);
    setInsightsMap({});
    setNodeDrafts({});
    try {
      localStorage.removeItem('ppmp_drafts');
    } catch(e) { console.error(e); }
    setSelectedNodeId(null);
    // Force a re-render of components by updating the projectId key
    setProjectId(Date.now().toString());
    setIsResetConfirmOpen(false);
  }, []);

  const addNode = useCallback((x: number = 100, y: number = 100, layer: number = 0) => {
    const newNode: ProcessNode = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New Process Step',
      description: 'Define the objectives for this specific task...',
      x,
      y,
      width: 240,
      height: 120,
      color: '#ffffff',
      slots: [
        { id: Math.random().toString(36).substr(2, 9), label: 'Primary Operation', type: 'task' }
      ],
      layer,
      status: 'idle'
    };
    setNodes(prev => [...prev, newNode]);
    setNodeDrafts(prev => ({ ...prev, [newNode.id]: { inputText: '', files: [], links: [] } }));
  }, []);

  const updateNode = useCallback((id: string, updates: Partial<ProcessNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.sourceNodeId !== id && c.targetNodeId !== id));
    setNodeDrafts(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (selectedNodeId === id) setSelectedNodeId(null);
  }, [selectedNodeId]);

  const addConnection = useCallback((conn: Connection) => {
    setConnections(prev => [...prev, conn]);
  }, []);

  const updateConnection = useCallback((id: string, updates: Partial<Connection>) => {
    setConnections(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteConnection = useCallback((id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'editor':
        return (
          <Editor 
            key={projectId}
            nodes={nodes} 
            connections={connections} 
            onAddNode={addNode} 
            onUpdateNode={updateNode} 
            onDeleteNode={deleteNode}
            onAddConnection={addConnection}
            onUpdateConnection={updateConnection}
            onDeleteConnection={deleteConnection}
            projectTitle={projectTitle}
            setProjectTitle={setProjectTitle}
            selectedNodeId={selectedNodeId}
            setSelectedNodeId={setSelectedNodeId}
            onSaveProject={saveProject}
            onLoadProject={triggerLoad}
          />
        );
      case 'insights':
        return (
          <Insights 
            key={`insights-${projectId}`}
            nodes={nodes}
            connections={connections}
            selectedNodeId={selectedNodeId}
            setSelectedNodeId={setSelectedNodeId}
            insightsMap={insightsMap}
            setInsightsMap={setInsightsMap}
            nodeDrafts={nodeDrafts}
            setNodeDrafts={setNodeDrafts}
            formatCost={formatCost}
            settings={settings}
          />
        );
      case 'simulation':
        return (
          <Simulation 
            key={`sim-${projectId}`}
            nodes={nodes} 
            connections={connections}
            insightsMap={insightsMap}
            nodeDrafts={nodeDrafts}
            setNodes={setNodes}
            formatCost={formatCost}
          />
        );
      case 'report':
        return (
          <Report 
            key={`report-${projectId}`}
            nodes={nodes} 
            connections={connections} 
            insightsMap={insightsMap}
            nodeDrafts={nodeDrafts}
            projectTitle={projectTitle}
            formatCost={formatCost}
            settings={settings}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={loadProject} 
        className="hidden" 
        accept=".json" 
      />
      
      <ConfirmationModal 
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={performReset}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        setSettings={setSettings}
      />

      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={toggleSidebar} 
        activePage={activePage} 
        setActivePage={setActivePage}
        onSaveProject={saveProject}
        onLoadProject={triggerLoad}
        onResetProject={resetProject}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      <main className="flex-1 flex flex-col transition-all duration-300">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-40 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
            >
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-br from-blue-700 to-indigo-700 bg-clip-text text-transparent tracking-tight">
              {projectTitle}
            </h1>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Currency</label>
                <select 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(CURRENCIES).map(([code, { label, symbol, name }]) => (
                    <option key={code} value={code}>{symbol} {label}</option>
                  ))}
                </select>
             </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100 shadow-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Live Sync
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-900 overflow-hidden border-2 border-white shadow-lg">
                <img src="https://picsum.photos/40/40?grayscale" alt="User profile" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden bg-slate-100/50">
          {renderPage()}
        </div>
      </main>
    </div>
  );
};

export default App;
