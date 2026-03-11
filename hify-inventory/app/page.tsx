'use client';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────
interface Component {
  id: string; asset: string; brand: string|null; vendor: string|null;
  qty_in_office: number; created_at: string;
  // legacy fields still in DB
  total_qty_purchased: number; qty_returned_from_facilities: number;
  old_stock: number; qty_in_new_purchases: number; qty_out: number;
  qty_returned_to_vendor: number;
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
  Home:     () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Box:      () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Cpu:      () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  Activity: () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Qr:       () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><line x1="20" y1="14" x2="20" y2="17"/><line x1="17" y1="17" x2="17" y2="20"/><line x1="20" y1="20" x2="20" y2="20"/></svg>,
  Plus:     () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Minus:    () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit:     () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:    () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Close:    () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Search:   () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Download: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Refresh:  () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  Package:  () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
};

function actionColor(a: string|null) { return (!a||a.includes('DELETE')) ? 'badge-red' : (a.includes('CREATE')||a.includes('ADD')) ? 'badge-green' : 'badge-orange'; }
function actionLabel(a: string|null) { return ({ADD_INVENTORY:'Restocked',UPDATE_INVENTORY:'Updated',DELETE_INVENTORY:'Removed',CREATE_PI_BUILD:'Pi Built',UPDATE_PI_BUILD:'Pi Updated',DELETE_PI_BUILD:'Pi Dismantled'} as any)[a||''] || (a||'Action'); }

function Toast({ msg, type }: { msg: string; type: 'success'|'error' }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-semibold slide-up"
      style={{background:type==='success'?'var(--hify-green)':'var(--hify-pink)',color:'white',whiteSpace:'nowrap',boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}>
      {msg}
    </div>
  );
}

// ─── Component role slots ──────────────────────────────────────────────────────
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

const S = {
  iconBtn: (color: string, bg: string): React.CSSProperties => ({
    width:36, height:36, borderRadius:10, background:bg, color,
    display:'flex', alignItems:'center', justifyContent:'center',
    border:'none', cursor:'pointer', flexShrink:0,
  }),
  label: { fontSize:12, fontWeight:500, color:'var(--hify-muted)', display:'block', marginBottom:6 } as React.CSSProperties,
  sheetWrap: { width:'100%', background:'var(--hify-surface)', borderRadius:'24px 24px 0 0', padding:'20px 20px', paddingBottom:'calc(28px + env(safe-area-inset-bottom, 0px))', maxHeight:'94dvh', overflowY:'auto' } as React.CSSProperties,
};

function stockBadge(qty: number) {
  if (qty === 0) return { cls:'badge-red',   label:'Out of stock' };
  if (qty <= 3)  return { cls:'badge-orange', label:`Low · ${qty}` };
  return              { cls:'badge-green',  label:`${qty} in stock` };
}
function statusBadge(s: string) {
  return s==='deployed'?'badge-green':s==='faulty'?'badge-red':'badge-orange';
}

