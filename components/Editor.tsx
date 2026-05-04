
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ProcessNode, Connection, SlotType, ConnectionType } from '../types';

interface EditorProps {
  nodes: ProcessNode[];
  connections: Connection[];
  onAddNode: (x?: number, y?: number, layer?: number) => void;
  onUpdateNode: (id: string, updates: Partial<ProcessNode>) => void;
  onDeleteNode: (id: string) => void;
  onAddConnection: (conn: Connection) => void;
  onUpdateConnection: (id: string, updates: Partial<Connection>) => void;
  onDeleteConnection: (id: string) => void;
  projectTitle: string;
  setProjectTitle: (val: string) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
}

const COLORS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Blue', value: '#eff6ff' },
  { name: 'Green', value: '#f0fdf4' },
  { name: 'Amber', value: '#fffbeb' },
  { name: 'Red', value: '#fef2f2' },
  { name: 'Slate', value: '#f8fafc' },
];

const CONNECTION_TYPES: { label: string, value: ConnectionType, color: string, dash?: string }[] = [
  { label: 'Dependency', value: 'dependency', color: '#64748b' },
  { label: 'Data Flow', value: 'data-flow', color: '#3b82f6' },
  { label: 'Resource Flow', value: 'resource-flow', color: '#10b981', dash: '5,5' },
  { label: 'Informational', value: 'informational', color: '#f59e0b', dash: '2,2' },
];

