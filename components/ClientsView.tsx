
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  FileBadge, 
  X,
  UserPlus,
  CheckCircle2,
  MoreVertical
} from 'lucide-react';
import { Client } from '../types';

interface ClientsViewProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
}

const ClientsView: React.FC<ClientsViewProps> = ({ clients, setClients }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    nif: '',
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
      type: newClient.type as 'Frio' | 'Quente',
      address: newClient.address,
      nif: newClient.nif
    };

    setClients([clientToAdd, ...clients]);
    setIsModalOpen(false);
    setNewClient({ name: '', email: '', phone: '', address: '', nif: '', type: 'Quente' });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
          <p className="text-sm text-gray-500">Base de dados centralizada de proprietários e entidades.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#2D4E4E] text-white rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition-all"
        >
          <UserPlus size={20} /> Novo Cliente
        </button>
      </div>

      {/* Stats Quick Look */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Clientes</p>
           <p className="text-3xl font-bold text-gray-800 mt-2">{clients.length}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Leads Quentes</p>
           <p className="text-3xl font-bold text-orange-500 mt-2">{clients.filter(c => c.type === 'Quente').length}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contactos Recentes</p>
           <p className="text-3xl font-bold text-[#2D4E4E] mt-2">2</p>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Nome</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Contacto</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">NIF</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Morada</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{client.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${client.type === 'Quente' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                        {client.type}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mail size={12} /> {client.email}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone size={12} /> {client.phone}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2 text-xs text-gray-600 font-mono">
                    <FileBadge size={14} className="text-gray-400" /> {client.nif || '---'}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2 text-xs text-gray-500 truncate max-w-[200px]">
                    <MapPin size={14} className="text-gray-400" /> {client.address || 'Não definida'}
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50">
               <div>
                  <h3 className="text-xl font-bold text-gray-800">Novo Cliente</h3>
                  <p className="text-sm text-gray-500">Preencha os dados básicos para o registo.</p>
               </div>
               <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all shadow-sm"
               >
                 <X size={20} />
               </button>
            </div>
            
            <form onSubmit={handleCreateClient} className="p-8 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo *</label>
                    <input 
                      required
                      type="text" 
                      value={newClient.name}
                      onChange={e => setNewClient({...newClient, name: e.target.value})}
                      placeholder="Ex: João Silva" 
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">NIF</label>
                    <input 
                      type="text" 
                      value={newClient.nif}
                      onChange={e => setNewClient({...newClient, nif: e.target.value})}
                      placeholder="9 dígitos" 
                      maxLength={9}
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Email Principal *</label>
                    <input 
                      required
                      type="email" 
                      value={newClient.email}
                      onChange={e => setNewClient({...newClient, email: e.target.value})}
                      placeholder="exemplo@email.com" 
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Telemóvel</label>
                    <input 
                      type="tel" 
                      value={newClient.phone}
                      onChange={e => setNewClient({...newClient, phone: e.target.value})}
                      placeholder="Ex: 912345678" 
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20 transition-all"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Morada de Faturação/Sede</label>
                    <input 
                      type="text" 
                      value={newClient.address}
                      onChange={e => setNewClient({...newClient, address: e.target.value})}
                      placeholder="Rua, Número, Código Postal, Localidade" 
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm text-gray-900 outline-none focus:ring-2 ring-[#2D4E4E]/20 transition-all"
                    />
                  </div>
               </div>

               <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                  <div className="flex gap-4">
                     <button 
                      type="button"
                      onClick={() => setNewClient({...newClient, type: 'Quente'})}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${newClient.type === 'Quente' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                     >
                        Lead Quente
                     </button>
                     <button 
                      type="button"
                      onClick={() => setNewClient({...newClient, type: 'Frio'})}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${newClient.type === 'Frio' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                     >
                        Lead Fria
                     </button>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-3 rounded-2xl text-sm font-bold text-gray-400 hover:text-gray-900 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-black transition-all"
                    >
                      <CheckCircle2 size={18} /> Guardar Cliente
                    </button>
                  </div>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsView;
