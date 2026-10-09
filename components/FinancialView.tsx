
import React, { useState } from 'react';
import CashflowForecast from './CashflowForecast';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  X
} from 'lucide-react';
import { FinancialTransaction, Client, Process } from '../types';

interface FinancialViewProps {
  transactions: FinancialTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
  clients: Client[];
  processes: Process[];
}

const FinancialView: React.FC<FinancialViewProps> = ({ transactions, setTransactions, clients, processes }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'Mês' | 'Trimestre' | 'Ano'>('Mês');
  const [newTransaction, setNewTransaction] = useState<Partial<FinancialTransaction>>({
    type: 'EXPENSE',
    category: '',
    description: '',
    value: 0,
    date: new Date().toISOString().split('T')[0],
    status: 'Pendente',
    entityName: '',
    frequency: 'Pontual'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransaction.description || !newTransaction.value || !newTransaction.entityName) return;

    const transaction: FinancialTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: newTransaction.type as 'INCOME' | 'EXPENSE',
      category: newTransaction.category || 'Geral',
      description: newTransaction.description,
      value: Number(newTransaction.value),
      date: newTransaction.date || new Date().toISOString().split('T')[0],
      status: newTransaction.status as 'Pendente' | 'Pago' | 'Atrasado',
      entityName: newTransaction.entityName,
      frequency: (newTransaction.frequency as 'Pontual' | 'Recorrente') || 'Pontual'
    };

    setTransactions([transaction, ...transactions]);
    setIsModalOpen(false);
    setNewTransaction({
      type: 'EXPENSE',
      category: '',
      description: '',
      value: 0,
      date: new Date().toISOString().split('T')[0],
      status: 'Pendente',
      entityName: '',
      frequency: 'Pontual'
    });
  };

  const isWithinPeriod = (dateStr: string, period: 'Mês' | 'Trimestre' | 'Ano') => {
    const date = new Date(dateStr);
    const now = new Date();
    
    if (period === 'Ano') {
      return date.getFullYear() === now.getFullYear();
    }
    
    if (period === 'Mês') {
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }
    
    if (period === 'Trimestre') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const dateQuarter = Math.floor(date.getMonth() / 3);
      return date.getFullYear() === now.getFullYear() && currentQuarter === dateQuarter;
    }
    
    return true;
  };

  const filteredTransactions = transactions.filter(t => isWithinPeriod(t.date, activeFilter));

  const totalIncome = filteredTransactions.filter(t => t.type === 'INCOME' && t.status === 'Pago').reduce((acc, t) => acc + t.value, 0);
  const totalExpenses = filteredTransactions.filter(t => t.type === 'EXPENSE' && t.status === 'Pago').reduce((acc, t) => acc + t.value, 0);
  const toReceive = transactions.filter(t => t.type === 'INCOME' && t.status !== 'Pago').reduce((acc, t) => acc + t.value, 0);
  const toPay = transactions.filter(t => t.type === 'EXPENSE' && t.status !== 'Pago').reduce((acc, t) => acc + t.value, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <CashflowForecast processes={processes} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Registos anteriores e despesas gerais</h2>
          <p className="text-sm text-gray-600 font-bold">Registos independentes do plano dos processos. Os novos recebimentos são consultados dentro de cada processo.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-2xl font-black text-xs shadow-sm hover:bg-gray-50 transition-all">
            <Download size={16} /> Exportar
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#2D4E4E] text-white rounded-2xl font-black text-xs shadow-xl hover:bg-black transition-all"
          >
            <Plus size={16} /> Novo Registo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Saldo" 
          value={`€${(totalIncome - totalExpenses).toLocaleString()}`} 
          icon={<Calendar size={20} />} 
          color="purple" 
          subtitle="Resultado operacional"
        />
        <StatCard 
          title={`Receita (${activeFilter})`} 
          value={`€${totalIncome.toLocaleString()}`} 
          icon={<DollarSign size={20} />} 
          color="green" 
          subtitle="Pagamentos confirmados"
          onClick={() => setIsFilterModalOpen(true)}
        />
        <StatCard 
          title={`Despesa (${activeFilter})`} 
          value={`€${totalExpenses.toLocaleString()}`} 
          icon={<TrendingDown size={20} />} 
          color="red" 
          subtitle="Custos confirmados"
          onClick={() => setIsFilterModalOpen(true)}
        />
        <StatCard 
          title="A Receber" 
          value={`€${toReceive.toLocaleString()}`} 
          icon={<TrendingUp size={20} />} 
          color="blue" 
          subtitle="Propostas adjudicadas"
        />
        <StatCard 
          title="A Pagar" 
          value={`€${toPay.toLocaleString()}`} 
          icon={<TrendingDown size={20} />} 
          color="red" 
          subtitle="Despesas pendentes"
        />
        <StatCard 
          title="Receita de Contratos Futuros" 
          value="€0" 
          icon={<TrendingUp size={20} />} 
          color="blue" 
          subtitle="Projeção de ganhos"
        />
        <StatCard 
          title="Despesa de Contratos Futuros" 
          value="€0" 
          icon={<TrendingDown size={20} />} 
          color="red" 
          subtitle="Projeção de custos"
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Diário de Bordo</h3>
          <div className="flex gap-2">
            <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-900 transition-all shadow-sm">
              <Filter size={16} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Data</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Descrição</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Entidade</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Frequência</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Categoria</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Valor</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-8 py-5 text-xs font-bold text-gray-500">{t.date}</td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-black text-gray-900">{t.description}</p>
                  </td>
                  <td className="px-8 py-5 text-sm text-gray-600 font-bold">{t.entityName}</td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                      t.frequency === 'Recorrente' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {t.frequency}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{t.category}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      {t.type === 'INCOME' ? (
                        <ArrowUpRight size={14} className="text-green-500" />
                      ) : (
                        <ArrowDownRight size={14} className="text-red-500" />
                      )}
                      <span className={`text-sm font-black ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'INCOME' ? '+' : '-'} €{t.value.toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl my-8 animate-in zoom-in-95 border border-gray-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-[2.5rem]">
              <h3 className="text-xl font-black text-gray-900">Novo Registo Financeiro</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200 transition-all">
                <X size={20}/>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Registo</label>
                  <div className="flex p-1 bg-gray-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setNewTransaction({ ...newTransaction, type: 'INCOME' })}
                      className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${newTransaction.type === 'INCOME' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      Receita
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTransaction({ ...newTransaction, type: 'EXPENSE' })}
                      className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${newTransaction.type === 'EXPENSE' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      Despesa
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Frequência</label>
                  <div className="flex p-1 bg-gray-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setNewTransaction({ ...newTransaction, frequency: 'Pontual' })}
                      className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${newTransaction.frequency === 'Pontual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                    >
                      Pontual
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTransaction({ ...newTransaction, frequency: 'Recorrente' })}
                      className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${newTransaction.frequency === 'Recorrente' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                    >
                      Recorrente
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data</label>
                  <input
                    required
                    type="date"
                    value={newTransaction.date}
                    onChange={e => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 ring-[#2D4E4E]/10 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor (€)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={newTransaction.value}
                    onChange={e => setNewTransaction({ ...newTransaction, value: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 ring-[#2D4E4E]/10 text-gray-900 font-black"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Pagamento Fase 1"
                  value={newTransaction.description}
                  onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 ring-[#2D4E4E]/10 text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Entidade / Cliente</label>
                <select
                  required
                  value={newTransaction.entityName}
                  onChange={e => setNewTransaction({ ...newTransaction, entityName: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 ring-[#2D4E4E]/10 text-gray-900"
                >
                  <option value="">Seleccione um cliente ou entidade...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.name}>{client.name}</option>
                  ))}
                  <option value="Outros">Outros / Fornecedores</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoria</label>
                  <select
                    value={newTransaction.category}
                    onChange={e => setNewTransaction({ ...newTransaction, category: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 ring-[#2D4E4E]/10 text-gray-900"
                  >
                    <option value="">Seleccione...</option>
                    <option value="Projecto">Projecto</option>
                    <option value="Consultoria">Consultoria</option>
                    <option value="Software">Software</option>
                    <option value="Renda">Renda</option>
                    <option value="Equipamento">Equipamento</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estado</label>
                  <select
                    value={newTransaction.status}
                    onChange={e => setNewTransaction({ ...newTransaction, status: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 ring-[#2D4E4E]/10 text-gray-900"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                    <option value="Atrasado">Atrasado</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-[#2D4E4E] text-white rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 mt-4"
              >
                <CheckCircle2 size={18} /> Registar Movimento
              </button>
            </form>
          </div>
        </div>
      )}

      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 border border-gray-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-[2.5rem]">
              <h3 className="text-xl font-black text-gray-900">Filtrar Período</h3>
              <button onClick={() => setIsFilterModalOpen(false)} className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200 transition-all">
                <X size={20}/>
              </button>
            </div>
            <div className="p-8 space-y-4">
              <p className="text-sm text-gray-600 font-bold mb-4">Selecione o período de visualização para as receitas, despesas e diário de bordo.</p>
              <div className="space-y-2">
                {(['Mês', 'Trimestre', 'Ano'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setActiveFilter(period);
                      setIsFilterModalOpen(false);
                    }}
                    className={`w-full py-4 px-6 rounded-2xl text-sm font-black transition-all border flex items-center justify-between ${
                      activeFilter === period 
                        ? 'bg-[#2D4E4E] text-white border-[#2D4E4E] shadow-lg scale-[1.02]' 
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-white'
                    }`}
                  >
                    {period}
                    {activeFilter === period && <CheckCircle2 size={18} />}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all mt-4"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ 
  title: string, 
  value: string, 
  icon: React.ReactNode, 
  color: string, 
  subtitle: string,
  onClick?: () => void
}> = ({ title, value, icon, color, subtitle, onClick }) => {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100'
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-[2rem] shadow-sm border border-gray-200 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-xl border ${colors[color]}`}>{icon}</div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
      </div>
      <p className="text-2xl font-black text-gray-900 mb-1">{value}</p>
      <p className="text-[10px] text-gray-500 font-bold italic">{subtitle}</p>
    </div>
  );
};

const StatusBadge: React.FC<{ status: FinancialTransaction['status'] }> = ({ status }) => {
  const styles: any = {
    Pago: 'bg-green-100 text-green-800',
    Pendente: 'bg-blue-100 text-blue-800',
    Atrasado: 'bg-red-100 text-red-800'
  };

  const icons: any = {
    Pago: <CheckCircle2 size={12} />,
    Pendente: <Clock size={12} />,
    Atrasado: <AlertCircle size={12} />
  };

  return (
    <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${styles[status]}`}>
      {icons[status]}
      {status}
    </span>
  );
};

export default FinancialView;
