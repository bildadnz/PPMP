
import React, { useState, useEffect } from 'react';
import { ProcessNode, Connection, NodeInsights } from '../types';

interface SimulationProps {
  nodes: ProcessNode[];
  connections: Connection[];
  insightsMap: Record<string, NodeInsights>;
  nodeDrafts: Record<string, any>;
  setNodes: React.Dispatch<React.SetStateAction<ProcessNode[]>>;
  formatCost: (amount: number) => string;
}

const Simulation: React.FC<SimulationProps> = ({ nodes, connections, insightsMap, nodeDrafts, setNodes, formatCost }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeConnectionIds, setActiveConnectionIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [executionQueue, setExecutionQueue] = useState<string[]>([]);
  const [errorReport, setErrorReport] = useState<string | null>(null);

  const startSim = () => {
    setIsRunning(true);
    setLogs(["[SYSTEM] Initializing Relational Blueprint Traversal..."]);
    setErrorReport(null);
    
    const sortedNodeIds = [...nodes]
      .sort((a, b) => a.x - b.x)
      .map(n => n.id);

    setExecutionQueue(sortedNodeIds);
    setNodes(prev => prev.map(n => ({ ...n, status: 'idle' })));
    setLogs(prev => [...prev, `[INIT] Analyzing ${nodes.length} process milestones for relational integrity.`]);
  };

  const stopSim = () => {
    setIsRunning(false);
    setActiveNodeId(null);
    setActiveConnectionIds([]);
    setExecutionQueue([]);
  };

  const downloadErrorReport = () => {
    if (!errorReport) return;
    const blob = new Blob([errorReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation_errors_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!isRunning || executionQueue.length === 0) {
      if (isRunning && executionQueue.length === 0) {
        setIsRunning(false);
        setActiveNodeId(null);
        setActiveConnectionIds([]);
        
        const failedNodes = nodes.filter(n => n.status === 'failed');
        if (failedNodes.length > 0) {
          const reportContent = `SIMULATION ERROR REPORT\nGenerated: ${new Date().toLocaleString()}\n\nFAILED MILESTONES:\n` + 
            failedNodes.map(n => `- ${n.title} (ID: ${n.id})\n  Reason: Comparison Weight <= 1.0 or Broken Dependency`).join('\n');
          setErrorReport(reportContent);
          setLogs(prev => [...prev, `[CRITICAL] Traversal finished with ${failedNodes.length} failures. Error file generated.`]);
        } else {
          setLogs(prev => [...prev, "[SUCCESS] Master Plan simulation concluded. All relational constraints verified."]);
        }
      }
      return;
    }

    const timer = setTimeout(() => {
      const currentId = executionQueue[0];
      const currentNode = nodes.find(n => n.id === currentId);
      if (!currentNode) return;

      setActiveNodeId(currentId);
      
      const incomingConns = connections.filter(c => c.targetNodeId === currentId);
      setActiveConnectionIds(incomingConns.map(c => c.id));

      const insights = insightsMap[currentId];
      
      setLogs(prev => [...prev, `[VALIDATING] Node: ${currentNode.title}`]);
      
      const upstreamNodes = incomingConns.map(c => nodes.find(n => n.id === c.sourceNodeId));
      const allUpstreamValidated = upstreamNodes.every(n => n?.status === 'success');
      
      // LOGIC: Check comparison_weight > 1.0
      // Ensure weight is strictly greater than 1.0 for validation success
      const weight = insights?.comparison_weight || 0;
      const weightMet = weight > 1.0;
      
      const isValid = allUpstreamValidated && weightMet;
      
      setNodes(prev => prev.map(n => n.id === currentId ? { ...n, status: isValid ? 'success' : 'failed' } : n));
      
      if (isValid) {
        const cost = insights?.resources.reduce((sum, r) => sum + r.cost, 0) || 0;
        setLogs(prev => [
          ...prev, 
          `[ENGINE_LOG.STDOUT] OK: ${currentNode.title} (Weight: ${weight.toFixed(2)})`,
          `[ENGINE_LOG.STDOUT] RELATIONAL: All predecessors synchronized.`,
          `[DATA] Validated Budget Allocation: ${formatCost(cost)}`
        ]);
      } else {
        const failureReason = !allUpstreamValidated ? "Unfulfilled Upstream Dependency" : 
                             !weightMet ? `Low Alignment Weight (${weight.toFixed(2)} <= 1.0)` : "General Integrity Error";
        
        setLogs(prev => [...prev, `[ENGINE_LOG.STDOUT] FAIL: ${currentNode.title}. Reason: ${failureReason}.`]);
      }

      setExecutionQueue(prev => prev.slice(1));
    }, 1200);

    return () => clearTimeout(timer);
  }, [isRunning, executionQueue, nodes, connections, insightsMap, nodeDrafts, setNodes, formatCost]);

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-hidden bg-slate-100/30">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-none">Relational Validation Engine</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Weight-Based Logic Analyzer v5.2</p>
        </div>
        <div className="flex gap-3">
          {errorReport && (
            <button 
              onClick={downloadErrorReport}
              className="px-6 py-2.5 bg-red-50 text-red-600 rounded-xl font-black border border-red-200 hover:bg-red-100 shadow-sm flex items-center gap-3 transition-all active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              DOWNLOAD ERRORS
            </button>
          )}
          {!isRunning ? (
            <button 
              onClick={startSim}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black hover:bg-black shadow-xl flex items-center gap-3 transition-all active:scale-95 group"
            >
              <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
              </div>
              START VALIDATION
            </button>
          ) : (
            <button 
              onClick={stopSim}
              className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-black hover:bg-red-700 shadow-xl flex items-center gap-3 transition-all active:scale-95"
            >
              <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              ABORT SIMULATION
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
        <div className="col-span-2 bg-white rounded-3xl border border-slate-200 p-8 relative overflow-auto shadow-sm">
           <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>

          <div className="flex flex-wrap gap-12 justify-center items-center pt-10 min-h-full">
            {nodes.map(node => (
              <div 
                key={node.id}
                className={`relative w-60 p-6 rounded-3xl border-4 text-center transition-all duration-500 ${
                  activeNodeId === node.id 
                    ? 'scale-105 border-blue-500 bg-blue-50/50 shadow-2xl z-20 ring-8 ring-blue-50' 
                    : node.status === 'success' 
                    ? 'bg-emerald-50/30 border-emerald-500 shadow-lg' 
                    : node.status === 'failed'
                    ? 'bg-red-50 border-red-500 shadow-lg opacity-100'
                    : 'bg-white border-slate-100 opacity-40 grayscale'
                }`}
              >
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md ${
                   node.status === 'success' ? 'bg-emerald-500 text-white' : 
                   node.status === 'failed' ? 'bg-red-500 text-white' :
                   'bg-slate-400 text-white'
                }`}>
                  {node.status === 'success' ? 'VALIDATED' : node.status === 'failed' ? 'REJECTED' : 'AWAITING'}
                </div>
                
                <h4 className="font-black text-sm text-slate-800 mb-2 truncate px-2">{node.title}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Weight: {insightsMap[node.id]?.comparison_weight?.toFixed(2) || '0.00'}</p>
                
                <div className="space-y-1.5 opacity-60 mt-3">
                   <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-1000 ${node.status === 'success' ? 'w-full bg-emerald-400' : 'w-0'}`} />
                   </div>
                </div>

                <div className="flex justify-center gap-3 mt-4">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${node.status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-200'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${node.status === 'success' ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-200'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-6 text-blue-400 font-mono text-[11px] overflow-hidden border-8 border-slate-800 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
            <h3 className="text-white font-black uppercase tracking-[0.2em] flex items-center gap-3 text-xs">
              <span className={`w-3 h-3 rounded-full ${isRunning ? 'bg-red-500 animate-pulse ring-4 ring-red-900/50' : 'bg-slate-600'}`}></span>
              ENGINE_LOG.STDOUT
            </h3>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <span className="text-slate-700 shrink-0 font-black">[{new Date().toLocaleTimeString([], {hour12: false})}]</span>
                <span className={`leading-snug ${
                  log.includes('[OK]') ? 'text-emerald-400 font-bold' : 
                  log.includes('[FAIL]') ? 'text-red-400 font-black' : 
                  log.includes('[DATA]') ? 'text-blue-200 italic' : 
                  log.includes('[VALIDATING]') ? 'text-amber-400 font-black' : 'text-slate-400'
                }`}>
                  {log}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulation;
