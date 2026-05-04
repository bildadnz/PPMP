
import React from 'react';
import { PageView } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activePage: PageView;
  setActivePage: (page: PageView) => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  onResetProject: () => void;
  onOpenSettings?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  activePage, 
  setActivePage,
  onSaveProject,
  onLoadProject,
  onResetProject,
  onOpenSettings
}) => {
  const menuItems = [
    { id: 'editor' as PageView, label: 'Design Editor', icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z' },
    { id: 'insights' as PageView, label: 'Data Insights', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    { id: 'simulation' as PageView, label: 'Simulation', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' },
    { id: 'report' as PageView, label: 'Process Report', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  ];

  return (
    <div 
      className={`bg-slate-900 text-white h-screen transition-all duration-300 ease-in-out border-r border-slate-700 flex flex-col ${isOpen ? 'w-64' : 'w-0 overflow-hidden'}`}
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20">
            P
          </div>
          <span className="font-bold text-lg tracking-tight whitespace-nowrap">Process Master</span>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activePage === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="font-medium whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-4">
        <div className="p-4 bg-slate-800 rounded-xl space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Project Files</p>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={onResetProject}
              className="flex-1 flex flex-col items-center justify-center p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors group"
              title="Start New Project"
            >
              <svg className="w-6 h-6 text-white mb-1 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] font-bold">New</span>
            </button>
            <button 
              type="button"
              onClick={onSaveProject}
              className="flex-1 flex flex-col items-center justify-center p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors group"
              title="Save Project Data as JSON"
            >
              <svg className="w-6 h-6 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span className="text-[10px] font-bold">Save</span>
            </button>
            <button 
              type="button"
              onClick={onLoadProject}
              className="flex-1 flex flex-col items-center justify-center p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors group"
              title="Load Project Data"
            >
              <svg className="w-6 h-6 text-blue-400 mb-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="text-[10px] font-bold">Load</span>
            </button>
          </div>
        </div>
        
        <button 
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-medium whitespace-nowrap">Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
