import React, { useState, useRef } from 'react';
import { X, Calendar, Clock, User, CheckCircle2, Circle, PlayCircle, Paperclip, FileText, Image as ImageIcon, Trash2, Send } from 'lucide-react';
import { Ticket, TicketStatus, Note, AppUser, Project } from '../types';
import { cn } from '../lib/utils';
import { addDays, differenceInDays } from 'date-fns';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ticket: Partial<Ticket>, projectId: string) => void;
  onDelete?: () => void;
  initialTicket?: Ticket;
  projectName: string;
  projectId: string;
  projects: Project[];
  tickets: Ticket[];
  users: AppUser[];
  presetTitles: string[];
  currentUser: AppUser;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialTicket,
  projectName,
  projectId: initialProjectId,
  projects,
  tickets,
  users,
  presetTitles,
  currentUser
}) => {
  const [title, setTitle] = useState(initialTicket?.title || '');
  const [startDate, setStartDate] = useState(initialTicket?.startDate ? initialTicket.startDate.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState(initialTicket?.durationDays || 1);
  const [finishDate, setFinishDate] = useState(() => {
    const start = initialTicket?.startDate ? new Date(initialTicket.startDate) : new Date();
    const dur = initialTicket?.durationDays || 1;
    return addDays(start, dur).toISOString().split('T')[0];
  });
  const [status, setStatus] = useState<TicketStatus>(initialTicket?.status || 'todo');
  const [isUrgent, setIsUrgent] = useState(initialTicket?.isUrgent || false);
  const [assignee, setAssignee] = useState(initialTicket?.assignee || '');
  const [projectId, setProjectId] = useState(initialProjectId);
  const [notes, setNotes] = useState<Note[]>(Array.isArray(initialTicket?.notes) ? initialTicket.notes : []);
  const [newNoteText, setNewNoteText] = useState('');
  const [attachments, setAttachments] = useState<{ id: string; name: string; dataUrl: string; type: string }[]>(initialTicket?.attachments || []);
  const [startAfterLast, setStartAfterLast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lastTicket = tickets.length > 0
    ? tickets.reduce((max, t) => {
        const tEnd = addDays(new Date(t.startDate), t.durationDays).getTime();
        const maxEnd = addDays(new Date(max.startDate), max.durationDays).getTime();
        return tEnd > maxEnd ? t : max;
      }, tickets[0])
    : null;

  const lastTicketEndDate = lastTicket ? addDays(new Date(lastTicket.startDate), lastTicket.durationDays) : null;

  const handleStartAfterLastChange = (checked: boolean) => {
    setStartAfterLast(checked);
    if (checked && lastTicketEndDate) {
      const newStartDate = lastTicketEndDate.toISOString().split('T')[0];
      setStartDate(newStartDate);
      setFinishDate(addDays(new Date(newStartDate), duration).toISOString().split('T')[0]);
    }
  };

  if (!isOpen) return null;

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      text: newNoteText.trim(),
      author: currentUser.name,
      timestamp: new Date().toISOString()
    };
    setNotes(prev => [...prev, newNote]);
    setNewNoteText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size to 2MB for prototype
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAttachments(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        dataUrl
      }]);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      startDate: new Date(startDate).toISOString(),
      durationDays: Number(duration),
      status,
      isUrgent,
      assignee,
      notes,
      attachments
    }, projectId);
    onClose();
  };

  const isOverdue = status !== 'done' && addDays(new Date(startDate), duration).getTime() < new Date().getTime();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className={cn(
          "px-6 py-4 border-b flex items-center justify-between flex-shrink-0 transition-colors duration-500",
          isOverdue ? "bg-[#800080] border-red-600" : "bg-slate-50/50 border-slate-100"
        )}>
          <div className="flex items-center gap-3">
            <div>
              <h3 className={cn("text-lg font-bold transition-colors", isOverdue ? "text-[#ff0000]" : "text-slate-800")}>
                {initialTicket ? 'Edit Ticket' : 'New Ticket'}
                {isOverdue && <span className="ml-2 text-xs uppercase tracking-widest bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">Overdue</span>}
              </h3>
              <p className={cn("text-xs transition-colors", isOverdue ? "text-red-400" : "text-slate-500")}>Project: {projectName}</p>
            </div>
          </div>
          <button onClick={onClose} className={cn("p-2 rounded-full transition-colors", isOverdue ? "hover:bg-red-900/30 text-red-400" : "hover:bg-slate-200 text-slate-500")}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
              >
                {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</label>
            <input
              autoFocus
              required
              list="preset-titles"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all"
              placeholder="What needs to be done?"
            />
            <datalist id="preset-titles">
              {presetTitles.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setStartDate(newStart);
                    setStartAfterLast(false);
                    // Update finish date based on new start and existing duration
                    setFinishDate(addDays(new Date(newStart), duration).toISOString().split('T')[0]);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
              {!initialTicket && lastTicketEndDate && (
                <label className="flex items-center gap-2 text-xs text-slate-600 mt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={startAfterLast}
                    onChange={(e) => handleStartAfterLastChange(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  Start after last ticket ({lastTicketEndDate.toISOString().split('T')[0]})
                </label>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Duration (Days)</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    min="1"
                    required
                    value={duration}
                    onChange={(e) => {
                      const newDur = Number(e.target.value);
                      setDuration(newDur);
                      // Update finish date based on new duration
                      setFinishDate(addDays(new Date(startDate), newDur).toISOString().split('T')[0]);
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Finish Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={finishDate}
                    onChange={(e) => {
                      const newFinish = e.target.value;
                      setFinishDate(newFinish);
                      // Update duration based on new finish date
                      const newDur = differenceInDays(new Date(newFinish), new Date(startDate));
                      setDuration(Math.max(1, newDur));
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Urgency</label>
            <button
              type="button"
              onClick={() => setIsUrgent(!isUrgent)}
              className={cn(
                "w-full py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all",
                isUrgent 
                  ? "bg-red-50 border-red-200 text-red-600 ring-1 ring-red-200" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {isUrgent ? 'Urgent' : 'Urgency Fucking Sprint'}
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
            <div className="flex gap-2">
              {(['todo', 'in-progress', 'done'] as TicketStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all",
                    status === s 
                      ? "bg-blue-50 border-blue-200 text-blue-600 ring-1 ring-blue-200" 
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {s === 'todo' && <Circle className="w-3 h-3" />}
                  {s === 'in-progress' && <PlayCircle className="w-3 h-3" />}
                  {s === 'done' && <CheckCircle2 className="w-3 h-3" />}
                  {s.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assignee</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes & Comments</label>
            
            <div className="flex gap-2">
              <input
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
                className="flex-grow px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all text-sm"
                placeholder="Type a note and press Enter..."
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={!newNoteText.trim()}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-xs font-bold"
              >
                <Send className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {notes.length > 0 && (
              <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {notes.map(note => (
                  <div key={note.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                          <User className="w-3 h-3 text-slate-500" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">{note.author}</span>
                      </div>
                      <span className="text-[9px] font-medium text-slate-400">
                        {new Date(note.timestamp).toLocaleDateString()} at {new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap pl-6">{note.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attachments</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" />
                Add File
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,application/pdf"
                className="hidden"
              />
            </div>
            
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg group">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {att.type.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      <a 
                        href={att.dataUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs font-medium text-slate-700 truncate hover:underline"
                      >
                        {att.name}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-3 border-t border-slate-100 mt-6">
            {onDelete && initialTicket && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            )}
            <div className="flex-grow" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
            >
              {initialTicket ? 'Update' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
