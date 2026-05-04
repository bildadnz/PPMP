
import React, { useState } from 'react';
import { ProcessNode, NodeInsights, Connection, Resource, NodeDraft, StoredFile } from '../types';
import { analyzeProcessData, GroundingLink } from '../services/geminiService';
import { AppSettings } from '../App';

interface InsightsProps {
  nodes: ProcessNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  insightsMap: Record<string, NodeInsights>;
  setInsightsMap: React.Dispatch<React.SetStateAction<Record<string, NodeInsights>>>;
  nodeDrafts: Record<string, NodeDraft>;
  setNodeDrafts: React.Dispatch<React.SetStateAction<Record<string, NodeDraft>>>;
  formatCost: (amount: number) => string;
  settings: AppSettings;
}

const Insights: React.FC<InsightsProps> = ({ 
  nodes, 
  connections,
  selectedNodeId, 
  setSelectedNodeId, 
  insightsMap, 
  setInsightsMap,
  nodeDrafts,
  setNodeDrafts,
  formatCost,
  settings
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentLinks, setCurrentLinks] = useState<GroundingLink[]>([]);
  const [lastResponseText, setLastResponseText] = useState<string>('');
  const [linkInput, setLinkInput] = useState('');
  
  const currentNode = nodes.find(n => n.id === selectedNodeId);
  const currentDraft = selectedNodeId ? nodeDrafts[selectedNodeId] || { inputText: '', files: [], links: [] } : { inputText: '', files: [], links: [] };

  const updateDraftText = (text: string) => {
    if (!selectedNodeId) return;
    setNodeDrafts(prev => ({
      ...prev,
      [selectedNodeId]: { ...prev[selectedNodeId], inputText: text }
    }));
  };

  const addLink = () => {
    if (!selectedNodeId || !linkInput.trim()) return;
    const url = linkInput.trim().startsWith('http') ? linkInput.trim() : `https://${linkInput.trim()}`;
    setNodeDrafts(prev => ({
      ...prev,
      [selectedNodeId]: { 
        ...prev[selectedNodeId], 
        links: [...(prev[selectedNodeId]?.links || []), url] 
      }
    }));
    setLinkInput('');
  };

  const removeLink = (index: number) => {
    if (!selectedNodeId) return;
    setNodeDrafts(prev => ({
      ...prev,
      [selectedNodeId]: {
        ...prev[selectedNodeId],
        links: (prev[selectedNodeId]?.links || []).filter((_, i) => i !== index)
      }
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedNodeId) return;
    
    const fileList = Array.from(e.target.files);
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB in bytes

    const processedFiles: StoredFile[] = [];

    for (const file of fileList) {
      if (file.size > MAX_SIZE) {
        alert(`File "${file.name}" exceeds the 50MB limit and cannot be uploaded.`);
        continue;
      }

      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        processedFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64Data
        });
      } catch (err) {
        console.error("Error reading file:", file.name, err);
        alert(`Failed to process file "${file.name}".`);
      }
    }

    if (processedFiles.length > 0) {
      setNodeDrafts(prev => {
        const existingFiles = prev[selectedNodeId]?.files || [];
        return {
          ...prev,
          [selectedNodeId]: { 
            ...prev[selectedNodeId], 
            files: [...existingFiles, ...processedFiles] 
          }
        };
      });
    }
    
    // Reset input so same files can be selected again if needed
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    if (!selectedNodeId) return;
    setNodeDrafts(prev => ({
      ...prev,
      [selectedNodeId]: {
        ...prev[selectedNodeId],
        files: prev[selectedNodeId].files.filter((_, i) => i !== index)
      }
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleAnalyze = async () => {
    if (!currentNode || !selectedNodeId) return;
    setIsAnalyzing(true);
    
    const upstreamConnections = connections.filter(c => c.targetNodeId === selectedNodeId);
    const dependencyContext = upstreamConnections.map(conn => {
      const sourceNode = nodes.find(n => n.id === conn.sourceNodeId);
      const sourceInsights = insightsMap[conn.sourceNodeId];
      return `
        DEPENDENCY FROM: ${sourceNode?.title || 'Unknown Step'}
        RELATIONSHIP TYPE: ${conn.type}
        SOURCE DESCRIPTION: ${sourceNode?.description || 'No description'}
        SOURCE REQUIREMENTS/OUTPUTS: ${sourceInsights?.summary || 'Not yet analyzed'}
      `;
    }).join('\n---\n');

    const fileContext = currentDraft.files.map(f => f.name).join(', ');
    const linkContext = (currentDraft.links || []).join(', ');
    const slotContext = currentNode.slots.map(s => `- ${s.label} (${s.type})`).join('\n');
    
    const rawContext = `
      TARGET NODE: ${currentNode.title}
      TARGET DESCRIPTION: ${currentNode.description}
      
      TARGET SLOTS (TASKS/OPS):
      ${slotContext || 'No specific task slots defined.'}
      
      RELATIONSHIP CONSTRAINTS (UPSTREAM DEPENDENCIES):
      ${dependencyContext || 'No direct upstream dependencies identified.'}
      
      SPECIFIC FILES PROVIDED: ${fileContext || 'None'}
      REFERENCE LINKS: ${linkContext || 'None'}
      USER NOTES: ${currentDraft.inputText}
    `;

    const prompt = `Analyze this process step. 
    1. Evaluate how the TARGET SLOTS (tasks/ops) fit into the execution strategy.
    2. Identify resources needed.
    3. Calculate the comparison_weight based on input data vs generated strategy.
    4. Ensure alignment with RELATIONAL CONSTRAINTS from predecessors.`;

    let location = undefined;
    try {
      if ('geolocation' in navigator) {
        const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      }
    } catch (e) { console.debug("Location restricted"); }
    
    // Pass settings.language to the service
    const result = await analyzeProcessData(currentNode.title, rawContext, prompt, location, settings.language);
    
    if (result) {
      setLastResponseText(result.summary);
      setCurrentLinks(result.links);
      
      setInsightsMap(prev => ({
        ...prev,
        [selectedNodeId]: { 
          nodeId: selectedNodeId, 
          summary: result.summary, 
          requirements: ['High-bandwidth data link', 'Validation certificate'], // Can be derived or hardcoded for now
          resources: result.resources, 
          executionStyle: 'Standard Adaptive',
          links: result.links,
          comparison_weight: result.comparison_weight
        }
      }));
    }
    setIsAnalyzing(false);
  };

  const StepSelector = () => (
    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
      <label htmlFor="step-select" className="text-xs font-bold text-slate-400 uppercase tracking-tight">Active Node:</label>
      <select 
        id="step-select"
        value={selectedNodeId || ''}
        onChange={(e) => {
          setSelectedNodeId(e.target.value || null);
          setLastResponseText('');
          setCurrentLinks([]);
        }}
        className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer min-w-[200px]"
      >
        <option value="">-- Choose Target Node --</option>
        {nodes.map(node => (
          <option key={node.id} value={node.id}>
            {node.title || 'Untitled Step'}
          </option>
        ))}
      </select>
    </div>
  );

  if (!selectedNodeId && nodes.length > 0) {
    return (
      <div className="h-full flex flex-col p-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
           <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Process Intelligence</h2>
           <StepSelector />
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-4 bg-white rounded-2xl border border-dashed border-slate-200 shadow-inner">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 mb-2">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-600">Select Step to Analyze</p>
            <p className="text-sm max-w-xs mx-auto">The system will automatically link upstream dependencies to ensure cross-process consistency.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentInsights = selectedNodeId ? insightsMap[selectedNodeId] : null;

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-auto bg-slate-50/50">
      <div className="flex items-center justify-between border-b pb-4 sticky top-0 bg-white/80 backdrop-blur-md z-10 p-4 rounded-t-2xl">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Intelligence Mapping</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black uppercase">Active Pipeline</span>
            <p className="text-indigo-600 text-xs font-bold uppercase">{currentNode?.title}</p>
            <span className="text-[10px] text-slate-400 font-bold ml-2">Language: {settings.language}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <StepSelector />
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !selectedNodeId}
            className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black hover:bg-black disabled:opacity-50 flex items-center gap-3 transition-all shadow-xl active:scale-95 group"
          >
            {isAnalyzing ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <>
                <svg className="w-5 h-5 text-indigo-400 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                DEEP ANALYSIS
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10 px-4">
        {/* Left Column: Data Input */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-3 text-slate-800 text-lg">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
                Step Data Assets
              </h3>
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border rounded-full">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Context Ready</span>
              </div>
            </div>

            {/* Tasks Preview */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Task Slots</p>
              <div className="flex flex-wrap gap-2">
                {currentNode?.slots.map(slot => (
                  <span key={slot.id} className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                    {slot.label}
                  </span>
                ))}
                {currentNode?.slots.length === 0 && <span className="text-xs italic text-slate-400">No tasks defined in editor.</span>}
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Process Notes & Requirements</p>
              <textarea 
                value={currentDraft.inputText}
                onChange={(e) => updateDraftText(e.target.value)}
                placeholder={`Provide specific instructions for ${currentNode?.title}...`}
                className="w-full h-40 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all resize-none outline-none font-medium placeholder:text-slate-300"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference Knowledge Links</p>
              
              {currentDraft.links && currentDraft.links.length > 0 && (
                <div className="flex flex-col gap-2 mb-2">
                  {currentDraft.links.map((link, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                           </div>
                           <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-slate-600 truncate hover:text-blue-600 hover:underline">{link}</a>
                        </div>
                        <button 
                          onClick={() => removeLink(idx)}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Remove Link"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <input 
                  type="text"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLink()}
                  placeholder="Paste URL..."
                  className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-400 transition-all"
                />
                <button 
                  onClick={addLink}
                  className="px-6 py-3 bg-slate-900 text-white text-xs font-black rounded-2xl hover:bg-black transition-colors"
                >
                  ADD LINK
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Milestone Documents</p>
              
              {/* File List Display */}
              {currentDraft.files && currentDraft.files.length > 0 && (
                <div className="flex flex-col gap-2 mb-3">
                  {currentDraft.files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-700 truncate">{file.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{formatFileSize(file.size)}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFile(idx)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete File"
                      >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-2 border-dashed border-slate-200 rounded-[24px] p-8 text-center hover:bg-slate-50 hover:border-indigo-300 transition-all cursor-pointer relative group">
                <input type="file" multiple onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors">
                    <svg className="w-6 h-6 text-slate-300 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  </div>
                  <p className="text-sm font-bold text-slate-600">Drop Blueprints Here</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Max Size: 50MB</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Output */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm min-h-[600px] flex flex-col">
            <h3 className="font-bold mb-8 flex items-center gap-3 text-slate-800 text-lg">
               <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              Intelligent Synthesis
            </h3>
            
            {!lastResponseText && !currentInsights ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-slate-50 border-t-indigo-400 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-indigo-400 rounded-full animate-ping"></div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-slate-500 uppercase tracking-widest">Awaiting Analysis Signal</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed italic">Click "Deep Analysis" to generate the validated strategy and resource map.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Weight Dashboard */}
                <div className="bg-slate-900 text-white p-6 rounded-[24px] shadow-2xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Comparison Alignment Weight</p>
                      <h4 className="text-5xl font-black text-white tracking-tighter">
                        {currentInsights?.comparison_weight?.toFixed(2) || "0.00"}
                        <span className="text-slate-500 text-xl font-bold ml-1">/ 3.0</span>
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Status</p>
                      <p className="text-sm font-black uppercase tracking-tighter">
                        {(currentInsights?.comparison_weight || 0) > 2 ? 'High Alignment' : 'Gap Detected'}
                      </p>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-1000" style={{ width: `${((currentInsights?.comparison_weight || 0) / 3) * 100}%` }}></div>
                  </div>
                </div>

                {/* Resource List */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identified Resource Stack</p>
                  <div className="grid grid-cols-1 gap-3">
                    {currentInsights?.resources.map((res: Resource, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl group hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-600 font-black text-xs">
                             {res.type.substring(0, 1)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800">{res.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{res.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-900">{formatCost(res.cost)}</p>
                          <p className={`text-[8px] font-black uppercase ${res.available ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {res.available ? 'Available' : 'Restricted'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generated Execution Strategy</p>
                  <div className="bg-slate-50 border border-slate-100 p-6 rounded-[24px] text-slate-700 text-sm leading-relaxed font-medium">
                    {currentInsights?.summary.split('\n').map((line, i) => (
                      <p key={i} className="mb-4 last:mb-0">{line}</p>
                    ))}
                  </div>
                </div>

                {currentLinks.length > 0 && (
                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Grounding Evidence</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {currentLinks.map((link, i) => (
                        <a 
                          key={i} 
                          href={link.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-300 hover:shadow-lg transition-all text-slate-800 group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <span className="text-[10px] font-black truncate block uppercase tracking-tighter">{link.title || link.uri}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
