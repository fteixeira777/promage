
export enum MainMenu {
  DASHBOARD = 'Dashboard',
  PORTFOLIO = 'Portfólio',
  GESTAO = 'Gestão',
  SOCIAL = 'Social'
}

export type TicketStatus = 'todo' | 'in-progress' | 'done';

export interface AppUser {
  id: string;
  name: string;
  canLogin?: boolean;
}


export interface Company {
  id: string;
  name: string;
  logo?: string;
}

export interface Client {
  id: string;
  name: string;
  type: 'Frio' | 'Quente';
  email: string;
  phone: string;
  address?: string;
  nif?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  fee: number; // Honorário mensal
  email: string;
  phone: string;
  status: 'Ativo' | 'Inativo';
}

export interface Phase {
  id: string;
  name: string;
  value: number;
  status: 'Pendente' | 'Adjudicado' | 'Em Execução' | 'Concluído';
  date?: string;
  startDate?: string;
  endDate?: string;
  completedAt?: string;
  responsible?: string;
  blocker?: string;
}

export interface PaymentSchedule {
  id: string;
  description: string;
  direction: 'INCOME' | 'EXPENSE';
  amount: number;
  rule: 'DATE' | 'PHASE';
  dueDate?: string;
  phaseId?: string;
  offsetDays: number;
  settlements: { id: string; amount: number; date: string }[];
}

export interface Subcontract {
  id: string;
  companyName: string;
  service: string;
  value: number;
  phases: Phase[];
}

export interface Expense {
  id: string;
  description: string;
  value: number;
  date: string;
}

export interface ProcessDocument {
  id: string;
  name: string;
  category: string;
  type: string;
  size: string;
  date: string;
  url?: string;
}

export interface Process {
  id: string;
  code: string;
  title: string;
  clientId: string;
  status: 'Início' | 'Projeto' | 'Execução' | 'Finalizado';
  budget: number;
  pricingMode: 'PHASES' | 'GLOBAL';
  startDate: string;
  phases: Phase[];
  subcontracts: Subcontract[];
  expenses: Expense[];
  documents: ProcessDocument[];
  payments?: PaymentSchedule[];
  sourcePortfolioId?: string;
}

export interface Budget {
  id: string;
  title: string;
  clientId: string;
  value: number;
  pricingMode: 'PHASES' | 'GLOBAL';
  status: 'Pendente' | 'Aceite' | 'Recusado' | 'Cancelado';
  date: string;
  description: string;
  phases: Phase[];
}

export interface FinancialTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  value: number;
  date: string;
  status: 'Pendente' | 'Pago' | 'Atrasado';
  entityName: string;
  frequency: 'Pontual' | 'Recorrente';
}

export interface SocialPost {
  id: string;
  processId: string;
  title: string;
  content: string;
  imageUrl?: string;
  status: 'Draft' | 'Published' | 'Scheduled';
  scheduledDate?: string;
  publishedDate?: string;
  likes: number;
  comments: number;
}

export interface Task {
  id: string;
  processId?: string; // ID do Projeto (Processo)
  phaseId?: string;
  startDate?: string;
  notes?: string;
  legacyTicket?: Ticket;
  title: string;
  priority: 1 | 2 | 3 | 4 | 5;
  status: 'Pendente' | 'Em Curso' | 'Concluído';
  dueDate: string;
  assignedTo?: string; // ID do membro da equipa
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  email: string;
  phone: string;
  address?: string;
  nif?: string;
}


export interface ProjectPreset {
  id: string;
  name: string;
  subtasks: string[];
}

export interface AppSettings {
  users: AppUser[];
  presetTitles: string[];
  projectPresets: ProjectPreset[];
}

export interface Note {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  title: string;
  startDate: string; // ISO string
  durationDays: number;
  status: TicketStatus;
  assignee?: string;
  notes?: Note[];
  attachments?: { id: string; name: string; dataUrl: string; type: string }[];
  isUrgent?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  tickets: Ticket[];
  color: string;
  clientName?: string;
  address?: string;
  contact?: string;
  notes?: string;
}

export interface Portfolio {
  projects: Project[];
}