export default function Home() {
  const [tab, setTab]               = useState<'home'|'inventory'|'pis'|'logs'>('home');
  const [inventory, setInventory]   = useState<Component[]>([]);
  const [pis, setPis]               = useState<PiUnit[]>([]);
  const [logs, setLogs]             = useState<Log[]>([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState<{msg:string;type:'success'|'error'}|null>(null);
  const [search, setSearch]         = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);

  // inventory modals
  const [showInventoryModal, setShowInventoryModal]   = useState(false);
  const [editingInventory, setEditingInventory]       = useState<Component|null>(null);
  const [receivingStockFor, setReceivingStockFor]     = useState<Component|null>(null);

  // pi modals
  const [showPiModal, setShowPiModal]   = useState(false);
  const [editingPi, setEditingPi]       = useState<PiUnit|null>(null);
  const [viewingPiQR, setViewingPiQR]   = useState<{pi:PiUnit;qr:string}|null>(null);
  const [viewingPiDetail, setViewingPiDetail] = useState<PiUnit|null>(null);

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

  // QR scan → show Pi detail, not edit
  const handleQRScan = (data: string) => {
    setShowQRScanner(false);
    try {
      const parsed = JSON.parse(data);
      const found = pis.find(p=>p.id===parsed.id||p.label===parsed.label);
      if (found) setViewingPiDetail(found);
      else showToast('Pi not found','error');
    } catch { showToast('Invalid QR code','error'); }
  };

  const saveInventory = async (item: {asset:string;brand:string;vendor:string;qty_in_office:number}) => {
    const method = editingInventory ? 'PUT' : 'POST';
    const url    = editingInventory ? `/api/inventory/${editingInventory.id}` : '/api/inventory';
    const res    = await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});
    if (res.ok) { showToast(editingInventory?'Updated!':'Asset added!'); setShowInventoryModal(false); setEditingInventory(null); fetchAll(); }
    else showToast('Save failed','error');
  };

  const deleteInventory = async (item: Component) => {
    if (!confirm(`Delete "${item.asset}"?`)) return;
    const res = await fetch(`/api/inventory/${item.id}`,{method:'DELETE'});
    if (res.ok) { showToast('Deleted!'); fetchAll(); }
    else showToast('Failed','error');
  };

  const receiveStock = async (componentId: string, qty: number) => {
    const res = await fetch(`/api/inventory/${componentId}/receive`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({qty})});
    if (res.ok) { showToast(`+${qty} units added!`); setReceivingStockFor(null); fetchAll(); }
    else showToast('Failed to receive stock','error');
  };

  const savePi = async (pi: any) => {
    const method = editingPi ? 'PUT' : 'POST';
    const url    = editingPi ? `/api/pi-builds/${editingPi.id}` : '/api/pi-builds';
    const res    = await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(pi)});
    if (res.ok) { showToast(editingPi?'Pi updated!':'Pi assembled!'); setShowPiModal(false); setEditingPi(null); fetchAll(); }
    else showToast('Save failed','error');
  };

  const deletePi = async (pi: PiUnit) => {
    if (!confirm(`Disassemble & delete Pi "${pi.label}"? Components will return to inventory.`)) return;
    const res = await fetch(`/api/pi-builds/${pi.id}`,{method:'DELETE'});
    if (res.ok) { showToast('Pi dismantled, stock returned!'); fetchAll(); }
    else showToast('Failed','error');
  };

  const generateQR = async (pi: PiUnit) => {
    try {
      const res = await fetch('/api/qr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:JSON.stringify({id:pi.id,label:pi.label})})});
      if (!res.ok) throw new Error('QR generation failed');
      const {qr} = await res.json();
      const saveRes = await fetch(`/api/pi-builds/${pi.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...pi,qr_code:qr,components:(pi.pi_components||[]).map(c=>({component_id:c.component_id,role:c.notes}))})});
      if (!saveRes.ok) throw new Error('Failed to save QR');
      setViewingPiQR({pi,qr});
    } catch (e: any) {
      showToast(e?.message||'Failed to generate QR','error');
    }
  };

  const filteredInventory = inventory.filter(i=>
    i.asset?.toLowerCase().includes(search.toLowerCase())||
    (i.brand||'').toLowerCase().includes(search.toLowerCase())
  );
  const filteredPis  = pis.filter(p=>p.label?.toLowerCase().includes(search.toLowerCase()));
  const totalUnits   = inventory.reduce((s,i)=>s+(i.qty_in_office||0),0);
  const lowStock     = inventory.filter(i=>i.qty_in_office<=3&&i.qty_in_office>0).length;
  const outOfStock   = inventory.filter(i=>i.qty_in_office===0).length;

  const navItems = [
    {id:'home'      as const, l:'Home',      Icon:I.Home},
    {id:'inventory' as const, l:'Assets',    Icon:I.Box},
    {id:'pis'       as const, l:'Pi Builds', Icon:I.Cpu},
    {id:'logs'      as const, l:'Logs',      Icon:I.Activity},
  ];

  return (
    <div style={{background:'var(--hify-bg)',height:'100dvh',display:'flex',justifyContent:'center',overflow:'hidden'}}>
      <div style={{width:'100%',maxWidth:430,height:'100%',display:'flex',flexDirection:'column',background:'var(--hify-bg)',position:'relative'}}>

        {toast && <Toast msg={toast.msg} type={toast.type}/>}
        {showQRScanner && <QRScanner onScan={handleQRScan} onClose={()=>setShowQRScanner(false)}/>}

        {/* ── HEADER ── */}
        <header style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid var(--hify-border)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:12,background:'linear-gradient(135deg,#FF6B35,#FF3D6E)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="2.5" fill="white" fillOpacity=".95"/>
                <rect x="9" y="9" width="6" height="6" fill="#FF6B35"/>
              </svg>
            </div>
            <div>
              <span className="font-display" style={{fontWeight:700,fontSize:15,color:'white'}}>HiFy</span>
              <span style={{fontSize:13,color:'var(--hify-muted)',marginLeft:6}}>Inventory</span>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={fetchAll} style={S.iconBtn('var(--hify-muted)','var(--hify-surface2)')} title="Refresh"><I.Refresh/></button>
            <button onClick={()=>setShowQRScanner(true)} style={{height:36,padding:'0 14px',borderRadius:10,background:'rgba(255,107,53,0.12)',color:'var(--hify-orange)',display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:600,border:'none',cursor:'pointer'}}>
              <I.Qr/> Scan QR
            </button>
          </div>
        </header>

        {/* ── MAIN ── */}
        <main style={{flex:1,overflowY:'auto',padding:'16px 16px 8px'}}>

          {/* HOME */}
          {tab==='home' && (
            <div className="slide-up" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[
                  {l:'In Stock',     v:totalUnits,  icon:'📦', c:'var(--hify-orange)', bg:'rgba(255,107,53,0.1)'},
                  {l:'Pi Builds',    v:pis.length,   icon:'🖥️', c:'var(--hify-purple)', bg:'rgba(167,139,250,0.1)'},
                  {l:'Low Stock',    v:lowStock,     icon:'⚠️', c:'var(--hify-yellow)', bg:'rgba(251,191,36,0.1)'},
                  {l:'Out of Stock', v:outOfStock,   icon:'🚫', c:'var(--hify-pink)',   bg:'rgba(255,61,110,0.1)'},
                ].map(s=>(
                  <div key={s.l} className="card" style={{padding:16}}>
                    <div style={{width:42,height:42,borderRadius:13,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,marginBottom:12}}>{s.icon}</div>
                    <div className="font-display" style={{fontWeight:700,fontSize:30,color:s.c,lineHeight:1}}>{loading?'—':s.v}</div>
                    <div style={{fontSize:12,color:'var(--hify-muted)',marginTop:5}}>{s.l}</div>
                  </div>
                ))}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <button onClick={()=>{setEditingInventory(null);setShowInventoryModal(true);setTab('inventory');}} className="card"
                  style={{padding:16,textAlign:'left',border:'1px solid var(--hify-border)',cursor:'pointer'}}>
                  <div style={{...S.iconBtn('var(--hify-orange)','rgba(255,107,53,0.12)'),marginBottom:10}}><I.Plus/></div>
                  <p style={{fontWeight:600,fontSize:14,color:'white',margin:0}}>Add Asset</p>
                  <p style={{fontSize:12,color:'var(--hify-muted)',margin:'3px 0 0'}}>New inventory item</p>
                </button>
                <button onClick={()=>{setEditingPi(null);setShowPiModal(true);setTab('pis');}} className="card"
                  style={{padding:16,textAlign:'left',border:'1px solid var(--hify-border)',cursor:'pointer'}}>
                  <div style={{...S.iconBtn('var(--hify-purple)','rgba(167,139,250,0.12)'),marginBottom:10}}><I.Cpu/></div>
                  <p style={{fontWeight:600,fontSize:14,color:'white',margin:0}}>Assemble Pi</p>
                  <p style={{fontSize:12,color:'var(--hify-muted)',margin:'3px 0 0'}}>Build a Pi unit</p>
                </button>
              </div>

              <div className="card" style={{overflow:'hidden'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderBottom:'1px solid var(--hify-border)'}}>
                  <span className="font-display" style={{fontWeight:600,fontSize:14,color:'white'}}>Recent Activity</span>
                  <button onClick={()=>setTab('logs')} style={{fontSize:12,fontWeight:600,color:'var(--hify-orange)',background:'none',border:'none',cursor:'pointer'}}>See all →</button>
                </div>
                {loading ? (
                  <div style={{padding:16,display:'flex',flexDirection:'column',gap:10}}>
                    {[1,2,3].map(i=><div key={i} className="skeleton" style={{height:44}}/>)}
                  </div>
                ) : logs.length===0 ? (
                  <div style={{padding:'32px 0',textAlign:'center',color:'var(--hify-muted)',fontSize:13}}>No activity yet</div>
                ) : logs.slice(0,5).map((log,i)=>(
                  <div key={log.id} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'11px 16px',borderBottom:i<Math.min(logs.length,5)-1?'1px solid var(--hify-border)':'none'}}>
                    <span className={`badge ${actionColor(log.action_type)}`} style={{marginTop:1,flexShrink:0}}>{actionLabel(log.action_type)}</span>
                    <div style={{minWidth:0,flex:1}}>
                      <p style={{fontSize:13,fontWeight:500,color:'white',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{log.pi_name||log.component?.asset||log.notes||'—'}</p>
                      <p style={{fontSize:11,color:'var(--hify-muted)',margin:'2px 0 0'}}>{new Date(log.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                    </div>
                    {log.quantity>0 && <span style={{fontSize:12,fontWeight:700,color:'var(--hify-orange)',flexShrink:0}}>×{log.quantity}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INVENTORY */}
          {tab==='inventory' && (
            <div className="slide-up" style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',gap:10}}>
                <div className="hify-input" style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'0 14px',height:44}}>
                  <span style={{color:'var(--hify-muted)',flexShrink:0}}><I.Search/></span>
                  <input style={{flex:1,fontSize:14,background:'transparent',border:'none',outline:'none',color:'var(--hify-text)'}} placeholder="Search assets…" value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                <button onClick={()=>{setEditingInventory(null);setShowInventoryModal(true);}} className="btn-primary" style={{width:44,height:44,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><I.Plus/></button>
              </div>

              {loading ? (
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:90}}/>)}
                </div>
              ) : filteredInventory.length===0 ? (
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:80,gap:10,color:'var(--hify-muted)'}}>
                  <div style={{fontSize:48}}>📦</div>
                  <p style={{fontSize:15,fontWeight:500,margin:0}}>No assets found</p>
                </div>
              ) : filteredInventory.map(item=>{
                const sb = stockBadge(item.qty_in_office);
                return (
                  <div key={item.id} className="card" style={{padding:16}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,marginBottom:12}}>
                      <div style={{minWidth:0}}>
                        <p style={{fontWeight:600,fontSize:14,color:'white',margin:0,lineHeight:1.35}}>{item.asset}</p>
                        <p style={{fontSize:12,color:'var(--hify-muted)',margin:'4px 0 0'}}>{[item.brand,item.vendor].filter(Boolean).join(' · ')||'—'}</p>
                      </div>
                      <span className={`badge ${sb.cls}`} style={{flexShrink:0}}>{sb.label}</span>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>setReceivingStockFor(item)}
                        style={{flex:1,height:34,borderRadius:10,background:'rgba(34,197,94,0.12)',color:'var(--hify-green)',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontSize:12,fontWeight:600,border:'none',cursor:'pointer'}}>
                        <I.Package/> Receive Stock
                      </button>
                      <button onClick={()=>{setEditingInventory(item);setShowInventoryModal(true);}} style={S.iconBtn('var(--hify-orange)','rgba(255,107,53,0.12)')}><I.Edit/></button>
                      <button onClick={()=>deleteInventory(item)} style={S.iconBtn('var(--hify-pink)','rgba(255,61,110,0.12)')}><I.Trash/></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PI BUILDS */}
          {tab==='pis' && (
            <div className="slide-up" style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',gap:10}}>
                <div className="hify-input" style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'0 14px',height:44}}>
                  <span style={{color:'var(--hify-muted)',flexShrink:0}}><I.Search/></span>
                  <input style={{flex:1,fontSize:14,background:'transparent',border:'none',outline:'none',color:'var(--hify-text)'}} placeholder="Search Pi builds…" value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                <button onClick={()=>{setEditingPi(null);setShowPiModal(true);}} className="btn-primary" style={{width:44,height:44,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><I.Plus/></button>
              </div>

              {loading ? (
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {[1,2,3].map(i=><div key={i} className="skeleton" style={{height:140}}/>)}
                </div>
              ) : filteredPis.length===0 ? (
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:80,gap:10,color:'var(--hify-muted)'}}>
                  <div style={{fontSize:48}}>🖥️</div>
                  <p style={{fontSize:15,fontWeight:500,margin:0}}>No Pi builds yet</p>
                </div>
              ) : filteredPis.map(pi=>{
                const comps = pi.pi_components||[];
                return (
                  <div key={pi.id} className="card" style={{padding:16}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
                      <div style={{minWidth:0}}>
                        <p className="font-display" style={{fontWeight:700,fontSize:16,color:'white',margin:0}}>{pi.label}</p>
                        <p style={{fontSize:12,color:'var(--hify-muted)',margin:'3px 0 0'}}>{pi.serial_number}</p>
                      </div>
                      <span className={`badge ${statusBadge(pi.status)}`}>{pi.status.replace(/_/g,' ')}</span>
                    </div>
                    {comps.length>0 && (
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:10}}>
                        {comps.map(c=>(
                          <div key={c.id} style={{padding:'6px 10px',borderRadius:10,background:'var(--hify-surface2)',fontSize:12}}>
                            <span style={{color:'var(--hify-muted)'}}>{c.notes||'Part'}: </span>
                            <span style={{fontWeight:500,color:'white'}}>{c.component?.asset?.split(' ').slice(0,3).join(' ')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {pi.notes && <p style={{fontSize:12,color:'var(--hify-muted)',fontStyle:'italic',margin:'0 0 10px'}}>{pi.notes}</p>}
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>setViewingPiDetail(pi)}
                        style={{flex:1,height:36,borderRadius:10,background:'rgba(167,139,250,0.12)',color:'var(--hify-purple)',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontSize:13,fontWeight:600,border:'none',cursor:'pointer'}}>
                        <I.Qr/> View / QR
                      </button>
                      <button onClick={()=>{setEditingPi(pi);setShowPiModal(true);}} style={S.iconBtn('var(--hify-orange)','rgba(255,107,53,0.12)')}><I.Edit/></button>
                      <button onClick={()=>deletePi(pi)} style={S.iconBtn('var(--hify-pink)','rgba(255,61,110,0.12)')}><I.Trash/></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LOGS */}
          {tab==='logs' && (
            <div className="slide-up" style={{display:'flex',flexDirection:'column',gap:8}}>
              <p style={{fontSize:12,color:'var(--hify-muted)',margin:'0 0 4px 2px'}}>{logs.length} transactions</p>
              {loading ? (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {[1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{height:66}}/>)}
                </div>
              ) : logs.length===0 ? (
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:80,gap:10,color:'var(--hify-muted)'}}>
                  <div style={{fontSize:48}}>📋</div>
                  <p style={{fontSize:15,fontWeight:500,margin:0}}>No transactions yet</p>
                </div>
              ) : logs.map(log=>(
                <div key={log.id} className="card" style={{padding:'12px 14px',display:'flex',alignItems:'flex-start',gap:12}}>
                  <span className={`badge ${actionColor(log.action_type)}`} style={{marginTop:2,flexShrink:0}}>{actionLabel(log.action_type)}</span>
                  <div style={{minWidth:0,flex:1}}>
                    <p style={{fontSize:13,fontWeight:500,color:'white',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{log.pi_name||log.component?.asset||log.notes||'—'}</p>
                    {log.notes && <p style={{fontSize:12,color:'var(--hify-muted)',margin:'2px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{log.notes}</p>}
                    <p style={{fontSize:11,color:'var(--hify-muted)',margin:'3px 0 0'}}>{new Date(log.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                  {log.quantity>0 && <span style={{fontSize:13,fontWeight:700,color:'var(--hify-orange)',flexShrink:0}}>×{log.quantity}</span>}
                </div>
              ))}
            </div>
          )}
        </main>

        {/* ── BOTTOM NAV ── */}
        <nav style={{flexShrink:0,background:'var(--hify-surface)',borderTop:'1px solid var(--hify-border)',paddingBottom:'env(safe-area-inset-bottom, 4px)'}}>
          <div style={{display:'flex'}}>
            {navItems.map(({id,l,Icon})=>{
              const active = tab===id;
              return (
                <button key={id} onClick={()=>{setTab(id);setSearch('');}} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,paddingTop:12,paddingBottom:10,color:active?'var(--hify-orange)':'var(--hify-muted)',background:'transparent',border:'none',cursor:'pointer'}}>
                  <Icon/>
                  <span style={{fontSize:11,fontWeight:active?600:400}}>{l}</span>
                  <div style={{width:4,height:4,borderRadius:'50%',background:active?'var(--hify-orange)':'transparent'}}/>
                </button>
              );
            })}
          </div>
        </nav>

        {/* ── MODALS ── */}
        {showInventoryModal && (
          <InventoryModal item={editingInventory} onSave={saveInventory} onClose={()=>{setShowInventoryModal(false);setEditingInventory(null);}}/>
        )}
        {showPiModal && (
          <PiModal pi={editingPi} inventory={inventory} onSave={savePi} onClose={()=>{setShowPiModal(false);setEditingPi(null);}}/>
        )}
        {receivingStockFor && (
          <ReceiveStockModal component={receivingStockFor} onReceive={receiveStock} onClose={()=>setReceivingStockFor(null)}/>
        )}
        {viewingPiDetail && (
          <PiDetailModal
            pi={viewingPiDetail}
            onClose={()=>setViewingPiDetail(null)}
            onEdit={pi=>{setViewingPiDetail(null);setEditingPi(pi);setShowPiModal(true);}}
            onGenerateQR={pi=>{setViewingPiDetail(null);generateQR(pi);}}
          />
        )}
        {viewingPiQR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop fade-in" style={{padding:24}}>
            <div className="card slide-up" style={{width:'100%',maxWidth:360,padding:24}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
                <div>
                  <h3 className="font-display" style={{fontWeight:700,fontSize:16,color:'white',margin:0}}>{viewingPiQR.pi.label}</h3>
                  <p style={{fontSize:12,color:'var(--hify-muted)',margin:'3px 0 0'}}>QR Code — ready to print</p>
                </div>
                <button onClick={()=>setViewingPiQR(null)} style={S.iconBtn('var(--hify-muted)','var(--hify-surface2)')}><I.Close/></button>
              </div>
              <div style={{background:'white',borderRadius:16,padding:16,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}>
                <img src={viewingPiQR.qr} alt="QR Code" style={{width:200,height:200}}/>
              </div>
              <p style={{fontSize:12,textAlign:'center',color:'var(--hify-muted)',marginBottom:16}}>Stick this on the Pi — scan to see all components</p>
              <a href={viewingPiQR.qr} download={`${viewingPiQR.pi.label}-qr.png`} className="btn-primary"
                style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'13px 0',fontSize:14,textDecoration:'none'}}>
                <I.Download/> Download QR
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Pi Detail Modal (shown on QR scan) ───────────────────────────────────────
function PiDetailModal({ pi, onClose, onEdit, onGenerateQR }: {
  pi: PiUnit;
  onClose: () => void;
  onEdit: (pi: PiUnit) => void;
  onGenerateQR: (pi: PiUnit) => void;
}) {
  const comps = pi.pi_components || [];
  return (
    <div className="fixed inset-0 z-50 flex items-end modal-backdrop fade-in">
      <div className="slide-up" style={S.sheetWrap}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <h2 className="font-display" style={{fontWeight:700,fontSize:20,color:'white',margin:0}}>{pi.label}</h2>
            <p style={{fontSize:12,color:'var(--hify-muted)',margin:'4px 0 0'}}>{pi.serial_number}</p>
            <span className={`badge ${statusBadge(pi.status)}`} style={{marginTop:8,display:'inline-flex'}}>{pi.status.replace(/_/g,' ')}</span>
          </div>
          <button onClick={onClose} style={S.iconBtn('var(--hify-muted)','var(--hify-surface2)')}><I.Close/></button>
        </div>

        {/* Components */}
        <div style={{marginBottom:16}}>
          <p style={{fontSize:12,fontWeight:600,color:'var(--hify-muted)',margin:'0 0 10px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Components</p>
          {comps.length===0 ? (
            <p style={{fontSize:14,color:'var(--hify-muted)',textAlign:'center',padding:'20px 0'}}>No components recorded</p>
          ) : comps.map(c=>(
            <div key={c.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',borderRadius:12,background:'var(--hify-surface2)',marginBottom:8}}>
              <div>
                <p style={{fontWeight:600,fontSize:14,color:'white',margin:0}}>{c.component?.asset||'Unknown'}</p>
                <p style={{fontSize:12,color:'var(--hify-muted)',margin:'2px 0 0'}}>{c.component?.brand||'—'}</p>
              </div>
              <span style={{fontSize:11,fontWeight:600,color:'var(--hify-orange)',background:'rgba(255,107,53,0.12)',padding:'3px 10px',borderRadius:100}}>{c.notes||'Part'}</span>
            </div>
          ))}
        </div>

        {pi.notes && (
          <div style={{padding:'10px 14px',borderRadius:12,background:'var(--hify-surface2)',marginBottom:16}}>
            <p style={{fontSize:12,color:'var(--hify-muted)',margin:'0 0 2px'}}>Notes</p>
            <p style={{fontSize:14,color:'white',margin:0}}>{pi.notes}</p>
          </div>
        )}

        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>onGenerateQR(pi)}
            style={{flex:1,height:44,borderRadius:12,background:'rgba(167,139,250,0.12)',color:'var(--hify-purple)',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontSize:14,fontWeight:600,border:'none',cursor:'pointer'}}>
            <I.Qr/> {pi.qr_code?'Regenerate QR':'Generate QR'}
          </button>
          <button onClick={()=>onEdit(pi)}
            style={{flex:1,height:44,borderRadius:12,background:'rgba(255,107,53,0.12)',color:'var(--hify-orange)',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontSize:14,fontWeight:600,border:'none',cursor:'pointer'}}>
            <I.Edit/> Edit Pi
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Receive Stock Modal ───────────────────────────────────────────────────────
function ReceiveStockModal({ component, onReceive, onClose }: {
  component: Component;
  onReceive: (id: string, qty: number) => void;
  onClose: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);

  const handleReceive = async () => {
    setSaving(true);
    await onReceive(component.id, qty);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end modal-backdrop fade-in">
      <div className="slide-up" style={S.sheetWrap}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
          <h2 className="font-display" style={{fontWeight:700,fontSize:18,color:'white',margin:0}}>Receive Stock</h2>
          <button onClick={onClose} style={S.iconBtn('var(--hify-muted)','var(--hify-surface2)')}><I.Close/></button>
        </div>
        <p style={{fontSize:13,color:'var(--hify-muted)',margin:'0 0 24px'}}>{component.asset}</p>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 16px',borderRadius:14,background:'var(--hify-surface2)',marginBottom:28}}>
          <span style={{fontSize:13,color:'var(--hify-muted)'}}>Current stock</span>
          <span style={{fontSize:16,fontWeight:700,color:'white'}}>{component.qty_in_office} units</span>
        </div>

        <p style={{...S.label,marginBottom:12}}>Units to add</p>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20,marginBottom:32}}>
          <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{width:52,height:52,borderRadius:14,background:'var(--hify-surface2)',color:'white',fontSize:24,display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer'}}>−</button>
          <span className="font-display" style={{fontSize:52,fontWeight:700,color:'white',minWidth:80,textAlign:'center',lineHeight:1}}>{qty}</span>
          <button onClick={()=>setQty(q=>q+1)} style={{width:52,height:52,borderRadius:14,background:'rgba(34,197,94,0.15)',color:'var(--hify-green)',fontSize:24,display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer'}}>+</button>
        </div>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:12,background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.15)',marginBottom:20}}>
          <span style={{fontSize:13,color:'var(--hify-muted)'}}>New total</span>
          <span style={{fontSize:16,fontWeight:700,color:'var(--hify-green)'}}>{component.qty_in_office + qty} units</span>
        </div>

        <button onClick={handleReceive} disabled={saving} className="btn-primary" style={{width:'100%',padding:'14px 0',fontSize:14}}>
          {saving?'Adding…':`Add ${qty} unit${qty!==1?'s':''} to stock`}
        </button>
      </div>
    </div>
  );
}

// ─── Inventory Modal ───────────────────────────────────────────────────────────
function InventoryModal({item,onSave,onClose}: {item:Component|null;onSave:(d:any)=>void;onClose:()=>void}) {
  const [asset,  setAsset]  = useState(item?.asset||'');
  const [brand,  setBrand]  = useState(item?.brand||'');
  const [vendor, setVendor] = useState(item?.vendor||'');
  const [qty,    setQty]    = useState(item?.qty_in_office??0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!asset.trim()) return;
    setSaving(true);
    await onSave({asset:asset.trim(),brand:brand.trim()||null,vendor:vendor.trim()||null,qty_in_office:qty});
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end modal-backdrop fade-in">
      <div className="slide-up" style={S.sheetWrap}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <h2 className="font-display" style={{fontWeight:700,fontSize:18,color:'white',margin:0}}>{item?'Edit Asset':'Add Asset'}</h2>
          <button onClick={onClose} style={S.iconBtn('var(--hify-muted)','var(--hify-surface2)')}><I.Close/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <label style={S.label}>Asset Name *</label>
            <input className="hify-input" style={{width:'100%',padding:'11px 14px',fontSize:14}} placeholder="e.g. Raspberry Pi 5 8GB" value={asset} onChange={e=>setAsset(e.target.value)}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <label style={S.label}>Brand</label>
              <input className="hify-input" style={{width:'100%',padding:'11px 14px',fontSize:14}} placeholder="e.g. Raspberry Pi" value={brand} onChange={e=>setBrand(e.target.value)}/>
            </div>
            <div>
              <label style={S.label}>Vendor</label>
              <input className="hify-input" style={{width:'100%',padding:'11px 14px',fontSize:14}} placeholder="e.g. Robu" value={vendor} onChange={e=>setVendor(e.target.value)}/>
            </div>
          </div>
          <div>
            <label style={S.label}>{item?'Stock (direct correction)':'Initial Stock'}</label>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <button onClick={()=>setQty(q=>Math.max(0,q-1))} style={{...S.iconBtn('white','var(--hify-surface2)'),width:44,height:44,fontSize:20,borderRadius:12}}>−</button>
              <input type="number" className="hify-input" min={0} style={{flex:1,padding:'11px 14px',fontSize:18,fontWeight:700,textAlign:'center'}} value={qty} onChange={e=>setQty(Math.max(0,parseInt(e.target.value)||0))}/>
              <button onClick={()=>setQty(q=>q+1)} style={{...S.iconBtn('var(--hify-green)','rgba(34,197,94,0.12)'),width:44,height:44,fontSize:20,borderRadius:12}}>+</button>
            </div>
            {item && <p style={{fontSize:11,color:'var(--hify-muted)',margin:'6px 0 0'}}>Tip: use "Receive Stock" on the card to add units without overriding the count.</p>}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving||!asset.trim()} className="btn-primary" style={{width:'100%',padding:'14px 0',marginTop:20,fontSize:14}}>
          {saving?'Saving…':(item?'Update Asset':'Add Asset')}
        </button>
      </div>
    </div>
  );
}

// ─── Pi Build Modal ────────────────────────────────────────────────────────────
function PiModal({pi,inventory,onSave,onClose}: {pi:PiUnit|null;inventory:Component[];onSave:(d:any)=>void;onClose:()=>void}) {
  const existingComps = pi?.pi_components||[];
  const initSlots: Record<string,string> = {};
  existingComps.forEach(c=>{ if(c.notes) initSlots[c.notes]=c.component_id; });

  const [label,  setLabel]  = useState(pi?.label||'');
  const [serial, setSerial] = useState(pi?.serial_number||'');
  const [status, setStatus] = useState(pi?.status||'in_office');
  const [notes,  setNotes]  = useState(pi?.notes||'');
  const [slots,  setSlots]  = useState<Record<string,string>>(initSlots);
  const [saving, setSaving] = useState(false);

  const setSlot = (role:string, componentId:string) => setSlots(s=>({...s,[role]:componentId}));
  const getOptionsForRole = (role:ComponentRole) => inventory.filter(i=>detectRole(i.asset)===role);

  // Count how many new components will be deducted from inventory
  const existingIds = new Set(existingComps.map(c=>c.component_id));
  const newlyAdded  = Object.values(slots).filter(id=>id&&!existingIds.has(id)).length;
  const removed     = existingComps.filter(c=>!Object.values(slots).includes(c.component_id)).length;

  const handleSave = async () => {
    if (!label.trim()) return;
    setSaving(true);
    const components = Object.entries(slots).filter(([,id])=>id).map(([role,component_id])=>({component_id,role}));
    await onSave({label:label.trim(),serial_number:serial||`HiFy-${Date.now()}`,status,notes,components});
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end modal-backdrop fade-in">
      <div className="slide-up" style={S.sheetWrap}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <h2 className="font-display" style={{fontWeight:700,fontSize:18,color:'white',margin:0}}>{pi?'Edit Pi Build':'Assemble Pi'}</h2>
          <button onClick={onClose} style={S.iconBtn('var(--hify-muted)','var(--hify-surface2)')}><I.Close/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <label style={S.label}>Pi Label *</label>
            <input className="hify-input" style={{width:'100%',padding:'11px 14px',fontSize:14}} placeholder="e.g. Pi-Alpha-01" value={label} onChange={e=>setLabel(e.target.value)}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <label style={S.label}>Serial Number</label>
              <input className="hify-input" style={{width:'100%',padding:'11px 14px',fontSize:14}} placeholder="auto-generated" value={serial} onChange={e=>setSerial(e.target.value)}/>
            </div>
            <div>
              <label style={S.label}>Status</label>
              <select className="hify-input" style={{width:'100%',padding:'11px 14px',fontSize:14,appearance:'auto'}} value={status} onChange={e=>setStatus(e.target.value)}>
                <option value="in_office">In Office</option>
                <option value="deployed">Deployed</option>
                <option value="faulty">Faulty</option>
                <option value="returned">Returned</option>
              </select>
            </div>
          </div>

          {/* Component slots */}
          <div style={{background:'rgba(255,107,53,0.06)',border:'1px solid rgba(255,107,53,0.15)',borderRadius:14,padding:'14px 14px 10px'}}>
            <p style={{fontSize:12,fontWeight:600,color:'var(--hify-orange)',margin:'0 0 12px'}}>🔧 Assembled Components</p>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {COMPONENT_ROLES.map(role=>{
                const opts = getOptionsForRole(role);
                const chosen = slots[role];
                const chosenItem = opts.find(o=>o.id===chosen);
                const isOutOfStock = chosenItem && chosenItem.qty_in_office===0 && !existingIds.has(chosen);
                return (
                  <div key={role}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
                      <label style={S.label}>{ROLE_LABELS[role]}</label>
                      {isOutOfStock && <span style={{fontSize:11,color:'var(--hify-pink)',fontWeight:600}}>⚠️ Out of stock</span>}
                    </div>
                    <select className="hify-input" style={{width:'100%',padding:'11px 14px',fontSize:13,appearance:'auto',borderColor:isOutOfStock?'var(--hify-pink)':'undefined'}} value={chosen||''} onChange={e=>setSlot(role,e.target.value)}>
                      <option value="">— None —</option>
                      {opts.map(o=><option key={o.id} value={o.id} disabled={o.qty_in_office===0&&!existingIds.has(o.id)}>{o.asset} {o.qty_in_office===0?'(out of stock)':o.qty_in_office<=3?`(${o.qty_in_office} left)`:`(${o.qty_in_office} in stock)`}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stock impact summary */}
          {(newlyAdded>0||removed>0) && (
            <div style={{padding:'10px 14px',borderRadius:12,background:'rgba(255,107,53,0.06)',border:'1px solid rgba(255,107,53,0.15)'}}>
              <p style={{fontSize:12,color:'var(--hify-muted)',margin:0}}>
                {newlyAdded>0 && <span style={{color:'var(--hify-pink)'}}>−{newlyAdded} from stock</span>}
                {newlyAdded>0&&removed>0 && <span style={{color:'var(--hify-muted)'}}> · </span>}
                {removed>0 && <span style={{color:'var(--hify-green)'}}>+{removed} returned</span>}
              </p>
            </div>
          )}

          <div>
            <label style={S.label}>Notes</label>
            <textarea className="hify-input" style={{width:'100%',padding:'11px 14px',fontSize:14,resize:'none'}} rows={2} value={notes} onChange={e=>setNotes(e.target.value)}/>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving||!label.trim()} className="btn-primary" style={{width:'100%',padding:'14px 0',marginTop:20,fontSize:14}}>
          {saving?'Saving…':(pi?'Update Pi Build':'Assemble Pi')}
        </button>
      </div>
    </div>
  );
}
