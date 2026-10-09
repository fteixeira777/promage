
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  ClipboardList, 
  Settings, 
  Plus, 
  Search, 
  ChevronDown, 
  HelpCircle,
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  ExternalLink,
  MessageSquareText,
  X,
  CheckCircle2,
  Share2,
  AlertTriangle,
  LayoutGrid, 
  ListTodo, 
  Settings2, 
  Filter, 
  Maximize2, 
  Download, 
  Upload, 
  LogOut, 
  Trash2
} from 'lucide-react';
import { MainMenu, Company, Process, Client, Budget, TeamMember, FinancialTransaction, SocialPost, Task, Supplier, Project, Ticket, AppSettings, AppUser } from './types';
import StudioOverview from './components/StudioOverview';
import TasksView from './components/TasksView';
import ProcessTimeline from './components/ProcessTimeline';
import { importPortfolio } from './lib/planning';
import ProcessView from './components/ProcessView';
import BudgetView from './components/BudgetView';
import ManagementView from './components/ManagementView';
import ClientsView from './components/ClientsView';
import TeamView from './components/TeamView';
import PortfolioDashboardView from './components/PortfolioDashboardView';
import FinancialView from './components/FinancialView';
import SocialView from './components/SocialView';
import { cn } from './lib/utils';
import { TicketModal } from './components/TicketModal';
import { ProjectModal } from './components/ProjectModal';
import { SettingsView } from './components/SettingsView';

