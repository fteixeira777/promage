
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  FileCheck, 
  Send,
  Download,
  DollarSign,
  X,
  CheckCircle2,
  Trash2,
  UserPlus,
  Coins,
  Layers
} from 'lucide-react';
import { Budget, Client, Phase } from '../types';

interface BudgetViewProps {
  budgets: Budget[];
  setBudgets: React.Dispatch<React.SetStateAction<Budget[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  onAccept: (budget: Budget) => void;
  activeSubmenu: string;
}

const BudgetView: React.FC<BudgetViewProps> = ({ budgets, setBudgets, clients, setClients, onAccept, activeSubmenu }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [isNewClientForm, setIsNewClientForm] = useState(false);
  
  const [newBudget, setNewBudget] = useState<Partial<Budget>>({
    title: '',
    clientId: '',
    description: '',
    pricingMode: 'PHASES',
    value: 0,
    phases: []
  });

  const [newClient, setNewClient] = useState<Partial<Client>>({ name: '', email: '', phone: '', type: 'Quente' });
  const [currentPhase, setCurrentPhase] = useState<Partial<Phase>>({ name: '', value: 0 });

  const handleAddPhase = () => {
    if (!currentPhase.name) return;
    const phase: Phase = {
      id: Math.random().toString(36).substr(2, 9),
      name: currentPhase.name,
      value: Number(currentPhase.value) || 0,
      status: 'Pendente'
    };
    setNewBudget({ ...newBudget, phases: [...(newBudget.phases || []), phase] });
    setCurrentPhase({ name: '', value: 0 });
  };

  const handleRemovePhase = (id: string) => {
    setNewBudget({ ...newBudget, phases: (newBudget.phases || []).filter(p => p.id !== id) });
  };

  const handleCreateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    let finalClientId = newBudget.clientId;

    if (isNewClientForm && newClient.name && newClient.email) {
      const addedClient: Client = {
        id: Math.random().toString(36).substr(2, 9),
        name: newClient.name,
        email: newClient.email,
        phone: newClient.phone || '',
        type: newClient.type as any || 'Quente'
      };
      setClients([...clients, addedClient]);
      finalClientId = addedClient.id;
    }

    if (!newBudget.title || !finalClientId) return;

    // Calcular o valor final baseado no modo
    const finalValue = newBudget.pricingMode === 'PHASES' 
      ? (newBudget.phases || []).reduce((acc, p) => acc + p.value, 0)
      : (newBudget.value || 0);

    const budgetToAdd: Budget = {
      id: Math.random().toString(36).substr(2, 9),
      title: newBudget.title,
      clientId: finalClientId,
      value: finalValue,
      pricingMode: newBudget.pricingMode || 'PHASES',
      status: 'Pendente',
      date: new Date().toISOString().split('T')[0],
      description: newBudget.description || '',
      phases: newBudget.phases || []
    };

    setBudgets([budgetToAdd, ...budgets]);
    setIsModalOpen(false);
    setNewBudget({ title: '', clientId: '', description: '', pricingMode: 'PHASES', value: 0, phases: [] });
    setIsNewClientForm(false);
  };

  const handleCancelBudget = (id: string) => {
    setBudgets(budgets.map(b => b.id === id ? { ...b, status: 'Cancelado' } : b));
  };

  const handleViewBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setIsViewModalOpen(true);
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || '---';

  const filteredBudgets = budgets.filter(b => {
    if (activeSubmenu === 'Arquivo') return b.status === 'Cancelado';
    return b.status !== 'Cancelado';
  });

