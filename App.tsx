import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { ApiItem, Collection, HttpMethod, ParamItem, ResponseMock, BodyType } from './types';
import { Icons, METHOD_COLORS } from './constants';

const HTTP_STATUS_CODES = [
  { code: 200, label: '200 OK' },
  { code: 201, label: '201 Created' },
  { code: 204, label: '204 No Content' },
  { code: 400, label: '400 Bad Request' },
  { code: 401, label: '401 Unauthorized' },
  { code: 403, label: '403 Forbidden' },
  { code: 404, label: '404 Not Found' },
  { code: 405, label: '405 Method Not Allowed' },
  { code: 500, label: '500 Internal Server Error' },
  { code: 502, label: '502 Bad Gateway' },
  { code: 503, label: '503 Service Unavailable' },
];

const INITIAL_COLLECTION: Collection = {
  id: 'col_default',
  name: 'Main Collection',
  description: 'Manage all your API structures here',
  theme: 'dark',
  items: [
    {
      id: 'fld_1',
      name: 'Existing Review Endpoints',
      description: 'Endpoints related to user profiles and settings.',
      type: 'folder',
      parentId: null
    },
    {
      id: 'req_1',
      name: 'All data',
      description: 'Fetch detailed user data for the specified ID.',
      type: 'request',
      parentId: 'fld_1',
      method: 'POST',
      url: 'https://api.example.com/v1/users/{{userId}}',
      params: [{ id: 'p1', key: 'fields', value: 'all', description: 'Filter fields', enabled: true }],
      headers: [{ id: 'h1', key: 'Authorization', value: 'Bearer {{token}}', description: 'Token', enabled: true }],
      bodyType: 'none',
      mocks: [
        { id: 'm1', name: 'Success', status: 200, body: '{\n  "status": "success",\n  "data": {\n    "id": 1,\n    "username": "jdoe",\n    "documents": [\n      {\n        "id": "doc_1",\n        "pages": [\n          {\n            "number": 1,\n            "content": "..."\n          }\n        ]\n      }\n    ]\n  }\n}' }
      ],
      activeMockId: 'm1'
    }
  ]
};

