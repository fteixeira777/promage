import React, { useState } from 'react';
import { ArrowLeft, User, ListTodo, Plus, Trash2, Briefcase, ShieldCheck, ShieldAlert, Download, Upload, Database } from 'lucide-react';
import { AppSettings, AppUser } from '../types';
import { cn } from '../lib/utils';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onBack: () => void;
  onResetAllData: () => void;
  onBackup: () => void;
  onUpload: () => void;
}

export function SettingsView({ 
  settings, 
  onUpdateSettings, 
  onBack, 
  onResetAllData,
  onBackup,
  onUpload
}: SettingsViewProps) {
  const [newUserName, setNewUserName] = useState('');
  const [newPresetTitle, setNewPresetTitle] = useState('');
  const [newProjectPresetName, setNewProjectPresetName] = useState('');

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState('');

  const handleUpdateUser = (id: string) => {
    if (editingUserName.trim()) {
      onUpdateSettings({
        ...settings,
        users: settings.users.map(u => u.id === id ? { ...u, name: editingUserName.trim() } : u)
      });
      setEditingUserId(null);
      setEditingUserName('');
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      const newUser: AppUser = {
        id: Math.random().toString(36).substr(2, 9),
        name: newUserName.trim(),
        canLogin: true
      };
      onUpdateSettings({
        ...settings,
        users: [...settings.users, newUser]
      });
      setNewUserName('');
    }
  };

  const handleToggleLogin = (id: string) => {
    onUpdateSettings({
      ...settings,
      users: settings.users.map(u => {
        if (u.id === id) {
          const currentCanLogin = u.canLogin !== false;
          return { ...u, canLogin: !currentCanLogin };
        }
        return u;
      })
    });
  };

  const handleRemoveUser = (id: string) => {
    onUpdateSettings({
      ...settings,
      users: settings.users.filter(u => u.id !== id)
    });
  };

  const handleAddPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPresetTitle.trim() && !settings.presetTitles.includes(newPresetTitle.trim())) {
      onUpdateSettings({
        ...settings,
        presetTitles: [...settings.presetTitles, newPresetTitle.trim()]
      });
      setNewPresetTitle('');
    }
  };

  const handleRemovePreset = (title: string) => {
    onUpdateSettings({
      ...settings,
      presetTitles: settings.presetTitles.filter(t => t !== title)
    });
  };

  const handleAddProjectPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectPresetName.trim() && !settings.projectPresets?.find(p => p.name === newProjectPresetName.trim())) {
      onUpdateSettings({
        ...settings,
        projectPresets: [...(settings.projectPresets || []), {
          id: Math.random().toString(36).substr(2, 9),
          name: newProjectPresetName.trim(),
          subtasks: []
        }]
      });
      setNewProjectPresetName('');
    }
  };

  const handleRemoveProjectPreset = (id: string) => {
    onUpdateSettings({
      ...settings,
      projectPresets: (settings.projectPresets || []).filter(p => p.id !== id)
    });
  };

  const handleAddSubtask = (presetId: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('subtask') as HTMLInputElement;
    const subtask = input.value.trim();
    
    if (subtask) {
      onUpdateSettings({
        ...settings,
        projectPresets: (settings.projectPresets || []).map(p => 
          p.id === presetId ? { ...p, subtasks: [...p.subtasks, subtask] } : p
        )
      });
      input.value = '';
    }
  };

  const handleRemoveSubtask = (presetId: string, subtaskIndex: number) => {
    onUpdateSettings({
      ...settings,
      projectPresets: (settings.projectPresets || []).map(p => 
        p.id === presetId ? { ...p, subtasks: p.subtasks.filter((_, i) => i !== subtaskIndex) } : p
      )
    });
  };

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">Settings</h2>
              <p className="text-slate-500 font-medium">Manage users and application preferences</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Users Management */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Team Members</h3>
                <p className="text-xs text-slate-500">Manage users who can log in and be assigned to tickets</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <form onSubmit={handleAddUser} className="flex gap-2">
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter user name..."
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newUserName.trim()}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </form>
              <div className="space-y-2">
                {settings.users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                    {editingUserId === user.id ? (
                      <div className="flex gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingUserName}
                          onChange={(e) => setEditingUserName(e.target.value)}
                          className="flex-1 px-3 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleUpdateUser(user.id)}
                          className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <span 
                        className="font-medium text-slate-700 cursor-pointer hover:text-blue-600"
                        onClick={() => {
                          setEditingUserId(user.id);
                          setEditingUserName(user.name);
                        }}
                      >
                        {user.name}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleLogin(user.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                          user.canLogin !== false 
                            ? "bg-green-100 text-green-700 border border-green-200" 
                            : "bg-slate-200 text-slate-500 border border-slate-300"
                        )}
                        title={user.canLogin !== false ? "Can log in" : "Organizational only"}
                      >
                        {user.canLogin !== false ? (
                          <><ShieldCheck className="w-3 h-3" /> Login</>
                        ) : (
                          <><ShieldAlert className="w-3 h-3" /> Org Only</>
                        )}
                      </button>
                      <button
                        onClick={() => handleRemoveUser(user.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {settings.users.length === 0 && (
                  <p className="text-center text-slate-500 text-sm py-4">No users configured.</p>
                )}
              </div>
            </div>
          </div>

          {/* Preset Titles Management */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <ListTodo className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Ticket Title Presets</h3>
                <p className="text-xs text-slate-500">Define common ticket titles for quick selection</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <form onSubmit={handleAddPreset} className="flex gap-2">
                <input
                  type="text"
                  value={newPresetTitle}
                  onChange={(e) => setNewPresetTitle(e.target.value)}
                  placeholder="Enter preset title..."
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  disabled={!newPresetTitle.trim()}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </form>
              <div className="space-y-2">
                {settings.presetTitles.map(title => (
                  <div key={title} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <span className="font-medium text-slate-700">{title}</span>
                    <button
                      onClick={() => handleRemovePreset(title)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {settings.presetTitles.length === 0 && (
                  <p className="text-center text-slate-500 text-sm py-4">No presets configured.</p>
                )}
              </div>
            </div>
          </div>

          {/* Project Presets Management */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Project Presets</h3>
                <p className="text-xs text-slate-500">Define default project structures for quick creation</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <form onSubmit={handleAddProjectPreset} className="flex gap-2">
                <input
                  type="text"
                  value={newProjectPresetName}
                  onChange={(e) => setNewProjectPresetName(e.target.value)}
                  placeholder="Enter preset name..."
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="submit"
                  disabled={!newProjectPresetName.trim()}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </form>
              <div className="space-y-4">
                {settings.projectPresets?.map(preset => (
                  <div key={preset.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{preset.name}</span>
                      <button
                        onClick={() => handleRemoveProjectPreset(preset.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="pl-4 border-l-2 border-slate-200 space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subtasks</p>
                      {preset.subtasks.map((subtask, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-100">
                          <span className="text-sm text-slate-600">{subtask}</span>
                          <button
                            onClick={() => handleRemoveSubtask(preset.id, idx)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      
                      <form onSubmit={(e) => handleAddSubtask(preset.id, e)} className="flex gap-2 mt-2">
                        <input
                          type="text"
                          name="subtask"
                          placeholder="Add a subtask..."
                          className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
                        >
                          Add
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
                {(!settings.projectPresets || settings.projectPresets.length === 0) && (
                  <p className="text-center text-slate-500 text-sm py-4">No project presets configured.</p>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Data Management</h3>
                <p className="text-xs text-slate-500">Backup, restore or reset your portfolio data</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={onBackup}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Backup
                </button>
                <button 
                  onClick={onUpload}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={onResetAllData}
                  className="w-full px-4 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold hover:bg-red-100 flex items-center justify-center gap-2 transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Reset All Data
                </button>
                <p className="mt-2 text-[10px] text-center text-slate-400 font-medium uppercase tracking-wider">
                  Warning: This action cannot be undone
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
