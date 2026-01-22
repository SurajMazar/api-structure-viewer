
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
  items: [
    {
      id: 'fld_1',
      name: 'User Management',
      description: 'Endpoints related to user profiles and settings.',
      type: 'folder',
      parentId: null
    },
    {
      id: 'req_1',
      name: 'Get User Profile',
      description: 'Fetch detailed user data for the specified ID.',
      type: 'request',
      parentId: 'fld_1',
      method: 'GET',
      url: 'https://api.example.com/v1/users/{{userId}}',
      params: [{ id: 'p1', key: 'fields', value: 'all', description: 'Filter fields', enabled: true }],
      headers: [{ id: 'h1', key: 'Authorization', value: 'Bearer {{token}}', description: 'Token', enabled: true }],
      bodyType: 'none',
      mocks: [
        { id: 'm1', name: 'Success', status: 200, body: '{\n  "status": "success",\n  "data": { "id": 1 }\n}' }
      ],
      activeMockId: 'm1'
    }
  ]
};

const App: React.FC = () => {
  const [collection, setCollection] = useState<Collection>(() => {
    const saved = localStorage.getItem('api_studio_data_v4');
    return saved ? JSON.parse(saved) : INITIAL_COLLECTION;
  });
  const [activeItemId, setActiveItemId] = useState<string | null>(collection.items.find(i => i.type === 'request')?.id || null);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResponsePanelOpen, setIsResponsePanelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('api_studio_data_v4', JSON.stringify(collection));
  }, [collection]);

  const activeItem = collection.items.find(item => item.id === activeItemId);
  const isResizingSidebar = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar.current) {
        setSidebarWidth(Math.max(200, Math.min(500, e.clientX)));
      }
    };
    const handleMouseUp = () => {
      isResizingSidebar.current = false;
      document.body.style.cursor = 'default';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

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
        bodyJson: '{}',
        bodyRaw: '',
        bodyFormData: [],
        mocks: [{ id: 'm1', name: 'Success', status: 200, body: '{}' }],
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

  return (
    <div className="flex h-screen w-full overflow-hidden text-slate-300 select-none bg-surface-950 font-sans text-[13px]">
      <input type="file" ref={fileInputRef} onChange={importData} className="hidden" accept=".json" />

      {/* --- Sidebar --- */}
      <aside style={{ width: sidebarWidth }} className="border-r border-surface-800 bg-surface-950 flex flex-col shrink-0 relative transition-none z-30">
        <header className="p-4 border-b border-surface-800 space-y-3 bg-surface-950">
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-primary-600 rounded flex items-center justify-center text-white font-black text-lg">D</div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-white text-[14px] leading-tight truncate">API Doc Studio</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-surface-900 hover:bg-surface-800 rounded text-[10px] font-bold uppercase tracking-wider border border-surface-800 transition-all">Import</button>
            <button onClick={exportData} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-primary-600/10 hover:bg-primary-600/20 text-primary-400 rounded text-[10px] font-bold uppercase tracking-wider border border-primary-500/20 transition-all">Export</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          <div className="flex items-center justify-between mb-3 px-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Explorer</span>
            <button onClick={() => addItem('folder')} className="text-primary-500 hover:text-primary-400 text-[10px] font-black uppercase flex items-center gap-1">
              <Icons.Plus className="size-3" /> Folder
            </button>
          </div>
          <div className="space-y-0.5">
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
        <div className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary-500/20 transition-colors z-50"
          onMouseDown={() => { isResizingSidebar.current = true; }} />
      </aside>

      {/* --- Main Workspace --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0f1c] relative z-10 overflow-hidden">
        {activeItem ? (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="max-w-4xl mx-auto p-8 md:p-12 space-y-12">
                <WorkspaceHeader item={activeItem} collection={collection} onUpdate={updateItem} />
                
                <section>
                  <SectionTitle title="Resource Overview" />
                  <textarea 
                    className="w-full bg-surface-900/50 border-surface-800 rounded text-[13px] text-slate-300 focus:ring-1 focus:ring-primary-500/40 focus:border-primary-500/40 placeholder-slate-700 min-h-[90px] p-4 shadow-sm border outline-none resize-none transition-all"
                    value={activeItem.description}
                    onChange={(e) => updateItem(activeItem.id, { description: e.target.value })}
                    placeholder="Describe this endpoint..."
                  />
                </section>

                {activeItem.type === 'request' && (
                  <>
                    <section><RequestDetails item={activeItem} onUpdate={updateItem} /></section>
                    <section><ParamTable title="Query Parameters" items={activeItem.params || []} onChange={(params) => updateItem(activeItem.id, { params })} /></section>
                    <section><ParamTable title="Request Headers" items={activeItem.headers || []} onChange={(headers) => updateItem(activeItem.id, { headers })} /></section>
                    <section><RequestBody item={activeItem} onUpdate={updateItem} /></section>
                  </>
                )}
                <div className="h-24" />
              </div>
            </div>

            <button 
              onClick={() => setIsResponsePanelOpen(true)}
              className="fixed bottom-6 right-6 z-[100] bg-primary-600 hover:bg-primary-500 text-white px-5 py-2.5 rounded shadow-lg flex items-center gap-2.5 font-bold text-[11px] uppercase tracking-widest transition-all border border-white/10 active:scale-95"
            >
              <Icons.FileCode className="size-4" />
              <span>Responses</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] min-w-[18px] text-center font-black">{activeItem.mocks?.length || 0}</span>
            </button>

            <div className={`fixed inset-y-0 right-0 w-[550px] max-w-[85vw] bg-surface-950 z-[110] border-l border-surface-800 shadow-2xl transform transition-transform duration-300 ease-out ${isResponsePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
              <ResponseOverlay item={activeItem} onClose={() => setIsResponsePanelOpen(false)} onUpdate={updateItem} />
            </div>
            {isResponsePanelOpen && <div className="fixed inset-0 bg-black/60 z-[105]" onClick={() => setIsResponsePanelOpen(false)} />}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30">
            <Icons.FileCode className="size-12 mb-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Select an item</span>
          </div>
        )}
      </main>
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
        className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-all duration-150 relative ${isActive ? 'bg-primary-600/15 text-primary-400' : 'hover:bg-surface-800/40 text-slate-500'}`}
        onClick={() => { setActiveItemId(item.id); if (item.type === 'folder') setIsOpen(!isOpen); }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {item.type === 'folder' ? <Icons.ChevronRight className={`size-3 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} /> : <span className={`text-[9px] font-black w-7 shrink-0 text-center ${isActive ? 'text-primary-400' : METHOD_COLORS[item.method || 'GET']}`}>{item.method}</span>}
          <span className={`text-[13px] font-medium truncate tracking-tight ${isActive ? 'text-slate-100' : ''}`}>{item.name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
          {item.type === 'folder' && <button onClick={(e) => { e.stopPropagation(); onAddChild('folder', item.id); }} className="p-0.5 hover:bg-white/10 rounded"><Icons.Folder className="size-3" /></button>}
          {item.type === 'folder' && <button onClick={(e) => { e.stopPropagation(); onAddChild('request', item.id); }} className="p-0.5 hover:bg-white/10 rounded"><Icons.Plus className="size-3" /></button>}
          <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-0.5 hover:bg-red-500/20 rounded text-red-500/50"><Icons.Delete className="size-3" /></button>
        </div>
      </div>
      {item.type === 'folder' && isOpen && (
        <div className="ml-4 pl-1 border-l border-surface-800/50 mt-px space-y-0.5">
          {children.map(child => <SidebarItem key={child.id} item={child} collection={collection} activeItemId={activeItemId} setActiveItemId={setActiveItemId} onAddChild={onAddChild} onDelete={onDelete} onMove={onMove} />)}
          {children.length === 0 && <div className="text-[10px] text-slate-700 py-1.5 pl-5 uppercase tracking-tighter">Empty</div>}
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
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[10px] text-slate-600 font-black uppercase tracking-widest">
        <span>Collection</span>
        {pathSegments.map((p, i) => <React.Fragment key={i}><Icons.ChevronRight className="size-2.5 opacity-30" /><span className="max-w-[120px] truncate">{p}</span></React.Fragment>)}
      </div>
      <input className="w-full bg-transparent border-none p-0 text-3xl font-black text-white focus:ring-0 placeholder-slate-900" value={item.name} onChange={(e) => onUpdate(item.id, { name: e.target.value })} placeholder="Endpoint Name" />
      <div className="h-0.5 w-12 bg-primary-600 rounded-full" />
    </div>
  );
};

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-600 mb-4 flex items-center gap-3">
    {title} <div className="h-px flex-1 bg-surface-800/50" />
  </h3>
);

const RequestDetails: React.FC<{ item: ApiItem, onUpdate: (id: string, updates: Partial<ApiItem>) => void }> = ({ item, onUpdate }) => (
  <div className="space-y-4">
    <SectionTitle title="Endpoint" />
    <div className="flex items-stretch bg-surface-900 border border-surface-800 rounded shadow-sm focus-within:border-primary-500/40 h-11 overflow-hidden transition-all">
      <div className="relative border-r border-surface-800 flex items-center shrink-0">
        <select className="bg-surface-800 border-none text-[12px] font-black text-primary-400 px-5 h-full focus:ring-0 cursor-pointer appearance-none pr-10 text-center" value={item.method} onChange={(e) => onUpdate(item.id, { method: e.target.value as HttpMethod })}>
          {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500"><Icons.ChevronRight className="size-3 rotate-90" /></div>
      </div>
      <input className="flex-1 bg-transparent border-none text-[14px] font-mono text-slate-300 px-5 focus:ring-0 placeholder-slate-800" value={item.url} onChange={(e) => onUpdate(item.id, { url: e.target.value })} placeholder="https://api.example.com/v1/..." />
    </div>
  </div>
);

const ParamTable: React.FC<{ title: string, items: ParamItem[], onChange: (items: ParamItem[]) => void }> = ({ title, items, onChange }) => {
  const addRow = () => onChange([...items, { id: `p_${Date.now()}`, key: '', value: '', description: '', enabled: true }]);
  const updateRow = (id: string, updates: Partial<ParamItem>) => onChange(items.map(it => it.id === id ? { ...it, ...updates } : it));
  const removeRow = (id: string) => onChange(items.filter(it => it.id !== id));
  return (
    <div className="space-y-3">
      <SectionTitle title={title} />
      <div className="bg-surface-900 border border-surface-800 rounded shadow-sm overflow-hidden">
        <table className="w-full text-left text-[13px] border-collapse min-w-[550px]">
          <thead className="bg-surface-950/30 text-slate-600 font-bold border-b border-surface-800 uppercase tracking-tighter text-[9px]">
            <tr>
              <th className="px-4 py-2.5 w-10 text-center">Req</th>
              <th className="px-4 py-2.5 w-[200px]">Key</th>
              <th className="px-4 py-2.5 w-[200px]">Value</th>
              <th className="px-4 py-2.5">Notes</th>
              <th className="px-4 py-2.5 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800/20">
            {items.map(item => (
              <tr key={item.id} className="group hover:bg-white/[0.01]">
                <td className="px-4 py-3 text-center"><input type="checkbox" checked={item.enabled} onChange={(e) => updateRow(item.id, { enabled: e.target.checked })} className="size-3.5 bg-surface-950 border-surface-700 rounded text-primary-600 focus:ring-0" /></td>
                <td className="px-4 py-3 font-mono"><input className="w-full bg-transparent border-none p-0 text-slate-300 focus:ring-0 placeholder-slate-800" value={item.key} onChange={(e) => updateRow(item.id, { key: e.target.value })} placeholder="field" /></td>
                <td className="px-4 py-3 font-mono"><input className="w-full bg-transparent border-none p-0 text-emerald-500/70 focus:ring-0 placeholder-slate-800" value={item.value} onChange={(e) => updateRow(item.id, { value: e.target.value })} placeholder="example" /></td>
                <td className="px-4 py-3"><input className="w-full bg-transparent border-none p-0 text-slate-600 italic focus:ring-0 placeholder-slate-800" value={item.description} onChange={(e) => updateRow(item.id, { description: e.target.value })} placeholder="..." /></td>
                <td className="px-4 py-3 text-center"><button onClick={() => removeRow(item.id)} className="text-slate-800 hover:text-red-500/70 opacity-0 group-hover:opacity-100 transition-all"><Icons.Delete className="size-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 border-t border-surface-800/50 bg-surface-900/40">
          <button onClick={addRow} className="w-full py-2 bg-surface-800 hover:bg-surface-700 rounded text-[10px] font-black text-slate-500 hover:text-slate-300 transition-all uppercase tracking-widest border border-surface-700">Add Item</button>
        </div>
      </div>
    </div>
  );
};

const RequestBody: React.FC<{ item: ApiItem, onUpdate: (id: string, updates: Partial<ApiItem>) => void }> = ({ item, onUpdate }) => {
  const types: { label: string, value: BodyType }[] = [
    { label: 'None', value: 'none' },
    { label: 'JSON', value: 'json' },
    { label: 'Form Data', value: 'form-data' },
    { label: 'Raw', value: 'raw' }
  ];

  return (
    <div className="space-y-4">
      <SectionTitle title="Request Body" />
      <div className="flex gap-2 mb-4">
        {types.map(t => (
          <button 
            key={t.value} 
            onClick={() => onUpdate(item.id, { bodyType: t.value })}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border transition-all ${item.bodyType === t.value ? 'bg-primary-600/10 border-primary-500/40 text-primary-400 shadow-sm' : 'bg-surface-900 border-surface-800 text-slate-600 hover:bg-surface-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      
      {item.bodyType === 'json' && (
        <div className="border border-surface-800 rounded bg-[#01040a] overflow-hidden h-64 shadow-inner">
          <Editor 
            height="100%" defaultLanguage="json" theme="vs-dark" value={item.bodyJson || ''} 
            onChange={(v) => onUpdate(item.id, { bodyJson: v })}
            options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: 'JetBrains Mono', padding: { top: 12, bottom: 12 }, automaticLayout: true, backgroundColor: '#01040a' }}
          />
        </div>
      )}

      {item.bodyType === 'raw' && (
        <textarea 
          className="w-full bg-[#01040a] border-surface-800 rounded text-[13px] font-mono text-slate-300 focus:ring-1 focus:ring-primary-500/30 focus:border-primary-500/40 min-h-[200px] p-4 border outline-none resize-none transition-all shadow-inner"
          value={item.bodyRaw}
          onChange={(e) => onUpdate(item.id, { bodyRaw: e.target.value })}
          placeholder="Enter raw request body..."
        />
      )}

      {item.bodyType === 'form-data' && (
        <ParamTable title="" items={item.bodyFormData || []} onChange={(items) => onUpdate(item.id, { bodyFormData: items })} />
      )}

      {item.bodyType === 'none' && (
        <div className="py-10 border border-dashed border-surface-800 rounded flex items-center justify-center text-[10px] text-slate-700 font-bold uppercase tracking-widest">No request body</div>
      )}
    </div>
  );
};

const ResponseOverlay: React.FC<{ item: ApiItem, onClose: () => void, onUpdate: (id: string, updates: Partial<ApiItem>) => void }> = ({ item, onClose, onUpdate }) => {
  const activeMock = item.mocks?.find(m => m.id === item.activeMockId) || item.mocks?.[0];
  const addMock = () => { const newMock: ResponseMock = { id: `m_${Date.now()}`, name: 'Scenario', status: 200, body: '{}' }; onUpdate(item.id, { mocks: [...(item.mocks || []), newMock], activeMockId: newMock.id }); };
  const updateActiveMock = (updates: Partial<ResponseMock>) => { if (!activeMock) return; onUpdate(item.id, { mocks: item.mocks?.map(m => m.id === activeMock.id ? { ...m, ...updates } : m) }); };
  const deleteMock = (id: string) => { const newMocks = item.mocks?.filter(m => m.id !== id) || []; onUpdate(item.id, { mocks: newMocks, activeMockId: newMocks[0]?.id || null }); };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface-950">
      <header className="p-4 border-b border-surface-800 flex items-center justify-between shrink-0 bg-surface-950/80 backdrop-blur-md">
        <div><h2 className="text-sm font-black text-white uppercase tracking-tighter">Mock Repository</h2><p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Responses</p></div>
        <button onClick={onClose} className="p-1 hover:bg-surface-800 rounded text-slate-600 hover:text-white transition-all"><Icons.Delete className="size-4" /></button>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-40 border-r border-surface-800 p-2 space-y-1.5 overflow-y-auto custom-scrollbar shrink-0 bg-surface-950/40">
          {item.mocks?.map(mock => (
            <div key={mock.id} onClick={() => onUpdate(item.id, { activeMockId: mock.id })} className={`p-2.5 rounded cursor-pointer transition-all border group relative ${item.activeMockId === mock.id ? 'bg-primary-600/5 border-primary-500/30 text-white' : 'hover:bg-surface-900 border-transparent text-slate-600'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-sm border ${mock.status >= 200 && mock.status < 300 ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10' : 'bg-red-500/5 text-red-600 border-red-500/10'}`}>{mock.status}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteMock(mock.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-opacity"><Icons.Delete className="size-3" /></button>
              </div>
              <div className="text-[11px] font-bold truncate tracking-tight">{mock.name}</div>
            </div>
          ))}
          <button onClick={addMock} className="w-full py-2 border border-dashed border-surface-800 rounded text-slate-700 hover:border-primary-500/20 hover:text-primary-400 transition-all text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5">Add Mock</button>
        </div>
        {activeMock ? (
          <div className="flex-1 flex flex-col min-w-0 bg-[#01040a]">
            <div className="p-4 border-b border-surface-800 space-y-3 bg-[#01040a]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-700 tracking-widest block pl-0.5">Mock Label</label>
                  <input className="w-full bg-surface-900 border border-surface-800 rounded px-3 py-1.5 text-[13px] font-bold text-slate-300 focus:ring-1 focus:ring-primary-500/30 outline-none" value={activeMock.name} onChange={(e) => updateActiveMock({ name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-700 tracking-widest block pl-0.5">HTTP Status</label>
                  <select className="w-full bg-surface-900 border border-surface-800 rounded px-3 py-1.5 text-[13px] font-bold text-slate-300 focus:ring-1 focus:ring-primary-500/30 outline-none cursor-pointer" value={activeMock.status} onChange={(e) => updateActiveMock({ status: parseInt(e.target.value) })}>
                    {HTTP_STATUS_CODES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                    {!HTTP_STATUS_CODES.find(s => s.code === activeMock.status) && <option value={activeMock.status}>{activeMock.status}</option>}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <Editor height="100%" defaultLanguage="json" theme="vs-dark" value={activeMock.body} onChange={(val) => updateActiveMock({ body: val || '' })} options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: 'JetBrains Mono', automaticLayout: true, padding: { top: 12, bottom: 12 }, wordWrap: 'on', backgroundColor: '#01040a', lineHeight: 18 }} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-800 text-center opacity-30"><p className="text-[10px] font-black uppercase tracking-[0.3em]">Empty scenario</p></div>
        )}
      </div>
    </div>
  );
};

export default App;
