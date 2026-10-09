
import React, { useState } from 'react';
import { 
  Plus, 
  X, 
  CheckCircle2, 
  Mail, 
  Phone, 
  UserCircle, 
  Briefcase, 
  Coins, 
  Trash2,
  Edit2
} from 'lucide-react';
import { TeamMember } from '../types';

interface TeamViewProps {
  team: TeamMember[];
  setTeam: React.Dispatch<React.SetStateAction<TeamMember[]>>;
}

const TeamView: React.FC<TeamViewProps> = ({ team, setTeam }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TeamMember>>({
    name: '',
    role: '',
    fee: 0,
    email: '',
    phone: '',
    status: 'Ativo'
  });

  const handleOpenAddModal = () => {
    setEditingMemberId(null);
    setFormData({ name: '', role: '', fee: 0, email: '', phone: '', status: 'Ativo' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setFormData({ ...member });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.role) return;

    if (editingMemberId) {
      setTeam(team.map(m => m.id === editingMemberId ? { ...m, ...formData } as TeamMember : m));
    } else {
      const memberToAdd: TeamMember = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name!,
        role: formData.role!,
        fee: Number(formData.fee) || 0,
        email: formData.email || '',
        phone: formData.phone || '',
        status: 'Ativo'
      };
      setTeam([...team, memberToAdd]);
    }

    setIsModalOpen(false);
    setFormData({ name: '', role: '', fee: 0, email: '', phone: '', status: 'Ativo' });
  };

  const confirmDelete = (id: string) => {
    setMemberToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleRemoveMember = () => {
    if (memberToDelete) {
      setTeam(team.filter(m => m.id !== memberToDelete));
      setIsDeleteModalOpen(false);
      setMemberToDelete(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Gestão de Equipa</h2>
          <p className="text-sm text-gray-600 font-bold">Controlo de colaboradores, cargos e custos de honorários.</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-6 py-3 bg-[#2D4E4E] text-white rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all"
        >
          <Plus size={20} /> Adicionar Colaborador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map((member) => (
          <div key={member.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-200 shadow-sm hover:shadow-lg transition-all group relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-[#2D4E4E] border border-gray-100">
                <UserCircle size={32} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-lg leading-tight">{member.name}</h3>
                <p className="text-[10px] text-[#2D4E4E] font-black uppercase tracking-widest">{member.role}</p>
              </div>
            </div>

            <div className="space-y-3 pb-6 border-b border-gray-50 mb-6">
               <div className="flex items-center gap-3 text-xs font-bold text-gray-700">
                  <Mail size={14} className="text-gray-400" /> {member.email}
               </div>
               <div className="flex items-center gap-3 text-xs font-bold text-gray-700">
                  <Phone size={14} className="text-gray-400" /> {member.phone}
               </div>
               <div className="flex items-center gap-3 text-xs font-black text-[#2D4E4E]">
                  <Coins size={14} className="text-gray-400" /> €{member.fee.toLocaleString()} <span className="text-[10px] text-gray-400 font-bold">/mês</span>
               </div>
            </div>

            <div className="flex justify-between items-center">
               <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider ${member.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {member.status}
               </span>
               <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleOpenEditModal(member); }} 
                    className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-[#2D4E4E] hover:text-white transition-all shadow-sm"
                    title="Editar"
                  >
                    <Edit2 size={14}/>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); confirmDelete(member.id); }} 
                    className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                    title="Eliminar"
                  >
                    <Trash2 size={14}/>
                  </button>
               </div>
            </div>
          </div>
        ))}
        {team.length === 0 && (
          <div className="col-span-full py-24 bg-white/50 rounded-[3rem] border-4 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-600">
             <UserCircle size={48} className="mb-4 text-gray-300"/>
             <p className="font-black text-gray-900">Nenhum membro na equipa.</p>
             <p className="text-sm font-bold text-gray-500">Comece por adicionar quem trabalha no atelier.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 border border-gray-200">
            <div className="p-8 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-[2.5rem]">
              <h3 className="text-xl font-black text-gray-900">{editingMemberId ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-200 transition-all"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">Nome Completo *</label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20" placeholder="Ex: Ana Costa" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">Cargo / Função *</label>
                    <input required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20" placeholder="Ex: Arquitecto Júnior" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">Honorário Mensal (€) *</label>
                    <input required type="number" value={formData.fee || ''} onChange={e => setFormData({...formData, fee: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20" placeholder="Ex: 1500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20" placeholder="ana@email.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">Telemóvel</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20" placeholder="910 000 000" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">Estado</label>
                    <select 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value as 'Ativo' | 'Inativo'})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20 appearance-none"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
               </div>

               <div className="pt-8 border-t border-gray-100 flex justify-end gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-4 text-sm font-black text-gray-500 hover:text-gray-900 transition-all">Cancelar</button>
                  <button type="submit" className="px-10 py-4 bg-[#2D4E4E] text-white rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all flex items-center gap-3">
                    <CheckCircle2 size={20}/> {editingMemberId ? 'Atualizar Colaborador' : 'Guardar Colaborador'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Confirmar Remoção</h3>
            <p className="text-sm text-gray-600 font-bold mb-8">Tem a certeza que deseja remover este colaborador da equipa? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-4 text-sm font-black text-gray-500 hover:text-gray-900 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleRemoveMember}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-red-700 transition-all"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamView;