const App: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<MainMenu>(MainMenu.DASHBOARD);
  const [processTab, setProcessTab] = useState<'Fases' | 'Tarefas'>('Fases');
  const [activeSubmenu, setActiveSubmenu] = useState<string>('Visão Geral');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [isNewBudgetModalOpen, setIsNewBudgetModalOpen] = useState(false);
  const [isNewProcessModalOpen, setIsNewProcessModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('portfolio_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('portfolio_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old string[] projectPresets to ProjectPreset[]
      if (parsed.projectPresets && typeof parsed.projectPresets[0] === 'string') {
        parsed.projectPresets = parsed.projectPresets.map((p: string) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: p,
          subtasks: []
        }));
      }
      return parsed;
    }
    return { 
      users: [{ id: 'u1', name: 'Admin User', canLogin: true }], 
      presetTitles: ['UX Research', 'UI Design', 'Frontend Setup', 'Backend Setup', 'API Integration', 'Testing'],
      projectPresets: [
        { id: 'pp1', name: 'Website Redesign', subtasks: ['UX Research', 'UI Design', 'Frontend Setup', 'Backend Setup'] },
        { id: 'pp2', name: 'Mobile App', subtasks: ['API Integration', 'Push Notifications', 'App Store Submission'] },
        { id: 'pp3', name: 'Internal Tool', subtasks: ['Database Schema', 'Auth Module', 'Admin Dashboard'] },
        { id: 'pp4', name: 'Marketing Campaign', subtasks: ['Copywriting', 'Asset Creation', 'Ad Setup'] }
      ]
    };
  });

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingTicket, setEditingTicket] = useState<{ project: Project, ticket?: Ticket } | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [isHolistic, setIsHolistic] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [pendingUpload, setPendingUpload] = useState<Project[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ganttContainerRef = useRef<HTMLDivElement>(null);

  const calculateFitZoom = () => {
    if (!ganttContainerRef.current || projects.length === 0) return 100;

    const containerWidth = ganttContainerRef.current.offsetWidth;
    const sidebarWidth = isHolistic ? 160 : 260;
    const internalPadding = isHolistic ? 32 : 48; // p-4 vs p-6
    const netWidth = containerWidth - sidebarWidth - internalPadding;

    const maxTickets = Math.max(...projects.map(p => p.tickets.length), 1);
    const baseTicketWidth = isHolistic ? 140 : 240;
    const gap = 16; // gap-4

    const neededWidthForGaps = (maxTickets - 1) * gap;
    const availableWidthForTickets = netWidth - neededWidthForGaps;
    
    if (availableWidthForTickets <= 0) return 30;

    const optimalZoom = (availableWidthForTickets / (maxTickets * baseTicketWidth)) * 100;
    return Math.min(Math.max(Math.floor(optimalZoom), 30), 200);
  };

  const handleFitAll = () => {
    const fitZoom = calculateFitZoom();
    setZoomLevel(fitZoom);
  };

  useEffect(() => {
    if (activeMenu === MainMenu.PORTFOLIO && projects.length > 0) {
      const timer = setTimeout(() => {
        handleFitAll();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeMenu, isHolistic]);

  useEffect(() => {
    localStorage.setItem('portfolio_data', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('portfolio_settings', JSON.stringify(settings));
  }, [settings]);

  const handleSaveTicket = (ticketData: Partial<Ticket>, projectId: string) => {
    if (!editingTicket) return;

    const { project, ticket } = editingTicket;
    
    setProjects(prev => prev.map(p => {
      if (p.id !== project.id && p.id !== projectId) return p;

      // If project changed, remove from old, add to new
      if (p.id === project.id && p.id !== projectId) {
        return {
          ...p,
          tickets: p.tickets.filter(t => t.id !== ticket?.id)
        };
      }
      
      if (p.id === projectId) {
        if (ticket && ticket.id) {
          // Update existing
          return {
            ...p,
            tickets: p.tickets.map(t => t.id === ticket.id ? { ...t, ...ticketData } : t)
          };
        } else {
          // Add new
          const newTicket: Ticket = {
            id: Math.random().toString(36).substr(2, 9),
            title: ticketData.title || 'Untitled Ticket',
            startDate: ticketData.startDate || new Date().toISOString(),
            durationDays: ticketData.durationDays || 1,
            status: ticketData.status || 'todo',
            assignee: ticketData.assignee || '',
            notes: ticketData.notes || [],
            attachments: ticketData.attachments || []
          };
          return {
            ...p,
            tickets: [...p.tickets, newTicket]
          };
        }
      }
      return p;
    }));
    setEditingTicket(null);
  };

  const handleDeleteTicket = () => {
    if (!editingTicket || !editingTicket.ticket) return;
    const { project, ticket } = editingTicket;
    
    setProjects(prev => prev.map(p => {
      if (p.id !== project.id) return p;
      return {
        ...p,
        tickets: p.tickets.filter(t => t.id !== ticket.id)
      };
    }));
    setEditingTicket(null);
  };

  const handleUpdateTicketStatus = (projectId: string, ticketId: string, status: 'todo' | 'in-progress' | 'done') => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        tickets: p.tickets.map(t => t.id === ticketId ? { ...t, status } : t)
      };
    }));
  };

  const handleUpdateTicketDates = (projectId: string, ticketId: string, newStartDate: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        tickets: p.tickets.map(t => t.id === ticketId ? { ...t, startDate: newStartDate } : t)
      };
    }));
  };

  const handleUpdateProjectName = (projectId: string, newName: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, name: newName };
    }));
  };

  const handleSaveProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setEditingProject(null);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setEditingProject(null);
  };

  const handleTimelineClick = (project: Project, date: Date) => {
    setEditingTicket({ 
      project, 
      ticket: { 
        id: '', // Temporary ID for new ticket
        title: '', 
        startDate: date.toISOString(), 
        durationDays: 1, 
        status: 'todo', 
        assignee: '' 
      } 
    });
  };

  const handleAddProject = () => {
    if (!newProjectName.trim()) return;
    
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    const nextId = `P${(projects.length + 1).toString().padStart(2, '0')}`;
    
    // Check if the selected preset
    const preset = settings.projectPresets?.find(p => p.id === selectedPresetId);
    
    let initialTickets: Ticket[] = [];
    if (preset && preset.subtasks && preset.subtasks.length > 0) {
      const now = new Date();
      initialTickets = preset.subtasks.map((subtask, index) => {
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() + (index * 2)); // Stagger start dates slightly
        return {
          id: Math.random().toString(36).substr(2, 9),
          title: subtask,
          startDate: startDate.toISOString(),
          durationDays: 3,
          status: 'todo'
        };
      });
    }

    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${nextId} - ${newProjectName}`,
      description: '',
      color: colors[projects.length % colors.length],
      tickets: initialTickets
    };
    
    setProjects([...projects, newProject]);
    setNewProjectName('');
    setIsAddingProject(false);
  };

  const handleResetAllData = () => {
    setProjects([]);
    setSettings({
      users: [{ id: 'u1', name: 'Admin User', canLogin: true }],
      presetTitles: ['UX Research', 'UI Design', 'Frontend Setup', 'Backend Setup', 'API Integration', 'Testing'],
      projectPresets: [
        { id: 'pp1', name: 'Website Redesign', subtasks: ['UX Research', 'UI Design', 'Frontend Setup', 'Backend Setup'] },
        { id: 'pp2', name: 'Mobile App', subtasks: ['API Integration', 'Push Notifications', 'App Store Submission'] },
        { id: 'pp3', name: 'Internal Tool', subtasks: ['Database Schema', 'Auth Module', 'Admin Dashboard'] },
        { id: 'pp4', name: 'Marketing Campaign', subtasks: ['Copywriting', 'Asset Creation', 'Ad Setup'] }
      ]
    });
    localStorage.removeItem('portfolio_data');
    localStorage.removeItem('portfolio_settings');
    setIsResetting(false);
  };
  const [newBudget, setNewBudget] = useState<Partial<Budget>>({
    title: '',
    clientId: '',
    value: 0,
    pricingMode: 'PHASES'
  });

  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('promage_companies');
    return saved ? JSON.parse(saved) : [{ id: '1', name: 'Atelier Alfa' }];
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('promage_clients');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'João Silva', email: 'joao.silva@email.com', phone: '912 345 678', type: 'Quente', nif: '123456789', address: 'Rua das Flores, 12, Lisboa' }
    ];
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('promage_suppliers');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Madeiras & Cia', category: 'Materiais', email: 'geral@madeiras.pt', phone: '210 000 000' },
      { id: '2', name: 'Eletro-Luz', category: 'Iluminação', email: 'info@eletroluz.pt', phone: '220 000 000' }
    ];
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('promage_budgets');
    return saved ? JSON.parse(saved) : [];
  });

  const [processes, setProcesses] = useState<Process[]>(() => {
    const saved = localStorage.getItem('promage_processes');
    const parsed = saved ? JSON.parse(saved) : [
      { id: 'p1', code: 'PR2024/001', title: 'Moradia Cascais', clientId: '1', status: 'Projeto', budget: 15000, pricingMode: 'PHASES', startDate: '2024-01-15', phases: [], subcontracts: [], expenses: [], documents: [] },
      { id: 'p2', code: 'PR2024/002', title: 'Loja Chiado', clientId: '1', status: 'Início', budget: 8500, pricingMode: 'GLOBAL', startDate: '2024-02-10', phases: [], subcontracts: [], expenses: [], documents: [] },
      { id: 'p3', code: 'PR2024/003', title: 'Reabilitação Porto', clientId: '1', status: 'Execução', budget: 25000, pricingMode: 'PHASES', startDate: '2023-11-20', phases: [], subcontracts: [], expenses: [], documents: [] }
    ];
    return parsed.map((p: any) => ({ 
      ...p, 
      expenses: p.expenses || [],
      documents: p.documents || []
    }));
  });

  const [team, setTeam] = useState<TeamMember[]>(() => {
    const saved = localStorage.getItem('promage_team');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Fábio T.', role: 'Arquitecto Sénior', fee: 2500, email: 'fabio@atelier.pt', phone: '912 000 000', status: 'Ativo' }
    ];
  });

  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() => {
    const saved = localStorage.getItem('promage_transactions');
    return saved ? JSON.parse(saved) : [
      { id: '1', type: 'INCOME', category: 'Projecto', description: 'Adjudicação Moradia Cascais', value: 5000, date: '2024-03-15', status: 'Pago', entityName: 'João Silva', frequency: 'Pontual' },
      { id: '2', type: 'EXPENSE', category: 'Software', description: 'Assinatura Autodesk', value: 250, date: '2024-03-10', status: 'Pago', entityName: 'Autodesk', frequency: 'Recorrente' },
      { id: '3', type: 'INCOME', category: 'Consultoria', description: 'Estudo Prévio Loja Chiado', value: 1200, date: '2024-03-20', status: 'Pendente', entityName: 'Moda Lda', frequency: 'Pontual' },
      { id: '4', type: 'EXPENSE', category: 'Renda', description: 'Renda Atelier Março', value: 1500, date: '2024-03-01', status: 'Pago', entityName: 'Imobiliária X', frequency: 'Recorrente' },
      { id: '5', type: 'EXPENSE', category: 'Equipamento', description: 'Novo Monitor 4K', value: 450, date: '2024-03-25', status: 'Pendente', entityName: 'Worten', frequency: 'Pontual' },
      { id: '6', type: 'INCOME', category: 'Projecto', description: 'Fase 2 - Reabilitação Porto', value: 3500, date: '2024-02-28', status: 'Atrasado', entityName: 'Ana Pereira', frequency: 'Pontual' },
    ];
  });

  const [posts, setPosts] = useState<SocialPost[]>(() => {
    const saved = localStorage.getItem('promage_posts');
    return saved ? JSON.parse(saved) : [];
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('promage_tasks');
    return saved ? JSON.parse(saved) : [
      { id: '1', processId: 'p1', title: 'Revisão Projeto Cascais', priority: 5, status: 'Pendente', dueDate: '2024-03-26', assignedTo: '1' },
      { id: '2', processId: 'p2', title: 'Reunião Cliente Chiado', priority: 4, status: 'Em Curso', dueDate: '2024-03-27', assignedTo: '2' },
      { id: '3', processId: 'p3', title: 'Submeter Licenciamento Porto', priority: 5, status: 'Pendente', dueDate: '2024-03-28', assignedTo: '1' },
      { id: '4', processId: 'p2', title: 'Orçamento Loja Sintra', priority: 3, status: 'Pendente', dueDate: '2024-03-30', assignedTo: '3' },
      { id: '5', processId: 'p1', title: 'Visita Obra Alvalade', priority: 2, status: 'Concluído', dueDate: '2024-03-24', assignedTo: '2' },
      { id: '6', title: 'Atualizar Portefólio Social', priority: 1, status: 'Em Curso', dueDate: '2024-04-01', assignedTo: '1' },
    ];
  });

  useEffect(() => localStorage.setItem('promage_companies', JSON.stringify(companies)), [companies]);
  useEffect(() => localStorage.setItem('promage_clients', JSON.stringify(clients)), [clients]);
  useEffect(() => localStorage.setItem('promage_budgets', JSON.stringify(budgets)), [budgets]);
  useEffect(() => localStorage.setItem('promage_processes', JSON.stringify(processes)), [processes]);
  useEffect(() => localStorage.setItem('promage_team', JSON.stringify(team)), [team]);
  useEffect(() => localStorage.setItem('promage_transactions', JSON.stringify(transactions)), [transactions]);
  useEffect(() => localStorage.setItem('promage_posts', JSON.stringify(posts)), [posts]);
  useEffect(() => localStorage.setItem('promage_tasks', JSON.stringify(tasks)), [tasks]);

  useEffect(() => {
    const subs = getSubmenus(activeMenu, processes);
    if (activeMenu === MainMenu.PORTFOLIO && activeSubmenu !== 'Dashboard Portfólio' && !subs.includes(activeSubmenu)) {
      setActiveSubmenu('Dashboard Portfólio');
    } else if (activeMenu !== MainMenu.PORTFOLIO && subs.length > 0 && !subs.includes(activeSubmenu)) {
      setActiveSubmenu(subs[0]);
    }
  }, [activeMenu, activeSubmenu, processes]);

  const handleAcceptBudget = (budget: Budget) => {
    if (budget.status === 'Aceite') return;
    const updatedBudgets = budgets.map(b => b.id === budget.id ? { ...b, status: 'Aceite' as const } : b);
    setBudgets(updatedBudgets);

    const client = clients.find(c => c.id === budget.clientId);

    const newProcess: Process = {
      id: Math.random().toString(36).substr(2, 9),
      code: `PR${new Date().getFullYear()}/${(processes.length + 1).toString().padStart(3, '0')}`,
      title: budget.title,
      clientId: budget.clientId,
      status: 'Início',
      budget: budget.value,
      pricingMode: budget.pricingMode,
      startDate: new Date().toISOString().split('T')[0],
      phases: budget.phases,
      subcontracts: [],
      expenses: [],
      documents: []
    };
    setProcesses([newProcess, ...processes]);

    setActiveMenu(MainMenu.PORTFOLIO);
    setProcessTab('Fases');
    setActiveSubmenu(newProcess.code);
  };

  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    name: '',
    category: '',
    email: '',
    phone: ''
  });

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name || !newSupplier.category) return;

    const supplierToAdd: Supplier = {
      id: Math.random().toString(36).substr(2, 9),
      name: newSupplier.name!,
      category: newSupplier.category!,
      email: newSupplier.email || '',
      phone: newSupplier.phone || ''
    };

    setSuppliers([supplierToAdd, ...suppliers]);
    setIsNewSupplierModalOpen(false);
    setNewSupplier({ name: '', category: '', email: '', phone: '' });
  };

  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    email: '',
    phone: '',
    type: 'Quente'
  });

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.email) return;

    const clientToAdd: Client = {
      id: Math.random().toString(36).substr(2, 9),
      name: newClient.name!,
      email: newClient.email!,
      phone: newClient.phone || '',
      type: newClient.type as 'Frio' | 'Quente'
    };

    setClients([clientToAdd, ...clients]);
    setIsNewClientModalOpen(false);
    setNewClient({ name: '', email: '', phone: '', type: 'Quente' });
  };

  const [newProcess, setNewProcess] = useState<Partial<Process>>({
    title: '',
    clientId: '',
    budget: 0,
    pricingMode: 'PHASES'
  });

  const handleCreateProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcess.title || !newProcess.clientId) return;

    const client = clients.find(c => c.id === newProcess.clientId);
    const processToAdd: Process = {
      id: Math.random().toString(36).substr(2, 9),
      code: `PR${new Date().getFullYear()}/${(processes.length + 1).toString().padStart(3, '0')}`,
      title: newProcess.title!,
      clientId: newProcess.clientId!,
      status: 'Início',
      budget: newProcess.budget || 0,
      pricingMode: newProcess.pricingMode as 'PHASES' | 'GLOBAL',
      startDate: new Date().toISOString().split('T')[0],
      phases: [],
      subcontracts: [],
      expenses: [],
      documents: []
    };

    setProcesses([processToAdd, ...processes]);
    
    setIsNewProcessModalOpen(false);
    setNewProcess({ title: '', clientId: '', budget: 0, pricingMode: 'PHASES' });
    setActiveMenu(MainMenu.PORTFOLIO);
    setProcessTab('Fases');
    setActiveSubmenu(processToAdd.code);
  };

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    const newCompany: Company = { id: Math.random().toString(36).substr(2, 9), name: newCompanyName };
    setCompanies([...companies, newCompany]);
    setSelectedCompany(newCompany);
    setIsNewCompanyModalOpen(false);
    setNewCompanyName('');
  };

  const handleCreateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudget.title || !newBudget.clientId) return;

    const budgetToAdd: Budget = {
      id: Math.random().toString(36).substr(2, 9),
      title: newBudget.title!,
      clientId: newBudget.clientId!,
      value: newBudget.value || 0,
      pricingMode: newBudget.pricingMode as 'PHASES' | 'GLOBAL',
      status: 'Pendente',
      date: new Date().toISOString().split('T')[0],
      description: '',
      phases: []
    };

    setBudgets([budgetToAdd, ...budgets]);
    setIsNewBudgetModalOpen(false);
    setNewBudget({ title: '', clientId: '', value: 0, pricingMode: 'PHASES' });
    setActiveMenu(MainMenu.GESTAO);
    setActiveSubmenu('Orçamentos');
  };

  if (!selectedCompany) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-200 p-8">
        <div className="bg-white p-12 rounded-3xl shadow-2xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 text-white">
            <Building2 size={40} />
          </div>
          <h1 className="text-3xl font-bold mb-4 text-gray-900">Bem-vindo à Promage</h1>
          <p className="text-gray-600 mb-8">Selecione um gabinete para começar a gestão.</p>
          <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
            {companies.map(c => (
              <button key={c.id} onClick={() => setSelectedCompany(c)} className="w-full py-4 px-6 border-2 border-gray-200 rounded-2xl hover:border-gray-900 transition-all text-left flex items-center justify-between group">
                <span className="font-bold text-gray-700 group-hover:text-gray-900">{c.name}</span>
                <ChevronDown size={18} className="-rotate-90 text-gray-500" />
              </button>
            ))}
          </div>
          <button onClick={() => setIsNewCompanyModalOpen(true)} className="w-full mt-6 py-4 px-6 bg-gray-900 text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-all font-bold">
            <Plus size={20} /> Criar Nova Empresa
          </button>
        </div>

        {isNewCompanyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Novo Gabinete</h3>
                <button onClick={() => setIsNewCompanyModalOpen(false)} className="text-gray-500 hover:text-gray-900"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Nome do Atelier</label>
                  <input autoFocus required type="text" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} placeholder="Ex: Atelier Criativo" className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900" />
                </div>
                <button type="submit" className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all">Criar Gabinete</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const renderContent = () => {
    switch (activeMenu) {
      case MainMenu.DASHBOARD: 
        if (activeSubmenu === 'Trabalho diário') return <TasksView processes={processes} tasks={tasks} setTasks={setTasks} team={team} />;
        if (activeSubmenu === 'Financeiro') return <FinancialView transactions={transactions} setTransactions={setTransactions} clients={clients} processes={processes} />;
        return <StudioOverview processes={processes} tasks={tasks} onOpen={process => { setProcessTab('Fases'); setActiveMenu(MainMenu.PORTFOLIO); setActiveSubmenu(process.code); }} />;
      case MainMenu.PORTFOLIO: 
        if (activeSubmenu === 'Dashboard Portfólio') {
          return <ProcessTimeline processes={processes} tasks={tasks} legacyProjects={projects} onImport={() => {
            const imported = importPortfolio(projects, processes, tasks);
            setProcesses(imported.processes); setTasks(imported.tasks);
          }} onOpen={(process, tab) => { setProcessTab(tab); setActiveSubmenu(process.code); }} />;
        }
        return <ProcessView processes={processes} setProcesses={setProcesses} clients={clients} activeSubmenu={activeSubmenu} setTransactions={setTransactions} tasks={tasks} setTasks={setTasks} team={team} initialTab={processTab} />;
      case MainMenu.GESTAO:
        if (activeSubmenu === 'Clientes') return <ClientsView clients={clients} setClients={setClients} />;
        if (activeSubmenu === 'Fornecedores') return <div className="p-8 text-center text-gray-500 font-bold italic">Área de Fornecedores em desenvolvimento.</div>;
        if (activeSubmenu === 'Orçamentos') return <BudgetView budgets={budgets} setBudgets={setBudgets} clients={clients} setClients={setClients} onAccept={handleAcceptBudget} activeSubmenu={activeSubmenu} />;
        if (activeSubmenu === 'Financeiro') return <FinancialView transactions={transactions} setTransactions={setTransactions} clients={clients} processes={processes} />;
        if (activeSubmenu === 'Relatórios') return <div className="p-8 text-center text-gray-500 font-bold italic">Área de Relatórios em desenvolvimento.</div>;
        if (activeSubmenu === 'Equipa') return <TeamView team={team} setTeam={setTeam} />;
        return <ManagementView />;
      case MainMenu.SOCIAL: return <SocialView processes={processes} posts={posts} setPosts={setPosts} activeSubmenu={activeSubmenu} />;
      default: return <StudioOverview processes={processes} tasks={tasks} onOpen={process => { setProcessTab('Fases'); setActiveMenu(MainMenu.PORTFOLIO); setActiveSubmenu(process.code); }} />;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-200 p-4 gap-4">
      <header className="flex items-center gap-3 h-16 shrink-0">
        <div className="w-auto lg:w-60 shrink-0 flex items-center gap-3 px-4 h-full glass-effect rounded-2xl shadow-sm border border-white/50">
           <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white font-bold">P</div>
           <span className="hidden sm:block text-xl font-black text-gray-900 tracking-tight">Promage</span>
        </div>
        <div className="flex-1 min-w-0 glass-effect rounded-2xl h-full flex items-center px-2 lg:px-6 gap-3 shadow-sm border border-white/50 overflow-x-auto">
          <div className="flex items-center gap-1">
            {[MainMenu.DASHBOARD, MainMenu.PORTFOLIO, MainMenu.GESTAO].map((menu) => (
            <button key={menu} onClick={() => setActiveMenu(menu)} className={`relative px-3 lg:px-6 py-2 rounded-full text-sm font-bold transition-all ${activeMenu === menu ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>
              {menu}
            </button>
          ))}
        </div>
      </div>
    </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 overflow-hidden">
        <aside className="w-full lg:w-60 shrink-0 max-h-44 lg:max-h-none glass-effect rounded-2xl p-4 flex flex-col gap-4 shadow-sm border border-white/50 overflow-y-auto">
           <div className="hidden lg:flex items-center gap-3">
              <div className="w-12 h-12 bg-[#2D4E4E] rounded-2xl flex items-center justify-center text-white">
                {activeMenu === MainMenu.DASHBOARD && <LayoutDashboard size={24} />}
                {activeMenu === MainMenu.PORTFOLIO && <ClipboardList size={24} />}
                {activeMenu === MainMenu.GESTAO && <Settings size={24} />}
                {activeMenu === MainMenu.SOCIAL && <Share2 size={24} />}
              </div>
              <h2 className="text-2xl font-black text-gray-900">{activeMenu}</h2>
           </div>
           <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 custom-scrollbar">
              <div className="space-y-4">
                 <h3 className="text-[10px] uppercase tracking-widest text-gray-600 font-black">Navegação</h3>
                 <nav className="flex flex-col gap-1">
                    {getSubmenus(activeMenu, processes).map((sub, idx) => (
                      <button key={idx} onClick={() => { setProcessTab('Fases'); setActiveSubmenu(sub); }} className={`text-left py-2.5 px-3 rounded-xl text-sm transition-all font-bold ${activeSubmenu === sub ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                        {sub}
                      </button>
                    ))}
                 </nav>
              </div>
              <div className="space-y-4">
                 <h3 className="text-[10px] uppercase tracking-widest text-gray-600 font-black">Atalhos</h3>
                 <div className="flex flex-col gap-2">
                    {getShortcuts(activeMenu).map((shortcut, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => {
                          if (shortcut.label === 'Novo Projeto') {
                            if (activeMenu === MainMenu.PORTFOLIO) {
                              setIsAddingProject(true);
                            } else {
                              setIsNewProcessModalOpen(true);
                            }
                          }
                          if (shortcut.label === 'Novo Ticket') {
                            if (projects.length > 0) {
                              setEditingTicket({ project: selectedProject || projects[0] });
                            } else {
                              setIsAddingProject(true);
                            }
                          }
                          if (shortcut.label === 'Planeamento Gantt') setActiveSubmenu('Dashboard Portfólio');
                          if (shortcut.label === 'Novo Cliente') setIsNewClientModalOpen(true);
                          if (shortcut.label === 'Novo Fornecedor') setIsNewSupplierModalOpen(true);
                          if (shortcut.label === 'Novo Orçamento') setIsNewBudgetModalOpen(true);
                          if (shortcut.label === 'Novo Processo') setIsNewProcessModalOpen(true);
                        }}
                        className="flex items-center gap-2 p-3 bg-white/60 rounded-2xl text-[12px] font-bold text-gray-700 hover:bg-white transition-all border border-transparent hover:border-gray-200"
                      >
                        {shortcut.icon}
                        <span className="truncate">{shortcut.label}</span>
                      </button>
                    ))}
                 </div>
              </div>
           </div>
           <button onClick={() => setSelectedCompany(null)} className="hidden lg:block w-full mt-auto py-3 bg-red-100 text-red-700 rounded-xl text-xs font-black hover:bg-red-200 transition-all border border-red-200">Mudar de Empresa</button>
        </aside>

        <main className="flex-1 min-w-0 min-h-0 glass-effect rounded-2xl flex flex-col shadow-sm border border-white/50 overflow-hidden">
           <div className="p-4 shrink-0 flex flex-wrap gap-3 items-center justify-between border-b border-gray-200">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input type="text" placeholder="Pesquisar..." className="w-full bg-white/80 rounded-2xl py-3 pl-12 pr-6 text-sm text-gray-900 outline-none focus:ring-2 ring-gray-300 transition-all shadow-sm placeholder-gray-500" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 h-14 px-6 bg-white rounded-2xl text-xs font-black text-gray-900 shadow-sm border border-gray-100 min-w-[200px]">
                  <Building2 size={18} className="text-[#2D4E4E]" /> {selectedCompany.name}
                </div>
                <div className="hidden xl:flex items-center gap-3 h-14 bg-white pl-2 pr-6 rounded-2xl shadow-sm border border-gray-100 min-w-[200px]">
                   <img src="https://picsum.photos/seed/user1/40/40" alt="Profile" className="w-10 h-10 rounded-xl" />
                   <div className="text-right flex-1">
                      <p className="text-xs font-black text-gray-900">Fábio T.</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase text-right">Gestor</p>
                   </div>
                   <ChevronDown size={14} className="text-gray-500 ml-2" />
                </div>
              </div>
           </div>
           <div key={`${activeMenu}-${activeSubmenu}`} className="flex-1 min-h-0 p-4 lg:p-6 overflow-y-auto custom-scrollbar bg-white/30 relative">
               {/* Project Adder Overlay */}
               {isAddingProject && (
                 <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-80 p-4 bg-white border border-slate-200 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">New Project</h3>
                   <input
                     autoFocus
                     value={newProjectName}
                     onChange={(e) => setNewProjectName(e.target.value)}
                     placeholder="Enter project name..."
                     className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-200 mb-4"
                   />
                   <select
                     className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-200 mb-4"
                     onChange={(e) => setSelectedPresetId(e.target.value)}
                     value={selectedPresetId}
                   >
                     <option value="">No Preset</option>
                     {settings.projectPresets?.map(preset => (
                       <option key={preset.id} value={preset.id}>{preset.name}</option>
                     ))}
                   </select>
                   <div className="flex justify-end gap-2">
                     <button onClick={() => setIsAddingProject(false)} className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">Cancel</button>
                     <button onClick={handleAddProject} className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 shadow-sm">Create</button>
                   </div>
                 </div>
               )}
              {renderContent()}
           </div>
        </main>
      </div>

      {isNewSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Novo Fornecedor</h3>
              <button onClick={() => setIsNewSupplierModalOpen(false)} className="text-gray-500 hover:text-gray-900"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Nome da Empresa</label>
                <input autoFocus required type="text" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} placeholder="Ex: Madeiras & Cia" className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Categoria</label>
                <input required type="text" value={newSupplier.category} onChange={e => setNewSupplier({...newSupplier, category: e.target.value})} placeholder="Ex: Materiais, Iluminação..." className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Email</label>
                  <input type="email" value={newSupplier.email} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} placeholder="geral@fornecedor.pt" className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Telemóvel</label>
                  <input type="tel" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} placeholder="912 000 000" className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900" />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all">Registar Fornecedor</button>
            </form>
          </div>
        </div>
      )}

      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Novo Cliente</h3>
              <button onClick={() => setIsNewClientModalOpen(false)} className="text-gray-500 hover:text-gray-900"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Nome Completo</label>
                <input autoFocus required type="text" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} placeholder="Ex: João Silva" className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Email</label>
                <input required type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} placeholder="joao@email.com" className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Telemóvel</label>
                  <input type="tel" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} placeholder="912 000 000" className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Tipo</label>
                  <select value={newClient.type} onChange={e => setNewClient({...newClient, type: e.target.value as any})} className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900 appearance-none">
                    <option value="Quente">Quente</option>
                    <option value="Frio">Frio</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all">Registar Cliente</button>
            </form>
          </div>
        </div>
      )}

      {isNewProcessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Novo Projeto</h3>
              <button onClick={() => setIsNewProcessModalOpen(false)} className="text-gray-500 hover:text-gray-900"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateProcess} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Título do Projeto</label>
                <input autoFocus required type="text" value={newProcess.title} onChange={e => setNewProcess({...newProcess, title: e.target.value})} placeholder="Ex: Moradia Cascais" className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Cliente</label>
                <select required value={newProcess.clientId} onChange={e => setNewProcess({...newProcess, clientId: e.target.value})} className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900 appearance-none">
                  <option value="">Selecionar Cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Orçamento (€)</label>
                  <input type="number" value={newProcess.budget} onChange={e => setNewProcess({...newProcess, budget: Number(e.target.value)})} placeholder="0.00" className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Modo de Faturação</label>
                  <select value={newProcess.pricingMode} onChange={e => setNewProcess({...newProcess, pricingMode: e.target.value as any})} className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900 appearance-none">
                    <option value="PHASES">Por Fases</option>
                    <option value="GLOBAL">Valor Global</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all">Criar Projeto</button>
            </form>
          </div>
        </div>
      )}

      {editingTicket && (
        <TicketModal
          isOpen={!!editingTicket}
          onClose={() => setEditingTicket(null)}
          onSave={handleSaveTicket}
          onDelete={handleDeleteTicket}
          initialTicket={editingTicket.ticket}
          projectName={editingTicket.project.name}
          projectId={editingTicket.project.id}
          projects={projects}
          tickets={editingTicket.project.tickets}
          users={settings.users}
          presetTitles={settings.presetTitles}
          currentUser={{ id: 'u1', name: 'Fábio T.', canLogin: true }} // Fixed to match current user
        />
      )}

      {editingProject && (
        <ProjectModal
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
          project={editingProject}
        />
      )}

      {isNewBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Novo Orçamento</h3>
              <button onClick={() => setIsNewBudgetModalOpen(false)} className="text-gray-500 hover:text-gray-900"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Título da Proposta</label>
                <input autoFocus required type="text" value={newBudget.title} onChange={e => setNewBudget({...newBudget, title: e.target.value})} placeholder="Ex: Estudo Prévio" className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Cliente</label>
                <select required value={newBudget.clientId} onChange={e => setNewBudget({...newBudget, clientId: e.target.value})} className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900 appearance-none">
                  <option value="">Selecionar Cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Valor (€)</label>
                  <input type="number" value={newBudget.value} onChange={e => setNewBudget({...newBudget, value: Number(e.target.value)})} placeholder="0.00" className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Modo</label>
                  <select value={newBudget.pricingMode} onChange={e => setNewBudget({...newBudget, pricingMode: e.target.value as any})} className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 ring-black/10 text-gray-900 appearance-none">
                    <option value="PHASES">Por Fases</option>
                    <option value="GLOBAL">Valor Global</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all">Criar Orçamento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function getSubmenus(menu: MainMenu, processes: Process[] = []): string[] {
  switch(menu) {
    case MainMenu.DASHBOARD: return ['Visão Geral', 'Trabalho diário', 'Financeiro', 'Relatórios', 'Equipa'];
    case MainMenu.PORTFOLIO: return processes.map(p => p.code);
    case MainMenu.GESTAO: return ['Clientes', 'Fornecedores', 'Orçamentos', 'Financeiro', 'Relatórios', 'Equipa'];
    case MainMenu.SOCIAL: return ['Feed', 'Publicações', 'Agendados', 'Analytics'];
    default: return [];
  }
}

function getShortcuts(menu: MainMenu) {
  if (menu === MainMenu.PORTFOLIO) {
    return [
      { label: 'Novo Processo', icon: <Plus size={14} className="text-[#2D4E4E]" /> },
      { label: 'Planeamento Gantt', icon: <LayoutDashboard size={14} className="text-[#2D4E4E]" /> },
    ];
  }
  if (menu === MainMenu.SOCIAL) {
    return [
      { label: 'Nova Publicação', icon: <Plus size={14} className="text-[#2D4E4E]" /> },
      { label: 'Ver Analytics', icon: <TrendingUp size={14} className="text-[#2D4E4E]" /> },
    ];
  }
  return [
    { label: 'Novo Cliente', icon: <Users size={14} className="text-[#2D4E4E]" /> },
    { label: 'Novo Fornecedor', icon: <Users size={14} className="text-[#2D4E4E]" /> },
    { label: 'Novo Orçamento', icon: <FileText size={14} className="text-[#2D4E4E]" /> },
  ];
}

export default App;