const Editor: React.FC<EditorProps> = ({ 
  nodes, connections, onAddNode, onUpdateNode, onDeleteNode, onAddConnection, 
  onUpdateConnection, onDeleteConnection,
  projectTitle, setProjectTitle, selectedNodeId, setSelectedNodeId,
  onSaveProject, onLoadProject
}) => {
  const [isConnecting, setIsConnecting] = useState<{ nodeId: string, slotId: string } | null>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<{ x: number, y: number, nodeId: string } | null>(null);
  const [lineContextMenu, setLineContextMenu] = useState<{ x: number, y: number, connId: string } | null>(null);
  const [slotContextMenu, setSlotContextMenu] = useState<{ x: number, y: number, nodeId: string, slotId: string } | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeMenus = () => {
      setNodeContextMenu(null);
      setLineContextMenu(null);
      setSlotContextMenu(null);
    };
    window.addEventListener('click', closeMenus);
    return () => window.removeEventListener('click', closeMenus);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNodeId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scrollX = canvasRef.current.scrollLeft;
      const scrollY = canvasRef.current.scrollTop;
      const x = e.clientX - rect.left + scrollX - dragOffset.current.x;
      const y = e.clientY - rect.top + scrollY - dragOffset.current.y;
      const layer = Math.floor(y / 200);
      onUpdateNode(draggingNodeId, { x, y, layer });
    }
  }, [draggingNodeId, onUpdateNode]);

  const handleMouseUp = () => setDraggingNodeId(null);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return; 
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDraggingNodeId(nodeId);
      setSelectedNodeId(nodeId);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const handleNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLineContextMenu(null);
    setSlotContextMenu(null);
    setNodeContextMenu({ x: e.clientX, y: e.clientY, nodeId });
  };

  const handleSlotContextMenu = (e: React.MouseEvent, nodeId: string, slotId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setNodeContextMenu(null);
    setLineContextMenu(null);
    setSlotContextMenu({ x: e.clientX, y: e.clientY, nodeId, slotId });
  };

  const handleLineContextMenu = (e: React.MouseEvent, connId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setNodeContextMenu(null);
    setSlotContextMenu(null);
    setLineContextMenu({ x: e.clientX, y: e.clientY, connId });
  };

  const handleSlotClick = (e: React.MouseEvent, nodeId: string, slotId: string) => {
    e.stopPropagation();
    if (!isConnecting) {
      setIsConnecting({ nodeId, slotId });
    } else {
      if (isConnecting.nodeId !== nodeId) {
        onAddConnection({
          id: Math.random().toString(36).substr(2, 9),
          sourceNodeId: isConnecting.nodeId,
          sourceSlotId: isConnecting.slotId,
          targetNodeId: nodeId,
          targetSlotId: slotId,
          biDirectional: false,
          type: 'dependency'
        });
      }
      setIsConnecting(null);
    }
  };

  const addSlot = (nodeId: string, type: SlotType) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      onUpdateNode(nodeId, {
        slots: [...node.slots, { id: Math.random().toString(36).substr(2, 9), label: `New ${type}`, type }]
      });
    }
  };

  const deleteSlot = (nodeId: string, slotId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      // 1. Remove connections involving this slot
      connections
        .filter(c => (c.sourceNodeId === nodeId && c.sourceSlotId === slotId) || (c.targetNodeId === nodeId && c.targetSlotId === slotId))
        .forEach(c => onDeleteConnection(c.id));
      
      // 2. Remove the slot from the node
      onUpdateNode(nodeId, {
        slots: node.slots.filter(s => s.id !== slotId)
      });
    }
    setSlotContextMenu(null);
  };

  const activeContextNode = nodes.find(n => n.id === nodeContextMenu?.nodeId);
  const activeContextConn = connections.find(c => c.id === lineContextMenu?.connId);

  // PRECISE UI DIMENSIONS FOR SLOT CENTER CALCULATION
  const HEADER_H = 37;
  const PADDING_T = 12; // from p-3
  const TEXTAREA_H = 48; // from h-12
  const GAP_S = 8; // from space-y-2
  const SLOT_H = 20; // from h-5
  const DOT_CENTER = 3; // vertical center of a 20px slot

  const BASE_Y_OFFSET = HEADER_H + PADDING_T + TEXTAREA_H + GAP_S + DOT_CENTER;

  return (
    <div className="flex flex-col h-full select-none" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <div className="bg-white border-b border-slate-200 p-2 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 border-r pr-4">
            <input 
              type="text" 
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10" onClick={() => onAddNode(200, 100 + (nodes.length * 40))}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              New Process Step
            </button>
            <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>
            <button className="p-2 hover:bg-slate-100 rounded text-slate-600 font-bold">B</button>
            <button className="p-2 hover:bg-slate-100 rounded text-slate-600 italic">I</button>
          </div>
        </div>
        <div className="flex items-center gap-3 pr-4">
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
             <button 
               onClick={onSaveProject}
               className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" 
               title="Save Process Data (JSON)"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
             </button>
             <button 
               onClick={onLoadProject}
               className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" 
               title="Load Process Plan"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
             </button>
          </div>
           <button onClick={onSaveProject} className="text-xs text-slate-400 font-medium hover:text-slate-600">Export Blueprint</button>
        </div>
      </div>

      <div 
        ref={canvasRef}
        className="flex-1 relative bg-slate-100 overflow-auto canvas-grid"
        style={{
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      >
        <div style={{ minWidth: 4000, minHeight: 4000, position: 'relative' }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="absolute w-full border-b border-slate-300 pointer-events-none" style={{ top: i * 200, height: 200 }}>
              <span className="absolute left-4 top-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">PROCESS PHASE {i + 1}</span>
            </div>
          ))}

          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              {CONNECTION_TYPES.map(ct => (
                <marker key={ct.value} id={`arrow-${ct.value}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill={ct.color} />
                </marker>
              ))}
            </defs>
            {connections.map(conn => {
              const srcNode = nodes.find(n => n.id === conn.sourceNodeId);
              const trgNode = nodes.find(n => n.id === conn.targetNodeId);
              if (!srcNode || !trgNode) return null;
              
              const srcSlotIdx = srcNode.slots.findIndex(s => s.id === conn.sourceSlotId);
              const trgSlotIdx = trgNode.slots.findIndex(s => s.id === conn.targetSlotId);

              // X: Right/Left edges adjusted for dot position (20px in from border)
              const x1 = srcNode.x + srcNode.width - 20; 
              const y1 = srcNode.y + BASE_Y_OFFSET + (srcSlotIdx * SLOT_H);
              
              const x2 = trgNode.x + 20;
              const y2 = trgNode.y + BASE_Y_OFFSET + (trgSlotIdx * SLOT_H);

              const connType = CONNECTION_TYPES.find(ct => ct.value === conn.type) || CONNECTION_TYPES[0];

              return (
                <g key={conn.id}>
                  <path 
                    d={`M ${x1} ${y1} C ${x1 + 80} ${y1}, ${x2 - 80} ${y2}, ${x2} ${y2}`}
                    stroke={connType.color}
                    strokeWidth="3"
                    strokeDasharray={connType.dash || '0'}
                    fill="none"
                    markerEnd={`url(#arrow-${connType.value})`}
                    className="pointer-events-auto cursor-pointer hover:stroke-blue-400 transition-colors"
                    onContextMenu={(e) => handleLineContextMenu(e, conn.id)}
                  />
                </g>
              );
            })}
          </svg>

          {nodes.map(node => (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
              className={`absolute rounded-xl border-2 shadow-sm flex flex-col cursor-move transition-shadow select-none ${selectedNodeId === node.id ? 'border-blue-500 ring-4 ring-blue-500/10 z-20' : 'border-slate-300 hover:border-slate-400 z-10'}`}
              style={{ 
                left: node.x, 
                top: node.y, 
                width: node.width,
                minHeight: node.height,
                backgroundColor: node.color || '#ffffff'
              }}
            >
              <div className="bg-white/50 backdrop-blur-sm border-b border-slate-200 px-3 py-2 flex items-center justify-between rounded-t-xl h-[37px]">
                <input 
                  className="font-bold text-sm bg-transparent w-full focus:outline-none"
                  value={node.title}
                  onChange={(e) => onUpdateNode(node.id, { title: e.target.value })}
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <button 
                  onClick={(e) => { e.stopPropagation(); addSlot(node.id, 'task'); }}
                  className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-500"
                >
                  <span className="text-xs">+</span>
                </button>
              </div>

              <div className="p-3 space-y-2">
                <textarea 
                  className="text-[11px] text-slate-600 w-full resize-none h-12 border-none bg-transparent focus:outline-none placeholder:italic"
                  placeholder="Describe step purpose..."
                  value={node.description}
                  onChange={(e) => onUpdateNode(node.id, { description: e.target.value })}
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <div className="space-y-0">
                  {node.slots.map(slot => (
                    <div 
                      key={slot.id} 
                      className="flex items-center justify-between text-[11px] h-5 relative group"
                      onMouseDown={(e) => e.stopPropagation()}
                      onContextMenu={(e) => handleSlotContextMenu(e, node.id, slot.id)}
                    >
                      <div className="flex items-center gap-2 overflow-hidden flex-1 pr-4">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${slot.type === 'task' ? 'bg-blue-400' : slot.type === 'decision' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                        <input 
                          className="bg-transparent hover:bg-white/60 focus:bg-white rounded px-1 outline-none w-full truncate"
                          value={slot.label}
                          onChange={(e) => {
                            const newSlots = node.slots.map(s => s.id === slot.id ? { ...s, label: e.target.value } : s);
                            onUpdateNode(node.id, { slots: newSlots });
                          }}
                        />
                      </div>
                      <button 
                        onClick={(e) => handleSlotClick(e, node.id, slot.id)}
                        className={`w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center transition-all ${isConnecting?.slotId === slot.id ? 'bg-blue-500 border-blue-500 scale-150 shadow-lg' : 'bg-white hover:bg-blue-50 hover:scale-110'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${isConnecting?.slotId === slot.id ? 'bg-white' : 'bg-slate-300'}`}></div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {nodeContextMenu && activeContextNode && (
          <div className="fixed z-50 bg-white border border-slate-200 shadow-2xl rounded-xl p-4 w-64 space-y-4" style={{ left: nodeContextMenu.x, top: nodeContextMenu.y }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center"><span className="text-xs font-black text-slate-400 uppercase">Edit Box</span><button onClick={() => setNodeContextMenu(null)}>×</button></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold">Width</span><input type="number" className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs" value={activeContextNode.width} onChange={(e) => onUpdateNode(activeContextNode.id, { width: parseInt(e.target.value) || 200 })} /></div>
              <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold">Height</span><input type="number" className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs" value={activeContextNode.height} onChange={(e) => onUpdateNode(activeContextNode.id, { height: parseInt(e.target.value) || 100 })} /></div>
            </div>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => <button key={c.value} onClick={() => onUpdateNode(activeContextNode.id, { color: c.value })} className={`w-6 h-6 rounded-full border transition-all ${activeContextNode.color === c.value ? 'ring-2 ring-blue-500 ring-offset-1 scale-110 shadow-md' : 'hover:scale-105'}`} style={{ backgroundColor: c.value }} />)}
            </div>
            <button onClick={() => { onDeleteNode(activeContextNode.id); setNodeContextMenu(null); }} className="w-full bg-red-50 text-red-600 text-xs py-2 rounded-lg font-bold hover:bg-red-100 transition-colors">Delete Step</button>
          </div>
        )}

        {slotContextMenu && (
          <div className="fixed z-50 bg-white border border-slate-200 shadow-2xl rounded-xl p-2 w-48 space-y-1" style={{ left: slotContextMenu.x, top: slotContextMenu.y }} onClick={(e) => e.stopPropagation()}>
            <div className="px-2 py-1 flex justify-between items-center mb-1">
              <span className="text-[10px] font-black text-slate-400 uppercase">Task Action</span>
              <button onClick={() => setSlotContextMenu(null)} className="text-slate-400">×</button>
            </div>
            <button 
              onClick={() => deleteSlot(slotContextMenu.nodeId, slotContextMenu.slotId)}
              className="w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 hover:bg-red-50 text-red-600 transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete Task
            </button>
          </div>
        )}

        {lineContextMenu && activeContextConn && (
          <div className="fixed z-50 bg-white border border-slate-200 shadow-2xl rounded-xl p-4 w-56 space-y-3" style={{ left: lineContextMenu.x, top: lineContextMenu.y }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center text-xs font-black text-slate-400 uppercase tracking-tighter">Connection Type</div>
            <div className="space-y-1">
              {CONNECTION_TYPES.map(ct => (
                <button 
                  key={ct.value}
                  onClick={() => { onUpdateConnection(activeContextConn.id, { type: ct.value }); setLineContextMenu(null); }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 hover:bg-slate-50 transition-colors ${activeContextConn.type === ct.value ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'}`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ct.color }}></div>
                  {ct.label}
                </button>
              ))}
            </div>
            <div className="border-t pt-2 mt-2">
              <button onClick={() => { onDeleteConnection(activeContextConn.id); setLineContextMenu(null); }} className="w-full bg-slate-50 text-slate-600 text-[11px] py-2 rounded-lg font-bold hover:bg-red-50 hover:text-red-600 transition-colors">Delete Relationship</button>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-3 bg-white border-t flex justify-between items-center text-xs text-slate-500 z-10">
        <div className="flex gap-4">
          {CONNECTION_TYPES.map(ct => (
            <div key={ct.value} className="flex items-center gap-1">
              <div className="w-3 h-[3px] rounded-full" style={{ backgroundColor: ct.color }}></div> {ct.label}
            </div>
          ))}
        </div>
        <p className="font-medium italic">Right-click steps, tasks, or lines to manage your process architecture • Use the canvas scrollbars to navigate</p>
      </div>
    </div>
  );
};

export default Editor;
