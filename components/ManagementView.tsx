
import React from 'react';
import { 
  Users, 
  Settings, 
  ShieldCheck, 
  Bell, 
  Globe,
  Database
} from 'lucide-react';

const ManagementView: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Gestão do Gabinete</h2>
        <p className="text-sm text-gray-500">Configurações globais, equipas e integrações.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="space-y-4">
           <h3 className="text-xs uppercase font-bold text-gray-400 tracking-wider">Geral</h3>
           <div className="space-y-2">
             <SettingsItem icon={<Users size={18} />} title="Equipa e Utilizadores" description="Gira quem tem acesso ao software e as suas permissões." />
             <SettingsItem icon={<Globe size={18} />} title="Dados da Empresa" description="Atualize logos, moradas e dados de faturação." />
             <SettingsItem icon={<Bell size={18} />} title="Notificações" description="Configure alertas de prazos e mensagens de clientes." />
           </div>
        </section>

        <section className="space-y-4">
           <h3 className="text-xs uppercase font-bold text-gray-400 tracking-wider">Segurança e Dados</h3>
           <div className="space-y-2">
             <SettingsItem icon={<ShieldCheck size={18} />} title="Segurança" description="Autenticação de dois fatores e logs de acesso." />
             <SettingsItem icon={<Database size={18} />} title="Backup de Documentos" description="Gira o armazenamento em nuvem e histórico." />
             <SettingsItem icon={<Settings size={18} />} title="Integrações" description="Conecte-se com softwares de desenho e faturação." />
           </div>
        </section>
      </div>

      <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-3xl">
         <h4 className="font-bold text-yellow-800 mb-2">Dica Pro</h4>
         <p className="text-sm text-yellow-700 leading-relaxed">
           Mantenha os dados do seu gabinete atualizados para que os seus orçamentos e comunicações saiam sempre com a imagem corporativa correta.
         </p>
      </div>
    </div>
  );
};

const SettingsItem: React.FC<{icon: React.ReactNode, title: string, description: string}> = ({ icon, title, description }) => (
  <button className="w-full flex items-start gap-4 p-4 bg-white rounded-2xl border border-transparent hover:border-gray-200 transition-all text-left shadow-sm group">
    <div className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:bg-[#2D4E4E] group-hover:text-white transition-all">
      {icon}
    </div>
    <div>
      <p className="text-sm font-bold text-gray-800">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{description}</p>
    </div>
  </button>
);

export default ManagementView;
