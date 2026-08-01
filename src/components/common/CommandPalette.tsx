import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockEngine } from '../../services/mockEngine';
import { Search, Boxes, ClipboardList, User, Shield, ArrowRight, X } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const components = mockEngine.getComponents();
  const requests = mockEngine.getRequests();

  const filteredComponents = components.filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.sku.toLowerCase().includes(query.toLowerCase())
  );

  const filteredRequests = requests.filter(
    (r) => r.request_code.toLowerCase().includes(query.toLowerCase()) || (r.component_name && r.component_name.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl glass-card border border-white/20 shadow-2xl overflow-hidden rounded-3xl">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-slate-900/60">
          <Search className="w-5 h-5 text-indigo-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a component name, SKU, request code, or action..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Quick Actions */}
          {!query && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Quick Navigation</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { navigate('/student/browse'); onClose(); }}
                  className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all"
                >
                  <Boxes className="w-4 h-4 text-indigo-400" />
                  <span>Browse Components</span>
                </button>
                <button
                  onClick={() => { navigate('/faculty/inventory'); onClose(); }}
                  className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all"
                >
                  <ClipboardList className="w-4 h-4 text-emerald-400" />
                  <span>Inventory Management</span>
                </button>
              </div>
            </div>
          )}

          {/* Matching Components */}
          {filteredComponents.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-2">Components ({filteredComponents.length})</p>
              <div className="space-y-1.5">
                {filteredComponents.slice(0, 5).map((comp) => (
                  <div
                    key={comp.id}
                    onClick={() => { navigate('/student/browse'); onClose(); }}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/30 hover:bg-indigo-950/40 border border-white/5 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img src={comp.image_url} alt={comp.name} className="w-8 h-8 rounded-xl object-cover" />
                      <div>
                        <p className="font-bold text-white">{comp.name}</p>
                        <p className="text-[10px] text-slate-400">{comp.sku} • {comp.cabinet}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-400">{comp.available_stock} Avail</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matching Requests */}
          {filteredRequests.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">Requests ({filteredRequests.length})</p>
              <div className="space-y-1.5">
                {filteredRequests.slice(0, 4).map((req) => (
                  <div
                    key={req.id}
                    onClick={() => { navigate('/student/requests'); onClose(); }}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/30 hover:bg-amber-950/40 border border-white/5 cursor-pointer transition-all"
                  >
                    <div>
                      <p className="font-bold text-white">{req.request_code} - {req.component_name}</p>
                      <p className="text-[10px] text-slate-400">Student: {req.student_name} • Purpose: {req.purpose}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-amber-300">
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {query && filteredComponents.length === 0 && filteredRequests.length === 0 && (
            <p className="text-center text-slate-400 py-8">No matching results found for "{query}"</p>
          )}
        </div>
      </div>
    </div>
  );
};