const App: React.FC = () => {
  const [collection, setCollection] = useState<Collection>(() => {
    const saved = localStorage.getItem('api_studio_data_v6');
    return saved ? JSON.parse(saved) : INITIAL_COLLECTION;
  });
  const [activeItemId, setActiveItemId] = useState<string | null>(collection.items.find(i => i.type === 'request')?.id || null);
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem('api_sidebar_width')) || 300);
  const [responsePanelWidth, setResponsePanelWidth] = useState(() => Number(localStorage.getItem('api_response_width')) || 550);
  const [isResponsePanelOpen, setIsResponsePanelOpen] = useState(false);
  const [isResponseFullscreen, setIsResponseFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>('params');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const theme = collection.theme || 'dark';

  useEffect(() => {
    localStorage.setItem('api_studio_data_v6', JSON.stringify(collection));
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [collection, theme]);

  useEffect(() => {
    localStorage.setItem('api_sidebar_width', sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem('api_response_width', responsePanelWidth.toString());
  }, [responsePanelWidth]);

  const activeItem = collection.items.find(item => item.id === activeItemId);
  const isResizingSidebar = useRef(false);
  const isResizingResponse = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar.current) {
        setSidebarWidth(Math.max(200, Math.min(800, e.clientX)));
      } else if (isResizingResponse.current) {
        const newWidth = window.innerWidth - e.clientX;
        setResponsePanelWidth(Math.max(300, Math.min(window.innerWidth, newWidth)));
        if (isResponseFullscreen) setIsResponseFullscreen(false);
      }
    };
    const handleMouseUp = () => {
      isResizingSidebar.current = false;
      isResizingResponse.current = false;
      document.body.style.cursor = 'default';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResponseFullscreen]);

  const toggleTheme = () => {
    setCollection(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light'
    }));
  };

  const updateItem = useCallback((id: string, updates: Partial<ApiItem>) => {
    setCollection(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  }, []);

  const addItem = (type: 'folder' | 'request', parentId: string | null = null) => {
    const id = `${type === 'folder' ? 'fld' : 'req'}_${Date.now()}`;
    const newItem: ApiItem = {
      id,
      name: type === 'folder' ? 'New Folder' : 'New Request',
      description: '',
      type,
      parentId,
      ...(type === 'request' ? {
        method: 'GET',
        url: '',
        params: [],
        headers: [],
        bodyType: 'none',
        bodyJson: '{\n  "key": "value"\n}',
        bodyRaw: '',
        bodyFormData: [],
        mocks: [{ id: 'm1', name: 'Success', status: 200, body: '{\n  "success": true\n}' }],
        activeMockId: 'm1'
      } : {})
    };
    setCollection(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setActiveItemId(id);
  };

  const deleteItem = (id: string) => {
    setCollection(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id && item.parentId !== id)
    }));
    if (activeItemId === id) setActiveItemId(null);
  };

  const moveItem = (itemId: string, newParentId: string | null) => {
    if (itemId === newParentId) return;
    setCollection(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === itemId ? { ...item, parentId: newParentId } : item)
    }));
  };

  const exportData = () => {
    const dataStr = JSON.stringify(collection, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `api_spec_${Date.now()}.json`;
    link.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.items) setCollection(imported);
      } catch (err) {
        alert("Invalid JSON");
      }
    };
    reader.readAsText(file);
  };

  const calculatedResponseWidth = isResponseFullscreen ? '100vw' : `${responsePanelWidth}px`;

  return (
    <div className="flex h-screen w-full overflow-hidden text-slate-800 dark:text-slate-300 select-none bg-white dark:bg-surface-950 font-sans text-[14px]">
      <input type="file" ref={fileInputRef} onChange={importData} className="hidden" accept=".json" />

      {/* --- Sidebar --- */}
      <aside style={{ width: sidebarWidth }} className="border-r border-slate-200 dark:border-surface-800 bg-slate-50 dark:bg-surface-950 flex flex-col shrink-0 relative transition-none z-30">
        <header className="p-4 border-b border-slate-200 dark:border-surface-800 space-y-3 bg-slate-50 dark:bg-surface-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 bg-primary-600 rounded flex items-center justify-center text-white font-black text-lg">D</div>
              <div className="min-w-0">
                <h1 className="font-extrabold text-slate-900 dark:text-white text-[15px] leading-tight truncate">API Studio</h1>
              </div>
            </div>
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-surface-800 text-slate-500 dark:text-slate-400 transition-colors"
            >
              {theme === 'dark' ? <Icons.Sun className="size-5" /> : <Icons.Moon className="size-5" />}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white dark:bg-surface-900 hover:bg-slate-100 dark:hover:bg-surface-800 rounded text-[11px] font-bold uppercase tracking-wider border border-slate-200 dark:border-surface-800 transition-all text-slate-600 dark:text-slate-300">Import</button>
            <button onClick={exportData} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-primary-600/10 hover:bg-primary-600/20 text-primary-600 dark:text-primary-400 rounded text-[11px] font-bold uppercase tracking-wider border border-primary-500/20 dark:border-primary-500/20 transition-all">Export</button>
          </div>
        </header>

        <div className="flex-1 overflow-auto custom-scrollbar p-2">
          <div className="flex items-center justify-between mb-3 px-2 sticky left-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">Explorer</span>
            <button onClick={() => addItem('folder')} className="text-primary-500 hover:text-primary-400 text-[10px] font-black uppercase flex items-center gap-1">
              <Icons.Plus className="size-3" /> Folder
            </button>
          </div>
          <div className="space-y-0.5 min-w-max pr-4">
            {collection.items.filter(i => i.parentId === null).map(item => (
              <SidebarItem 
                key={item.id} 
                item={item} 
                collection={collection}
                activeItemId={activeItemId} 
                setActiveItemId={setActiveItemId}
                onAddChild={(type, pId) => addItem(type, pId)}
                onDelete={deleteItem}
                onMove={moveItem}
              />
            ))}
          </div>
        </div>
        <div className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary-500 transition-colors z-50"
          onMouseDown={() => { isResizingSidebar.current = true; }} />
      </aside>

      {/* --- Main Workspace --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0a0f1c] relative overflow-hidden">
        {activeItem ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto p-8 md:p-12 space-y-8">
              <WorkspaceHeader item={activeItem} collection={collection} onUpdate={updateItem} />
              
              <section>
                <SectionTitle title="Description" />
                <textarea 
                  className="w-full bg-slate-50 dark:bg-surface-900/50 border-slate-200 dark:border-surface-800 rounded text-[14px] text-slate-800 dark:text-slate-300 focus:ring-1 focus:ring-primary-500/40 focus:border-primary-500/40 placeholder-slate-400 dark:placeholder-slate-700 min-h-[70px] p-4 shadow-sm border outline-none resize-none transition-all"
                  value={activeItem.description}
                  onChange={(e) => updateItem(activeItem.id, { description: e.target.value })}
                  placeholder="Describe this endpoint..."
                />
              </section>

              {activeItem.type === 'request' && (
                <div className="space-y-6">
                  <RequestDetails item={activeItem} onUpdate={updateItem} />
                  
                  <div className="border-b border-slate-200 dark:border-surface-800/60 flex items-center gap-8 px-2">
                    <button 
                      onClick={() => setActiveTab('params')}
                      className={`pb-3 text-[12px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'params' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}
                    >
                      Params
                      {activeTab === 'params' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500 rounded-full" />}
                    </button>
                    <button 
                      onClick={() => setActiveTab('headers')}
                      className={`pb-3 text-[12px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'headers' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}
                    >
                      Headers
                      {activeTab === 'headers' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500 rounded-full" />}
                    </button>
                    <button 
                      onClick={() => setActiveTab('body')}
                      className={`pb-3 text-[12px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'body' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}
                    >
                      Body
                      {activeTab === 'body' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500 rounded-full" />}
                    </button>
                  </div>

                  <div className="min-h-[300px]">
                    {activeTab === 'params' && (
                      <ParamTable title="" items={activeItem.params || []} onChange={(params) => updateItem(activeItem.id, { params })} />
                    )}
                    {activeTab === 'headers' && (
                      <ParamTable title="" items={activeItem.headers || []} onChange={(headers) => updateItem(activeItem.id, { headers })} />
                    )}
                    {activeTab === 'body' && (
                      <RequestBody item={activeItem} onUpdate={updateItem} theme={theme} />
                    )}
                  </div>
                </div>
              )}
              <div className="h-24" />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30">
            <Icons.FileCode className="size-12 mb-4" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em]">Select an item</span>
          </div>
        )}
      </main>

      {/* --- Response Trigger Button --- */}
      {activeItem && (
        <button 
          onClick={() => setIsResponsePanelOpen(true)}
          className="fixed bottom-6 right-6 z-[100] bg-primary-600 hover:bg-primary-500 text-white px-5 py-2.5 rounded shadow-lg flex items-center gap-2.5 font-bold text-[11px] uppercase tracking-widest transition-all border border-white/10 active:scale-95"
        >
          <Icons.FileCode className="size-4" />
          <span>Responses</span>
          <span className="bg-white/20 px-2 py-0.5 rounded text-[11px] min-w-[18px] text-center font-black">{activeItem.mocks?.length || 0}</span>
        </button>
      )}

      {/* --- Response Panel Overlay --- */}
      <div 
        style={{ width: isResponsePanelOpen ? calculatedResponseWidth : 0 }}
        className={`fixed inset-y-0 right-0 bg-white dark:bg-surface-950 z-[150] border-l border-slate-200 dark:border-surface-800 shadow-2xl transform transition-all duration-300 ease-out overflow-visible ${isResponsePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {isResponsePanelOpen && !isResponseFullscreen && (
          <div 
            className="absolute -left-1 top-0 w-2 h-full cursor-col-resize hover:bg-primary-500 transition-colors z-[160]"
            onMouseDown={(e) => { e.preventDefault(); isResizingResponse.current = true; document.body.style.cursor = 'col-resize'; }}
          />
        )}
        
        <div className={`h-full w-full ${isResponsePanelOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
          {activeItem && (
            <ResponseOverlay 
              item={activeItem} 
              isFullscreen={isResponseFullscreen}
              onToggleFullscreen={() => setIsResponseFullscreen(!isResponseFullscreen)}
              onClose={() => { setIsResponsePanelOpen(false); setIsResponseFullscreen(false); }} 
              onUpdate={updateItem} 
              theme={theme} 
            />
          )}
        </div>
      </div>
      {isResponsePanelOpen && <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-[140]" onClick={() => setIsResponsePanelOpen(false)} />}
    </div>
  );
};

const SidebarItem: React.FC<{ 
  item: ApiItem, collection: Collection, activeItemId: string | null, setActiveItemId: (id: string) => void,
  onAddChild: (type: 'folder' | 'request', parentId: string) => void, onDelete: (id: string) => void, onMove: (itemId: string, newParentId: string | null) => void
}> = ({ item, collection, activeItemId, setActiveItemId, onAddChild, onDelete, onMove }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isActive = activeItemId === item.id;
  const children = collection.items.filter(c => c.parentId === item.id);

  return (
    <div className="group/item">
      <div 
        draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', item.id); e.stopPropagation(); }}
        onDragOver={(e) => { if(item.type === 'folder') { e.preventDefault(); e.currentTarget.classList.add('bg-primary-500/5'); } }}
        onDragLeave={(e) => e.currentTarget.classList.remove('bg-primary-500/5')}
        onDrop={(e) => { if(item.type === 'folder') { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('bg-primary-500/5'); const draggedId = e.dataTransfer.getData('text/plain'); if (draggedId) onMove(draggedId, item.id); setIsOpen(true); } }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 relative mb-1 mx-1 ${isActive ? 'bg-primary-600/10 dark:bg-primary-600/15 text-primary-600 dark:text-primary-400' : 'hover:bg-slate-100 dark:hover:bg-surface-800/40 text-slate-600 dark:text-slate-500'}`}
        onClick={() => setActiveItemId(item.id)}
      >
        {/* Active Indicator Line */}
        {isActive && <div className="absolute left-1.5 top-2 bottom-2 w-1 bg-primary-600 rounded-full" />}
        
        <div className="flex items-center gap-3 flex-1">
          {item.type === 'folder' ? (
            <div 
              className="p-1 -ml-1 hover:bg-slate-300 dark:hover:bg-white/10 rounded-sm transition-colors cursor-pointer shrink-0 z-10"
              onClick={(e) => { 
                e.stopPropagation(); 
                setIsOpen(!isOpen); 
              }}
            >
              <Icons.ChevronRight className={`size-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </div>
          ) : (
            <div className={`text-[9px] font-black w-10 shrink-0 text-center py-1 px-1.5 rounded bg-white dark:bg-surface-900 shadow-sm border border-slate-200 dark:border-surface-800 uppercase tracking-tighter ${isActive ? 'text-primary-600 dark:text-primary-400' : METHOD_COLORS[item.method || 'GET']}`}>
              {item.method}
            </div>
          )}
          <span className={`text-[14px] font-semibold whitespace-nowrap ${isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-400'}`}>
            {item.name}
          </span>
        </div>
        
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity sticky right-0">
          {item.type === 'folder' && <button onClick={(e) => { e.stopPropagation(); onAddChild('folder', item.id); }} className="p-1 hover:bg-slate-300 dark:hover:bg-white/10 rounded"><Icons.Folder className="size-3.5" /></button>}
          {item.type === 'folder' && <button onClick={(e) => { e.stopPropagation(); onAddChild('request', item.id); }} className="p-1 hover:bg-slate-300 dark:hover:bg-white/10 rounded"><Icons.Plus className="size-3.5" /></button>}
          <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-1 hover:bg-red-500/20 rounded text-red-500/50"><Icons.Delete className="size-3.5" /></button>
        </div>
      </div>
      {item.type === 'folder' && isOpen && (
        <div className="ml-5 pl-1 border-l border-slate-200 dark:border-surface-800/50 mt-px space-y-0.5">
          {children.map(child => <SidebarItem key={child.id} item={child} collection={collection} activeItemId={activeItemId} setActiveItemId={setActiveItemId} onAddChild={onAddChild} onDelete={onDelete} onMove={onMove} />)}
          {children.length === 0 && <div className="text-[10px] text-slate-400 dark:text-slate-700 py-2 pl-8 uppercase tracking-widest font-bold opacity-50">No content</div>}
        </div>
      )}
    </div>
  );
};

const WorkspaceHeader: React.FC<{ item: ApiItem, collection: Collection, onUpdate: (id: string, updates: Partial<ApiItem>) => void }> = ({ item, collection, onUpdate }) => {
  const getPath = (id: string): string[] => {
    const it = collection.items.find(i => i.id === id);
    return it?.parentId ? [...getPath(it.parentId), it.name] : [it?.name || ''];
  };
  const pathSegments = getPath(item.id).slice(0, -1);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest">
        <span>Collection</span>
        {pathSegments.map((p, i) => <React.Fragment key={i}><Icons.ChevronRight className="size-3 opacity-30" /><span className="max-w-[150px] truncate">{p}</span></React.Fragment>)}
      </div>
      <input className="w-full bg-transparent border-none p-0 text-4xl font-black text-slate-900 dark:text-white focus:ring-0 placeholder-slate-200 dark:placeholder-slate-900" value={item.name} onChange={(e) => onUpdate(item.id, { name: e.target.value })} placeholder="Endpoint Name" />
      <div className="h-0.5 w-16 bg-primary-600 rounded-full" />
    </div>
  );
};

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-600 mb-4 flex items-center gap-3">
    {title} <div className="h-px flex-1 bg-slate-200 dark:bg-surface-800/40" />
  </h3>
);

