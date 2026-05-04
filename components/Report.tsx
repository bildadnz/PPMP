
import React, { useState, useEffect } from 'react';
import { ProcessNode, Connection, NodeInsights, GroundingLink } from '../types';
import { generateGlobalStrategy } from '../services/geminiService';
import { AppSettings } from '../App';

interface ReportProps {
  nodes: ProcessNode[];
  connections: Connection[];
  insightsMap: Record<string, NodeInsights>;
  nodeDrafts: Record<string, any>;
  projectTitle: string;
  formatCost: (amount: number) => string;
  settings: AppSettings;
}

const Report: React.FC<ReportProps> = ({ nodes, connections, insightsMap, nodeDrafts, projectTitle, formatCost, settings }) => {
  const [globalStrategy, setGlobalStrategy] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const totalCost = Object.values(insightsMap).reduce((sum: number, ins: NodeInsights) => 
    sum + ins.resources.reduce((s, r) => s + r.cost, 0), 0
  );

  const allLinks = Object.values(insightsMap)
    .flatMap(ins => ins.links || [])
    .filter((link, index, self) => 
      index === self.findIndex((t) => t.uri === link.uri)
    );

  const totalValidated = nodes.filter(n => n.status === 'success').length;
  const readinessPercentage = Math.round((totalValidated / nodes.length) * 100) || 0;

  const handleDownloadReport = () => {
    const reportElement = document.getElementById('report-container');
    if (!reportElement) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${projectTitle} - Process Report</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; background-color: #f8fafc; }
          .print-break { page-break-before: always; }
          @media print {
            body { background: white !important; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="max-w-5xl mx-auto bg-white p-12 shadow-none border-none">
          ${reportElement.innerHTML}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSynthesize = async () => {
    setIsGenerating(true);
    const strategy = await generateGlobalStrategy(projectTitle, nodes, connections, insightsMap, settings.language);
    setGlobalStrategy(strategy);
    setIsGenerating(false);
  };

  return (
    <div className="h-full bg-slate-50 overflow-auto py-8 px-4 print:p-0 print:bg-white">
      <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleDownloadReport}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black hover:bg-black shadow-xl flex items-center gap-3 transition-all active:scale-95"
            title="Download Full Report as HTML"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            DOWNLOAD REPORT
          </button>
          <div className="w-[1px] h-8 bg-slate-300 mx-2"></div>
          <button 
            onClick={handleSynthesize}
            disabled={isGenerating}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 shadow-xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? 'Synthesizing...' : 'GENERATE FULL STRATEGY'}
          </button>
        </div>
      </div>

      <div id="report-container" className="h-auto p-12 bg-white overflow-visible max-w-5xl mx-auto shadow-2xl border-x border-slate-100 print:shadow-none print:border-none print:m-0 print:p-8">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body { background: white !important; }
            .print-break { page-break-before: always; }
            ::-webkit-scrollbar { display: none; }
            main { padding: 0 !important; }
            header, nav, aside { display: none !important; }
          }
        `}} />

        <div className="border-b-[12px] border-slate-900 pb-12 mb-12 flex justify-between items-end">
          <div>
            <div className="inline-block px-4 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.4em] mb-6 rounded-sm">
              Official Process Architecture Blueprint
            </div>
            <h1 
              className="font-black text-slate-900 tracking-tighter leading-none mb-3"
              style={{ fontSize: `${settings.titleFontSize}px` }}
            >
              {projectTitle}
            </h1>
            <p className="text-slate-400 font-bold uppercase text-[11px] tracking-widest flex items-center gap-3">
              Config-ID: {Math.random().toString(36).substr(2, 9).toUpperCase()} 
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
              Readiness: {readinessPercentage}% Verified
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
              Language: {settings.language}
            </p>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl mb-6 flex items-center justify-center font-black text-4xl text-slate-200 border-2 border-slate-100 shadow-inner">PP</div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
              Status: Final Version<br/>
              Timestamp: {new Date().toLocaleString()}
            </p>
          </div>
        </div>

        {/* Global Synthesis Section */}
        {globalStrategy && (
          <section className="mb-20 p-10 bg-blue-950 text-white rounded-[40px] border-8 border-slate-900 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full -mr-48 -mt-48 blur-3xl"></div>
            <h3 
              className="font-black mb-8 flex items-center gap-4"
              style={{ fontSize: `${settings.headingFontSize}px` }}
            >
               <span className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center text-xl italic shadow-lg rotate-6">S</span>
               FULL EXECUTION STRATEGY
            </h3>
            <div 
              className="prose prose-invert prose-slate max-w-none text-blue-100 leading-loose"
              style={{ fontSize: `${settings.textFontSize}px` }}
            >
              <div className="whitespace-pre-wrap">{globalStrategy}</div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-4 gap-6 mb-16">
          <div className="p-8 bg-slate-50 border-2 border-slate-900 rounded-3xl shadow-[6px_6px_0px_rgba(15,23,42,1)]">
            <p className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-widest">Process Nodes</p>
            <p className="text-5xl font-black text-slate-900">{nodes.length}</p>
          </div>
          <div className="p-8 bg-blue-600 border-2 border-slate-900 rounded-3xl shadow-[6px_6px_0px_rgba(15,23,42,1)]">
            <p className="text-[10px] text-blue-200 font-black uppercase mb-1 tracking-widest">Total Budget</p>
            <p className="text-5xl font-black text-white">{formatCost(totalCost)}</p>
          </div>
          <div className="p-8 bg-emerald-500 border-2 border-slate-900 rounded-3xl shadow-[6px_6px_0px_rgba(15,23,42,1)]">
            <p className="text-[10px] text-emerald-100 font-black uppercase mb-1 tracking-widest">Validated</p>
            <p className="text-5xl font-black text-white">{totalValidated}</p>
          </div>
          <div className="p-8 bg-amber-400 border-2 border-slate-900 rounded-3xl shadow-[6px_6px_0px_rgba(15,23,42,1)]">
            <p className="text-[10px] text-amber-900 font-black uppercase mb-1 tracking-widest">Connections</p>
            <p className="text-5xl font-black text-amber-950">{connections.length}</p>
          </div>
        </div>

        <div className="space-y-24">
          <section>
            <div className="flex items-center gap-6 mb-12">
               <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center text-2xl font-black shadow-xl rotate-3">01</div>
               <div>
                 <h3 
                   className="font-black text-slate-900 tracking-tighter uppercase"
                   style={{ fontSize: `${settings.headingFontSize}px` }}
                 >
                   Milestone Data Matrix
                 </h3>
                 <p className="text-sm text-slate-400 font-bold uppercase tracking-widest italic">Node Intelligence, Input Validation & Weight Analysis</p>
               </div>
            </div>

            <div className="space-y-20">
              {nodes.map((node, nodeIdx) => {
                const insights = insightsMap[node.id];
                const draft = nodeDrafts[node.id];
                const incoming = connections.filter(c => c.targetNodeId === node.id);
                const isValidated = node.status === 'success';

                return (
                  <div key={node.id} className={`relative group ${nodeIdx > 0 && nodeIdx % 2 === 0 ? 'print-break' : ''}`}>
                    <div className="absolute -left-6 top-0 bottom-0 w-1.5 bg-slate-100 group-hover:bg-blue-100 transition-colors rounded-full"></div>
                    
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <h4 
                          className="font-black text-slate-800 tracking-tighter uppercase mb-2"
                          style={{ fontSize: `${settings.headingFontSize + 4}px` }}
                        >
                          {node.title}
                        </h4>
                        <div className="flex items-center gap-4">
                           <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border-2 ${
                             isValidated ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                           }`}>
                             {isValidated ? 'Validated' : 'Failed Integrity'}
                           </span>
                           <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-black uppercase">Weight:</span>
                              <span className={`text-xs font-black ${ (insights?.comparison_weight || 0) >= 1.5 ? 'text-emerald-600' : 'text-red-500' }`}>
                                {insights?.comparison_weight?.toFixed(2) || '0.00'}
                              </span>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="pl-6 border-l-4 border-slate-50 space-y-10 ml-2">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                        <div className="md:col-span-5 space-y-8">
                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Task Slots</p>
                            <div className="flex flex-wrap gap-2">
                              {node.slots.map(s => (
                                <span key={s.id} className="px-2 py-1 bg-slate-50 text-slate-500 text-[9px] font-bold rounded border border-slate-200">{s.label}</span>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Input Data Captured</p>
                            <div 
                              className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-600 leading-relaxed italic"
                              style={{ fontSize: `${settings.textFontSize}px` }}
                            >
                              {draft?.inputText || "No textual data provided for this milestone."}
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-7 space-y-8">
                          {insights ? (
                            <div className="space-y-8">
                              <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                   <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span> 
                                   Execution Strategy Summary
                                </p>
                                <div 
                                  className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-700 leading-loose"
                                  style={{ fontSize: `${settings.textFontSize}px` }}
                                >
                                  {insights.summary}
                                </div>
                              </div>

                              <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                   <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> 
                                   Verified Resource Requirements
                                </p>
                                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-slate-50/50">
                                  <table className="w-full text-left border-collapse" style={{ fontSize: `${settings.textFontSize - 1}px` }}>
                                    <thead>
                                      <tr className="bg-white border-b border-slate-200">
                                        <th className="py-3 px-4 font-black uppercase text-slate-400">Resource Asset</th>
                                        <th className="py-3 px-4 font-black uppercase text-slate-400 text-right">Est. Budget</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {insights.resources.map((r, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 hover:bg-white transition-colors">
                                          <td className="py-3 px-4 font-bold text-slate-700">{r.name}</td>
                                          <td className="py-3 px-4 text-right font-black text-slate-900">{formatCost(r.cost)}</td>
                                        </tr>
                                      ))}
                                      <tr className="bg-slate-900 text-white">
                                        <td className="py-2.5 px-4 font-black uppercase text-[9px] tracking-widest">Aggregate Cost</td>
                                        <td className="py-2.5 px-4 text-right font-black text-emerald-400 text-sm italic">
                                          {formatCost(insights.resources.reduce((s, r) => s + r.cost, 0))}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 opacity-60">
                               <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Intelligence Synthesis Missing</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="mt-40 pt-16 border-t-2 border-slate-100 text-center space-y-6 pb-12">
          <div className="flex justify-center gap-6">
             {[1,2,3,4].map(i => <div key={i} className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-slate-900' : 'bg-slate-100'}`}></div>)}
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.6em] mb-2">END OF DOCUMENT — CONFIDENTIAL PROCESS BLUEPRINT</p>
            <p className="text-[8px] text-slate-300 font-bold uppercase">System Auth ID: PPMP_V6_RELATIONAL_SYNTHESIS</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;
