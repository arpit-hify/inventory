'use client';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────
interface Category { id: string; name: string; }
interface Component {
  id: string; asset: string; brand: string|null; vendor: string|null;
  qty_in_office: number; category_id: string|null; location_id: string|null;
  category?: { id: string; name: string }|null;
  created_at: string;
  total_qty_purchased: number; qty_returned_from_facilities: number;
  old_stock: number; qty_in_new_purchases: number; qty_out: number;
  qty_returned_to_vendor: number;
}
interface PiUnit {
  id: string; serial_number: string; label: string; status: string;
  location: string|null; notes: string|null; qr_code: string|null;
  extra_components: string[];
  created_at: string; updated_at: string;
  pi_components?: Array<{id:string;component_id:string;notes:string|null;component:Component}>;
}
interface Log {
  id: string; type: string; quantity: number; reason: string|null;
  notes: string|null; performed_by: string|null; pi_name: string|null;
  action_type: string|null; created_at: string;
  component?: {asset:string;brand:string}|null;
}
interface Location {
  id: string; name: string;
  type: 'office'|'facility'|'warehouse';
  city: string|null; address: string|null; created_at: string;
}
interface FacilityAsset {
  id: string; asset_type: string; serial_number: string|null;
  status: 'deployed'|'faulty'|'retired'|'spare';
  location_id: string; arena_label: string|null;
  notes: string|null; purchased_at: string|null; created_at: string;
  location?: Location;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PI_SLOT_CATEGORIES = ['RPi','SSD','HAT','Fan','Camera','AI Accelerator','RPi case','Cables'];
const ASSET_TYPES = [
  'Raspberry Pi','NVMe SSD','HAT','Cooler','SD Card','Power Cable','Metal Case',
  'Camera','PoE Switch','Omada Switch','Router','Ethernet Cable','Wall Mount','Accessory',
];

// ─── Icons ────────────────────────────────────────────────────────────────────
const I = {
  Box:      ()=><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  MapPin:   ()=><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Cpu:      ()=><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  Activity: ()=><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Plus:     ()=><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Search:   ()=><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Edit:     ()=><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:    ()=><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Close:    ()=><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  Package:  ()=><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  Qr:       ()=><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><line x1="20" y1="14" x2="20" y2="17"/><line x1="17" y1="17" x2="17" y2="20"/><line x1="20" y1="20" x2="20" y2="20"/></svg>,
  Refresh:  ()=><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  Download: ()=><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Tag:      ()=><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  ChevDown: ()=><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>,
  ChevRight:()=><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>,
  ChevUp:   ()=><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>,
  Deploy:   ()=><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>,
  Back:     ()=><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const iconBtn = (color: string, bg: string): React.CSSProperties => ({
  width:40, height:40, borderRadius:10, background:bg, color,
  display:'flex', alignItems:'center', justifyContent:'center',
  border:'none', cursor:'pointer', flexShrink:0,
});
const fieldLabel: React.CSSProperties = { fontSize:11, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' };
const sheetWrap = (isDesktop=false): React.CSSProperties => ({ width:'100%', maxWidth: isDesktop ? 580 : 480, boxSizing:'border-box', background:'var(--surface)', borderRadius: isDesktop ? 16 : '20px 20px 0 0', padding:'20px 18px', paddingBottom: isDesktop ? '20px' : 'calc(24px + env(safe-area-inset-bottom, 0px))', maxHeight:'92dvh', overflowY:'auto', overflowX:'hidden' });
const sheetOuter = (isDesktop=false): React.CSSProperties => ({ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent:'center' });

function stockBadge(qty: number) {
  if (qty === 0) return { cls:'badge-red',  label:'Out of stock' };
  if (qty <= 3)  return { cls:'badge-pink', label:`Low · ${qty}` };
  return              { cls:'badge-green', label:`${qty} in stock` };
}
function statusBadge(s: string) {
  if (s==='deployed') return 'badge-green';
  if (s==='faulty')   return 'badge-red';
  if (s==='spare')    return 'badge-gray';
  if (s==='retired')  return 'badge-gray';
  return 'badge-gray';
}
function locationTypeBadge(t: string) {
  if (t==='office')    return { cls:'badge-green', label:'Office' };
  if (t==='warehouse') return { cls:'badge-gray',  label:'Warehouse' };
  return                      { cls:'badge-pink',  label:'Facility' };
}
function actionColor(a: string|null) {
  if (!a) return 'badge-gray';
  if (a.includes('DELETE') || a.includes('DISASSEMBLE')) return 'badge-red';
  if (a.includes('CREATE') || a.includes('ADD')) return 'badge-green';
  return 'badge-gray';
}
function actionLabel(a: string|null) {
  return ({
    ADD_INVENTORY:'Added', UPDATE_INVENTORY:'Updated', DELETE_INVENTORY:'Removed',
    CREATE_PI_BUILD:'Pi Built', UPDATE_PI_BUILD:'Pi Updated', DELETE_PI_BUILD:'Pi Dismantled',
    RECEIVE_STOCK:'Restocked',
  } as Record<string,string>)[a||''] || (a||'Action');
}
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}

// ─── Desktop hook ─────────────────────────────────────────────────────────────
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isDesktop;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg:string; type:'success'|'error' }) {
  return (
    <div className="fade-in" style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:999,background:type==='error'?'var(--pink)':'var(--surface)',border:'1px solid var(--border)',color:type==='error'?'white':'var(--text)',padding:'9px 18px',borderRadius:100,fontSize:13,fontWeight:500,whiteSpace:'nowrap',boxShadow:'0 4px 20px rgba(0,0,0,0.4)'}}>
      {msg}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Home() {
  const isDesktop = useIsDesktop();
  const [tab, setTab]             = useState<'assets'|'locations'|'pis'|'transactions'>('assets');
  const [inventory, setInventory] = useState<Component[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pis, setPis]             = useState<PiUnit[]>([]);
  const [logs, setLogs]           = useState<Log[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [facilityAssets, setFacilityAssets] = useState<FacilityAsset[]>([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState<{msg:string;type:'success'|'error'}|null>(null);
  const [search, setSearch]       = useState('');
  const [stockFilter, setStockFilter] = useState<'all'|'low'|'out'>('all');
  const [assetTypeFilter, setAssetTypeFilter] = useState<'all'|'components'|'facility'>('all');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [openCategory, setOpenCategory] = useState<string|null>(null);

  // Location drill-in
  const [selectedLocation, setSelectedLocation] = useState<Location|null>(null);

  // Existing modals
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [editingInventory, setEditingInventory]     = useState<Component|null>(null);
  const [defaultCategory, setDefaultCategory]       = useState<Category|null>(null);
  const [receivingStockFor, setReceivingStockFor]   = useState<Component|null>(null);
  const [showCategoryModal, setShowCategoryModal]   = useState(false);
  const [showPiModal, setShowPiModal]               = useState(false);
  const [editingPi, setEditingPi]                   = useState<PiUnit|null>(null);
  const [viewingPiDetail, setViewingPiDetail]       = useState<PiUnit|null>(null);
  const [viewingPiQR, setViewingPiQR]               = useState<{pi:PiUnit;qr:string}|null>(null);

  // New modals
  const [showAssetModal, setShowAssetModal]   = useState(false);
  const [editingAsset, setEditingAsset]       = useState<FacilityAsset|null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({msg,type}); setTimeout(()=>setToast(null), 2500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, cats, piData, logData, locData, faData] = await Promise.all([
        fetch('/api/inventory').then(r=>r.json()),
        fetch('/api/categories').then(r=>r.json()),
        fetch('/api/pi-builds').then(r=>r.json()),
        fetch('/api/logs').then(r=>r.json()),
        fetch('/api/locations').then(r=>r.json()),
        fetch('/api/facility-assets').then(r=>r.json()),
      ]);
      setInventory(Array.isArray(inv)?inv:[]);
      setCategories(Array.isArray(cats)?cats:[]);
      setPis(Array.isArray(piData)?piData:[]);
      setLogs(Array.isArray(logData)?logData:[]);
      setLocations(Array.isArray(locData)?locData:[]);
      setFacilityAssets(Array.isArray(faData)?faData:[]);
    } catch { showToast('Failed to load data','error'); }
    setLoading(false);
  }, []);

  useEffect(()=>{ fetchAll(); }, [fetchAll]);

  // Open Pi detail from ?pi= URL param
  useEffect(()=>{
    const piId = new URLSearchParams(window.location.search).get('pi');
    if (!piId || pis.length === 0) return;
    const found = pis.find(p=>p.id===piId);
    if (found) setViewingPiDetail(found);
  }, [pis]);

  // Read tab from URL on mount
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t && ['assets','locations','pis','transactions'].includes(t)) setTab(t as typeof tab);
  }, []);

  // QR scan handler
  const handleQRScan = (data: string) => {
    setShowQRScanner(false);
    try {
      if (data.includes('?pi=')) {
        const id = new URL(data).searchParams.get('pi');
        const found = pis.find(p=>p.id===id);
        if (found) { setViewingPiDetail(found); return; }
        showToast('Pi not found','error'); return;
      }
      const parsed = JSON.parse(data);
      const found = pis.find(p=>p.id===parsed.id||p.label===parsed.label);
      if (found) setViewingPiDetail(found);
      else showToast('Pi not found','error');
    } catch { showToast('Invalid QR code','error'); }
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const saveInventory = async (item: {asset:string;brand:string;vendor:string;qty_in_office:number;category_id:string|null}) => {
    const method = editingInventory ? 'PUT' : 'POST';
    const url    = editingInventory ? `/api/inventory/${editingInventory.id}` : '/api/inventory';
    const res    = await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});
    if (res.ok) { showToast(editingInventory?'Updated!':'Added!'); setShowInventoryModal(false); setEditingInventory(null); setDefaultCategory(null); fetchAll(); }
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
    else showToast('Failed','error');
  };

  const savePi = async (pi: Record<string,unknown>) => {
    const method = editingPi ? 'PUT' : 'POST';
    const url    = editingPi ? `/api/pi-builds/${editingPi.id}` : '/api/pi-builds';
    const res    = await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(pi)});
    if (res.ok) { showToast(editingPi?'Pi updated!':'Pi assembled!'); setShowPiModal(false); setEditingPi(null); fetchAll(); }
    else showToast('Save failed','error');
  };

  const deletePi = async (pi: PiUnit) => {
    if (!confirm(`Disassemble "${pi.label}"? Components return to stock.`)) return;
    const res = await fetch(`/api/pi-builds/${pi.id}`,{method:'DELETE'});
    if (res.ok) { showToast('Pi dismantled, stock returned!'); fetchAll(); }
    else showToast('Failed','error');
  };

  const saveCategory = async (name: string) => {
    const res = await fetch('/api/categories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});
    if (res.ok) { showToast('Category created!'); setShowCategoryModal(false); fetchAll(); }
    else { const d = await res.json(); showToast(d.error||'Failed','error'); }
  };

  const generateQR = async (pi: PiUnit) => {
    try {
      const res = await fetch('/api/qr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:`https://hify-inventory.vercel.app?pi=${pi.id}`})});
      if (!res.ok) throw new Error('QR generation failed');
      const {qr} = await res.json();
      const saveRes = await fetch(`/api/pi-builds/${pi.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...pi,qr_code:qr,components:(pi.pi_components||[]).map(c=>({component_id:c.component_id,role:c.notes}))})});
      if (!saveRes.ok) throw new Error('Failed to save QR');
      setViewingPiQR({pi,qr});
      fetchAll();
    } catch (e: unknown) {
      showToast((e as Error)?.message||'Failed to generate QR','error');
    }
  };

  const saveFacilityAsset = async (data: Record<string,unknown>) => {
    const method = editingAsset ? 'PUT' : 'POST';
    const url    = editingAsset ? `/api/facility-assets/${editingAsset.id}` : '/api/facility-assets';
    const res    = await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    if (res.ok) { showToast(editingAsset?'Asset updated!':'Asset added!'); setShowAssetModal(false); setEditingAsset(null); fetchAll(); }
    else showToast('Save failed','error');
  };

  const deleteFacilityAsset = async (asset: FacilityAsset) => {
    if (!confirm(`Delete "${asset.asset_type}"?`)) return;
    const res = await fetch(`/api/facility-assets/${asset.id}`,{method:'DELETE'});
    if (res.ok) { showToast('Deleted!'); fetchAll(); }
    else showToast('Failed','error');
  };

  const saveLocation = async (data: {name:string;type:string;city:string;address:string}) => {
    const res = await fetch('/api/locations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    if (res.ok) { showToast('Location added!'); setShowLocationModal(false); fetchAll(); }
    else showToast('Failed','error');
  };

  // ── Derived data ─────────────────────────────────────────────────────────────
  const filteredInventory = inventory.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = !search || [i.asset, i.brand, i.vendor, i.category?.name].some(f=>f?.toLowerCase().includes(q));
    const matchStock  = stockFilter==='all' || (stockFilter==='low' && i.qty_in_office>0 && i.qty_in_office<=3) || (stockFilter==='out' && i.qty_in_office===0);
    return matchSearch && matchStock;
  });

  const filteredFacilityAssets = facilityAssets.filter(a => {
    const q = search.toLowerCase();
    return !search || [a.asset_type, a.serial_number, a.location?.name, a.arena_label, a.notes].some(f=>f?.toLowerCase().includes(q));
  });

  const filteredPis = pis.filter(p => !search || p.label.toLowerCase().includes(search.toLowerCase()));
  const lowStock    = inventory.filter(i=>i.qty_in_office<=3&&i.qty_in_office>0).length;
  const outOfStock  = inventory.filter(i=>i.qty_in_office===0).length;

  const grouped = categories.map(cat => ({
    category: cat,
    items: filteredInventory.filter(i=>i.category_id===cat.id),
  })).filter(g=>g.items.length>0);
  const uncategorized = filteredInventory.filter(i=>!i.category_id);

  const navItems = [
    {id:'assets'       as const, l:'Assets',      Icon:I.Box},
    {id:'locations'    as const, l:'Locations',   Icon:I.MapPin},
    {id:'pis'          as const, l:'Pi Builds',   Icon:I.Cpu},
    {id:'transactions' as const, l:'Transactions',Icon:I.Activity},
  ];

  const switchTab = (t: typeof tab) => {
    setTab(t); setSearch(''); setStockFilter('all'); setAssetTypeFilter('all');
    setSelectedLocation(null);
    const url = t === 'assets' ? '/' : `/?tab=${t}`;
    window.history.pushState({}, '', url);
  };

  // Assets at selected location
  const locationComponents    = selectedLocation ? inventory.filter(i=>i.location_id===selectedLocation.id) : [];
  const locationFacilityAssets = selectedLocation ? facilityAssets.filter(a=>a.location_id===selectedLocation.id) : [];

  return (
    <div style={{background:'var(--bg)',height:'100dvh',display:'flex',overflow:'hidden'}}>

      {/* ── DESKTOP SIDEBAR ── */}
      {isDesktop && (
        <aside style={{width:200,flexShrink:0,height:'100%',background:'var(--surface)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',padding:'20px 12px'}}>
          <div style={{padding:'4px 8px',marginBottom:28}}>
            <img src="/logo-light.png" alt="HiFy" onClick={()=>switchTab('assets')} style={{height:28,width:'auto',cursor:'pointer'}}/>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4,flex:1}}>
            {navItems.map(({id,l,Icon})=>{
              const active = tab===id;
              return (
                <button key={id} onClick={()=>switchTab(id)}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:active?'rgba(255,107,53,0.15)':'transparent',color:active?'var(--pink)':'var(--muted)',border:'none',cursor:'pointer',textAlign:'left',fontFamily:'inherit',fontSize:14,fontWeight:active?600:400,transition:'background 0.15s,color 0.15s'}}>
                  <Icon/>{l}
                </button>
              );
            })}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8,paddingTop:12,borderTop:'1px solid var(--border)'}}>
            <button onClick={()=>setShowQRScanner(true)} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:10,background:'rgba(255,61,110,0.08)',color:'var(--pink)',border:'none',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>
              <I.Qr/> Scan QR
            </button>
            <button onClick={fetchAll} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:10,background:'transparent',color:'var(--muted)',border:'none',cursor:'pointer',fontSize:13,fontFamily:'inherit'}}>
              <I.Refresh/> Refresh
            </button>
          </div>
        </aside>
      )}

      <div style={{flex:1,minWidth:0,height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)',position:'relative'}}>

        {toast && <Toast msg={toast.msg} type={toast.type}/>}
        {showQRScanner && <QRScanner onScan={handleQRScan} onClose={()=>setShowQRScanner(false)}/>}

        {/* ── MOBILE HEADER ── */}
        {!isDesktop && (
          <header style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderBottom:'1px solid var(--border)'}}>
            <img src="/logo-light.png" alt="HiFy" onClick={()=>switchTab('assets')} style={{height:26,width:'auto',cursor:'pointer'}}/>
            <div style={{display:'flex',gap:6}}>
              <button onClick={fetchAll} style={iconBtn('var(--muted)','var(--surface2)')} title="Refresh"><I.Refresh/></button>
              <button onClick={()=>setShowQRScanner(true)} style={{height:32,padding:'0 12px',borderRadius:9,background:'rgba(255,107,53,0.15)',color:'var(--pink)',display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:600,border:'1px solid rgba(255,107,53,0.3)',cursor:'pointer'}}>
                <I.Qr/> Scan
              </button>
            </div>
          </header>
        )}

        {/* ── DESKTOP TAB HEADER ── */}
        {isDesktop && (
          <header style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 28px',borderBottom:'1px solid var(--border)'}}>
            <h1 className="font-display" style={{fontWeight:700,fontSize:18,color:'var(--text)',margin:0}}>
              {selectedLocation && tab==='locations' ? selectedLocation.name : navItems.find(n=>n.id===tab)?.l}
            </h1>
            <div style={{display:'flex',gap:8}}>
              {tab==='assets' && <>
                <button onClick={()=>setShowCategoryModal(true)} style={{height:36,padding:'0 14px',borderRadius:10,background:'rgba(155,184,0,0.12)',color:'var(--lime)',border:'1px solid rgba(155,184,0,0.3)',cursor:'pointer',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:5}}><I.Tag/> New Category</button>
                <button onClick={()=>{setEditingInventory(null);setDefaultCategory(null);setShowInventoryModal(true);}} style={{height:36,padding:'0 14px',borderRadius:10,background:'rgba(255,107,53,0.15)',color:'var(--pink)',border:'none',cursor:'pointer',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:5}}><I.Plus/> Add Variant</button>
                <button onClick={()=>{setEditingAsset(null);setShowAssetModal(true);}} style={{height:36,padding:'0 14px',borderRadius:10,background:'rgba(207,255,4,0.1)',color:'var(--lime)',border:'1px solid rgba(207,255,4,0.25)',cursor:'pointer',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:5}}><I.Plus/> Add Asset</button>
              </>}
              {tab==='locations' && !selectedLocation && (
                <button onClick={()=>setShowLocationModal(true)} style={{height:36,padding:'0 14px',borderRadius:10,background:'rgba(255,107,53,0.15)',color:'var(--pink)',border:'none',cursor:'pointer',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:5}}><I.Plus/> Add Location</button>
              )}
              {tab==='pis' && <button onClick={()=>{setEditingPi(null);setShowPiModal(true);}} style={{height:36,padding:'0 14px',borderRadius:10,background:'rgba(255,107,53,0.15)',color:'var(--pink)',border:'none',cursor:'pointer',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:5}}><I.Plus/> Assemble Pi</button>}
            </div>
          </header>
        )}

        {/* ── MAIN ── */}
        <main style={{flex:1,overflowY:'auto',padding: isDesktop ? '20px 28px 20px' : '14px 14px 8px'}}>

          {/* ASSETS */}
          {tab==='assets' && (
            <div className="slide-up" style={{display:'flex',flexDirection:'column',gap:10}}>

              {/* Stats row */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {[
                  {l:'SKUs',           v:inventory.length,        sub:'components'},
                  {l:'Facility Assets',v:facilityAssets.length,   sub:'tracked'},
                  {l:'Low / Out',      v:lowStock+outOfStock,     sub:`${outOfStock} out of stock`},
                ].map(s=>(
                  <div key={s.l} className="card" style={{padding:'12px 12px 10px'}}>
                    <div className="font-display" style={{fontSize:22,fontWeight:700,color:'var(--lime)',lineHeight:1}}>{loading?'—':s.v}</div>
                    <div style={{fontSize:12,fontWeight:600,color:'var(--text)',marginTop:4}}>{s.l}</div>
                    <div style={{fontSize:10,color:'var(--muted)',marginTop:1}}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Search + add buttons (mobile) */}
              <div style={{display:'flex',gap:8}}>
                <div style={{flex:1,display:'flex',alignItems:'center',gap:8,background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,padding:'0 12px',height:38}}>
                  <span style={{color:'var(--muted)',flexShrink:0}}><I.Search/></span>
                  <input className="input" style={{flex:1,background:'transparent',border:'none',padding:'0',height:'100%'}} placeholder="Search assets…" value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                {!isDesktop && <>
                  <button onClick={()=>setShowCategoryModal(true)} style={{height:38,padding:'0 10px',borderRadius:10,background:'rgba(155,184,0,0.12)',color:'var(--lime)',border:'1px solid rgba(155,184,0,0.3)',cursor:'pointer',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                    <I.Tag/>
                  </button>
                  <button onClick={()=>{setEditingInventory(null);setDefaultCategory(null);setShowInventoryModal(true);}} style={{...iconBtn('var(--pink)','rgba(255,107,53,0.15)'),width:38,height:38,border:'none',flexShrink:0}}><I.Plus/></button>
                  <button onClick={()=>{setEditingAsset(null);setShowAssetModal(true);}} style={{height:38,padding:'0 10px',borderRadius:10,background:'rgba(207,255,4,0.1)',color:'var(--lime)',border:'1px solid rgba(207,255,4,0.25)',cursor:'pointer',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                    <I.Deploy/>
                  </button>
                </>}
              </div>

              {/* Type filter */}
              <div style={{display:'flex',gap:6}}>
                {([['all','All'],['components','Components'],['facility','Facility']] as const).map(([val,lbl])=>(
                  <button key={val} onClick={()=>setAssetTypeFilter(val)} style={{height:28,padding:'0 12px',borderRadius:100,fontSize:11,fontWeight:600,border:'none',cursor:'pointer',
                    background:assetTypeFilter===val?'var(--surface2)':'transparent',
                    color:assetTypeFilter===val?'var(--text)':'var(--muted)'}}>
                    {lbl}
                  </button>
                ))}
              </div>

              {/* Stock filter — only for components */}
              {assetTypeFilter !== 'facility' && (
                <div style={{display:'flex',gap:6}}>
                  {([['all','All Stock'],['low','Low'],['out','Out of Stock']] as const).map(([val,lbl])=>(
                    <button key={val} onClick={()=>setStockFilter(val)} style={{height:26,padding:'0 10px',borderRadius:100,fontSize:11,fontWeight:600,border:'none',cursor:'pointer',
                      background:stockFilter===val?(val==='out'?'var(--pink)':val==='low'?'rgba(155,184,0,0.18)':'var(--surface2)'):'transparent',
                      color:stockFilter===val?(val==='out'?'white':val==='low'?'var(--lime)':'var(--text)'):'var(--muted)'}}>
                      {lbl}
                    </button>
                  ))}
                </div>
              )}

              {loading ? (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {[1,2,3].map(i=><div key={i} className="skeleton" style={{height:80}}/>)}
                </div>
              ) : (
                <>
                  {/* Components section */}
                  {assetTypeFilter !== 'facility' && (
                    <div style={{display: isDesktop ? 'grid' : 'flex', gridTemplateColumns: isDesktop ? '1fr 1fr' : undefined, flexDirection:'column', gap:10, alignItems: isDesktop ? 'start' : 'stretch'}}>
                      {grouped.map(({category,items})=>(
                        <CategorySection key={category.id} category={category} items={items}
                          isOpen={openCategory===category.id}
                          onToggle={()=>setOpenCategory(o=>o===category.id?null:category.id)}
                          onAddVariant={()=>{ setEditingInventory(null); setDefaultCategory(category); setShowInventoryModal(true); }}
                          onEdit={item=>{ setEditingInventory(item); setShowInventoryModal(true); }}
                          onDelete={deleteInventory}
                          onReceive={item=>setReceivingStockFor(item)}
                        />
                      ))}
                      {uncategorized.length>0 && (
                        <CategorySection category={null} items={uncategorized}
                          isOpen={openCategory==='uncategorized'}
                          onToggle={()=>setOpenCategory(o=>o==='uncategorized'?null:'uncategorized')}
                          onAddVariant={()=>{ setEditingInventory(null); setDefaultCategory(null); setShowInventoryModal(true); }}
                          onEdit={item=>{ setEditingInventory(item); setShowInventoryModal(true); }}
                          onDelete={deleteInventory}
                          onReceive={item=>setReceivingStockFor(item)}
                        />
                      )}
                      {grouped.length===0 && uncategorized.length===0 && (
                        <p style={{textAlign:'center',padding:'24px 0',color:'var(--muted)',fontSize:13}}>No components found</p>
                      )}
                    </div>
                  )}

                  {/* Facility assets section */}
                  {assetTypeFilter !== 'components' && (
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {assetTypeFilter==='all' && facilityAssets.length>0 && (
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop: assetTypeFilter==='all'?4:0}}>
                          <p style={{fontSize:11,fontWeight:600,color:'var(--muted)',margin:0,textTransform:'uppercase',letterSpacing:'0.05em'}}>Facility Assets</p>
                          <span style={{fontSize:11,color:'var(--muted)'}}>{filteredFacilityAssets.length}</span>
                        </div>
                      )}
                      {filteredFacilityAssets.length===0 && assetTypeFilter==='facility' ? (
                        <p style={{textAlign:'center',padding:'24px 0',color:'var(--muted)',fontSize:13}}>No facility assets yet</p>
                      ) : filteredFacilityAssets.map(asset=>(
                        <FacilityAssetRow key={asset.id} asset={asset}
                          onEdit={()=>{ setEditingAsset(asset); setShowAssetModal(true); }}
                          onDelete={()=>deleteFacilityAsset(asset)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* LOCATIONS */}
          {tab==='locations' && (
            <div className="slide-up" style={{display:'flex',flexDirection:'column',gap:10}}>
              {selectedLocation ? (
                /* Location detail view */
                <>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                    <button onClick={()=>setSelectedLocation(null)} style={{...iconBtn('var(--text)','var(--surface2)'),width:36,height:36}}><I.Back/></button>
                    <div style={{flex:1,minWidth:0}}>
                      <p className="font-display" style={{fontWeight:700,fontSize:16,color:'var(--text)',margin:0}}>{selectedLocation.name}</p>
                      {selectedLocation.city && <p style={{fontSize:11,color:'var(--muted)',margin:0}}>{selectedLocation.city}</p>}
                    </div>
                    <span className={`badge ${locationTypeBadge(selectedLocation.type).cls}`}>{locationTypeBadge(selectedLocation.type).label}</span>
                  </div>

                  {/* Components at this location */}
                  {locationComponents.length>0 && (
                    <div>
                      <p style={{fontSize:11,fontWeight:600,color:'var(--muted)',margin:'0 0 8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Components ({locationComponents.length})</p>
                      <div className="card" style={{overflow:'hidden'}}>
                        {locationComponents.map((item,i)=>{
                          const b = stockBadge(item.qty_in_office);
                          return (
                            <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderBottom:i<locationComponents.length-1?'1px solid var(--border)':'none'}}>
                              <div style={{flex:1,minWidth:0}}>
                                <p style={{fontSize:13,fontWeight:500,color:'var(--text)',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.asset}</p>
                                {item.category?.name && <p style={{fontSize:11,color:'var(--muted)',margin:'1px 0 0'}}>{item.category.name}</p>}
                              </div>
                              <span className={`badge ${b.cls}`} style={{fontSize:10,flexShrink:0}}>{b.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Facility assets at this location */}
                  {locationFacilityAssets.length>0 && (
                    <div>
                      <p style={{fontSize:11,fontWeight:600,color:'var(--muted)',margin:'0 0 8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Assets ({locationFacilityAssets.length})</p>
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        {locationFacilityAssets.map(asset=>(
                          <FacilityAssetRow key={asset.id} asset={asset}
                            onEdit={()=>{ setEditingAsset(asset); setShowAssetModal(true); }}
                            onDelete={()=>deleteFacilityAsset(asset)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {locationComponents.length===0 && locationFacilityAssets.length===0 && (
                    <p style={{textAlign:'center',padding:'40px 0',color:'var(--muted)',fontSize:13}}>No assets at this location</p>
                  )}
                </>
              ) : (
                /* Location list */
                <>
                  {!isDesktop && (
                    <div style={{display:'flex',justifyContent:'flex-end'}}>
                      <button onClick={()=>setShowLocationModal(true)} style={{height:36,padding:'0 14px',borderRadius:10,background:'rgba(255,107,53,0.15)',color:'var(--pink)',border:'none',cursor:'pointer',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:5}}>
                        <I.Plus/> Add Location
                      </button>
                    </div>
                  )}
                  {loading ? (
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {[1,2,3].map(i=><div key={i} className="skeleton" style={{height:72}}/>)}
                    </div>
                  ) : locations.length===0 ? (
                    <p style={{textAlign:'center',padding:'40px 0',color:'var(--muted)',fontSize:13}}>No locations yet</p>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {locations.map(loc=>{
                        const compCount = inventory.filter(i=>i.location_id===loc.id).length;
                        const assetCount = facilityAssets.filter(a=>a.location_id===loc.id).length;
                        const badge = locationTypeBadge(loc.type);
                        return (
                          <button key={loc.id} onClick={()=>setSelectedLocation(loc)} className="card"
                            style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 16px',border:'none',cursor:'pointer',textAlign:'left',transition:'opacity 0.15s'}}
                            onMouseEnter={e=>(e.currentTarget.style.opacity='0.8')} onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
                            <div style={{width:36,height:36,borderRadius:10,background:'rgba(255,107,53,0.12)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--pink)',flexShrink:0}}>
                              <I.MapPin/>
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <p className="font-display" style={{fontWeight:600,fontSize:14,color:'var(--text)',margin:0}}>{loc.name}</p>
                              <p style={{fontSize:11,color:'var(--muted)',margin:'2px 0 0'}}>
                                {loc.city && `${loc.city} · `}{compCount} SKUs · {assetCount} assets
                              </p>
                            </div>
                            <span className={`badge ${badge.cls}`} style={{fontSize:10,flexShrink:0}}>{badge.label}</span>
                            <span style={{color:'var(--muted)',display:'flex'}}><I.ChevRight/></span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* PI BUILDS */}
          {tab==='pis' && (
            <div className="slide-up" style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={{display:'flex',gap:8}}>
                <div style={{flex:1,display:'flex',alignItems:'center',gap:8,background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,padding:'0 12px',height:38}}>
                  <span style={{color:'var(--muted)',flexShrink:0}}><I.Search/></span>
                  <input className="input" style={{flex:1,background:'transparent',border:'none',padding:'0',height:'100%'}} placeholder="Search Pi builds…" value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                {!isDesktop && <button onClick={()=>{setEditingPi(null);setShowPiModal(true);}} style={{...iconBtn('var(--pink)','rgba(255,107,53,0.15)'),width:38,height:38,border:'none'}}><I.Plus/></button>}
              </div>

              {loading ? (
                <div style={{display: isDesktop ? 'grid' : 'flex', gridTemplateColumns: isDesktop ? 'repeat(3,1fr)' : undefined, flexDirection:'column',gap:8}}>
                  {[1,2,3].map(i=><div key={i} className="skeleton" style={{height:120}}/>)}
                </div>
              ) : filteredPis.length===0 ? (
                <div style={{textAlign:'center',paddingTop:60,color:'var(--muted)',fontSize:13}}>No Pi builds yet</div>
              ) : <div style={{display: isDesktop ? 'grid' : 'flex', gridTemplateColumns: isDesktop ? 'repeat(3,1fr)' : undefined, flexDirection: isDesktop ? undefined : 'column', gap:10}}>
              {filteredPis.map(pi=>{
                const comps = pi.pi_components||[];
                return (
                  <div key={pi.id} className="card" style={{padding:14}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
                      <div style={{minWidth:0}}>
                        <p className="font-display" style={{fontWeight:700,fontSize:15,color:'var(--text)',margin:0}}>{pi.label}</p>
                        <p style={{fontSize:11,color:'var(--muted)',margin:'2px 0 0'}}>{pi.serial_number}</p>
                        {pi.location && <p style={{fontSize:11,color:'var(--pink)',margin:'2px 0 0'}}>📍 {pi.location}</p>}
                      </div>
                      <span className={`badge ${statusBadge(pi.status)}`}>{pi.status.replace(/_/g,' ')}</span>
                    </div>
                    {comps.length>0 && (
                      <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:10}}>
                        {comps.map(c=>(
                          <span key={c.id} style={{fontSize:11,padding:'3px 8px',borderRadius:6,background:'var(--surface2)',color:'var(--muted)'}}>
                            {c.notes&&<span style={{color:'var(--lime)',marginRight:3}}>{c.notes}</span>}{c.component?.asset?.split(' ').slice(0,3).join(' ')||'—'}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>setViewingPiDetail(pi)} style={{flex:1,height:32,borderRadius:9,background:'rgba(207,255,4,0.08)',color:'var(--lime)',display:'flex',alignItems:'center',justifyContent:'center',gap:5,fontSize:12,fontWeight:600,border:'1px solid rgba(155,184,0,0.18)',cursor:'pointer'}}>
                        <I.Qr/> View / QR
                      </button>
                      <button onClick={()=>{setEditingPi(pi);setShowPiModal(true);}} style={iconBtn('var(--pink)','rgba(255,107,53,0.15)')}><I.Edit/></button>
                      <button onClick={()=>deletePi(pi)} style={iconBtn('var(--muted)','var(--surface2)')}><I.Trash/></button>
                    </div>
                  </div>
                );
              })}
              </div>}
            </div>
          )}

          {/* TRANSACTIONS */}
          {tab==='transactions' && (
            <div className="slide-up">
              <p style={{fontSize:11,color:'var(--muted)',marginBottom:8}}>{logs.length} transactions</p>
              <div className="card" style={{overflow:'hidden'}}>
                {loading ? (
                  <div style={{padding:12,display:'flex',flexDirection:'column',gap:6}}>
                    {[1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{height:32}}/>)}
                  </div>
                ) : logs.length===0 ? (
                  <p style={{padding:'32px 0',textAlign:'center',color:'var(--muted)',fontSize:13,margin:0}}>No transactions yet</p>
                ) : logs.map((log,i)=>(
                  <div key={log.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderBottom:i<logs.length-1?'1px solid var(--border)':'none'}}>
                    <span className={`badge ${actionColor(log.action_type)}`} style={{flexShrink:0}}>{actionLabel(log.action_type)}</span>
                    <span style={{fontSize:12,color:'var(--text)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{log.pi_name||log.component?.asset||log.notes||'—'}</span>
                    {log.quantity>0 && <span style={{fontSize:11,fontWeight:700,color:'var(--lime)',flexShrink:0}}>×{log.quantity}</span>}
                    <span style={{fontSize:11,color:'var(--muted)',flexShrink:0}}>{timeAgo(log.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* ── MOBILE BOTTOM NAV ── */}
        {!isDesktop && (
          <nav style={{flexShrink:0,background:'var(--surface)',borderTop:'1px solid var(--border)',paddingBottom:'env(safe-area-inset-bottom, 4px)'}}>
            <div style={{display:'flex'}}>
              {navItems.map(({id,l,Icon})=>{
                const active = tab===id;
                return (
                  <button key={id} onClick={()=>switchTab(id)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,paddingTop:10,paddingBottom:8,color:active?'var(--pink)':'var(--muted)',background:'transparent',border:'none',cursor:'pointer'}}>
                    <Icon/>
                    <span style={{fontSize:10,fontWeight:active?600:400}}>{l}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* ── MODALS ── */}
        {showInventoryModal && (
          <InventoryModal item={editingInventory} categories={categories} defaultCategory={defaultCategory} onSave={saveInventory} onClose={()=>{setShowInventoryModal(false);setEditingInventory(null);setDefaultCategory(null);}} isDesktop={isDesktop}/>
        )}
        {showPiModal && (
          <PiModal pi={editingPi} inventory={inventory} onSave={savePi} onClose={()=>{setShowPiModal(false);setEditingPi(null);}} isDesktop={isDesktop}/>
        )}
        {receivingStockFor && (
          <ReceiveStockModal component={receivingStockFor} onReceive={receiveStock} onClose={()=>setReceivingStockFor(null)} isDesktop={isDesktop}/>
        )}
        {showCategoryModal && (
          <CategoryModal onSave={saveCategory} onClose={()=>setShowCategoryModal(false)} isDesktop={isDesktop}/>
        )}
        {viewingPiDetail && (
          <PiDetailModal pi={viewingPiDetail} onClose={()=>setViewingPiDetail(null)}
            onEdit={pi=>{setViewingPiDetail(null);setEditingPi(pi);setShowPiModal(true);}}
            onGenerateQR={pi=>{setViewingPiDetail(null);generateQR(pi);}}
            isDesktop={isDesktop}
          />
        )}
        {viewingPiQR && (
          <div className="modal-backdrop fade-in" style={{padding:20,position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="card slide-up" style={{width:'100%',maxWidth:340,padding:20}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div>
                  <h3 className="font-display" style={{fontWeight:700,fontSize:15,color:'var(--text)',margin:0}}>{viewingPiQR.pi.label}</h3>
                  <p style={{fontSize:11,color:'var(--muted)',margin:'2px 0 0'}}>QR Code — ready to print</p>
                </div>
                <button onClick={()=>setViewingPiQR(null)} style={iconBtn('var(--muted)','var(--surface2)')}><I.Close/></button>
              </div>
              <div style={{background:'white',borderRadius:12,padding:14,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14}}>
                <img src={viewingPiQR.qr} alt="QR Code" style={{width:190,height:190}}/>
              </div>
              <a href={viewingPiQR.qr} download={`${viewingPiQR.pi.label}-qr.png`} className="btn-primary"
                style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px 0',fontSize:13,textDecoration:'none'}}>
                <I.Download/> Download QR
              </a>
            </div>
          </div>
        )}
        {showAssetModal && (
          <AssetModal asset={editingAsset} locations={locations} onSave={saveFacilityAsset} onClose={()=>{setShowAssetModal(false);setEditingAsset(null);}} isDesktop={isDesktop}/>
        )}
        {showLocationModal && (
          <LocationModal onSave={saveLocation} onClose={()=>setShowLocationModal(false)} isDesktop={isDesktop}/>
        )}

      </div>
    </div>
  );
}

// ─── Facility Asset Row ────────────────────────────────────────────────────────
function FacilityAssetRow({ asset, onEdit, onDelete }: { asset: FacilityAsset; onEdit:()=>void; onDelete:()=>void }) {
  const statusColor = asset.status==='deployed'?'var(--green2)':asset.status==='faulty'?'var(--pink)':'var(--muted)';
  return (
    <div className="card" style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:10}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <p style={{fontSize:13,fontWeight:500,color:'var(--text)',margin:0}}>{asset.asset_type}</p>
          {asset.arena_label && <span style={{fontSize:10,padding:'2px 7px',borderRadius:100,background:'rgba(207,255,4,0.12)',color:'var(--lime)',fontWeight:600}}>{asset.arena_label}</span>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:3,flexWrap:'wrap'}}>
          {asset.location?.name && <span style={{fontSize:11,color:'var(--muted)'}}>📍 {asset.location.name}</span>}
          {asset.serial_number && <span style={{fontSize:11,color:'var(--muted)'}}>· {asset.serial_number}</span>}
        </div>
      </div>
      <span style={{fontSize:11,fontWeight:600,color:statusColor,background:asset.status==='deployed'?'rgba(18,183,106,0.12)':asset.status==='faulty'?'rgba(255,107,53,0.12)':'var(--surface2)',padding:'3px 9px',borderRadius:100,flexShrink:0,textTransform:'capitalize'}}>{asset.status}</span>
      <button onClick={onEdit}   style={{...iconBtn('var(--pink)','rgba(255,107,53,0.12)'),width:32,height:32,borderRadius:8,flexShrink:0}}><EditIcon/></button>
      <button onClick={onDelete} style={{...iconBtn('var(--muted)','var(--surface2)'),width:32,height:32,borderRadius:8,flexShrink:0}}><TrashIcon/></button>
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────
function CategorySection({ category, items, isOpen, onToggle, onAddVariant, onEdit, onDelete, onReceive }: {
  category: Category|null; items: Component[]; isOpen: boolean; onToggle: () => void;
  onAddVariant: () => void; onEdit: (i: Component) => void; onDelete: (i: Component) => void; onReceive: (i: Component) => void;
}) {
  const total = items.reduce((s,i)=>s+i.qty_in_office,0);
  return (
    <div className="card" style={{overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderBottom:isOpen?'1px solid var(--border)':'none',cursor:'pointer'}} onClick={onToggle}>
        <span style={{flex:1,fontWeight:600,fontSize:13,color:'var(--text)'}}>{category?.name||'Uncategorized'}</span>
        <span className="badge badge-gray" style={{fontSize:10}}>{total} units</span>
        <button onClick={e=>{e.stopPropagation();onAddVariant();}} style={{height:24,padding:'0 8px',borderRadius:6,background:'rgba(155,184,0,0.12)',color:'var(--lime)',border:'none',cursor:'pointer',fontSize:11,fontWeight:600}}>+ Add</button>
        <span style={{color:'var(--muted)',display:'flex'}}>{isOpen?<ChevUp/>:<ChevDown/>}</span>
      </div>
      {isOpen && items.map((item,i)=>{
        const accentColor = item.qty_in_office===0?'var(--pink)':item.qty_in_office<=3?'#F79009':'var(--green2)';
        return (
          <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderBottom:i<items.length-1?'1px solid var(--border)':'none'}}>
            <div style={{width:3,alignSelf:'stretch',borderRadius:2,background:accentColor,flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontSize:13,fontWeight:500,color:'var(--text)',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.asset}</p>
              {(item.brand||item.vendor) && <p style={{fontSize:11,color:'var(--muted)',margin:'1px 0 0'}}>{[item.brand,item.vendor].filter(Boolean).join(' · ')}</p>}
            </div>
            <div style={{textAlign:'center',flexShrink:0,minWidth:32}}>
              <div style={{fontSize:18,fontWeight:700,lineHeight:1,color:accentColor}}>{item.qty_in_office}</div>
              <div style={{fontSize:9,color:'var(--muted)',marginTop:1,textTransform:'uppercase',letterSpacing:'0.04em'}}>units</div>
            </div>
            <button onClick={()=>onReceive(item)} style={{...iconBtn('var(--green2)','rgba(18,183,106,0.15)'),width:32,height:32,borderRadius:8}}><PackIcon/></button>
            <button onClick={()=>onEdit(item)}    style={{...iconBtn('var(--pink)','rgba(255,107,53,0.12)'),width:32,height:32,borderRadius:8}}><EditIcon/></button>
            <button onClick={()=>onDelete(item)}  style={{...iconBtn('var(--muted)','var(--surface2)'),width:32,height:32,borderRadius:8}}><TrashIcon/></button>
          </div>
        );
      })}
    </div>
  );
}
const ChevDown = ()=><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>;
const ChevUp   = ()=><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>;
const PackIcon = ()=><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
const EditIcon = ()=><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon= ()=><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>;

// ─── Category Modal ───────────────────────────────────────────────────────────
function CategoryModal({ onSave, onClose, isDesktop=false }: { onSave:(name:string)=>void; onClose:()=>void; isDesktop?:boolean }) {
  const [name, setName] = useState('');
  return (
    <div className="modal-backdrop fade-in" style={sheetOuter(isDesktop)}>
      <div className={isDesktop?'fade-in':'slide-up'} style={sheetWrap(isDesktop)}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
          <h2 className="font-display" style={{fontWeight:700,fontSize:17,color:'var(--text)',margin:0}}>New Category</h2>
          <button onClick={onClose} style={iconBtn('var(--muted)','var(--surface2)')}><I.Close/></button>
        </div>
        <label style={fieldLabel}>Category Name</label>
        <input className="input" style={{width:'100%',padding:'11px 13px'}} placeholder="e.g. Power Supply" value={name} onChange={e=>setName(e.target.value)} autoFocus/>
        <button onClick={()=>name.trim()&&onSave(name.trim())} disabled={!name.trim()} className="btn-primary" style={{width:'100%',padding:'13px 0',marginTop:16,fontSize:14}}>
          Create Category
        </button>
      </div>
    </div>
  );
}

// ─── Inventory Modal ──────────────────────────────────────────────────────────
function InventoryModal({ item, categories, defaultCategory, onSave, onClose, isDesktop=false }: {
  item: Component|null; categories: Category[]; defaultCategory: Category|null;
  onSave: (d: {asset:string;brand:string;vendor:string;qty_in_office:number;category_id:string|null}) => void;
  onClose: () => void; isDesktop?: boolean;
}) {
  const [asset,      setAsset]      = useState(item?.asset||'');
  const [brand,      setBrand]      = useState(item?.brand||'');
  const [vendor,     setVendor]     = useState(item?.vendor||'');
  const [qty,        setQty]        = useState(item?.qty_in_office??0);
  const [categoryId, setCategoryId] = useState<string|null>(item?.category_id||defaultCategory?.id||null);
  const [saving,     setSaving]     = useState(false);

  const handleSave = async () => {
    if (!asset.trim()) return;
    setSaving(true);
    await onSave({asset:asset.trim(),brand:brand.trim(),vendor:vendor.trim(),qty_in_office:qty,category_id:categoryId});
    setSaving(false);
  };

  return (
    <div className="modal-backdrop fade-in" style={sheetOuter(isDesktop)}>
      <div className={isDesktop?'fade-in':'slide-up'} style={sheetWrap(isDesktop)}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
          <h2 className="font-display" style={{fontWeight:700,fontSize:17,color:'var(--text)',margin:0}}>{item?'Edit Variant':'Add Variant'}</h2>
          <button onClick={onClose} style={iconBtn('var(--muted)','var(--surface2)')}><I.Close/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:13}}>
          <div>
            <label style={fieldLabel}>Category</label>
            <select className="input" style={{width:'100%',padding:'10px 13px',appearance:'auto'}} value={categoryId||''} onChange={e=>setCategoryId(e.target.value||null)}>
              <option value="">None</option>
              {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={fieldLabel}>Name *</label>
            <input className="input" style={{width:'100%',padding:'10px 13px'}} placeholder="e.g. Samsung 980 Pro 1TB" value={asset} onChange={e=>setAsset(e.target.value)}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={fieldLabel}>Brand</label>
              <input className="input" style={{width:'100%',padding:'10px 13px'}} placeholder="Samsung" value={brand} onChange={e=>setBrand(e.target.value)}/>
            </div>
            <div>
              <label style={fieldLabel}>Vendor</label>
              <input className="input" style={{width:'100%',padding:'10px 13px'}} placeholder="Amazon" value={vendor} onChange={e=>setVendor(e.target.value)}/>
            </div>
          </div>
          <div>
            <label style={fieldLabel}>{item?'Stock (direct edit)':'Initial Stock'}</label>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <button onClick={()=>setQty(q=>Math.max(0,q-1))} style={{...iconBtn('var(--text)','var(--surface2)'),width:40,height:40,borderRadius:10,fontSize:20}}>−</button>
              <input inputMode="numeric" autoComplete="off" className="input" min={0} style={{flex:1,padding:'10px 13px',fontSize:18,fontWeight:700,textAlign:'center'}} value={qty} onChange={e=>setQty(Math.max(0,parseInt(e.target.value)||0))}/>
              <button onClick={()=>setQty(q=>q+1)} style={{...iconBtn('var(--green2)','rgba(18,183,106,0.15)'),width:40,height:40,borderRadius:10,fontSize:20}}>+</button>
            </div>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving||!asset.trim()} className="btn-primary" style={{width:'100%',padding:'13px 0',marginTop:18,fontSize:14}}>
          {saving?'Saving…':(item?'Update Variant':'Add Variant')}
        </button>
      </div>
    </div>
  );
}

// ─── Receive Stock Modal ──────────────────────────────────────────────────────
function ReceiveStockModal({ component, onReceive, onClose, isDesktop=false }: {
  component: Component; onReceive: (id:string,qty:number)=>void; onClose: ()=>void; isDesktop?: boolean;
}) {
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);
  return (
    <div className="modal-backdrop fade-in" style={sheetOuter(isDesktop)}>
      <div className={isDesktop?'fade-in':'slide-up'} style={sheetWrap(isDesktop)}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
          <h2 className="font-display" style={{fontWeight:700,fontSize:17,color:'var(--text)',margin:0}}>Receive Stock</h2>
          <button onClick={onClose} style={iconBtn('var(--muted)','var(--surface2)')}><I.Close/></button>
        </div>
        <p style={{fontSize:13,color:'var(--muted)',margin:'0 0 20px'}}>{component.asset}</p>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',borderRadius:10,background:'var(--surface2)',marginBottom:24}}>
          <span style={{fontSize:12,color:'var(--muted)'}}>Current stock</span>
          <span style={{fontSize:15,fontWeight:700,color:'var(--text)'}}>{component.qty_in_office} units</span>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:18,marginBottom:24}}>
          <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{width:48,height:48,borderRadius:12,background:'var(--surface2)',color:'var(--text)',fontSize:22,display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer'}}>−</button>
          <span className="font-display" style={{fontSize:48,fontWeight:700,color:'var(--text)',minWidth:70,textAlign:'center',lineHeight:1}}>{qty}</span>
          <button onClick={()=>setQty(q=>q+1)} style={{width:48,height:48,borderRadius:12,background:'rgba(18,183,106,0.15)',color:'var(--green2)',fontSize:22,display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer'}}>+</button>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 13px',borderRadius:10,background:'rgba(18,183,106,0.1)',border:'1px solid rgba(18,183,106,0.18)',marginBottom:18}}>
          <span style={{fontSize:12,color:'var(--muted)'}}>New total</span>
          <span style={{fontSize:15,fontWeight:700,color:'var(--green2)'}}>{component.qty_in_office+qty} units</span>
        </div>
        <button onClick={async()=>{setSaving(true);await onReceive(component.id,qty);setSaving(false);}} disabled={saving} className="btn-primary" style={{width:'100%',padding:'13px 0',fontSize:14}}>
          {saving?'Adding…':`Add ${qty} unit${qty!==1?'s':''}`}
        </button>
      </div>
    </div>
  );
}

// ─── Pi Detail Modal ──────────────────────────────────────────────────────────
function PiDetailModal({ pi, onClose, onEdit, onGenerateQR, isDesktop=false }: {
  pi: PiUnit; onClose:()=>void; onEdit:(pi:PiUnit)=>void; onGenerateQR:(pi:PiUnit)=>void; isDesktop?:boolean;
}) {
  const comps = pi.pi_components||[];
  return (
    <div className="modal-backdrop fade-in" style={sheetOuter(isDesktop)}>
      <div className={isDesktop?'fade-in':'slide-up'} style={sheetWrap(isDesktop)}>
        <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:16}}>
          <div style={{flex:1,minWidth:0}}>
            <h2 className="font-display" style={{fontWeight:700,fontSize:18,color:'var(--text)',margin:0}}>{pi.label}</h2>
            <p style={{fontSize:11,color:'var(--muted)',margin:'3px 0 0'}}>{pi.serial_number}</p>
            {pi.location && <p style={{fontSize:11,color:'var(--pink)',margin:'3px 0 0'}}>📍 {pi.location}</p>}
            <span className={`badge ${statusBadge(pi.status)}`} style={{marginTop:6,display:'inline-flex'}}>{pi.status.replace(/_/g,' ')}</span>
          </div>
          <button onClick={onClose} style={{...iconBtn('var(--muted)','var(--surface2)'),flexShrink:0}}><I.Close/></button>
        </div>
        {comps.length>0 && (
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:600,color:'var(--muted)',margin:'0 0 8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Components</p>
            {comps.map(c=>(
              <div key={c.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',borderRadius:10,background:'var(--surface2)',marginBottom:6}}>
                <div style={{minWidth:0,flex:1}}>
                  <p style={{fontWeight:500,fontSize:13,color:'var(--text)',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.component?.asset||'Unknown'}</p>
                  {c.component?.brand && <p style={{fontSize:11,color:'var(--muted)',margin:'1px 0 0'}}>{c.component.brand}</p>}
                </div>
                {c.notes && <span style={{fontSize:10,fontWeight:600,color:'var(--lime)',background:'rgba(155,184,0,0.12)',padding:'2px 8px',borderRadius:100,flexShrink:0,marginLeft:8}}>{c.notes}</span>}
              </div>
            ))}
          </div>
        )}
        {(pi.extra_components||[]).length>0 && (
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:600,color:'var(--muted)',margin:'0 0 8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Additional</p>
            {pi.extra_components.map((e,i)=>(
              <div key={i} style={{padding:'8px 12px',borderRadius:10,background:'var(--surface2)',marginBottom:5}}>
                <p style={{fontSize:12,color:'var(--text)',margin:0}}>{e}</p>
              </div>
            ))}
          </div>
        )}
        {pi.notes && (
          <div style={{padding:'9px 12px',borderRadius:10,background:'var(--surface2)',marginBottom:14}}>
            <p style={{fontSize:11,color:'var(--muted)',margin:'0 0 2px'}}>Notes</p>
            <p style={{fontSize:13,color:'var(--text)',margin:0}}>{pi.notes}</p>
          </div>
        )}
        {pi.qr_code && (
          <div style={{marginBottom:14}}>
            <div style={{background:'white',borderRadius:12,padding:12,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
              <img src={pi.qr_code} alt="QR Code" style={{width:170,height:170}}/>
            </div>
            <div style={{display:'flex',gap:8}}>
              <a href={pi.qr_code} download={`${pi.label}-qr.png`} style={{flex:1,height:36,borderRadius:9,background:'rgba(155,184,0,0.12)',color:'var(--lime)',display:'flex',alignItems:'center',justifyContent:'center',gap:5,fontSize:12,fontWeight:600,textDecoration:'none',border:'1px solid rgba(155,184,0,0.3)'}}>
                <I.Download/> Download QR
              </a>
              <button onClick={()=>onGenerateQR(pi)} style={{height:36,padding:'0 12px',borderRadius:9,background:'var(--surface2)',color:'var(--muted)',border:'1px solid var(--border)',cursor:'pointer',fontSize:11,fontWeight:600,display:'flex',alignItems:'center',gap:4}}>
                <I.Refresh/> Regen
              </button>
            </div>
          </div>
        )}
        <div style={{display:'flex',gap:8}}>
          {!pi.qr_code && (
            <button onClick={()=>onGenerateQR(pi)} style={{flex:1,height:40,borderRadius:10,background:'rgba(155,184,0,0.12)',color:'var(--lime)',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontSize:13,fontWeight:600,border:'1px solid rgba(155,184,0,0.3)',cursor:'pointer'}}>
              <I.Qr/> Generate QR
            </button>
          )}
          <button onClick={()=>onEdit(pi)} style={{flex:1,height:40,borderRadius:10,background:'rgba(255,107,53,0.15)',color:'var(--pink)',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontSize:13,fontWeight:600,border:'1px solid rgba(255,107,53,0.3)',cursor:'pointer'}}>
            <I.Edit/> Edit Pi
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pi Modal (assemble / edit) ───────────────────────────────────────────────
type PiModalView = 'main' | 'pick-category' | 'pick-variant';

function PiModal({ pi, inventory, onSave, onClose, isDesktop=false }: {
  pi: PiUnit|null; inventory: Component[]; onSave:(d:Record<string,unknown>)=>void; onClose:()=>void; isDesktop?:boolean;
}) {
  const existingComps = pi?.pi_components||[];
  const [label,    setLabel]    = useState(pi?.label||'');
  const [serial,   setSerial]   = useState(pi?.serial_number||'');
  const [status,   setStatus]   = useState(pi?.status||'in_office');
  const [location, setLocation] = useState(pi?.location||'');
  const [notes,    setNotes]    = useState(pi?.notes||'');
  const [selected, setSelected] = useState<Array<{component_id:string;role:string}>>(
    existingComps.map(c=>({component_id:c.component_id,role:c.notes||''}))
  );
  const [extras,   setExtras]   = useState<string[]>(pi?.extra_components||[]);
  const [saving,   setSaving]   = useState(false);
  const [view,     setView]     = useState<PiModalView>('main');
  const [pickerCat,setPickerCat]= useState<string>('');
  const [varSearch,setVarSearch]= useState('');
  const [dupWarning,setDupWarning]= useState<{existing:Component;incoming:Component}|null>(null);

  const cats = Array.from(new Map(
    inventory.filter(i=>i.category).map(i=>[i.category!.id, i.category!])
  ).values()).sort((a,b)=>a.name.localeCompare(b.name));

  const addComponent = (component_id: string, role: string, force=false) => {
    if (!force) {
      const existingInCat = selected.find(s => {
        const comp = inventory.find(c=>c.id===s.component_id);
        return comp?.category?.name === role;
      });
      if (existingInCat) {
        const existingComp = inventory.find(c=>c.id===existingInCat.component_id)!;
        const incomingComp = inventory.find(c=>c.id===component_id)!;
        setDupWarning({existing:existingComp, incoming:incomingComp});
        return;
      }
    }
    setSelected(s=>[...s,{component_id,role}]);
    setView('main'); setVarSearch(''); setDupWarning(null);
  };
  const removeComponent = (idx: number) => setSelected(s=>s.filter((_,i)=>i!==idx));

  const existingIds = new Set(existingComps.map(c=>c.component_id));
  const newlyAdded  = selected.filter(s=>!existingIds.has(s.component_id)).length;
  const removed     = existingComps.filter(c=>!selected.find(s=>s.component_id===c.component_id)).length;

  const handleSave = async () => {
    if (!label.trim()||!location.trim()) return;
    setSaving(true);
    await onSave({label:label.trim(),serial_number:serial||`HiFy-${Date.now()}`,status,location:location.trim(),notes,extra_components:extras.filter(e=>e.trim()),components:selected.map(s=>({component_id:s.component_id,role:s.role}))});
    setSaving(false);
  };

  const variantItems = inventory.filter(i=>i.category?.name===pickerCat&&
    (!varSearch.trim()||[i.asset,i.brand,i.vendor].some(f=>f?.toLowerCase().includes(varSearch.toLowerCase()))));

  return (
    <div className="modal-backdrop fade-in" style={sheetOuter(isDesktop)}>
      <div className={isDesktop?'fade-in':'slide-up'} style={{...sheetWrap(isDesktop),width:'100%',position:'relative'}}>

        {view==='pick-category' && (
          <>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
              <button onClick={()=>setView('main')} style={{...iconBtn('var(--text)','var(--surface2)'),flexShrink:0}}><I.Back/></button>
              <h2 className="font-display" style={{fontWeight:700,fontSize:17,color:'var(--text)',margin:0}}>Pick Category</h2>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {cats.map(cat=>{
                const count = inventory.filter(i=>i.category?.id===cat.id).length;
                return (
                  <button key={cat.id} onClick={()=>{setPickerCat(cat.name);setVarSearch('');setView('pick-variant');}}
                    style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 16px',borderRadius:12,background:'var(--surface2)',border:'1px solid var(--border)',cursor:'pointer',textAlign:'left'}}>
                    <span style={{fontSize:16,fontWeight:600,color:'var(--text)'}}>{cat.name}</span>
                    <span style={{fontSize:12,color:'var(--muted)'}}>{count} variant{count!==1?'s':''}</span>
                  </button>
                );
              })}
              {cats.length===0 && <p style={{fontSize:13,color:'var(--muted)',textAlign:'center',padding:'24px 0'}}>No categorised items in inventory</p>}
            </div>
          </>
        )}

        {view==='pick-variant' && (
          <>
            {dupWarning && (
              <div style={{position:'absolute',inset:0,zIndex:10,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end',justifyContent:'center',borderRadius:'20px 20px 0 0'}}>
                <div style={{width:'100%',padding:'20px 18px 28px',background:'var(--surface)',borderTop:'1px solid var(--border)'}}>
                  <p style={{fontSize:13,fontWeight:700,color:'var(--pink)',margin:'0 0 6px'}}>Already have a {pickerCat}</p>
                  <p style={{fontSize:13,color:'var(--text)',margin:'0 0 4px'}}><span style={{color:'var(--muted)'}}>Current: </span>{dupWarning.existing.asset}{dupWarning.existing.brand?` · ${dupWarning.existing.brand}`:''}</p>
                  <p style={{fontSize:13,color:'var(--text)',margin:'0 0 18px'}}><span style={{color:'var(--muted)'}}>Adding: </span>{dupWarning.incoming.asset}{dupWarning.incoming.brand?` · ${dupWarning.incoming.brand}`:''}</p>
                  <p style={{fontSize:12,color:'var(--muted)',margin:'0 0 16px'}}>Are you sure you want to add a second {pickerCat}?</p>
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={()=>setDupWarning(null)} className="btn-ghost" style={{flex:1,padding:'12px 0',fontSize:13}}>Cancel</button>
                    <button onClick={()=>addComponent(dupWarning.incoming.id,pickerCat,true)} className="btn-primary" style={{flex:1,padding:'12px 0',fontSize:13}}>Add anyway</button>
                  </div>
                </div>
              </div>
            )}
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <button onClick={()=>{setView('pick-category');setDupWarning(null);}} style={{...iconBtn('var(--text)','var(--surface2)'),flexShrink:0}}><I.Back/></button>
              <h2 className="font-display" style={{fontWeight:700,fontSize:17,color:'var(--text)',margin:0}}>{pickerCat}</h2>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,padding:'0 12px',height:44,marginBottom:12}}>
              <I.Search/>
              <input className="input" style={{flex:1,background:'transparent',border:'none',padding:0,fontSize:14,height:'100%'}} placeholder={`Search ${pickerCat}…`} value={varSearch} onChange={e=>setVarSearch(e.target.value)} autoFocus/>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {variantItems.length===0
                ? <p style={{fontSize:13,color:'var(--muted)',textAlign:'center',padding:'24px 0'}}>No variants found</p>
                : variantItems.map(item=>{
                    const oos = item.qty_in_office<=0;
                    return (
                      <button key={item.id} onClick={()=>addComponent(item.id,pickerCat)}
                        style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderRadius:12,background:'var(--surface2)',border:'1px solid var(--border)',cursor:'pointer',textAlign:'left',boxSizing:'border-box'}}>
                        <div style={{minWidth:0,flex:1}}>
                          <p style={{fontSize:15,fontWeight:500,color:'var(--text)',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.asset}</p>
                          {item.brand && <p style={{fontSize:12,color:'var(--muted)',margin:'2px 0 0'}}>{item.brand}</p>}
                        </div>
                        <span style={{fontSize:12,fontWeight:700,flexShrink:0,marginLeft:12,color:oos?'var(--pink)':item.qty_in_office<=3?'#FBBF24':'var(--green2)'}}>
                          {oos?`${item.qty_in_office} (OOS)`:item.qty_in_office<=3?`${item.qty_in_office} left`:`${item.qty_in_office}`}
                        </span>
                      </button>
                    );
                  })
              }
            </div>
          </>
        )}

        {view==='main' && (
          <>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
              <h2 className="font-display" style={{fontWeight:700,fontSize:17,color:'var(--text)',margin:0,flex:1}}>{pi?'Edit Pi':'Assemble Pi'}</h2>
              <button onClick={onClose} style={{...iconBtn('var(--muted)','var(--surface2)'),flexShrink:0}}><I.Close/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label style={fieldLabel}>Label *</label>
                  <input className="input" style={{width:'100%',boxSizing:'border-box',padding:'12px 13px',fontSize:15}} placeholder="Pi-Alpha-01" value={label} onChange={e=>setLabel(e.target.value)}/>
                </div>
                <div>
                  <label style={fieldLabel}>Location *</label>
                  <input className="input" style={{width:'100%',boxSizing:'border-box',padding:'12px 13px',fontSize:15}} placeholder="Warehouse A" value={location} onChange={e=>setLocation(e.target.value)}/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label style={fieldLabel}>Serial</label>
                  <input className="input" style={{width:'100%',boxSizing:'border-box',padding:'12px 13px',fontSize:15}} placeholder="auto" value={serial} onChange={e=>setSerial(e.target.value)}/>
                </div>
                <div>
                  <label style={fieldLabel}>Status</label>
                  <select className="input" style={{width:'100%',boxSizing:'border-box',padding:'12px 13px',fontSize:15,appearance:'auto'}} value={status} onChange={e=>setStatus(e.target.value)}>
                    <option value="in_office">In Office</option>
                    <option value="deployed">Deployed</option>
                    <option value="faulty">Faulty</option>
                    <option value="returned">Returned</option>
                  </select>
                </div>
              </div>
              <div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <label style={{...fieldLabel,margin:0}}>Components ({selected.length})</label>
                </div>
                {selected.map((s,i)=>{
                  const comp = inventory.find(c=>c.id===s.component_id);
                  return (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 13px',borderRadius:10,background:'var(--surface2)',marginBottom:7}}>
                      <div style={{flex:1,minWidth:0}}>
                        <span style={{fontSize:10,fontWeight:600,color:'var(--lime)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.role}</span>
                        <p style={{fontSize:14,fontWeight:500,color:'var(--text)',margin:'2px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{comp?.asset||s.component_id}</p>
                      </div>
                      <button onClick={()=>removeComponent(i)} style={{...iconBtn('var(--muted)','transparent'),width:36,height:36,flexShrink:0}}><I.Close/></button>
                    </div>
                  );
                })}
                <button onClick={()=>setView('pick-category')}
                  style={{width:'100%',height:48,borderRadius:10,background:'rgba(155,184,0,0.08)',color:'var(--lime)',border:'1px dashed rgba(155,184,0,0.4)',cursor:'pointer',fontSize:14,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  <I.Plus/> Add Component
                </button>
              </div>
              <div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <label style={{...fieldLabel,margin:0}}>Non-inventory items</label>
                  <button onClick={()=>setExtras(e=>[...e,''])} style={{height:26,padding:'0 10px',borderRadius:7,background:'var(--surface2)',color:'var(--muted)',border:'none',cursor:'pointer',fontSize:12}}>+ Add</button>
                </div>
                {extras.length===0
                  ? <p style={{fontSize:12,color:'var(--muted)',margin:0}}>Cables, adapters, misc not tracked in inventory</p>
                  : extras.map((e,i)=>(
                      <div key={i} style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
                        <input className="input" style={{flex:1,minWidth:0,boxSizing:'border-box',padding:'10px 13px',fontSize:14}} placeholder="e.g. HDMI cable" value={e} onChange={ev=>setExtras(arr=>arr.map((x,idx)=>idx===i?ev.target.value:x))}/>
                        <button onClick={()=>setExtras(arr=>arr.filter((_,idx)=>idx!==i))} style={iconBtn('var(--muted)','var(--surface2)')}><I.Trash/></button>
                      </div>
                    ))
                }
              </div>
              {(newlyAdded>0||removed>0) && (
                <div style={{padding:'10px 13px',borderRadius:10,background:'var(--surface2)',border:'1px solid var(--border)'}}>
                  <p style={{fontSize:12,color:'var(--muted)',margin:0}}>
                    {newlyAdded>0&&<span style={{color:'var(--pink)'}}>−{newlyAdded} from stock</span>}
                    {newlyAdded>0&&removed>0&&<span> · </span>}
                    {removed>0&&<span style={{color:'var(--green2)'}}>+{removed} returned</span>}
                  </p>
                </div>
              )}
              <div>
                <label style={fieldLabel}>Notes</label>
                <textarea className="input" style={{width:'100%',boxSizing:'border-box',padding:'12px 13px',resize:'none',fontSize:14}} rows={2} value={notes} onChange={e=>setNotes(e.target.value)}/>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving||!label.trim()||!location.trim()} className="btn-primary" style={{width:'100%',padding:'15px 0',marginTop:18,fontSize:15}}>
              {saving?'Saving…':(pi?'Update Pi':'Assemble Pi')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Asset Modal (facility assets) ────────────────────────────────────────────
function AssetModal({ asset, locations, onSave, onClose, isDesktop=false }: {
  asset: FacilityAsset|null; locations: Location[];
  onSave: (d: Record<string,unknown>) => void;
  onClose: () => void; isDesktop?: boolean;
}) {
  const defaultLoc = locations.find(l=>l.type==='office') || locations[0];
  const [assetType,   setAssetType]   = useState(asset?.asset_type||'');
  const [serial,      setSerial]      = useState(asset?.serial_number||'');
  const [status,      setStatus]      = useState<string>(asset?.status||'spare');
  const [locationId,  setLocationId]  = useState(asset?.location_id||defaultLoc?.id||'');
  const [arenaLabel,  setArenaLabel]  = useState(asset?.arena_label||'');
  const [notes,       setNotes]       = useState(asset?.notes||'');
  const [purchasedAt, setPurchasedAt] = useState(asset?.purchased_at||'');
  const [saving,      setSaving]      = useState(false);

  const handleSave = async () => {
    if (!assetType.trim() || !locationId) return;
    setSaving(true);
    await onSave({ asset_type:assetType.trim(), serial_number:serial.trim()||null, status, location_id:locationId, arena_label:arenaLabel.trim()||null, notes:notes.trim()||null, purchased_at:purchasedAt||null });
    setSaving(false);
  };

  return (
    <div className="modal-backdrop fade-in" style={sheetOuter(isDesktop)}>
      <div className={isDesktop?'fade-in':'slide-up'} style={sheetWrap(isDesktop)}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
          <h2 className="font-display" style={{fontWeight:700,fontSize:17,color:'var(--text)',margin:0}}>{asset?'Edit Asset':'Add Asset'}</h2>
          <button onClick={onClose} style={iconBtn('var(--muted)','var(--surface2)')}><I.Close/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:13}}>
          <div>
            <label style={fieldLabel}>Asset Type *</label>
            <select className="input" style={{width:'100%',padding:'10px 13px',appearance:'auto'}} value={assetType} onChange={e=>setAssetType(e.target.value)}>
              <option value="">Select type…</option>
              {ASSET_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={fieldLabel}>Status</label>
              <select className="input" style={{width:'100%',padding:'10px 13px',appearance:'auto'}} value={status} onChange={e=>setStatus(e.target.value)}>
                <option value="spare">Spare</option>
                <option value="deployed">Deployed</option>
                <option value="faulty">Faulty</option>
                <option value="retired">Retired</option>
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Serial No.</label>
              <input className="input" style={{width:'100%',padding:'10px 13px'}} placeholder="Optional" value={serial} onChange={e=>setSerial(e.target.value)}/>
            </div>
          </div>
          <div>
            <label style={fieldLabel}>Location *</label>
            <select className="input" style={{width:'100%',padding:'10px 13px',appearance:'auto'}} value={locationId} onChange={e=>setLocationId(e.target.value)}>
              <option value="">Select location…</option>
              {locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={fieldLabel}>Arena / Zone</label>
              <input className="input" style={{width:'100%',padding:'10px 13px'}} placeholder="e.g. Court 1" value={arenaLabel} onChange={e=>setArenaLabel(e.target.value)}/>
            </div>
            <div>
              <label style={fieldLabel}>Purchased On</label>
              <input type="date" className="input" style={{width:'100%',padding:'10px 13px'}} value={purchasedAt} onChange={e=>setPurchasedAt(e.target.value)}/>
            </div>
          </div>
          <div>
            <label style={fieldLabel}>Notes</label>
            <textarea className="input" style={{width:'100%',boxSizing:'border-box',padding:'10px 13px',resize:'none',fontSize:14}} rows={2} value={notes} onChange={e=>setNotes(e.target.value)}/>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving||!assetType.trim()||!locationId} className="btn-primary" style={{width:'100%',padding:'13px 0',marginTop:18,fontSize:14}}>
          {saving?'Saving…':(asset?'Update Asset':'Add Asset')}
        </button>
      </div>
    </div>
  );
}

// ─── Location Modal ───────────────────────────────────────────────────────────
function LocationModal({ onSave, onClose, isDesktop=false }: {
  onSave: (d:{name:string;type:string;city:string;address:string}) => void;
  onClose: () => void; isDesktop?: boolean;
}) {
  const [name,    setName]    = useState('');
  const [type,    setType]    = useState('facility');
  const [city,    setCity]    = useState('');
  const [address, setAddress] = useState('');
  const [saving,  setSaving]  = useState(false);

  return (
    <div className="modal-backdrop fade-in" style={sheetOuter(isDesktop)}>
      <div className={isDesktop?'fade-in':'slide-up'} style={sheetWrap(isDesktop)}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
          <h2 className="font-display" style={{fontWeight:700,fontSize:17,color:'var(--text)',margin:0}}>Add Location</h2>
          <button onClick={onClose} style={iconBtn('var(--muted)','var(--surface2)')}><I.Close/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:13}}>
          <div>
            <label style={fieldLabel}>Name *</label>
            <input className="input" style={{width:'100%',padding:'10px 13px'}} placeholder="e.g. Andheri Sports Complex" value={name} onChange={e=>setName(e.target.value)} autoFocus/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={fieldLabel}>Type</label>
              <select className="input" style={{width:'100%',padding:'10px 13px',appearance:'auto'}} value={type} onChange={e=>setType(e.target.value)}>
                <option value="facility">Facility</option>
                <option value="office">Office</option>
                <option value="warehouse">Warehouse</option>
              </select>
            </div>
            <div>
              <label style={fieldLabel}>City</label>
              <input className="input" style={{width:'100%',padding:'10px 13px'}} placeholder="Mumbai" value={city} onChange={e=>setCity(e.target.value)}/>
            </div>
          </div>
          <div>
            <label style={fieldLabel}>Address</label>
            <input className="input" style={{width:'100%',padding:'10px 13px'}} placeholder="Optional" value={address} onChange={e=>setAddress(e.target.value)}/>
          </div>
        </div>
        <button onClick={async()=>{if(!name.trim())return;setSaving(true);await onSave({name:name.trim(),type,city:city.trim(),address:address.trim()});setSaving(false);}}
          disabled={saving||!name.trim()} className="btn-primary" style={{width:'100%',padding:'13px 0',marginTop:18,fontSize:14}}>
          {saving?'Saving…':'Add Location'}
        </button>
      </div>
    </div>
  );
}
