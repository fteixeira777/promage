
import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Plus, 
  Heart, 
  MessageCircle, 
  Calendar, 
  Image as ImageIcon,
  MoreHorizontal,
  Send,
  Clock,
  CheckCircle2,
  X,
  ChevronRight,
  Globe,
  Lock,
  AlertCircle
} from 'lucide-react';
import { Process, SocialPost } from '../types';

interface SocialViewProps {
  processes: Process[];
  posts: SocialPost[];
  setPosts: React.Dispatch<React.SetStateAction<SocialPost[]>>;
  activeSubmenu: string;
}

const SocialView: React.FC<SocialViewProps> = ({ processes, posts, setPosts, activeSubmenu }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const [newPost, setNewPost] = useState<Partial<SocialPost>>({
    title: '',
    content: '',
    status: 'Draft',
    scheduledDate: ''
  });

  // Auto-publish logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const postsToPublish = posts.filter(post => 
        post.status === 'Scheduled' && 
        post.scheduledDate && 
        new Date(post.scheduledDate) <= now
      );

      if (postsToPublish.length > 0) {
        setPosts(currentPosts => currentPosts.map(post => {
          if (post.status === 'Scheduled' && post.scheduledDate && new Date(post.scheduledDate) <= now) {
            return {
              ...post,
              status: 'Published',
              publishedDate: new Date().toISOString()
            };
          }
          return post;
        }));
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [posts, setPosts]);

  const filteredPosts = posts.filter(post => {
    if (activeSubmenu === 'Feed') return post.status === 'Published';
    if (activeSubmenu === 'Publicações') return true;
    if (activeSubmenu === 'Agendados') return post.status === 'Scheduled';
    return true;
  });

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleOpenModal = (post?: SocialPost) => {
    if (post) {
      setEditingPostId(post.id);
      setSelectedProcessId(post.processId);
      setNewPost({
        title: post.title,
        content: post.content,
        status: post.status,
        scheduledDate: post.scheduledDate || ''
      });
    } else {
      setEditingPostId(null);
      setSelectedProcessId('');
      setNewPost({
        title: '',
        content: '',
        status: 'Draft',
        scheduledDate: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcessId || !newPost.content) return;

    const process = processes.find(p => p.id === selectedProcessId);
    if (!process) return;

    if (editingPostId) {
      setPosts(posts.map(p => p.id === editingPostId ? {
        ...p,
        processId: selectedProcessId,
        title: newPost.title || process.title,
        content: newPost.content || '',
        status: newPost.status as any || 'Draft',
        publishedDate: newPost.status === 'Published' ? (p.publishedDate || new Date().toISOString()) : undefined,
        scheduledDate: newPost.status === 'Scheduled' ? newPost.scheduledDate : undefined,
      } : p));
    } else {
      const post: SocialPost = {
        id: Math.random().toString(36).substr(2, 9),
        processId: selectedProcessId,
        title: newPost.title || process.title,
        content: newPost.content || '',
        imageUrl: `https://picsum.photos/seed/${process.id}/800/600`,
        status: newPost.status as any || 'Draft',
        likes: 0,
        comments: 0,
        publishedDate: newPost.status === 'Published' ? new Date().toISOString() : undefined,
        scheduledDate: newPost.status === 'Scheduled' ? newPost.scheduledDate : undefined,
      };
      setPosts([post, ...posts]);
    }

    setIsModalOpen(false);
    setEditingPostId(null);
    setSelectedProcessId('');
    setNewPost({ title: '', content: '', status: 'Draft', scheduledDate: '' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Social & Portefólio</h2>
          <p className="text-sm text-gray-600 font-bold">Gira a presença digital dos teus projetos.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#2D4E4E] text-white rounded-2xl font-black text-xs shadow-xl hover:bg-black transition-all"
        >
          <Plus size={16} /> Nova Publicação
        </button>
      </div>

      {activeSubmenu === 'Feed' ? (
        <div className="max-w-2xl mx-auto space-y-8">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
              <Share2 size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-bold italic">Nenhuma publicação no feed ainda.</p>
            </div>
          ) : (
            filteredPosts.map(post => (
              <div key={post.id} className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-black text-xs">A</div>
                    <div>
                      <p className="text-sm font-black text-gray-900">Atelier Alfa</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                        {post.status === 'Published' ? formatDateTime(post.publishedDate) : `Agendado: ${formatDateTime(post.scheduledDate)}`}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleOpenModal(post)}
                    className="text-gray-400 hover:text-gray-900"
                  >
                    <MoreHorizontal size={20}/>
                  </button>
                </div>
                <img 
                  src={post.imageUrl} 
                  alt={post.title} 
                  className="w-full aspect-video object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="p-8 space-y-4">
                  <div className="flex items-center gap-6">
                    <button className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors">
                      <Heart size={22} />
                      <span className="text-xs font-black">{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors">
                      <MessageCircle size={22} />
                      <span className="text-xs font-black">{post.comments}</span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors ml-auto">
                      <Share2 size={22} />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 mb-2">{post.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{post.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map(post => (
            <div key={post.id} className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md transition-all">
              <div className="relative aspect-square">
                <img 
                  src={post.imageUrl} 
                  alt={post.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                    post.status === 'Published' ? 'bg-green-100 text-green-700' :
                    post.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {post.status}
                  </span>
                  {post.status === 'Scheduled' && post.scheduledDate && (
                    <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[9px] font-black text-blue-600 shadow-sm border border-blue-100 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDateTime(post.scheduledDate)}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6 space-y-3">
                <h3 className="font-black text-gray-900 truncate">{post.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 font-bold">{post.content}</p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-gray-400">
                    <div className="flex items-center gap-1">
                      <Heart size={14} />
                      <span className="text-[10px] font-black">{post.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle size={14} />
                      <span className="text-[10px] font-black">{post.comments}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleOpenModal(post)}
                    className="text-[10px] font-black text-[#2D4E4E] uppercase tracking-widest hover:underline"
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl my-8 animate-in zoom-in-95 border border-gray-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-[2.5rem]">
              <h3 className="text-xl font-black text-gray-900">
                {editingPostId ? 'Editar Publicação' : 'Nova Publicação'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200 transition-all">
                <X size={20}/>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vincular ao Processo</label>
                <select
                  required
                  value={selectedProcessId}
                  onChange={e => setSelectedProcessId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 ring-[#2D4E4E]/10 text-gray-900"
                >
                  <option value="">Seleccione um processo...</option>
                  {processes.map(p => (
                    <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Título da Publicação</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Obra em Cascais finalizada"
                  value={newPost.title}
                  onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 ring-[#2D4E4E]/10 text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Conteúdo / Legenda</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escreve algo sobre este projeto..."
                  value={newPost.content}
                  onChange={e => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 ring-[#2D4E4E]/10 text-gray-900 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estado</label>
                <div className="flex p-1 bg-gray-100 rounded-2xl">
                  {['Draft', 'Scheduled', 'Published'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setNewPost({ ...newPost, status: status as any })}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${newPost.status === status ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                    >
                      {status === 'Draft' ? 'Rascunho' : status === 'Scheduled' ? 'Agendado' : 'Publicar'}
                    </button>
                  ))}
                </div>
              </div>

              {newPost.status === 'Scheduled' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data e Hora de Publicação</label>
                  <div className="relative">
                    <input
                      required
                      type="datetime-local"
                      value={newPost.scheduledDate}
                      onChange={e => setNewPost({ ...newPost, scheduledDate: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 ring-[#2D4E4E]/10 text-gray-900"
                    />
                    <div className="mt-2 p-3 bg-blue-50 rounded-xl flex items-start gap-2 border border-blue-100">
                      <AlertCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-blue-700 font-bold leading-tight">
                        A publicação será movida para o feed automaticamente na data e hora selecionadas.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-[#2D4E4E] text-white rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 mt-4"
              >
                <Send size={18} /> {editingPostId ? 'Guardar Alterações' : 'Criar Publicação'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface FolderCardProps {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
}

const FolderCard: React.FC<FolderCardProps> = ({ icon, title, sub, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white p-8 rounded-[2.5rem] border border-gray-200 flex flex-col items-center text-center gap-4 hover:border-[#2D4E4E] hover:shadow-lg transition-all group"
  >
    <div className="group-hover:scale-110 transition-transform duration-300">
      {icon}
    </div>
    <div>
      <h4 className="font-black text-gray-900">{title}</h4>
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{sub}</p>
    </div>
  </button>
);

export default SocialView;
