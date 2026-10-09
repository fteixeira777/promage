import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { addDays, differenceInDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { Circle, PlayCircle, CheckCircle2, User, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, Ticket } from '../types';
import { cn } from '../lib/utils';

interface GanttChartProps {
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

export const GanttChart: React.FC<GanttChartProps> = ({ 
  projects, 
  onTicketClick, 
  onUpdateTicketStatus,
  onUpdateTicketDates,
  onUpdateProjectName,
  onProjectClick,
  onTimelineClick,
  isHolistic = false,
  zoomLevel
}) => {
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = React.useState('');

  const { startDate, days, minEndDate, maxEndDate, flattenedTickets } = useMemo(() => {
    const allTickets = projects?.flatMap(p => p.tickets.map(t => ({ ...t, projectId: p.id, projectColor: p.color, projectName: p.name }))) || [];
    
    if (allTickets.length === 0) {
      const start = startOfDay(new Date());
      const end = addDays(start, 30);
      return {
        startDate: start,
        days: eachDayOfInterval({ start, end }),
        minEndDate: null,
        maxEndDate: null,
        flattenedTickets: []
      };
    }

    const ticketEndDates = allTickets.map(t => addDays(new Date(t.startDate), t.durationDays).getTime());
    const minEnd = d3.min(ticketEndDates) || 0;
    const maxEnd = d3.max(ticketEndDates) || 0;

    const allDates = allTickets.flatMap(t => [
      new Date(t.startDate),
      addDays(new Date(t.startDate), t.durationDays)
    ]);

    const start = startOfDay(addDays(d3.min(allDates) || new Date(), -2));
    const end = endOfDay(addDays(d3.max(allDates) || new Date(), 14));
    
    return {
      startDate: start,
      days: eachDayOfInterval({ start, end }),
      minEndDate: minEnd,
      maxEndDate: maxEnd,
      flattenedTickets: allTickets
    };
  }, [projects]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo': return <Circle className="w-3 h-3" />;
      case 'in-progress': return <PlayCircle className="w-3 h-3" />;
      case 'done': return <CheckCircle2 className="w-3 h-3" />;
      default: return null;
    }
  };

  const handleExportPDF = (project: Project) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(project.name, 14, 22);
    
    // Description & Stats
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Total Tasks: ${project.tickets.length} | Active: ${project.tickets.filter(t => t.status === 'in-progress').length} | Done: ${project.tickets.filter(t => t.status === 'done').length}`, 14, 30);
    
    if (project.description) {
      doc.text(project.description, 14, 38);
    }

    // Table
    const tableData = project.tickets.map(t => {
      const notesText = Array.isArray(t.notes) && t.notes.length > 0
        ? t.notes.map(n => `${n.author}: ${n.text}`).join(' | ')
        : '-';

      return [
        t.title,
        t.status.toUpperCase(),
        new Date(t.startDate).toLocaleDateString(),
        `${t.durationDays} days`,
        t.assignee || 'Unassigned',
        notesText.length > 50 ? notesText.substring(0, 50) + '...' : notesText
      ];
    });

    autoTable(doc, {
      startY: project.description ? 45 : 40,
      head: [['Task', 'Status', 'Start Date', 'Duration', 'Assignee', 'Notes']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }, // slate-900
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 50 },
        5: { cellWidth: 'auto' }
      }
    });

    doc.save(`${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-timeline.pdf`);
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Sidebar Header */}
      <div className={cn("flex border-b border-slate-200 bg-slate-50/50", isHolistic ? "h-8" : "h-14")}>
        <div className={cn("flex-shrink-0 border-r border-slate-200 flex items-center font-black text-slate-400 uppercase tracking-[0.2em]", isHolistic ? "w-[160px] px-4 text-[8px]" : "w-[260px] px-6 text-[10px]")}>
          Portfolio Roadmap
        </div>
        <div className="flex-grow bg-slate-50/20" />
      </div>

      {/* Body */}
      <div className="flex-grow overflow-y-auto gantt-scroll">
        {projects.map((project) => {
          const sortedTickets = [...project.tickets].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
          
          return (
            <div key={project.id} className={cn("flex border-b border-slate-100 hover:bg-slate-50/30 transition-colors group", isHolistic ? "min-h-[60px]" : "min-h-[120px]")}>
              {/* Project Info Sidebar */}
            <div className={cn("flex-shrink-0 border-r border-slate-200 flex flex-col justify-center bg-slate-50/10", isHolistic ? "w-[160px] px-4 py-0" : "w-[260px] px-6 py-8")}>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)] flex-shrink-0" style={{ backgroundColor: project.color }} />
                {editingProjectId === project.id ? (
                  <input
                    autoFocus
                    value={editingProjectName}
                    onChange={(e) => setEditingProjectName(e.target.value)}
                    onBlur={() => {
                      if (editingProjectName.trim() && editingProjectName !== project.name) {
                        onUpdateProjectName?.(project.id, editingProjectName.trim());
                      }
                      setEditingProjectId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingProjectName.trim() && editingProjectName !== project.name) {
                          onUpdateProjectName?.(project.id, editingProjectName.trim());
                        }
                        setEditingProjectId(null);
                      } else if (e.key === 'Escape') {
                        setEditingProjectId(null);
                      }
                    }}
                    className={cn("font-black text-slate-900 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:ring-2 focus:ring-blue-500 w-full", isHolistic ? "text-xs" : "text-base")}
                  />
                ) : (
                  <span 
                    onClick={() => onProjectClick?.(project)}
                    className={cn("font-black text-slate-900 truncate tracking-tight cursor-pointer hover:bg-slate-200/50 px-1 rounded transition-colors", isHolistic ? "text-xs" : "text-base")}
                    title="Click to edit project"
                  >
                    {project.name}
                  </span>
                )}
              </div>
              {!isHolistic && (
                <>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {project.tickets.length} Tasks
                    </span>
                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                      {project.tickets.filter(t => t.status === 'in-progress').length} Active
                    </span>
                  </div>
                  <button
                    onClick={() => handleExportPDF(project)}
                    className="mt-3 flex items-center gap-1.5 w-fit px-2 py-1 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                  >
                    <Download className="w-3 h-3" />
                    Export PDF
                  </button>
                </>
              )}
            </div>

            {/* Grid Area (Per Project) */}
            <div 
              className="flex-grow bg-white/50 p-4 sm:p-6 cursor-crosshair"
              onClick={(e) => {
                // If clicking empty space (outer or inner container), create a ticket
                if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('ticket-container')) {
                  const lastTicket = sortedTickets[sortedTickets.length - 1];
                  const newStartDate = lastTicket 
                    ? addDays(new Date(lastTicket.startDate), lastTicket.durationDays) 
                    : new Date();
                  onTimelineClick?.(project, newStartDate);
                }
              }}
            >
              <div className="ticket-container flex flex-nowrap gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {/* Tickets for this project */}
                {sortedTickets.map((ticket) => {
                  const endDate = addDays(new Date(ticket.startDate), ticket.durationDays).getTime();
                  
                  // Color logic (Portfolio-wide)
                  const getTicketColor = () => {
                    if (ticket.status === 'done') return '#10b981'; // Green
                    if (endDate === maxEndDate) return '#3b82f6'; // Blue
                    if (endDate === minEndDate) return '#ef4444'; // Red
                    return '#94a3b8'; // Default Slate-400
                  };

                  const ticketColor = getTicketColor();
                  const today = new Date();
                  const isOverdue = ticket.status !== 'done' && endDate < today.getTime();
                  const isUrgent = ticket.status !== 'done' && (ticket.isUrgent || (endDate - today.getTime()) <= (5 * 24 * 60 * 60 * 1000));
                  
                  // Zoom level affects the base dimensions
                  const zoomFactor = (zoomLevel || 100) / 100;
                  const baseWidth = isHolistic ? 140 : 240;
                  const baseHeight = isHolistic ? 48 : 100;
                  const width = baseWidth * zoomFactor;
                  const height = baseHeight * zoomFactor;

                  return (
                    <motion.div 
                      key={ticket.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', ticket.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedId = e.dataTransfer.getData('text/plain');
                        if (draggedId && draggedId !== ticket.id) {
                          // Reorder by setting the dragged ticket's start date just before the dropped ticket
                          const targetDate = new Date(ticket.startDate);
                          targetDate.setSeconds(targetDate.getSeconds() - 1);
                          onUpdateTicketDates?.(project.id, draggedId, targetDate.toISOString());
                        }
                      }}
                      onClick={() => onTicketClick?.(project, ticket)}
                      initial={false}
                      animate={isUrgent ? {
                        scale: [1, 1.03, 1],
                        boxShadow: [
                          "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                          "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                          "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
                        ]
                      } : {}}
                      transition={isUrgent ? {
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      } : {}}
                      className={cn(
                        "rounded-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col shadow-md border border-slate-200 border-l-4 overflow-hidden group/ticket flex-shrink-0",
                        isHolistic ? "p-2 justify-center" : "p-3",
                        ticket.status === 'done' ? "opacity-60" : "opacity-100",
                        ticket.status === 'in-progress' ? "ring-2 ring-slate-200 ring-offset-1" : "",
                        isUrgent && !isOverdue ? "border-red-500 ring-1 ring-red-500" : "",
                        isOverdue ? "border-red-600 ring-2 ring-red-600" : ""
                      )}
                      style={{ 
                        width,
                        height,
                        backgroundColor: isOverdue ? '#800080' : (isUrgent ? '#fee2e2' : 'white'),
                        borderLeftColor: isOverdue ? '#ff0000' : (isUrgent ? '#ef4444' : ticketColor),
                        color: isOverdue ? '#ff0000' : 'inherit'
                      }}
                    >
                      {/* Status & Duration */}
                      {!isHolistic && zoomFactor > 0.6 && (
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: isOverdue ? '#ff0000' : ticketColor }}>
                            {getStatusIcon(ticket.status)}
                            {ticket.status.replace('-', ' ')}
                          </div>
                          <div className="flex items-center gap-1">
                            {ticket.status !== 'done' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateTicketStatus?.(project.id, ticket.id, 'done');
                                }}
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-[8px] font-black transition-colors",
                                  isOverdue ? "bg-white text-[#ff0000] hover:bg-slate-100" : "bg-slate-100 hover:bg-emerald-100 text-slate-400 hover:text-emerald-600"
                                )}
                              >
                                DONE
                              </button>
                            )}
                            <div className={cn(
                              "text-[9px] font-black px-1.5 py-0.5 rounded",
                              isOverdue ? "bg-white text-[#ff0000]" : "text-white"
                            )} style={{ backgroundColor: isOverdue ? undefined : ticketColor }}>
                              {ticket.durationDays}D
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Title */}
                      <h4 
                        className={cn("font-bold leading-tight", isHolistic ? "text-[10px] mb-0 truncate" : "text-sm mb-2 line-clamp-2", isOverdue ? "text-[#ff0000]" : "text-slate-800")}
                        style={{ fontSize: isHolistic ? `${Math.max(8, 10 * zoomFactor)}px` : `${Math.max(10, 14 * zoomFactor)}px` }}
                      >
                        {ticket.title}
                      </h4>

                      {/* Footer: Assignee */}
                      {!isHolistic && zoomFactor > 0.6 && (
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0", isOverdue ? "bg-red-900/30" : "bg-slate-100")}>
                              <User className={cn("w-2.5 h-2.5", isOverdue ? "text-[#ff0000]" : "text-slate-400")} />
                            </div>
                            <span className={cn("text-[9px] font-medium truncate max-w-[80px]", isOverdue ? "text-[#ff0000]" : "text-slate-500")}>
                              {ticket.assignee || 'Unassigned'}
                            </span>
                          </div>
                          
                          {/* Project Indicator */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isOverdue ? '#ff0000' : project.color }} />
                            <span className={cn("text-[7px] font-bold uppercase truncate max-w-[40px]", isOverdue ? "text-[#ff0000]" : "text-slate-300")}>{project.name}</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <p className="text-sm font-medium">No projects in portfolio</p>
            <p className="text-xs">Add a project to start visualizing your timeline</p>
          </div>
        )}
      </div>
    </div>
  );
};
