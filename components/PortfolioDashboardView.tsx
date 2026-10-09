import React from 'react';
import { Project, Ticket } from '../types';
import { GanttChart } from './GanttChart';
import { Clock, CheckCircle2 } from 'lucide-react';

interface PortfolioDashboardViewProps {
  projects: Project[];
  onTicketClick?: (project: Project, ticket: Ticket) => void;
  onUpdateTicketStatus?: (projectId: string, ticketId: string, status: 'todo' | 'in-progress' | 'done') => void;
  onUpdateTicketDates?: (projectId: string, ticketId: string, newStartDate: string) => void;
  onUpdateProjectName?: (projectId: string, newName: string) => void;
  onProjectClick?: (project: Project) => void;
  onTimelineClick?: (project: Project, date: Date) => void;
  isHolistic?: boolean;
  zoomLevel?: number;
}

const PortfolioDashboardView: React.FC<PortfolioDashboardViewProps> = ({ 
  projects, 
  onTicketClick,
  onUpdateTicketStatus,
  onUpdateTicketDates,
  onUpdateProjectName,
  onProjectClick,
  onTimelineClick,
  isHolistic,
  zoomLevel
}) => {
  // Calculate stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.tickets.some(t => t.status === 'in-progress')).length;
  const completedProjects = projects.filter(p => p.tickets.length > 0 && p.tickets.every(t => t.status === 'done')).length;

  return (
    <div className="flex-grow flex flex-col h-full bg-white/30 rounded-[2.5rem] overflow-hidden">
      {!isHolistic && (
        <div className="p-8 flex items-center justify-between bg-white border-b border-gray-200 shadow-sm">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard de Portfólio</h1>
            <p className="text-gray-500 font-bold mt-1 uppercase text-[10px] tracking-widest text-[#CB922E]">Gantt & Roadmap Estratégico</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 min-w-[150px]">
              <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Ativos</p>
                <p className="text-xl font-black text-gray-900">{activeProjects}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 min-w-[150px]">
              <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Concluídos</p>
                <p className="text-xl font-black text-gray-900">{completedProjects}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={isHolistic ? "flex-grow" : "flex-grow p-8"}>
        <GanttChart 
          projects={projects}
          onTicketClick={onTicketClick}
          onUpdateTicketStatus={onUpdateTicketStatus}
          onUpdateTicketDates={onUpdateTicketDates}
          onUpdateProjectName={onUpdateProjectName}
          onProjectClick={onProjectClick}
          onTimelineClick={onTimelineClick}
          isHolistic={isHolistic}
          zoomLevel={zoomLevel}
        />
      </div>
    </div>
  );
};

export default PortfolioDashboardView;
