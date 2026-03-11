'use client';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────
interface Component {
  id: string; asset: string; brand: string|null; vendor: string|null;
  total_qty_purchased: number; qty_returned_from_facilities: number;
  old_stock: number; qty_in_new_purchases: number; qty_out: number;
  qty_returned_to_vendor: number; qty_in_office: number; created_at: string;
}
interface PiUnit {
  id: string; serial_number: string; label: string; status: string;
  notes: string|null; qr_code: string|null; created_at: string; updated_at: string;
  pi_components?: Array<{id:string;component_id:string;notes:string|null;component:Component}>;
}
interface Log {
  id: string; type: string; quantity: number; reason: string|null;
  notes: string|null; performed_by: string|null; pi_name: string|null;
  action_type: string|null; created_at: string; component?: {asset:string;brand:string}|null;
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const I = {
  Home: () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Box: () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Cpu: () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  Activity: () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Qr: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><line x1="20" y1="14" x2="20" y2="17"/><line x1="17" y1="17" x2="17" y2="20"/><line x1="20" y1="20" x2="20" y2="20"/></svg>,
  Plus: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Close: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Search: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Download: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Refresh: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
};

function actionColor(a: string|null) { return (!a||a.includes('DELETE')) ? 'badge-red' : (a.includes('CREATE')||a.includes('ADD')) ? 'badge-green' : 'badge-orange'; }
function actionLabel(a: string|null) { return ({ADD_INVENTORY:'Added',UPDATE_INVENTORY:'Updated',DELETE_INVENTORY:'Deleted',CREATE_PI_BUILD:'Pi Created',UPDATE_PI_BUILD:'Pi Updated',DELETE_PI_BUILD:'Pi Deleted'} as any)[a||''] || (a||'Action'); }

function Toast({ msg, type }: { msg: string; type: 'success'|'error' }) {
  return <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl text-sm font-medium slide-up shadow-2xl" style={{background:type==='success'?'var(--hify-green)':'var(--hify-pink)',color:'white',whiteSpace:'nowrap'}}>{msg}</div>;
}

// ─── COMPONENT ROLE SLOTS ─────────────────────────────────────────────────────
const COMPONENT_ROLES = ['ssd','hat','cooler','sd_card','power_cable','metal_case'] as const;
type ComponentRole = typeof COMPONENT_ROLES[number];
const ROLE_LABELS: Record<ComponentRole, string> = {ssd:'SSD / NVMe',hat:'HAT',cooler:'Active Cooler',sd_card:'SD Card',power_cable:'Power Cable',metal_case:'Metal Case'};
function detectRole(asset: string): ComponentRole|null {
  const a = asset.toLowerCase();
  if (a.includes('ssd')||a.includes('nvme')) return 'ssd';
  if (a.includes('hat')) return 'hat';
  if (a.includes('cooler')) return 'cooler';
  if (a.includes('micro sd')||a.includes('sd card')) return 'sd_card';
  if (a.includes('power')||a.includes('usb c')) return 'power_cable';
  if (a.includes('case')) return 'metal_case';
  return null;
}

export default function Home() {
  const [tab, setTab] = useState<'home'|'inventory'|'pis'|'logs'>('home');
  const [inventory, setInventory] = useState<Component[]>([]);
  const [pis, setPis] = useState<PiUnit[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null);
  const [search, setSearch] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [editingInventory, setEditingInventory] = useState<Component|null>(null);
  const [showPiModal, setShowPiModal] = useState(false);
  const [editingPi, setEditingPi] = useState<PiUnit|null>(null);
  const [viewingPiQR, setViewingPiQR] = useState<{pi:PiUnit;qr:string}|null>(null);

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({msg,type}); setTimeout(()=>setToast(null),2500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, piData, logData] = await Promise.all([
        fetch('/api/inventory').then(r=>r.json()),
        fetch('/api/pi-builds').then(r=>r.json()),
        fetch('/api/logs').then(r=>r.json()),
      ]);
      setInventory(Array.isArray(inv)?inv:[]);
      setPis(Array.isArray(piData)?piData:[]);
      setLogs(Array.isArray(logData)?logData:[]);
    } catch { showToast('Failed to load data','error'); }
    setLoading(false);
  }, []);

  useEffect(()=>{fetchAll();},[fetchAll]);

  const handleQRScan = (data: string) => {
    setShowQRScanner(false);
    try {
      const parsed = JSON.parse(data);
      const found = pis.find(p=>p.id===parsed.id||p.label===parsed.label);
      if (found) { setEditingPi(found); setShowPiModal(true); setTab('pis'); }
      else showToast('Pi not found','error');
    } catch { showToast('Invalid QR code','error'); }
  };

  const saveInventory = async (item: Partial<Component>) => {
    const method = editingInventory ? 'PUT' : 'POST';
    const url = editingInventory ? `/api/inventory/${editingInventory.id}` : '/api/inventory';
    const res = await fetch(url, {method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(item)});
    if (res.ok) { showToast(editingInventory?'Updated!':'Added!'); setShowInventoryModal(false); setEditingInventory(null); fetchAll(); }
    else showToast('Save failed','error');
  };

  const deleteInventory = async (item: Component) => {
    if (!confirm(`Delete "${item.asset}"?`)) return;
    const res = await fetch(`/api/inventory/${item.id}`,{method:'DELETE'});
    if (res.ok) { showToast('Deleted!'); fetchAll(); }
    else showToast('Failed','error');
  };

  const savePi = async (pi: any) => {
    const method = editingPi ? 'PUT' : 'POST';
    const url = editingPi ? `/api/pi-builds/${editingPi.id}` : '/api/pi-builds';
    const res = await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(pi)});
    if (res.ok) { showToast(editingPi?'Pi updated!':'Pi created!'); setShowPiModal(false); setEditingPi(null); fetchAll(); }
    else showToast('Save failed','error');
  };

  const deletePi = async (pi: PiUnit) => {
    if (!confirm(`Delete Pi "${pi.label}"?`)) return;
    const res = await fetch(`/api/pi-builds/${pi.id}`,{method:'DELETE'});
    if (res.ok) { showToast('Deleted!'); fetchAll(); }
    else showToast('Failed','error');
  };

  const generateQR = async (pi: PiUnit) => {
    const res = await fetch('/api/qr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:JSON.stringify({id:pi.id,label:pi.label})})});
    const {qr} = await res.json();
    // Save QR back to pi
    await fetch(`/api/pi-builds/${pi.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...pi,qr_code:qr,components:(pi.pi_components||[]).map(c=>({component_id:c.component_id,role:c.notes}))})});
    setViewingPiQR({pi,qr});
  };

  const filteredInventory = inventory.filter(i=>i.asset?.toLowerCase().includes(search.toLowerCase())||(i.brand||'').toLowerCase().includes(search.toLowerCase()));
  const filteredPis = pis.filter(p=>p.label?.toLowerCase().includes(search.toLowerCase()));
  const totalUnits = inventory.reduce((s,i)=>s+(i.qty_in_office||0),0);
  const lowStock = inventory.filter(i=>i.qty_in_office<=2&&i.qty_in_office>0).length;
  const outOfStock = inventory.filter(i=>i.qty_in_office===0).length;

  const navItems = [
    {id:'home' as const, l:'Home', Icon:I.Home},
    {id:'inventory' as const, l:'Assets', Icon:I.Box},
    {id:'pis' as const, l:'Pi Builds', Icon:I.Cpu},
    {id:'logs' as const, l:'Logs', Icon:I.Activity},
  ];

  return (
    <div className="min-h-screen" style={{background:'var(--hify-dark)'}}>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      {showQRScanner && <QRScanner onScan={handleQRScan} onClose={()=>setShowQRScanner(false)}/>}

      {/* HEADER — sticky */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-5 py-3 md:px-8" style={{background:'var(--hify-dark)',borderBottom:'1px solid var(--hify-border)'}}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#FF6B2B,#FF3D6E)'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" fill="white" fillOpacity=".9"/><rect x="9" y="9" width="6" height="6" fill="#FF6B2B"/></svg>
          </div>
          <span className="font-display font-bold" style={{color:'var(--hify-text)'}}>HiFy</span>
          <span className="font-display text-sm" style={{color:'var(--hify-muted)'}}>Inventory</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="p-2 rounded-xl" style={{background:'rgba(0,0,0,0.06)',color:'var(--hify-muted)'}} title="Refresh"><I.Refresh/></button>
          <button onClick={()=>setShowQRScanner(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold" style={{background:'rgba(255,107,43,0.15)',color:'var(--hify-orange)'}}>
            <I.Qr/> Scan
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar nav */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto py-5 px-3 border-r" style={{borderColor:'var(--hify-border)'}}>
          {navItems.map(({id,l,Icon})=>{
            const active = tab===id;
            return (
              <button key={id} onClick={()=>{setTab(id);setSearch('');}}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 w-full text-left transition-colors"
                style={{background:active?'rgba(255,107,43,0.10)':'transparent',color:active?'var(--hify-orange)':'var(--hify-muted)'}}>
                <Icon/>{l}
              </button>
            );
          })}
        </aside>

        {/* Main content */}
        <main className="flex-1 px-4 py-4 pb-28 md:pb-10 md:px-8 md:max-w-3xl">

        {/* ── HOME ── */}
        {tab==='home' && (
          <div className="slide-up space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[{l:'Total Units',v:totalUnits,e:'📦',c:'var(--hify-orange)'},{l:'Pi Builds',v:pis.length,e:'🖥️',c:'#7C6EFF'},{l:'Low Stock',v:lowStock,e:'⚠️',c:'#F5A623'},{l:'Out of Stock',v:outOfStock,e:'🚫',c:'var(--hify-pink)'}].map(s=>(
                <div key={s.l} className="card p-4">
                  <div className="text-2xl mb-2">{s.e}</div>
                  <div className="font-display font-bold text-2xl" style={{color:s.c}}>{loading?'—':s.v}</div>
                  <div className="text-xs mt-0.5" style={{color:'var(--hify-muted)'}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-sm">Recent Activity</h3>
                <button onClick={()=>setTab('logs')} className="text-xs" style={{color:'var(--hify-orange)'}}>See all →</button>
              </div>
              {loading ? [1,2,3].map(i=><div key={i} className="h-12 rounded-lg mb-2" style={{background:'rgba(0,0,0,0.05)'}}/>) :
                logs.slice(0,5).map(log=>(
                <div key={log.id} className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{borderColor:'var(--hify-border)'}}>
                  <span className={`badge ${actionColor(log.action_type)} mt-0.5 shrink-0`}>{actionLabel(log.action_type)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{log.pi_name||log.component?.asset||log.notes||'—'}</p>
                    <p className="text-xs" style={{color:'var(--hify-muted)'}}>{new Date(log.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={()=>{setEditingInventory(null);setShowInventoryModal(true);setTab('inventory');}} className="card p-4 text-left">
                <div className="text-xl mb-2">➕</div>
                <p className="font-semibold text-sm">Add Asset</p>
                <p className="text-xs mt-0.5" style={{color:'var(--hify-muted)'}}>New inventory item</p>
              </button>
              <button onClick={()=>{setEditingPi(null);setShowPiModal(true);setTab('pis');}} className="card p-4 text-left">
                <div className="text-xl mb-2">🖥️</div>
                <p className="font-semibold text-sm">New Pi Build</p>
                <p className="text-xs mt-0.5" style={{color:'var(--hify-muted)'}}>Configure a Pi</p>
              </button>
            </div>
          </div>
        )}

        {/* ── INVENTORY ── */}
        {tab==='inventory' && (
          <div className="slide-up space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 hify-input px-3 py-2.5">
                <I.Search/><input className="bg-transparent flex-1 text-sm outline-none" placeholder="Search assets..." value={search} onChange={e=>setSearch(e.target.value)} style={{color:'var(--hify-text)'}}/>
              </div>
              <button onClick={()=>{setEditingInventory(null);setShowInventoryModal(true);}} className="btn-primary p-2.5 shrink-0"><I.Plus/></button>
            </div>
            {loading ? [1,2,3,4].map(i=><div key={i} className="h-20 card" style={{animation:'pulse 1.5s infinite'}}/>) :
            filteredInventory.length===0 ? <div className="text-center py-16" style={{color:'var(--hify-muted)'}}><div className="text-4xl mb-3">📦</div><p>No assets found</p></div> :
            filteredInventory.map(item=>(
              <div key={item.id} className="card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-tight">{item.asset}</p>
                    <p className="text-xs mt-0.5" style={{color:'var(--hify-muted)'}}>{item.brand}{item.vendor?` · ${item.vendor}`:''}</p>
                  </div>
                  <div className={`badge shrink-0 ${item.qty_in_office===0?'badge-red':item.qty_in_office<=3?'badge-orange':'badge-green'}`}>{item.qty_in_office} in office</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs" style={{color:'var(--hify-muted)'}}>
                    <span>Purchased: {item.total_qty_purchased||'—'}</span>
                    <span>Out: {item.qty_out||0}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>{setEditingInventory(item);setShowInventoryModal(true);}} className="p-1.5 rounded-lg" style={{background:'rgba(255,107,43,0.15)',color:'var(--hify-orange)'}}><I.Edit/></button>
                    <button onClick={()=>deleteInventory(item)} className="p-1.5 rounded-lg" style={{background:'rgba(255,61,110,0.15)',color:'var(--hify-pink)'}}><I.Trash/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PI BUILDS ── */}
        {tab==='pis' && (
          <div className="slide-up space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 hify-input px-3 py-2.5">
                <I.Search/><input className="bg-transparent flex-1 text-sm outline-none" placeholder="Search Pi builds..." value={search} onChange={e=>setSearch(e.target.value)} style={{color:'var(--hify-text)'}}/>
              </div>
              <button onClick={()=>{setEditingPi(null);setShowPiModal(true);}} className="btn-primary p-2.5 shrink-0"><I.Plus/></button>
            </div>
            {loading ? [1,2,3].map(i=><div key={i} className="h-32 card" style={{animation:'pulse 1.5s infinite'}}/>) :
            filteredPis.length===0 ? <div className="text-center py-16" style={{color:'var(--hify-muted)'}}><div className="text-4xl mb-3">🖥️</div><p>No Pi builds yet</p></div> :
            filteredPis.map(pi=>{
              const comps = pi.pi_components||[];
              return (
                <div key={pi.id} className="card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-display font-semibold">{pi.label}</p>
                      <p className="text-xs mt-0.5" style={{color:'var(--hify-muted)'}}>{pi.serial_number} · <span className={`badge inline ${pi.status==='deployed'?'badge-green':'badge-orange'}`}>{pi.status}</span></p>
                    </div>
                    <button onClick={()=>generateQR(pi)} className="p-2 rounded-xl" style={{background:'rgba(124,110,255,0.15)',color:'#7C6EFF'}}><I.Qr/></button>
                  </div>
                  {comps.length>0 && (
                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      {comps.map(c=>(
                        <div key={c.id} className="px-2.5 py-1.5 rounded-lg text-xs" style={{background:'rgba(0,0,0,0.05)'}}>
                          <span style={{color:'var(--hify-muted)'}}>{c.notes||'Part'}: </span>
                          <span className="font-medium">{c.component?.asset?.split(' ').slice(0,3).join(' ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {pi.notes && <p className="text-xs mb-3 italic" style={{color:'var(--hify-muted)'}}>{pi.notes}</p>}
                  <div className="flex gap-2">
                    <button onClick={()=>{setEditingPi(pi);setShowPiModal(true);}} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{background:'rgba(255,107,43,0.15)',color:'var(--hify-orange)'}}><I.Edit/> Edit</button>
                    <button onClick={()=>deletePi(pi)} className="py-2 px-3 rounded-xl" style={{background:'rgba(255,61,110,0.15)',color:'var(--hify-pink)'}}><I.Trash/></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── LOGS ── */}
        {tab==='logs' && (
          <div className="slide-up space-y-3">
            <p className="text-xs" style={{color:'var(--hify-muted)'}}>{logs.length} recent transactions</p>
            {loading ? [1,2,3,4,5].map(i=><div key={i} className="h-16 card" style={{animation:'pulse 1.5s infinite'}}/>) :
            logs.length===0 ? <div className="text-center py-16" style={{color:'var(--hify-muted)'}}><div className="text-4xl mb-3">📋</div><p>No transactions yet</p></div> :
            logs.map(log=>(
              <div key={log.id} className="card p-3.5 flex items-start gap-3">
                <span className={`badge ${actionColor(log.action_type)} mt-0.5 shrink-0`}>{actionLabel(log.action_type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{log.pi_name||log.component?.asset||log.notes||'—'}</p>
                  {log.notes && <p className="text-xs truncate" style={{color:'var(--hify-muted)'}}>{log.notes}</p>}
                  <p className="text-xs mt-1" style={{color:'var(--hify-muted)'}}>{new Date(log.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                </div>
                {log.quantity>0 && <span className="text-sm font-bold shrink-0" style={{color:'var(--hify-orange)'}}>×{log.quantity}</span>}
              </div>
            ))}
          </div>
        )}
        </main>
      </div>

      {/* Mobile bottom nav — hidden on desktop */}
      <nav className="bottom-nav md:hidden fixed bottom-0 left-0 right-0 px-2 pb-6 pt-2">
        <div className="flex">
          {navItems.map(({id,l,Icon})=>(
            <button key={id} onClick={()=>{setTab(id);setSearch('');}} className="flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium" style={{color:tab===id?'var(--hify-orange)':'var(--hify-muted)'}}>
              <Icon/>{l}
              {tab===id && <div className="w-1 h-1 rounded-full" style={{background:'var(--hify-orange)'}}/>}
            </button>
          ))}
        </div>
      </nav>

      {showInventoryModal && <InventoryModal item={editingInventory} onSave={saveInventory} onClose={()=>{setShowInventoryModal(false);setEditingInventory(null);}}/>}
      {showPiModal && <PiModal pi={editingPi} inventory={inventory} onSave={savePi} onClose={()=>{setShowPiModal(false);setEditingPi(null);}}/>}

      {viewingPiQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop fade-in px-6">
          <div className="card p-6 w-full max-w-sm slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">{viewingPiQR.pi.label}</h3>
              <button onClick={()=>setViewingPiQR(null)} className="p-1 rounded-full" style={{background:'rgba(0,0,0,0.07)'}}><I.Close/></button>
            </div>
            <div className="bg-white rounded-2xl p-4 flex items-center justify-center mb-4">
              <img src={viewingPiQR.qr} alt="QR Code" className="w-56 h-56"/>
            </div>
            <p className="text-xs text-center mb-4" style={{color:'var(--hify-muted)'}}>Print and attach to this Pi for tracking</p>
            <a href={viewingPiQR.qr} download={`${viewingPiQR.pi.label}-qr.png`} className="btn-primary flex items-center justify-center gap-2 py-3 w-full text-sm"><I.Download/> Download QR</a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inventory Modal ──────────────────────────────────────────────────────────
function InventoryModal({item,onSave,onClose}: {item:Component|null;onSave:(d:any)=>void;onClose:()=>void}) {
  const [form,setForm] = useState({
    asset:item?.asset||'', brand:item?.brand||'', vendor:item?.vendor||'',
    total_qty_purchased:item?.total_qty_purchased??0,
    qty_returned_from_facilities:item?.qty_returned_from_facilities??0,
    old_stock:item?.old_stock??0, qty_in_new_purchases:item?.qty_in_new_purchases??0,
    qty_out:item?.qty_out??0, qty_returned_to_vendor:item?.qty_returned_to_vendor??0,
    qty_in_office:item?.qty_in_office??0,
  });
  const [saving,setSaving] = useState(false);
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));
  const handleSave = async () => { if(!form.asset) return; setSaving(true); await onSave(form); setSaving(false); };
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center modal-backdrop fade-in md:px-4">
      <div className="w-full max-w-lg card rounded-t-3xl md:rounded-3xl p-5 pb-10 slide-up" style={{maxHeight:'90vh',overflowY:'auto'}}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-semibold text-lg">{item?'Edit Asset':'Add Asset'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{background:'rgba(0,0,0,0.07)'}}><I.Close/></button>
        </div>
        <div className="space-y-3">
          {[{l:'Asset Name *',k:'asset',p:'e.g. Raspberry Pi 5 8GB'},{l:'Brand',k:'brand',p:'e.g. Raspberry Pi'},{l:'Vendor',k:'vendor',p:'e.g. Robu'}].map(f=>(
            <div key={f.k}><label className="text-xs font-medium mb-1.5 block" style={{color:'var(--hify-muted)'}}>{f.l}</label>
            <input className="hify-input w-full px-3 py-2.5 text-sm" placeholder={f.p} value={(form as any)[f.k]} onChange={e=>set(f.k,e.target.value)}/></div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            {[{l:'Total Purchased',k:'total_qty_purchased'},{l:'Old Stock',k:'old_stock'},{l:'Qty In (new)',k:'qty_in_new_purchases'},{l:'Qty Out',k:'qty_out'},{l:'Returned to Vendor',k:'qty_returned_to_vendor'},{l:'In Office ✱',k:'qty_in_office'}].map(f=>(
              <div key={f.k}><label className="text-xs font-medium mb-1.5 block" style={{color:'var(--hify-muted)'}}>{f.l}</label>
              <input type="number" className="hify-input w-full px-3 py-2.5 text-sm" value={(form as any)[f.k]} onChange={e=>set(f.k,parseInt(e.target.value)||0)}/></div>
            ))}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving||!form.asset} className="btn-primary w-full py-3.5 mt-5 text-sm" style={{opacity:saving||!form.asset?0.6:1}}>{saving?'Saving…':(item?'Update Asset':'Add Asset')}</button>
      </div>
    </div>
  );
}

// ─── Pi Build Modal ───────────────────────────────────────────────────────────
function PiModal({pi,inventory,onSave,onClose}: {pi:PiUnit|null;inventory:Component[];onSave:(d:any)=>void;onClose:()=>void}) {
  const existingComps = pi?.pi_components||[];
  const initSlots: Record<string,string> = {};
  existingComps.forEach(c => { if(c.notes) initSlots[c.notes] = c.component_id; });

  const [label,setLabel] = useState(pi?.label||'');
  const [serial,setSerial] = useState(pi?.serial_number||'');
  const [status,setStatus] = useState(pi?.status||'in_office');
  const [notes,setNotes] = useState(pi?.notes||'');
  const [slots,setSlots] = useState<Record<string,string>>(initSlots);
  const [saving,setSaving] = useState(false);

  const setSlot = (role: string, componentId: string) => setSlots(s=>({...s,[role]:componentId}));
  const getOptionsForRole = (role: ComponentRole) => inventory.filter(i=>detectRole(i.asset)===role);

  const handleSave = async () => {
    if(!label) return;
    setSaving(true);
    const components = Object.entries(slots).filter(([,id])=>id).map(([role,component_id])=>({component_id,role}));
    await onSave({label,serial_number:serial||`HiFy-${Date.now()}`,status,notes,components});
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center modal-backdrop fade-in md:px-4">
      <div className="w-full max-w-lg card rounded-t-3xl md:rounded-3xl p-5 pb-10 slide-up" style={{maxHeight:'92vh',overflowY:'auto'}}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-semibold text-lg">{pi?'Edit Pi Build':'New Pi Build'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{background:'rgba(0,0,0,0.07)'}}><I.Close/></button>
        </div>
        <div className="space-y-3">
          <div><label className="text-xs font-medium mb-1.5 block" style={{color:'var(--hify-muted)'}}>Pi Label *</label>
          <input className="hify-input w-full px-3 py-2.5 text-sm" placeholder="e.g. Pi-Alpha-01" value={label} onChange={e=>setLabel(e.target.value)}/></div>
          <div><label className="text-xs font-medium mb-1.5 block" style={{color:'var(--hify-muted)'}}>Serial Number</label>
          <input className="hify-input w-full px-3 py-2.5 text-sm" placeholder="auto-generated if blank" value={serial} onChange={e=>setSerial(e.target.value)}/></div>
          <div><label className="text-xs font-medium mb-1.5 block" style={{color:'var(--hify-muted)'}}>Status</label>
          <select className="hify-input w-full px-3 py-2.5 text-sm" value={status} onChange={e=>setStatus(e.target.value)} style={{appearance:'auto'}}>
            <option value="in_office">In Office</option>
            <option value="deployed">Deployed</option>
            <option value="faulty">Faulty</option>
            <option value="returned">Returned</option>
          </select></div>

          <div className="rounded-xl p-3 space-y-3" style={{background:'rgba(255,107,43,0.05)',border:'1px solid rgba(255,107,43,0.15)'}}>
            <p className="text-xs font-semibold" style={{color:'var(--hify-orange)'}}>🔧 Assembled Components</p>
            {COMPONENT_ROLES.map(role=>{
              const opts = getOptionsForRole(role);
              return (
                <div key={role}>
                  <label className="text-xs font-medium mb-1.5 block" style={{color:'var(--hify-muted)'}}>{ROLE_LABELS[role]}</label>
                  <select className="hify-input w-full px-3 py-2.5 text-sm" value={slots[role]||''} onChange={e=>setSlot(role,e.target.value)} style={{appearance:'auto'}}>
                    <option value="">— None —</option>
                    {opts.map(o=><option key={o.id} value={o.id}>{o.asset} ({o.qty_in_office} in office)</option>)}
                  </select>
                </div>
              );
            })}
          </div>

          <div><label className="text-xs font-medium mb-1.5 block" style={{color:'var(--hify-muted)'}}>Notes</label>
          <textarea className="hify-input w-full px-3 py-2.5 text-sm resize-none" rows={2} value={notes} onChange={e=>setNotes(e.target.value)}/></div>
        </div>
        <button onClick={handleSave} disabled={saving||!label} className="btn-primary w-full py-3.5 mt-5 text-sm" style={{opacity:saving||!label?0.6:1}}>{saving?'Saving…':(pi?'Update Pi Build':'Create Pi Build')}</button>
      </div>
    </div>
  );
}
