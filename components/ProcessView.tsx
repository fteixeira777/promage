
import React, { useState } from 'react';
import ProcessPlanning from './ProcessPlanning';
import TasksView from './TasksView';
import { 
  Plus, 
  MoreHorizontal, 
  Filter, 
  Sparkles,
  CheckCircle2,
  Clock,
  Briefcase,
  X,
  FileText,
  FolderOpen,
  Users,
  Building2,
  ChevronRight,
  Folder,
  File,
  Receipt,
  Trash2,
  ArrowLeft,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { getAIProjectOpinion } from '../services/geminiService';
import { Process, Client, Phase, Subcontract, Expense, ProcessDocument, FinancialTransaction, Task, TeamMember } from '../types';

interface ProcessViewProps {
  processes: Process[];
  setProcesses: React.Dispatch<React.SetStateAction<Process[]>>;
  clients: Client[];
  activeSubmenu: string;
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  team: TeamMember[];
  initialTab?: 'Fases' | 'Tarefas';
}

const ProcessView: React.FC<ProcessViewProps> = ({ processes, setProcesses, clients, activeSubmenu, setTransactions, tasks, setTasks, team, initialTab = 'Fases' }) => {
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [activeTab, setActiveTab] = useState<'Fases' | 'Tarefas' | 'Subcontratos' | 'Documentos' | 'Despesas'>(initialTab);
  const [currentDocFolder, setCurrentDocFolder] = useState<string | null>(null);
  const [currentDocSubFolder, setCurrentDocSubFolder] = useState<string | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSubcontractModalOpen, setIsSubcontractModalOpen] = useState(false);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [isProcessEditModalOpen, setIsProcessEditModalOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [newExpense, setNewExpense] = useState({ description: '', value: 0 });
  const [newSubcontract, setNewSubcontract] = useState({ companyName: '', service: '', value: 0, phaseId: '' });

  React.useEffect(() => {
    const process = processes.find(p => p.code === activeSubmenu);
    if (process) {
      setSelectedProcess(process);
    } else {
      setSelectedProcess(null);
    }
  }, [activeSubmenu, processes]);

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || '---';

  const filteredProcesses = processes.filter(p => {
    if (activeSubmenu === 'Documentação') return true;
    if (p.code === activeSubmenu) return true;
    return p.status === activeSubmenu;
  });

  const handleEditPhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcess || !editingPhase) return;

    const updatedPhases = selectedProcess.phases.map(p => 
      p.id === editingPhase.id ? editingPhase : p
    );

    const updatedProcess = {
      ...selectedProcess,
      phases: updatedPhases,
      // Recalcular budget se o pricingMode for PHASES
      budget: selectedProcess.pricingMode === 'PHASES' 
        ? updatedPhases.reduce((acc, p) => acc + p.value, 0)
        : selectedProcess.budget
    };

    setProcesses(processes.map(p => p.id === selectedProcess.id ? updatedProcess : p));
    setSelectedProcess(updatedProcess);
    setIsPhaseModalOpen(false);
    setEditingPhase(null);
  };

  const handleUpdateProcessStatus = () => {
    if (!selectedProcess) return;

    const statusOrder: Process['status'][] = ['Início', 'Projeto', 'Execução', 'Finalizado'];
    const currentIndex = statusOrder.indexOf(selectedProcess.status);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    const newStatus = statusOrder[nextIndex];

    const updatedProcess = {
      ...selectedProcess,
      status: newStatus
    };

    setProcesses(processes.map(p => p.id === selectedProcess.id ? updatedProcess : p));
    setSelectedProcess(updatedProcess);
  };

  const handleEditProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcess || !editingProcess) return;

    const updatedProcess = {
      ...editingProcess
    };

    setProcesses(processes.map(p => p.id === selectedProcess.id ? updatedProcess : p));
    setSelectedProcess(updatedProcess);
    setIsProcessEditModalOpen(false);
  };

  const handleAddSubcontract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcess || !newSubcontract.companyName || newSubcontract.value <= 0) return;

    const phase = selectedProcess.phases.find(p => p.id === newSubcontract.phaseId);
    
    const subcontract: Subcontract = {
      id: Math.random().toString(36).substr(2, 9),
      companyName: newSubcontract.companyName,
      service: newSubcontract.service,
      value: Number(newSubcontract.value),
      phases: phase ? [phase] : []
    };

    const updatedProcess = {
      ...selectedProcess,
      subcontracts: [...(selectedProcess.subcontracts || []), subcontract]
    };

    setProcesses(processes.map(p => p.id === selectedProcess.id ? updatedProcess : p));
    setSelectedProcess(updatedProcess);
    setIsSubcontractModalOpen(false);
    setNewSubcontract({ companyName: '', service: '', value: 0, phaseId: '' });


  };

  const removeSubcontract = (subId: string) => {
    if (!selectedProcess) return;
    const updatedProcess = {
      ...selectedProcess,
      subcontracts: selectedProcess.subcontracts.filter(s => s.id !== subId)
    };
    setProcesses(processes.map(p => p.id === selectedProcess.id ? updatedProcess : p));
    setSelectedProcess(updatedProcess);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcess || !newExpense.description || newExpense.value <= 0) return;

    const expense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      description: newExpense.description,
      value: Number(newExpense.value),
      date: new Date().toISOString().split('T')[0]
    };

    const updatedProcess = {
      ...selectedProcess,
      expenses: [...(selectedProcess.expenses || []), expense]
    };

    setProcesses(processes.map(p => p.id === selectedProcess.id ? updatedProcess : p));
    setSelectedProcess(updatedProcess);
    setIsExpenseModalOpen(false);
    setNewExpense({ description: '', value: 0 });

    // Adicionar transação financeira
    const client = clients.find(c => c.id === selectedProcess.clientId);
    const transaction: FinancialTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'EXPENSE',
      category: 'Projecto',
      description: `Despesa Processo: ${expense.description} (${selectedProcess.code})`,
      value: expense.value,
      date: expense.date,
      status: 'Pendente',
      entityName: client?.name || 'Fornecedor',
      frequency: 'Pontual'
    };
    setTransactions(prev => [transaction, ...prev]);
  };

  const removeExpense = (expenseId: string) => {
    if (!selectedProcess) return;
    const updatedProcess = {
      ...selectedProcess,
      expenses: selectedProcess.expenses.filter(e => e.id !== expenseId)
    };
    setProcesses(processes.map(p => p.id === selectedProcess.id ? updatedProcess : p));
    setSelectedProcess(updatedProcess);
  };

  const handleFileUpload = (category: string) => {
    if (!selectedProcess) return;
    
    // Simulação de upload
    const newDoc: ProcessDocument = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Documento_${Math.floor(Math.random() * 1000)}.pdf`,
      category: category,
      type: 'pdf',
      size: '1.2 MB',
      date: new Date().toISOString().split('T')[0]
    };

    const updatedProcess = {
      ...selectedProcess,
      documents: [...(selectedProcess.documents || []), newDoc]
    };

    setProcesses(processes.map(p => p.id === selectedProcess.id ? updatedProcess : p));
    setSelectedProcess(updatedProcess);
  };

  const removeDocument = (docId: string) => {
    if (!selectedProcess) return;
    const updatedProcess = {
      ...selectedProcess,
      documents: selectedProcess.documents.filter(d => d.id !== docId)
    };
    setProcesses(processes.map(p => p.id === selectedProcess.id ? updatedProcess : p));
    setSelectedProcess(updatedProcess);
  };

  if (selectedProcess) {
    const totalSubcontracts = selectedProcess.subcontracts?.reduce((acc, sub) => acc + sub.value, 0) || 0;
    const totalExpenses = selectedProcess.expenses?.reduce((acc, exp) => acc + exp.value, 0) || 0;
    const totalCosts = totalSubcontracts + totalExpenses;
    const margin = selectedProcess.budget - totalCosts;
    const marginPercent = selectedProcess.budget > 0 ? (margin / selectedProcess.budget) * 100 : 0;
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-4 text-gray-600 text-sm font-bold">
          <button onClick={() => setSelectedProcess(null)} className="hover:text-gray-900 transition-colors">Processos</button>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-gray-900 font-black">{selectedProcess.code} - {selectedProcess.title}</span>
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-gray-900">{selectedProcess.title}</h2>
            <p className="text-gray-700 font-bold">{getClientName(selectedProcess.clientId)} • Iniciado em {selectedProcess.startDate}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setEditingProcess(selectedProcess);
                setIsProcessEditModalOpen(true);
              }}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg"
            >
              Editar Detalhes
            </button>
            <button 
              onClick={handleUpdateProcessStatus}
              className="px-6 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
            >
              <Sparkles size={16} className="text-[#2D4E4E]" />
              Alterar Estado: <span className="text-[#2D4E4E]">{selectedProcess.status}</span>
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
          {['Fases', 'Tarefas', 'Subcontratos', 'Documentos', 'Despesas'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-4 whitespace-nowrap text-sm font-black transition-all relative ${activeTab === tab ? 'text-[#2D4E4E]' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {tab === 'Fases' ? 'Fases e pagamentos' : tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2D4E4E] rounded-t-full"></div>}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'Fases' && (
              <ProcessPlanning process={selectedProcess} tasks={tasks} onChange={updated => {
                setProcesses(prev => prev.map(p => p.id === updated.id ? updated : p));
                setSelectedProcess(updated);
              }} />
            )}

            {activeTab === 'Tarefas' && <TasksView processes={processes} tasks={tasks} setTasks={setTasks} team={team} processId={selectedProcess.id} />}

            {activeTab === 'Subcontratos' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">Empresas Subcontratadas</h3>
                  <button 
                    onClick={() => setIsSubcontractModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2D4E4E] text-white rounded-xl text-xs font-black hover:bg-black transition-all shadow-md"
                  >
                    <Plus size={14}/> Novo Subcontrato
                  </button>
                </div>
                {selectedProcess.subcontracts?.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-[2rem] border-2 border-dashed border-gray-200 text-gray-500 font-bold italic">
                    Nenhuma empresa subcontratada vinculada a este processo.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {selectedProcess.subcontracts?.map((sub) => (
                      <div key={sub.id} className="bg-white p-6 rounded-[2rem] border border-gray-200 flex items-center justify-between shadow-sm hover:border-gray-300 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl">
                            <Building2 size={24}/>
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900">{sub.companyName}</p>
                            <p className="text-xs text-gray-600 font-bold">{sub.service || 'Sem descrição'}</p>
                            {sub.phases.length > 0 && (
                              <p className="text-[10px] text-[#2D4E4E] font-black uppercase tracking-wider mt-1">
                                Fase: {sub.phases[0].name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm font-black text-gray-900">€{sub.value.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-500 font-black uppercase">{sub.phases.length > 0 ? 'Vinculado a Fase' : 'Global'}</p>
                          </div>
                          <button 
                            onClick={() => removeSubcontract(sub.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Documentos' && (
              <div className="space-y-6">
                {/* Breadcrumbs para navegação de pastas */}
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 mb-4">
                  <button 
                    onClick={() => { setCurrentDocFolder(null); setCurrentDocSubFolder(null); }}
                    className={`hover:text-[#2D4E4E] transition-colors ${!currentDocFolder ? 'text-[#2D4E4E]' : ''}`}
                  >
                    Documentos
                  </button>
                  {currentDocFolder && (
                    <>
                      <ChevronRight size={12} />
                      <button 
                        onClick={() => setCurrentDocSubFolder(null)}
                        className={`hover:text-[#2D4E4E] transition-colors ${!currentDocSubFolder ? 'text-[#2D4E4E]' : ''}`}
                      >
                        {currentDocFolder}
                      </button>
                    </>
                  )}
                  {currentDocSubFolder && (
                    <>
                      <ChevronRight size={12} />
                      <span className="text-[#2D4E4E]">{currentDocSubFolder}</span>
                    </>
                  )}
                </div>

                {!currentDocFolder && (
                  <div className="grid grid-cols-2 gap-6">
                    <FolderCard 
                      icon={<Folder size={40} className="text-yellow-600 fill-yellow-500"/>} 
                      title="Documentação" 
                      sub="Fotos, Requerente, Prédio..." 
                      onClick={() => setCurrentDocFolder('Documentação')}
                    />
                    <FolderCard 
                      icon={<Folder size={40} className="text-blue-600 fill-blue-500"/>} 
                      title="Projeto" 
                      sub="EP, Licenciamento, Execução" 
                      onClick={() => setCurrentDocFolder('Projeto')}
                    />
                  </div>
                )}

                {currentDocFolder === 'Documentação' && !currentDocSubFolder && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      'Fotos do local',
                      'Documentos do requerente',
                      'Documentos do prédio',
                      'Inspirações',
                      'Artigos / Produtos do cliente',
                      'Documentos de estudo'
                    ].map(sub => (
                      <FolderCard 
                        key={sub}
                        icon={<Folder size={32} className="text-yellow-600 fill-yellow-500/30"/>} 
                        title={sub} 
                        sub="Abrir pasta" 
                        onClick={() => setCurrentDocSubFolder(sub)}
                      />
                    ))}
                  </div>
                )}

                {currentDocFolder === 'Projeto' && !currentDocSubFolder && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      'Estudo Prévio (EP)',
                      'Licenciamento',
                      'Execução',
                      'Sketches',
                      'Objetos',
                      '3D',
                      'Procedimentos',
                      'Comunicações'
                    ].map(sub => (
                      <FolderCard 
                        key={sub}
                        icon={<Folder size={32} className="text-blue-600 fill-blue-500/30"/>} 
                        title={sub} 
                        sub="Abrir pasta" 
                        onClick={() => setCurrentDocSubFolder(sub)}
                      />
                    ))}
                  </div>
                )}

                {currentDocSubFolder && (
                  <div className="bg-white rounded-[2rem] border border-gray-200 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <div>
                        <h4 className="font-black text-gray-900">{currentDocSubFolder}</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          {selectedProcess.documents?.filter(d => d.category === currentDocSubFolder).length || 0} Ficheiros
                        </p>
                      </div>
                      <button 
                        onClick={() => handleFileUpload(currentDocSubFolder)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#2D4E4E] text-white rounded-xl text-xs font-black hover:bg-black transition-all shadow-md"
                      >
                        <Upload size={14}/> Carregar Ficheiro
                      </button>
                    </div>
                    <div className="p-4">
                      {selectedProcess.documents?.filter(d => d.category === currentDocSubFolder).length === 0 ? (
                        <div className="py-12 text-center text-gray-400 italic font-bold text-sm">
                          Esta pasta está vazia.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedProcess.documents?.filter(d => d.category === currentDocSubFolder).map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all group">
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                                  {doc.type === 'pdf' ? <FileText size={20} /> : <ImageIcon size={20} />}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-gray-900">{doc.name}</p>
                                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{doc.size} • {doc.date}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => removeDocument(doc.id)}
                                className="p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!currentDocSubFolder && (
                  <div className="bg-white p-8 rounded-[2rem] border border-gray-200">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Ficheiros Recentes</h4>
                    <div className="space-y-2">
                      {selectedProcess.documents?.slice(-3).reverse().map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-3.5 hover:bg-gray-100 rounded-xl cursor-pointer transition-all border border-transparent hover:border-gray-200">
                          <div className="flex items-center gap-3">
                            <File size={16} className="text-[#2D4E4E]"/>
                            <span className="text-xs font-bold text-gray-900">{doc.name}</span>
                          </div>
                          <span className="text-[10px] text-gray-600 font-bold">{doc.date}</span>
                        </div>
                      ))}
                      {(!selectedProcess.documents || selectedProcess.documents.length === 0) && (
                        <p className="text-xs text-gray-400 italic font-bold">Nenhum ficheiro carregado recentemente.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Despesas' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">Despesas do Processo</h3>
                  <button 
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2D4E4E] text-white rounded-xl text-xs font-black hover:bg-black transition-all shadow-md"
                  >
                    <Plus size={14}/> Adicionar Despesa
                  </button>
                </div>
                
                {selectedProcess.expenses?.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-[2rem] border-2 border-dashed border-gray-200 text-gray-500 font-bold italic">
                    Nenhuma despesa registada para este processo.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {selectedProcess.expenses?.map((exp) => (
                      <div key={exp.id} className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center justify-between shadow-sm hover:border-gray-300 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                            <Receipt size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900">{exp.description}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{exp.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <p className="text-sm font-black text-gray-900">€{exp.value.toLocaleString()}</p>
                          <button 
                            onClick={() => removeExpense(exp.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-[#2D4E4E] p-8 rounded-[2rem] text-white shadow-xl">
               <h3 className="font-black flex items-center gap-2 mb-6 text-sm uppercase tracking-widest"><Sparkles size={18} className="text-yellow-400"/> Resumo Financeiro</h3>
               <div className="space-y-4">
                  <div className="flex justify-between border-b border-white/20 pb-2.5">
                     <span className="text-xs text-gray-200 font-bold">Total Adjudicado</span>
                     <span className="text-sm font-black">€{selectedProcess.budget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/20 pb-2.5">
                     <span className="text-xs text-gray-200 font-bold">Custo Subcontratação</span>
                     <span className="text-sm font-black">€{totalSubcontracts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/20 pb-2.5">
                     <span className="text-xs text-gray-200 font-bold">Despesas Diretas</span>
                     <span className="text-sm font-black">€{totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                     <span className="text-sm font-black uppercase tracking-wider">Saldo após custos externos</span>
                     <span className={`text-2xl font-black ${marginPercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {marginPercent.toFixed(1)}%
                     </span>
                  </div>
                  <p className="text-xs text-gray-200">Não inclui horas da equipa, custos gerais ou impostos.</p>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gray-200 shadow-sm">
               <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest mb-6">Responsáveis pelas fases</h3>
               <div className="space-y-4">
                  {selectedProcess.phases.filter(p => p.responsible).map(phase => <div key={phase.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100"><p className="text-sm font-bold">{phase.responsible}</p><p className="text-xs text-gray-500">{phase.name}</p></div>)}
                  {!selectedProcess.phases.some(p => p.responsible) && <p className="text-sm text-gray-500">Define os responsáveis ao editar as fases.</p>}
               </div>
            </div>
          </div>
        </div>

        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900">Nova Despesa</h3>
                <button onClick={() => setIsExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X size={20}/></button>
              </div>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Descrição</label>
                  <input 
                    required 
                    autoFocus
                    type="text" 
                    value={newExpense.description} 
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20"
                    placeholder="Ex: Impressões A0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Valor (€)</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01"
                    value={newExpense.value || ''} 
                    onChange={e => setNewExpense({...newExpense, value: Number(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20"
                    placeholder="0.00"
                  />
                </div>
                <button type="submit" className="w-full py-4 bg-[#2D4E4E] text-white rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                  <CheckCircle2 size={18}/> Registar Despesa
                </button>
              </form>
            </div>
          </div>
        )}

        {isSubcontractModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900">Novo Subcontrato</h3>
                <button onClick={() => setIsSubcontractModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X size={20}/></button>
              </div>
              <form onSubmit={handleAddSubcontract} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Empresa</label>
                  <input 
                    required 
                    autoFocus
                    type="text" 
                    value={newSubcontract.companyName} 
                    onChange={e => setNewSubcontract({...newSubcontract, companyName: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20"
                    placeholder="Nome da Empresa"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Descrição (Opcional)</label>
                  <input 
                    type="text" 
                    value={newSubcontract.service} 
                    onChange={e => setNewSubcontract({...newSubcontract, service: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20"
                    placeholder="Ex: Levantamento Topográfico"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Valor (€)</label>
                    <input 
                      required 
                      type="number" 
                      step="0.01"
                      value={newSubcontract.value || ''} 
                      onChange={e => setNewSubcontract({...newSubcontract, value: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Fase (Opcional)</label>
                    <select 
                      value={newSubcontract.phaseId}
                      onChange={e => setNewSubcontract({...newSubcontract, phaseId: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20 appearance-none"
                    >
                      <option value="">Global / Nenhuma</option>
                      {selectedProcess.phases.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-[#2D4E4E] text-white rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                  <CheckCircle2 size={18}/> Adicionar Subcontrato
                </button>
              </form>
            </div>
          </div>
        )}

        {isProcessEditModalOpen && editingProcess && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Editar Detalhes do Processo</h2>
                  <p className="text-sm text-gray-500 font-bold">Atualize as informações gerais do projeto.</p>
                </div>
                <button 
                  onClick={() => setIsProcessEditModalOpen(false)}
                  className="p-3 hover:bg-gray-100 rounded-2xl transition-colors text-gray-400 hover:text-gray-900"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleEditProcess} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Código</label>
                    <input 
                      required 
                      type="text" 
                      value={editingProcess.code} 
                      onChange={e => setEditingProcess({...editingProcess, code: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Data de Início</label>
                    <input 
                      required 
                      type="date" 
                      value={editingProcess.startDate} 
                      onChange={e => setEditingProcess({...editingProcess, startDate: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Título do Projeto</label>
                  <input 
                    required 
                    type="text" 
                    value={editingProcess.title} 
                    onChange={e => setEditingProcess({...editingProcess, title: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cliente</label>
                  <select 
                    value={editingProcess.clientId}
                    onChange={e => setEditingProcess({...editingProcess, clientId: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20 appearance-none"
                  >
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Modo de Faturação</label>
                    <select 
                      value={editingProcess.pricingMode}
                      onChange={e => setEditingProcess({...editingProcess, pricingMode: e.target.value as 'PHASES' | 'GLOBAL'})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20 appearance-none"
                    >
                      <option value="GLOBAL">Global</option>
                      <option value="PHASES">Por Fases</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Orçamento Total (€)</label>
                    <input 
                      required 
                      disabled={editingProcess.pricingMode === 'PHASES'}
                      type="number" 
                      step="0.01"
                      value={editingProcess.budget} 
                      onChange={e => setEditingProcess({...editingProcess, budget: Number(e.target.value)})}
                      className={`w-full border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20 ${editingProcess.pricingMode === 'PHASES' ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50'}`}
                    />
                    {editingProcess.pricingMode === 'PHASES' && (
                      <p className="text-[9px] text-gray-400 font-bold mt-1 ml-1">* Calculado automaticamente pela soma das fases.</p>
                    )}
                  </div>
                </div>

                <button type="submit" className="w-full py-4 bg-[#2D4E4E] text-white rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                  <CheckCircle2 size={18}/> Guardar Alterações
                </button>
              </form>
            </div>
          </div>
        )}

        {isPhaseModalOpen && editingPhase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900">Editar Fase</h3>
                <button onClick={() => setIsPhaseModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X size={20}/></button>
              </div>
              <form onSubmit={handleEditPhase} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nome da Fase</label>
                  <input 
                    required 
                    type="text" 
                    value={editingPhase.name} 
                    onChange={e => setEditingPhase({...editingPhase, name: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Valor (€)</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01"
                    value={editingPhase.value} 
                    onChange={e => setEditingPhase({...editingPhase, value: Number(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Previsão Início</label>
                    <input 
                      type="date" 
                      value={editingPhase.startDate || ''} 
                      onChange={e => setEditingPhase({...editingPhase, startDate: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Previsão Fim</label>
                    <input 
                      type="date" 
                      value={editingPhase.endDate || ''} 
                      onChange={e => setEditingPhase({...editingPhase, endDate: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-[#2D4E4E] text-white rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                  <CheckCircle2 size={18}/> Guardar Alterações
                </button>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}

return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">{activeSubmenu}</h2>
          <p className="text-sm text-gray-600 font-bold">Gestão detalhada de projetos em estado de {activeSubmenu}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProcesses.map(p => (
          <div 
            key={p.id} 
            onClick={() => setSelectedProcess(p)}
            className="bg-white p-6 rounded-[2.5rem] border border-gray-200 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-6">
               <div className="p-3 bg-gray-50 rounded-2xl text-[#2D4E4E] group-hover:bg-[#2D4E4E] group-hover:text-white transition-all border border-gray-100">
                  <Briefcase size={24}/>
               </div>
               <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black uppercase tracking-wider">{p.status}</span>
            </div>
            <h3 className="font-black text-gray-900 text-lg leading-tight mb-2 truncate">{p.title}</h3>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-4">{p.code}</p>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
               <div className="flex -space-x-2">
                  <img src="https://picsum.photos/seed/p1/24/24" className="w-7 h-7 rounded-full border-2 border-white shadow-sm" alt=""/>
                  <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-gray-600 shadow-sm">+1</div>
               </div>
               <p className="text-base font-black text-gray-900">€{p.budget.toLocaleString()}</p>
            </div>
          </div>
        ))}
        {processes.length === 0 && (
          <div className="col-span-full py-24 bg-white/50 rounded-[3rem] border-4 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-600">
             <FolderOpen size={48} className="mb-4 text-gray-300"/>
             <p className="font-black text-gray-900">Nenhum processo ativo no momento.</p>
             <p className="text-sm font-bold text-gray-500">Adjudique um orçamento para começar automaticamente.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const FolderCard: React.FC<{icon: React.ReactNode, title: string, sub: string, onClick?: () => void}> = ({icon, title, sub, onClick}) => (
  <div 
    onClick={onClick}
    className="bg-white p-8 rounded-[2rem] border border-gray-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group"
  >
    <div className="mb-6 transform group-hover:scale-110 transition-transform">{icon}</div>
    <h4 className="font-black text-gray-900">{title}</h4>
    <p className="text-[10px] text-gray-600 font-black uppercase mt-1 tracking-widest">{sub}</p>
  </div>
);

export default ProcessView;
