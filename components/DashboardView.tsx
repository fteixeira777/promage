
import React from 'react';
import { 
  TrendingUp, 
  Users, 
  Briefcase, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Sun,
  Sunrise,
  Moon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Line
} from 'recharts';
import { Process, Client, TeamMember, Task } from '../types';
import { 
  AlertCircle,
  CheckCircle,
  Circle,
  Flag
} from 'lucide-react';

interface DashboardViewProps {
  processes: Process[];
  clients: Client[];
  team: TeamMember[];
  tasks: Task[];
}

const data = [
  { name: 'Jan', value: 4000, revenue: 2400, profit: 2400 - 4000 },
  { name: 'Fev', value: 3000, revenue: 1398, profit: 1398 - 3000 },
  { name: 'Mar', value: 2000, revenue: 9800, profit: 9800 - 2000 },
  { name: 'Abr', value: 2780, revenue: 3908, profit: 3908 - 2780 },
  { name: 'Mai', value: 1890, revenue: 4800, profit: 4800 - 1890 },
  { name: 'Jun', value: 2390, revenue: 3800, profit: 3800 - 2390 },
];

const DashboardView: React.FC<DashboardViewProps> = ({ processes, clients, team, tasks }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 13) return { text: 'Bom dia', icon: <Sunrise className="text-orange-500" size={32} /> };
    if (hour >= 13 && hour < 19) return { text: 'Boa tarde', icon: <Sun className="text-yellow-500" size={32} /> };
    return { text: 'Boa noite', icon: <Moon className="text-indigo-500" size={32} /> };
  };

  const { text: greeting, icon: greetingIcon } = getGreeting();

  const totalBudget = processes.reduce((acc, curr) => acc + curr.budget, 0);
  const monthlyTeamExpense = team.reduce((acc, curr) => acc + curr.fee, 0);

  const pendingTasks = tasks
    .filter(t => t.status !== 'Concluído')
    .sort((a, b) => b.priority - a.priority || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
            {greetingIcon}
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">{greeting}, Fábio!</h1>
            <p className="text-gray-600 font-medium mt-1">Aqui está o resumo da atividade do seu gabinete hoje.</p>
          </div>
        </div>
      </div>

      {/* Task List Section */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
              <Flag size={20} />
            </div>
            <h3 className="font-black text-gray-900 uppercase text-sm tracking-widest">Tarefas a Fazer</h3>
          </div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{pendingTasks.length} Pendentes</span>
        </div>
        
        <div className="space-y-3">
          {pendingTasks.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-500 font-bold italic text-sm">Não existem tarefas pendentes.</p>
            </div>
          ) : (
            pendingTasks.slice(0, 5).map(task => {
              const project = processes.find(p => p.id === task.processId);
              const projectCode = project ? project.code : 'S/P'; // S/P for Sem Projeto
              
              return (
                <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-10 rounded-full ${
                      task.priority === 5 ? 'bg-red-500' :
                      task.priority === 4 ? 'bg-orange-500' :
                      task.priority === 3 ? 'bg-yellow-500' :
                      task.priority === 2 ? 'bg-blue-500' :
                      'bg-gray-300'
                    }`} />
                    <div>
                      <h4 className="font-black text-gray-900 text-sm">
                        <span className="text-gray-400">{projectCode}</span>
                        <span className="text-gray-400 mx-2">-</span>
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                        task.priority === 5 ? 'bg-red-100 text-red-700' :
                        task.priority === 4 ? 'bg-orange-100 text-orange-700' :
                        task.priority === 3 ? 'bg-yellow-100 text-yellow-700' :
                        task.priority === 2 ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        Prioridade {task.priority}
                      </span>
                      <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(task.dueDate).toLocaleDateString('pt-PT')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${
                    task.status === 'Em Curso' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {task.status}
                  </span>
                  <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                    <ArrowUpRight size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
          {pendingTasks.length > 5 && (
            <button className="w-full py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-gray-900 transition-colors">
              Ver mais {pendingTasks.length - 5} tarefas...
            </button>
          )}
        </div>
      </div>

      <div className="pt-4 pb-2">
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">O teu Atelier em Resumo</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Processos Ativos" 
          value={processes.filter(p => p.status !== 'Finalizado').length.toString()} 
          change="+12%" 
          isPositive={true} 
          icon={<Briefcase className="text-blue-600" />} 
        />
        <StatCard 
          title="Colaboradores" 
          value={team.length.toString()} 
          change="Ativos" 
          isPositive={true} 
          icon={<Users className="text-purple-600" />} 
        />
        <StatCard 
          title="Volume de Receitas Anuais" 
          value={`€${totalBudget.toLocaleString()}`} 
          change="+5%" 
          isPositive={true} 
          icon={<TrendingUp className="text-green-600" />} 
        />
        <StatCard 
          title="Volume Despesa Anual" 
          value={`€${monthlyTeamExpense.toLocaleString()}`} 
          change="Mensal" 
          isPositive={false} 
          icon={<Wallet className="text-red-600" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-gray-900 uppercase text-sm tracking-widest">Volume de Atividade</h3>
            <select className="text-xs font-black text-gray-600 outline-none cursor-pointer bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <option>Últimos 6 meses</option>
              <option>Este ano</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2D4E4E" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2D4E4E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#4b5563', fontWeight: 'bold'}} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold'}} 
                />
                <Area type="monotone" dataKey="value" stroke="#2D4E4E" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
                <Line type="monotone" dataKey="profit" stroke="#2D4E4E" strokeWidth={2} strokeDasharray="5 5" opacity={0.3} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-gray-900 uppercase text-sm tracking-widest">Rentabilidade (Est.)</h3>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2D4E4E]"></div>
                  <span className="text-[10px] text-gray-700 uppercase font-black">Receitas</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <span className="text-[10px] text-gray-700 uppercase font-black">Despesa</span>
               </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#4b5563', fontWeight: 'bold'}} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="revenue" fill="#2D4E4E" radius={[8, 8, 0, 0]} barSize={32} />
                <Bar dataKey="value" fill="#F87171" radius={[8, 8, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, isPositive, icon }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-4 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div className="p-3 bg-gray-50 rounded-2xl">
        {icon}
      </div>
      <div className={`flex items-center text-[10px] font-black px-2.5 py-1 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {isPositive ? <ArrowUpRight size={12} strokeWidth={3} /> : <ArrowDownRight size={12} strokeWidth={3} />}
        {change}
      </div>
    </div>
    <div>
      <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{title}</p>
      <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
    </div>
  </div>
);

export default DashboardView;