const RequestDetails: React.FC<{ item: ApiItem, onUpdate: (id: string, updates: Partial<ApiItem>) => void }> = ({ item, onUpdate }) => (
  <div className="space-y-4">
    <SectionTitle title="Endpoint" />
    <div className="flex items-stretch bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-surface-800 rounded shadow-sm focus-within:border-primary-500/40 h-12 overflow-hidden transition-all">
      <div className="relative border-r border-slate-200 dark:border-surface-800 flex items-center shrink-0">
        <select className="bg-slate-100 dark:bg-surface-800 border-none text-[13px] font-black text-primary-600 dark:text-primary-400 px-6 h-full focus:ring-0 cursor-pointer appearance-none pr-11 text-center" value={item.method} onChange={(e) => onUpdate(item.id, { method: e.target.value as HttpMethod })}>
          {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500"><Icons.ChevronRight className="size-3.5 rotate-90" /></div>
      </div>
      <input className="flex-1 bg-transparent border-none text-[15px] font-mono text-slate-800 dark:text-slate-300 px-6 focus:ring-0 placeholder-slate-300 dark:placeholder-slate-800" value={item.url || ''} onChange={(e) => onUpdate(item.id, { url: e.target.value })} placeholder="https://api.example.com/v1/..." />
    </div>
  </div>
);

const ParamTable: React.FC<{ title?: string, items: ParamItem[], onChange: (items: ParamItem[]) => void }> = ({ title, items, onChange }) => {
  const addRow = () => onChange([...items, { id: `p_${Date.now()}`, key: '', value: '', description: '', enabled: true }]);
  const updateRow = (id: string, updates: Partial<ParamItem>) => onChange(items.map(it => it.id === id ? { ...it, ...updates } : it));
  const removeRow = (id: string) => onChange(items.filter(it => it.id !== id));
  return (
    <div className="space-y-4">
      {title && <SectionTitle title={title} />}
      <div className="bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800 rounded shadow-sm overflow-hidden">
        <table className="w-full text-left text-[14px] border-collapse min-w-[550px]">
          <thead className="bg-slate-50 dark:bg-surface-950/30 text-slate-400 dark:text-slate-600 font-bold border-b border-slate-200 dark:border-surface-800 uppercase tracking-widest text-[10px]">
            <tr>
              <th className="px-5 py-3 w-12 text-center" title="Is required?">Req</th>
              <th className="px-5 py-3 w-[220px]">Key</th>
              <th className="px-5 py-3 w-[220px]">Value / Example</th>
              <th className="px-5 py-3">Notes</th>
              <th className="px-5 py-3 w-12 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-surface-800/20">
            {items.map(item => (
              <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.01]">
                <td className="px-5 py-4 text-center"><input type="checkbox" checked={item.enabled} onChange={(e) => updateRow(item.id, { enabled: e.target.checked })} className="size-4 bg-white dark:bg-surface-950 border-slate-300 dark:border-surface-700 rounded text-primary-600 focus:ring-0" /></td>
                <td className="px-5 py-4 font-mono"><input className="w-full bg-transparent border-none p-0 text-slate-800 dark:text-slate-300 focus:ring-0 placeholder-slate-300 dark:placeholder-slate-800" value={item.key} onChange={(e) => updateRow(item.id, { key: e.target.value })} placeholder="field_name" /></td>
                <td className="px-5 py-4 font-mono"><input className="w-full bg-transparent border-none p-0 text-emerald-600 dark:text-emerald-500/80 focus:ring-0 placeholder-slate-300 dark:placeholder-slate-800" value={item.value} onChange={(e) => updateRow(item.id, { value: e.target.value })} placeholder="example_value" /></td>
                <td className="px-5 py-4"><input className="w-full bg-transparent border-none p-0 text-slate-500 italic focus:ring-0 placeholder-slate-300 dark:placeholder-slate-800" value={item.description} onChange={(e) => updateRow(item.id, { description: e.target.value })} placeholder="Add a note..." /></td>
                <td className="px-5 py-4 text-center"><button onClick={() => removeRow(item.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Icons.Delete className="size-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 border-t border-slate-200 dark:border-surface-800/50 bg-slate-50 dark:bg-surface-900/40">
          <button onClick={addRow} className="w-full py-2.5 bg-white dark:bg-surface-800 hover:bg-slate-100 dark:hover:bg-surface-700 rounded text-[11px] font-black text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all uppercase tracking-widest border border-slate-200 dark:border-surface-700 flex items-center justify-center gap-2 shadow-sm">
            <Icons.Plus className="size-3.5" /> Add Property
          </button>
        </div>
      </div>
    </div>
  );
};

const RequestBody: React.FC<{ item: ApiItem, onUpdate: (id: string, updates: Partial<ApiItem>) => void, theme: 'light' | 'dark' }> = ({ item, onUpdate, theme }) => {
  const types: { label: string, value: BodyType }[] = [
    { label: 'None', value: 'none' },
    { label: 'JSON', value: 'json' },
    { label: 'Form Data', value: 'form-data' },
    { label: 'Raw', value: 'raw' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {types.map(t => (
          <button 
            key={t.value} 
            onClick={() => onUpdate(item.id, { bodyType: t.value })}
            className={`px-4 py-1.5 rounded text-[11px] font-bold uppercase tracking-widest border transition-all ${item.bodyType === t.value ? 'bg-primary-600/10 border-primary-500/40 text-primary-600 dark:text-primary-400 shadow-sm' : 'bg-white dark:bg-surface-900 border-slate-200 dark:border-surface-800 text-slate-500 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-surface-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      
      {item.bodyType === 'json' && (
        <div className="border border-slate-200 dark:border-surface-800 rounded bg-slate-50 dark:bg-[#01040a] overflow-hidden h-72 shadow-inner">
          <Editor 
            height="100%" defaultLanguage="json" theme={theme === 'dark' ? "vs-dark" : "vs-light"} value={item.bodyJson || ''} 
            onChange={(v) => onUpdate(item.id, { bodyJson: v })}
            options={{ 
              minimap: { enabled: false }, 
              fontSize: 14, 
              fontFamily: 'JetBrains Mono', 
              padding: { top: 16, bottom: 16 }, 
              automaticLayout: true, 
              backgroundColor: theme === 'dark' ? '#01040a' : '#f8fafc', 
              scrollBeyondLastLine: false, 
              stickyScroll: { enabled: false } 
            }}
          />
        </div>
      )}

      {item.bodyType === 'raw' && (
        <textarea 
          className="w-full bg-slate-50 dark:bg-[#01040a] border-slate-200 dark:border-surface-800 rounded text-[14px] font-mono text-slate-800 dark:text-slate-300 focus:ring-1 focus:ring-primary-500/30 focus:border-primary-500/40 min-h-[220px] p-5 border outline-none resize-none transition-all shadow-inner"
          value={item.bodyRaw || ''}
          onChange={(e) => onUpdate(item.id, { bodyRaw: e.target.value })}
          placeholder="Enter raw request body content..."
        />
      )}

      {item.bodyType === 'form-data' && (
        <ParamTable items={item.bodyFormData || []} onChange={(items) => onUpdate(item.id, { bodyFormData: items })} />
      )}

      {item.bodyType === 'none' && (
        <div className="py-12 border border-dashed border-slate-200 dark:border-surface-800 rounded flex flex-col items-center justify-center text-[11px] text-slate-400 dark:text-slate-700 font-bold uppercase tracking-[0.3em] gap-3">
          <Icons.FileCode className="size-6 opacity-20" />
          No body content defined
        </div>
      )}
    </div>
  );
};

const ResponseOverlay: React.FC<{ 
  item: ApiItem, 
  isFullscreen: boolean,
  onToggleFullscreen: () => void,
  onClose: () => void, 
  onUpdate: (id: string, updates: Partial<ApiItem>) => void, 
  theme: 'light' | 'dark' 
}> = ({ item, isFullscreen, onToggleFullscreen, onClose, onUpdate, theme }) => {
  const activeMock = item.mocks?.find(m => m.id === item.activeMockId) || item.mocks?.[0];
  const addMock = () => { const newMock: ResponseMock = { id: `m_${Date.now()}`, name: 'New Case', status: 200, body: '{\n  "success": true\n}' }; onUpdate(item.id, { mocks: [...(item.mocks || []), newMock], activeMockId: newMock.id }); };
  const updateActiveMock = (updates: Partial<ResponseMock>) => { if (!activeMock) return; onUpdate(item.id, { mocks: item.mocks?.map(m => m.id === activeMock.id ? { ...m, ...updates } : m) }); };
  const deleteMock = (id: string) => { const newMocks = item.mocks?.filter(m => m.id !== id) || []; onUpdate(item.id, { mocks: newMocks, activeMockId: newMocks[0]?.id || null }); };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-surface-950">
      <header className="p-4 border-b border-slate-200 dark:border-surface-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-surface-950/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div><h2 className="text-[15px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">Mock Responses</h2><p className="text-[9px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">Documented Output Scenarios</p></div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onToggleFullscreen} 
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-surface-800 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isFullscreen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              )}
            </svg>
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-surface-800 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"><Icons.Delete className="size-5" /></button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-44 border-r border-slate-200 dark:border-surface-800 p-2 space-y-2 overflow-y-auto custom-scrollbar shrink-0 bg-slate-50 dark:bg-surface-950/40">
          {item.mocks?.map(mock => (
            <div key={mock.id} onClick={() => onUpdate(item.id, { activeMockId: mock.id })} className={`p-3 rounded cursor-pointer transition-all border group relative ${item.activeMockId === mock.id ? 'bg-primary-600/5 border-primary-500/30 text-slate-900 dark:text-white shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-surface-900 border-transparent text-slate-500 dark:text-slate-600'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-sm border ${mock.status >= 200 && mock.status < 300 ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10' : 'bg-red-500/5 text-red-600 border-red-500/10'}`}>{mock.status}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteMock(mock.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-600 transition-opacity"><Icons.Delete className="size-3.5" /></button>
              </div>
              <div className="text-[12px] font-bold truncate tracking-tight">{mock.name}</div>
            </div>
          ))}
          <button onClick={addMock} className="w-full py-2.5 border border-dashed border-slate-300 dark:border-surface-800 rounded text-slate-500 dark:text-slate-700 hover:border-primary-500/30 hover:text-primary-600 dark:hover:text-primary-400 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5">
            <Icons.Plus className="size-3" /> Add Case
          </button>
        </div>
        {activeMock ? (
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-[#01040a]">
            <div className="p-5 border-b border-slate-200 dark:border-surface-800 space-y-4 bg-slate-50 dark:bg-[#01040a]">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-700 tracking-widest block pl-0.5">Mock Label</label>
                  <input className="w-full bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800 rounded px-4 py-2 text-[14px] font-bold text-slate-800 dark:text-slate-300 focus:ring-1 focus:ring-primary-500/30 outline-none" value={activeMock.name} onChange={(e) => updateActiveMock({ name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-700 tracking-widest block pl-0.5">HTTP Status</label>
                  <select className="w-full bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800 rounded px-4 py-2 text-[14px] font-bold text-slate-800 dark:text-slate-300 focus:ring-1 focus:ring-primary-500/30 outline-none cursor-pointer" value={activeMock.status} onChange={(e) => updateActiveMock({ status: parseInt(e.target.value) })}>
                    {HTTP_STATUS_CODES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                    {!HTTP_STATUS_CODES.find(s => s.code === activeMock.status) && <option value={activeMock.status}>{activeMock.status}</option>}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex-1 relative">
              <Editor 
                height="100%" defaultLanguage="json" theme={theme === 'dark' ? "vs-dark" : "vs-light"} value={activeMock.body} 
                onChange={(val) => updateActiveMock({ body: val || '' })} 
                options={{ 
                  minimap: { enabled: false }, 
                  fontSize: 14, 
                  fontFamily: 'JetBrains Mono', 
                  automaticLayout: true, 
                  padding: { top: 16, bottom: 16 }, 
                  wordWrap: 'off',
                  scrollBeyondLastLine: false,
                  backgroundColor: theme === 'dark' ? '#01040a' : '#f8fafc', 
                  lineHeight: 20,
                  stickyScroll: { enabled: false },
                  folding: true,
                  renderLineHighlight: 'all',
                  scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible',
                    useShadows: false,
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                  }
                }} 
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-800 text-center opacity-40">
            <Icons.FileCode className="size-12 mb-4" />
            <p className="text-[11px] font-black uppercase tracking-[0.3em]">Select Response Scenario</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