  // Valor calculado para exibição em tempo real
  const calculatedTotal = newBudget.pricingMode === 'PHASES'
    ? (newBudget.phases || []).reduce((acc, p) => acc + p.value, 0)
    : (newBudget.value || 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Orçamentos e Honorários</h2>
          <p className="text-sm text-gray-600 font-bold">Gestão estratégica de propostas comerciais.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#2D4E4E] text-white rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all"
        >
          <Plus size={20} /> Nova Proposta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-700 border border-blue-100"><Send size={18} /></div>
            <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Pendentes</p>
          </div>
          <p className="text-2xl font-black text-gray-900">{budgets.filter(b => b.status === 'Pendente').length}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-green-50 rounded-xl text-green-700 border border-green-100"><FileCheck size={18} /></div>
            <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Aceites</p>
          </div>
          <p className="text-2xl font-black text-gray-900">{budgets.filter(b => b.status === 'Aceite').length}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-700 border border-purple-100"><DollarSign size={18} /></div>
            <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Total Aceite</p>
          </div>
          <p className="text-2xl font-black text-gray-900">€{budgets.filter(b => b.status === 'Aceite').reduce((acc, b) => acc + b.value, 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">Proposta</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">Cliente</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">Valor</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">Estado</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredBudgets.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50/80 transition-colors group">
                <td className="px-6 py-5 cursor-pointer" onClick={() => handleViewBudget(b)}>
                  <p className="text-sm font-black text-gray-900 group-hover:text-[#2D4E4E] transition-colors">{b.title}</p>
                  <p className="text-[10px] text-gray-500 font-bold">{b.date}</p>
                </td>
                <td className="px-6 py-5">
                  <p className="text-sm text-gray-700 font-bold">{getClientName(b.clientId)}</p>
                </td>
                <td className="px-6 py-5 font-black text-gray-900">
                  <div className="flex flex-col">
                    <span>€{b.value.toLocaleString()}</span>
                    <span className="text-[8px] uppercase text-gray-400">{b.pricingMode === 'GLOBAL' ? 'Global' : 'Por Fases'}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    b.status === 'Aceite' ? 'bg-green-100 text-green-800' : 
                    b.status === 'Recusado' ? 'bg-red-100 text-red-800' : 
                    b.status === 'Cancelado' ? 'bg-gray-100 text-gray-500' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {b.status === 'Pendente' && (
                      <>
                        <button 
                          onClick={() => onAccept(b)}
                          className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-xs font-black hover:bg-green-700 transition-all shadow-md"
                        >
                          Adjudicar
                        </button>
                        <button 
                          onClick={() => handleCancelBudget(b.id)}
                          className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Cancelar Orçamento"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => handleViewBudget(b)}
                      className="p-2 text-gray-400 hover:text-[#2D4E4E] transition-colors"
                      title="Ver Detalhes"
                    >
                      <Layers size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredBudgets.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center">
                  <p className="text-sm font-bold text-gray-500 italic">Nenhum orçamento encontrado nesta categoria.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl my-8 animate-in zoom-in-95 border border-gray-200">
            <div className="p-8 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-[2.5rem]">
              <h3 className="text-xl font-black text-gray-900">Nova Proposta Comercial</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-200 transition-all"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleCreateBudget} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">Título da Proposta *</label>
                  <input required value={newBudget.title} onChange={e => setNewBudget({...newBudget, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20 placeholder-gray-400" placeholder="Ex: Levantamento Topográfico + Estudo Prévio" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-widest">Cliente *</label>
                    <button type="button" onClick={() => setIsNewClientForm(!isNewClientForm)} className="text-[10px] font-black text-[#2D4E4E] underline uppercase tracking-tighter">
                      {isNewClientForm ? 'Usar Existente' : '+ Novo Cliente'}
                    </button>
                  </div>
                  {!isNewClientForm ? (
                    <select required value={newBudget.clientId} onChange={e => setNewBudget({...newBudget, clientId: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none appearance-none cursor-pointer focus:ring-2 ring-[#2D4E4E]/20">
                      <option value="">Selecione um cliente...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  ) : (
                    <div className="p-5 bg-gray-50 rounded-2xl space-y-4 border border-gray-200">
                      <input required placeholder="Nome do Cliente" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-900 outline-none" />
                      <input required placeholder="Email Principal" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-900 outline-none" />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">Configuração de Preço</label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl border border-gray-200">
                    <button 
                      type="button" 
                      onClick={() => setNewBudget({...newBudget, pricingMode: 'PHASES'})}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${newBudget.pricingMode === 'PHASES' ? 'bg-white text-[#2D4E4E] shadow-sm' : 'text-gray-500'}`}
                    >
                      <Layers size={14}/> Por Fases
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setNewBudget({...newBudget, pricingMode: 'GLOBAL'})}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${newBudget.pricingMode === 'GLOBAL' ? 'bg-white text-[#2D4E4E] shadow-sm' : 'text-gray-500'}`}
                    >
                      <Coins size={14}/> Valor Global
                    </button>
                  </div>
                  
                  {newBudget.pricingMode === 'GLOBAL' && (
                    <div className="animate-in slide-in-from-top-2">
                       <input 
                         required
                         type="number"
                         value={newBudget.value || ''}
                         onChange={e => setNewBudget({...newBudget, value: Number(e.target.value)})}
                         className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20"
                         placeholder="Insira o valor final global (Ex: 5000)"
                       />
                       <p className="text-[10px] text-gray-500 font-bold mt-2 ml-1 italic">Neste modo, o valor final é fixo. Pode ainda assim adicionar fases para organização.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">Organização das Fases do Projeto</label>
                  <div className="flex gap-3">
                    <input value={currentPhase.name} onChange={e => setCurrentPhase({...currentPhase, name: e.target.value})} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-xs font-bold text-gray-900 outline-none" placeholder="Ex: Estudo Prévio" />
                    {newBudget.pricingMode === 'PHASES' && (
                      <input type="number" value={currentPhase.value || ''} onChange={e => setCurrentPhase({...currentPhase, value: Number(e.target.value)})} className="w-28 bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-xs font-black text-gray-900 outline-none" placeholder="€" />
                    )}
                    <button type="button" onClick={handleAddPhase} className="p-3.5 bg-gray-900 text-white rounded-xl hover:bg-black transition-all shadow-md"><Plus size={18}/></button>
                  </div>
                  
                  <div className="mt-4 space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                    {newBudget.phases?.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                        <span className="text-xs font-black text-gray-800 uppercase tracking-tighter">{p.name}</span>
                        <div className="flex items-center gap-4">
                          {newBudget.pricingMode === 'PHASES' && <span className="text-xs font-black text-gray-900">€{p.value.toLocaleString()}</span>}
                          <button type="button" onClick={() => handleRemovePhase(p.id)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    ))}
                    {newBudget.phases?.length === 0 && <p className="text-[10px] text-center text-gray-400 py-4 italic">Nenhuma fase definida ainda.</p>}
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-200 flex flex-col gap-6">
                  <div className="flex justify-between items-center text-gray-900">
                    <div className="flex flex-col">
                      <span className="text-sm font-black uppercase tracking-widest">Total Honorários:</span>
                      <span className="text-[10px] text-gray-500 font-bold italic">{newBudget.pricingMode === 'PHASES' ? 'Soma das fases' : 'Valor global definido'}</span>
                    </div>
                    <span className="text-3xl font-black">€{calculatedTotal.toLocaleString()}</span>
                  </div>
                  <button type="submit" className="w-full py-4.5 bg-[#2D4E4E] text-white rounded-2xl font-black text-base shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3">
                    <CheckCircle2 size={22}/> Criar e Validar Proposta
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Orçamento */}
      {isViewModalOpen && selectedBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl my-8 animate-in zoom-in-95 border border-gray-200">
            <div className="p-8 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-[2.5rem]">
              <div>
                <h3 className="text-xl font-black text-gray-900">{selectedBudget.title}</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Detalhes da Proposta</p>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-white rounded-full text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-200 transition-all"><X size={20}/></button>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</p>
                  <p className="text-lg font-black text-gray-900">{getClientName(selectedBudget.clientId)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data de Criação</p>
                  <p className="text-lg font-black text-gray-900">{selectedBudget.date}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Modo de Faturação</p>
                  <p className="text-lg font-black text-gray-900">{selectedBudget.pricingMode === 'GLOBAL' ? 'Global' : 'Por Fases'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado Atual</p>
                  <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    selectedBudget.status === 'Aceite' ? 'bg-green-100 text-green-800' : 
                    selectedBudget.status === 'Recusado' ? 'bg-red-100 text-red-800' : 
                    selectedBudget.status === 'Cancelado' ? 'bg-gray-100 text-gray-500' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {selectedBudget.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição / Notas</p>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  {selectedBudget.description || 'Nenhuma descrição adicional fornecida.'}
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estrutura de Fases</p>
                <div className="space-y-2">
                  {selectedBudget.phases.map((phase) => (
                    <div key={phase.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                      <span className="text-xs font-black text-gray-800 uppercase tracking-tighter">{phase.name}</span>
                      <span className="text-xs font-black text-gray-900">€{phase.value.toLocaleString()}</span>
                    </div>
                  ))}
                  {selectedBudget.phases.length === 0 && (
                    <p className="text-xs text-gray-500 italic">Nenhuma fase detalhada.</p>
                  )}
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100 flex justify-between items-center">
                <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Valor Total da Proposta</p>
                <p className="text-4xl font-black text-[#2D4E4E]">€{selectedBudget.value.toLocaleString()}</p>
              </div>

              <div className="flex gap-4 pt-4">
                {selectedBudget.status === 'Pendente' && (
                  <>
                    <button 
                      onClick={() => {
                        onAccept(selectedBudget);
                        setIsViewModalOpen(false);
                      }}
                      className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={18}/> Adjudicar Proposta
                    </button>
                    <button 
                      onClick={() => {
                        handleCancelBudget(selectedBudget.id);
                        setIsViewModalOpen(false);
                      }}
                      className="flex-1 py-4 bg-white text-red-600 border border-red-100 rounded-2xl font-black text-sm shadow-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                    >
                      <X size={18}/> Cancelar Proposta
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetView;
