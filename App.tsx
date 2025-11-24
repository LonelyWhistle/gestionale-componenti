import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword,
    signOut,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    onSnapshot,
    doc,
    setDoc,
    addDoc,
    deleteDoc,
    writeBatch,
    Timestamp,
    updateDoc
} from 'firebase/firestore';

// --- IMPORTAZIONI LIBRERIE ---
import * as XLSX from 'xlsx';

// --- TIPI DI DATI ---
interface Supplier {
  id: string;
  name: string;
  partNumber: string;
  cost: number;
  leadTime: string;
  packaging: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  note: string;
}

interface ElectronicComponent {
  id: string;
  sekoCode: string;
  aselCode: string;
  lfWmsCode: string;
  description: string;
  suppliers: Supplier[];
  logs?: LogEntry[];
}

interface BomItem {
    sekoCode: string;
    quantity: number;
}

interface Product {
    id: string;
    code: string;
    name: string;
    bom: BomItem[];
    logs?: LogEntry[];
}

// --- CONFIGURAZIONE FIREBASE ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const checkFirebaseConfig = (config) => {
    return Object.values(config).every(value => value && typeof value === 'string' && value.length > 0);
};

// --- COMPONENTI ICONE ---
const Icon = ({ children, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    {children}
  </svg>
);

const EditIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></Icon>;
const TrashIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></Icon>;
const PlusIcon = () => <Icon className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></Icon>;
const SaveIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></Icon>;
const XIcon = () => <Icon className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></Icon>;
const SunIcon = () => <Icon className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></Icon>;
const MoonIcon = () => <Icon className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></Icon>;
const UploadIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></Icon>;
const SearchIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></Icon>;
const FileExcelIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" /></Icon>;
const FileImportIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M10 18h4v-2h-4v2zM3 6h18M6 6l.9 12.6a1 1 0 001 .9h8.2a1 1 0 001-.9L18 6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v4m-2-2h4" /></Icon>;
const SpinnerIcon = ({ className }) => <Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3m16.95 6.95l-2.12-2.12M7.05 7.05L4.93 4.93m14.14 0l-2.12 2.12M7.05 16.95l-2.12 2.12" /></Icon>;
const AlertTriangleIcon = () => <Icon className="w-12 h-12 text-red-500 mx-auto"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></Icon>;
const ChartBarIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></Icon>;
const DocumentDuplicateIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></Icon>;
const CalculatorIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></Icon>;
const FilePdfIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></Icon>;

// --- UI HELPERS ---
const LoadingScreen = ({ message }) => (<div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white"><h1 className="text-3xl font-bold text-center text-electric-blue mb-4 tracking-wider">GESTIONALE COMPONENTI</h1><SpinnerIcon className="w-10 h-10 text-electric-blue animate-spin" /><p className="mt-4 text-slate-400">{message}</p></div>);
const ErrorScreen = ({ title, message, details }) => (<div className="min-h-screen flex items-center justify-center bg-slate-950 p-4"><div className="w-full max-w-lg bg-slate-900 border border-red-500/30 rounded-xl shadow-2xl p-8 text-center"><AlertTriangleIcon /><h2 className="mt-4 text-2xl font-bold text-red-400">{title}</h2><p className="mt-2 text-slate-300">{message}</p>{details && <pre className="mt-4 text-left bg-slate-800/50 p-3 rounded-md text-xs text-slate-400 overflow-x-auto"><code>{details}</code></pre>}</div></div>);
const InputField = ({ label, name, value, onChange, required, type = "text", readOnly = false, placeholder = '', step = null }) => (<div><label htmlFor={name} className="block text-sm font-medium text-slate-400 mb-1">{label}</label><input type={type} name={name} id={name} value={value} onChange={onChange} required={required} readOnly={readOnly} placeholder={placeholder} step={step} className={`w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:ring-1 focus:ring-electric-blue focus:border-electric-blue transition-colors ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`} /></div>);
const LoginPage = ({ onLogin, error }) => { const [e, setE] = useState(''); const [p, setP] = useState(''); const [l, setL] = useState(false); const sub = async (evt) => { evt.preventDefault(); setL(true); await onLogin(e, p); setL(false); }; return (<div className="min-h-screen flex items-center justify-center bg-slate-950 p-4"><div className="w-full max-w-sm"><h1 className="text-3xl font-bold text-center text-electric-blue mb-8 tracking-wider">GESTIONALE COMPONENTI</h1><div className="bg-slate-900/50 border border-slate-800/50 rounded-xl shadow-2xl p-8"><form onSubmit={sub} className="space-y-6"><div><label className="block text-sm font-medium text-slate-400 mb-1">Email</label><input type="email" value={e} onChange={ev=>setE(ev.target.value)} required className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:ring-1 focus:ring-electric-blue text-slate-200" /></div><div><label className="block text-sm font-medium text-slate-400 mb-1">Password</label><input type="password" value={p} onChange={ev=>setP(ev.target.value)} required className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:ring-1 focus:ring-electric-blue text-slate-200" /></div>{error && <p className="text-sm text-red-400 text-center">{error}</p>}<div><button type="submit" disabled={l} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-electric-blue hover:bg-electric-blue/90 disabled:bg-slate-600">{l ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : 'Accedi'}</button></div></form></div></div></div>); };

// --- MODALI ---
const ComponentModal = ({ component, onClose, onSave }) => {
    const [formData, setFormData] = useState({ sekoCode: '', aselCode: '', description: '', suppliers: [], logs: [] });
    const [lfWmsCode, setLfWmsCode] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [note, setNote] = useState('');
    const [supplierForm, setSupplierForm] = useState({ name: '', partNumber: '', cost: 0, leadTime: '', packaging: '' });
    const [editingSupplierId, setEditingSupplierId] = useState(null);
    const [activeTab, setActiveTab] = useState('details');
  
    useEffect(() => {
      if (component) {
        setFormData({
          sekoCode: component.sekoCode || '',
          aselCode: component.aselCode || '',
          description: component.description || '',
          suppliers: component.suppliers ? [...component.suppliers] : [],
          logs: component.logs ? [...component.logs].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : []
        });
        setLfWmsCode(component.lfWmsCode || '');
      } else {
        setFormData({ sekoCode: '', aselCode: '', description: '', suppliers: [], logs: [] });
        setLfWmsCode('');
      }
    }, [component]);
    useEffect(() => { setLfWmsCode(formData.sekoCode ? `AS${formData.sekoCode}` : ''); }, [formData.sekoCode]);
    const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSupplierFormChange = (e) => setSupplierForm(prev => ({ ...prev, [e.target.name]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }));
    const resetSupplierForm = () => { setEditingSupplierId(null); setSupplierForm({ name: '', partNumber: '', cost: 0, leadTime: '', packaging: '' }); };
    const handleAddOrUpdateSupplier = () => { if (!supplierForm.name || !supplierForm.partNumber) { alert("Dati fornitore mancanti."); return; } if (editingSupplierId) { setFormData(prev => ({ ...prev, suppliers: prev.suppliers.map(s => s.id === editingSupplierId ? { ...supplierForm, id: editingSupplierId } : s) })); } else { setFormData(prev => ({ ...prev, suppliers: [...prev.suppliers, { id: `s_${Date.now()}`, ...supplierForm }] })); } resetSupplierForm(); };
    const handleConfirmSave = async () => { if (note.trim() === '') { alert('Nota obbligatoria.'); return; } await onSave({ id: component?.id, ...formData, lfWmsCode }, note); setIsConfirmModalOpen(false); setNote(''); };
  
    return (
      <>
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 backdrop-blur-sm"><div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"><header className="flex justify-between items-center p-5 border-b border-slate-800"><div className="flex items-center gap-4"><h2 className="text-xl font-bold text-slate-100">{component ? 'Modifica' : 'Nuovo'}</h2>{component && (<div className="flex items-center text-sm border border-slate-700 rounded-lg p-0.5 bg-slate-800/50"><button onClick={() => setActiveTab('details')} className={`px-3 py-1 rounded-md transition-colors ${activeTab === 'details' ? 'bg-electric-blue text-white' : 'text-slate-400'}`}>Dettagli</button><button onClick={() => setActiveTab('logs')} className={`px-3 py-1 rounded-md transition-colors ${activeTab === 'logs' ? 'bg-electric-blue text-white' : 'text-slate-400'}`}>Logs</button></div>)}</div><button onClick={onClose} className="text-slate-500 hover:text-slate-100"><XIcon /></button></header><div className="flex-grow overflow-y-auto">{activeTab === 'details' ? (<div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6"><div className="md:col-span-2"><label className="block text-sm font-medium text-slate-400 mb-1">Descrizione</label><textarea name="description" value={formData.description} onChange={handleInputChange} rows={2} required className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:ring-1 focus:ring-electric-blue transition-colors"/></div><InputField label="Codice Seko" name="sekoCode" value={formData.sekoCode} onChange={handleInputChange} required /><InputField label="Codice Asel" name="aselCode" value={formData.aselCode} onChange={handleInputChange} /><InputField label="LF_WMS" name="lfWmsCode" value={lfWmsCode} readOnly /><div className="md:col-span-2 border-t border-slate-800 pt-4"><h3 className="text-lg font-semibold text-slate-200 mb-4">Fornitori</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-800/40 rounded-lg border border-slate-700/80 mb-6"><InputField label="Nome" name="name" value={supplierForm.name} onChange={handleSupplierFormChange} /><InputField label="Part Number" name="partNumber" value={supplierForm.partNumber} onChange={handleSupplierFormChange} /><InputField label="Confezione" name="packaging" value={supplierForm.packaging} onChange={handleSupplierFormChange} /><div><label className="text-xs font-medium text-slate-400">Costo</label><input type="number" name="cost" value={supplierForm.cost} onChange={handleSupplierFormChange} step="0.00001" className="w-full mt-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-sm"/></div><InputField label="Lead Time" name="leadTime" value={supplierForm.leadTime} onChange={handleSupplierFormChange} /><div className="flex items-end justify-end gap-2"><button type="button" onClick={resetSupplierForm} className="bg-slate-600 text-white rounded p-2 h-10 w-10 flex items-center justify-center"><XIcon /></button><button type="button" onClick={handleAddOrUpdateSupplier} className="bg-electric-blue text-white rounded p-2 h-10 w-10 flex items-center justify-center"><PlusIcon /></button></div></div><div className="space-y-3">{formData.suppliers.map(s => (<div key={s.id} className="flex justify-between p-3 bg-slate-800/70 border border-slate-700 rounded-lg"><div><p className="font-bold text-slate-200">{s.name}</p><p className="text-xs text-slate-500">{s.partNumber}</p></div><div className="flex gap-2 items-center"><span className="text-slate-300">€{s.cost}</span><button onClick={()=>setEditingSupplierId(s.id)||setSupplierForm(s)}><EditIcon/></button><button onClick={()=>setFormData(p=>({...p,suppliers:p.suppliers.filter(x=>x.id!==s.id)}))} className="text-red-400"><TrashIcon/></button></div></div>))}</div></div></div>) : (<div className="p-6 space-y-4">{formData.logs.map(l=>(<div key={l.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded"><div className="flex justify-between text-xs text-slate-400"><span>{l.username}</span><span>{new Date(l.timestamp).toLocaleString()}</span></div><p className="text-sm mt-1">{l.details}</p><p className="text-xs italic text-slate-500 mt-1">"{l.note}"</p></div>))}</div>)}</div><footer className="flex justify-end p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-xl"><button onClick={onClose} className="mr-2 px-4 py-2 text-slate-300">Annulla</button><button onClick={()=>setIsConfirmModalOpen(true)} className="bg-electric-blue text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><SaveIcon /> Salva</button></footer></div></div>
        {isConfirmModalOpen && (<div className="fixed inset-0 bg-black/80 z-[60] flex justify-center items-center p-4"><div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6"><h3 className="text-lg font-bold text-slate-100 mb-4">Conferma</h3><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Nota obbligatoria..." className="w-full p-2 bg-slate-800 border border-slate-700 rounded mb-4" /><div className="flex justify-end"><button onClick={()=>setIsConfirmModalOpen(false)} className="mr-2 text-slate-300">Annulla</button><button onClick={handleConfirmSave} className="bg-electric-blue text-white px-4 py-2 rounded">Conferma</button></div></div></div>)}
      </>
    );
};

const BomQuoteModal = ({ isOpen, onClose, components }) => { 
    const [sekoCodes, setSekoCodes] = useState('');
    const [quoteResults, setQuoteResults] = useState([]);
    const [searched, setSearched] = useState(false);
    const handleSearch = () => { const res = sekoCodes.split(/\r?\n/).map(c=>c.trim()).filter(c=>c).map(code => { const f = components.find(x=>x.sekoCode===code); return { inputSeko: code, status: f?'Trovato':'Non Trovato', component: f }; }); setQuoteResults(res); setSearched(true); };
    const handleExport = () => { const data = quoteResults.map(r => { if(r.status==='Trovato' && r.component.suppliers.length>0) { const best = r.component.suppliers.reduce((m,c)=>c.cost<m.cost?c:m, r.component.suppliers[0]); return { 'Input': r.inputSeko, 'Desc': r.component.description, 'Fornitore': best.name, 'Costo': best.cost }; } return { 'Input': r.inputSeko, 'Stato': 'N/D' }; }); XLSX.writeFile(XLSX.utils.book_newWithSheets({"Quote": XLSX.utils.json_to_sheet(data)}), 'quote.xlsx'); };
    if (!isOpen) return null;
    return (<div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4"><div className="bg-slate-900/80 border border-slate-700 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col"><header className="p-5 border-b border-slate-800 flex justify-between"><h2 className="text-xl font-bold">Quotazione Rapida</h2><button onClick={onClose}><XIcon/></button></header><div className="p-6 flex-grow overflow-y-auto"><textarea className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded font-mono" rows={6} value={sekoCodes} onChange={e=>setSekoCodes(e.target.value)} placeholder="Incolla codici..." />{searched && <div className="mt-4 border border-slate-800 rounded overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-800 text-slate-400"><tr><th className="p-2">Input</th><th className="p-2">Stato</th><th className="p-2">Desc</th><th className="p-2">Miglior Prezzo</th></tr></thead><tbody>{quoteResults.map((r,i)=>(<tr key={i} className="border-b border-slate-800 text-slate-300"><td className="p-2 font-mono">{r.inputSeko}</td><td className="p-2">{r.status}</td><td className="p-2">{r.component?.description}</td><td className="p-2">{r.component?.suppliers?.[0]?.cost ? '€'+r.component.suppliers.reduce((m,c)=>c.cost<m.cost?c:m, r.component.suppliers[0]).cost : '-'}</td></tr>))}</tbody></table></div>}</div><footer className="p-4 border-t border-slate-800 flex justify-between"><button onClick={handleExport} className="text-green-400 border border-green-500/30 px-4 py-2 rounded">Export</button><div className="flex gap-2"><button onClick={onClose} className="text-slate-300 px-4 py-2">Chiudi</button><button onClick={handleSearch} className="bg-electric-blue text-white px-4 py-2 rounded">Cerca</button></div></footer></div></div>);
};

const CsvImportModal = ({ isOpen, onClose, onImport }) => {
    const [isDragging, setIsDragging] = useState(false); const [error, setError] = useState(null); const [processing, setProcessing] = useState(false);
    const handleFileProcess = useCallback((file) => { 
        if (!file) return; 
        setError(null); 
        setProcessing(true); 
        const reader = new FileReader(); 
        reader.onload = (e) => { 
            try { 
                const wb = XLSX.read(e.target.result, { type: 'binary' });
                const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false }); 
                const list = []; 
                json.forEach(r => { 
                    const s = String(r.sekoCode||'').trim(); 
                    if(s) list.push({ sekoCode: s, aselCode: String(r.aselCode||''), lfWmsCode: `AS${s}`, description: String(r.description||''), suppliers: r.supplierName ? [{ id:`s_${s}_0`, name:r.supplierName, cost: parseFloat(r.cost)||0, partNumber: r.supplierPartNumber||'' }] : [] }); 
                }); 
                if(list.length===0) setError("No data."); else onImport(list); 
            } catch(err){ setError(err.message); } finally { setProcessing(false); } 
        }; 
        reader.readAsBinaryString(file); 
    }, [onImport]);
    
    if (!isOpen) return null;
    return (<div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4"><div className="bg-slate-900/80 w-full max-w-2xl border border-slate-700 rounded-xl p-6 text-center"><h2 className="text-xl font-bold mb-4">Importa CSV/Excel</h2><input type="file" onChange={e=>handleFileProcess(e.target.files[0])} className="block w-full text-slate-400 file:bg-electric-blue file:text-white file:border-0 file:rounded file:px-4 file:py-2 mb-4" />{processing && <p>Elaborazione...</p>}{error && <p className="text-red-400">{error}</p>}<button onClick={onClose} className="text-slate-400 mt-4">Chiudi</button></div></div>);
};

const AselUpdateModal = ({ isOpen, onClose, onUpdate }) => {
    const [processing, setProcessing] = useState(false);
    const handleFile = (file) => { 
        if(!file) return; 
        setProcessing(true); 
        const r = new FileReader(); 
        r.onload = (e) => { 
            const wb = XLSX.read(e.target.result, {type:'binary'});
            const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:['s','a']}); 
            onUpdate(json.map(x=>({sekoCode:String(x.s), aselCode:String(x.a)}))); 
            setProcessing(false); 
        }; 
        r.readAsBinaryString(file); 
    };
    if (!isOpen) return null; return (<div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4"><div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700"><h2 className="text-xl font-bold mb-4">Update Asel</h2><input type="file" onChange={e=>handleFile(e.target.files[0])} /><button onClick={onClose} className="mt-4 text-slate-400">Chiudi</button></div></div>);
};

// --- COMPONENTE PRODUCT MODAL CON IMPORTAZIONE DINAMICA PDF (CORRETTO) ---
const ProductModal = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [bom, setBom] = useState([]);
    const [fileError, setFileError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const cleanCode = (c) => String(c).replace(/^0+/, '').trim();
    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileError(null);
        setBom([]);
        setIsProcessing(true);
        if (file.type === 'application/pdf') {
            try {
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

                const fileUrl = URL.createObjectURL(file);
                const pdf = await pdfjsLib.getDocument(fileUrl).promise;
                let allItems = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageItems = textContent.items.map(item => ({ str: item.str, x: item.transform[4], y: item.transform[5], w: item.width }));
                    allItems = [...allItems, ...pageItems];
                }
                
                // Aumentata la tolleranza verticale a 10 per gestire disallineamenti leggeri
                const tolerance = 10; 
                const rows = [];
                allItems.sort((a, b) => b.y - a.y);
                if (allItems.length > 0) {
                    let currentRow = [allItems[0]];
                    let currentY = allItems[0].y;
                    for (let i = 1; i < allItems.length; i++) {
                        if (Math.abs(allItems[i].y - currentY) < tolerance) {
                            currentRow.push(allItems[i]);
                        } else {
                            rows.push(currentRow.sort((a, b) => a.x - b.x));
                            currentRow = [allItems[i]];
                            currentY = allItems[i].y;
                        }
                    }
                    rows.push(currentRow.sort((a, b) => a.x - b.x));
                }
                let codeColX = null;
                let qtyColX = null;
                let headerFound = false;
                
                // AGGIUNTO 'part code' e 'q.ty' alle parole chiave
                const codeKeywords = ['part code', 'codice', 'code', 'part number', 'articolo'];
                const qtyKeywords = ['q.ty', 'q.tà', 'q.ta', 'qta', 'qty', 'quantity', 'quantità'];
                
                for (const row of rows) {
                    const codeIdx = row.findIndex(item => codeKeywords.some(k => item.str.toLowerCase().includes(k)));
                    const qtyIdx = row.findIndex(item => qtyKeywords.some(k => item.str.toLowerCase().includes(k)));
                    if (codeIdx !== -1 && qtyIdx !== -1) {
                        codeColX = row[codeIdx].x;
                        qtyColX = row[qtyIdx].x;
                        headerFound = true;
                        break;
                    }
                }
                if (!headerFound) {
                    setFileError("Impossibile trovare le colonne 'Codice' e 'Quantità' nel PDF.");
                    setIsProcessing(false);
                    return;
                }
                const xTolerance = 20;
                const parsedBom = [];
                for (const row of rows) {
                    const codeItem = row.find(item => Math.abs(item.x - codeColX) < xTolerance);
                    const qtyItem = row.find(item => Math.abs(item.x - qtyColX) < xTolerance);
                    if (codeItem && qtyItem) {
                        const rawCode = codeItem.str.trim();
                        if (codeKeywords.some(k => rawCode.toLowerCase().includes(k))) continue;
                        const cleanedCode = cleanCode(rawCode);
                        const qtyStr = qtyItem.str.replace(',', '.').replace(/[^0-9.]/g, '');
                        const qty = parseFloat(qtyStr);
                        if (cleanedCode && qty > 0) {
                            parsedBom.push({ sekoCode: cleanedCode, quantity: qty });
                        }
                    }
                }
                if (parsedBom.length === 0) setFileError("Nessun componente valido estratto.");
                else setBom(parsedBom);
            } catch (err) {
                console.error(err);
                setFileError("Errore lettura PDF: " + err.message);
            }
            setIsProcessing(false);
            return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }); 
                const parsedBom = [];
                data.forEach((row, index) => {
                    if (index === 0 && isNaN(row[1])) return;
                    const compCode = String(row[0] || '').trim();
                    const qty = parseFloat(row[1]);
                    if (compCode && qty > 0) {
                        parsedBom.push({ sekoCode: cleanCode(compCode), quantity: qty });
                    }
                });
                if (parsedBom.length === 0) setFileError("Nessun componente valido trovato.");
                else setBom(parsedBom);
            } catch (err) { setFileError("Errore lettura file."); }
            setIsProcessing(false);
        };
        reader.readAsBinaryString(file);
    };
    const handleSubmit = () => { if (!name || !code || bom.length === 0) { alert("Compila tutti i campi."); return; } onSave({ name, code, bom }); setName(''); setCode(''); setBom([]); onClose(); };
    if (!isOpen) return null;
    return (<div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 backdrop-blur-sm"><div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg"><header className="p-5 border-b border-slate-800 flex justify-between"><h2 className="text-xl font-bold text-white">Nuovo Prodotto (BOM)</h2><button onClick={onClose} className="text-slate-500 hover:text-white"><XIcon /></button></header><div className="p-6 space-y-4"><InputField label="Nome Prodotto" name="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Scheda Madre V1" required /><InputField label="Codice Prodotto" name="pcode" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Es. PRD-001" required /><div><label className="block text-sm font-medium text-slate-400 mb-1">Carica BOM (Excel, CSV o PDF)</label><div className="relative border border-slate-700 bg-slate-800/50 rounded-md p-4 text-center hover:bg-slate-800 transition-colors"><input type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={handleFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/><div className="flex flex-col items-center">{isProcessing ? <SpinnerIcon className="animate-spin text-electric-blue w-8 h-8"/> : <div className="flex gap-2"><FileExcelIcon /><FilePdfIcon /></div>}<p className="text-sm text-slate-300 mt-2">{isProcessing ? "Analisi PDF in corso..." : "Trascina file o clicca"}</p></div></div><p className="text-xs text-slate-500 mt-2"><strong>Excel:</strong> Col A: Codice, Col B: Qta.<br/><strong>PDF:</strong> Rilevamento automatico colonne.<br/><span className="text-electric-blue">Nota: Zeri iniziali rimossi.</span></p>{fileError && <p className="text-red-400 text-sm mt-1 bg-red-500/10 p-2 rounded border border-red-500/20">{fileError}</p>}{bom.length > 0 && !isProcessing && <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded"><p className="text-green-400 text-sm font-bold">BOM caricata!</p><p className="text-green-300 text-xs">{bom.length} componenti.</p></div>}</div></div><footer className="p-4 border-t border-slate-800 flex justify-end"><button onClick={handleSubmit} disabled={bom.length === 0 || isProcessing} className="bg-electric-blue text-white font-bold py-2 px-4 rounded-lg hover:bg-electric-blue/90 disabled:bg-slate-700 disabled:text-slate-500 transition-all">Salva Prodotto</button></footer></div></div>);
};

// --- VISTA FORECAST ---
const ForecastView = ({ products, components, onAddProduct }) => {
    const [plan, setPlan] = useState([{ productId: '', quantity: 0 }]); const [results, setResults] = useState(null);
    const handlePlanChange = (index, field, value) => { const newPlan = [...plan]; newPlan[index][field] = value; setPlan(newPlan); };
    const calculateForecast = () => { const agg = {}; plan.forEach(item => { const p = products.find(x=>x.id===item.productId); const q = parseFloat(item.quantity); if(p && q>0) { p.bom.forEach(c => { if(!agg[c.sekoCode]) agg[c.sekoCode]={t:0, b:[]}; const n = c.quantity * q; agg[c.sekoCode].t+=n; agg[c.sekoCode].b.push({p:p.name, pq:q, qpu:c.quantity, tot:n}); }); } }); setResults(Object.keys(agg).map(code => ({ code, desc: components.find(c=>c.sekoCode===code)?.description||'N/D', tot: agg[code].t, b: agg[code].b }))); };
    const exportForecast = () => { if(!results) return; XLSX.writeFile(XLSX.utils.book_newWithSheets({"Forecast": XLSX.utils.json_to_sheet(results.map(r=>({'Codice':r.code, 'Desc':r.desc, 'Tot':r.tot, 'Dettaglio':r.b.map(x=>`${x.p}(${x.tot})`).join('; ')})))}), 'forecast.xlsx'); };
    return (<div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><div className="lg:col-span-1 space-y-6"><div className="bg-slate-900/50 border border-slate-800/50 p-6 rounded-xl"><div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold text-slate-200">Prodotti / BOM</h2><button onClick={() => onAddProduct(true)} className="text-xs bg-electric-blue px-2 py-1 rounded text-white">+ Nuovo</button></div><div className="max-h-60 overflow-y-auto space-y-2">{products.map(p => (<div key={p.id} className="p-3 bg-slate-800/50 rounded border border-slate-700/50 flex justify-between"><div><p className="font-bold text-slate-200 text-sm">{p.name}</p><p className="text-xs text-slate-400">{p.code}</p></div><span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">{p.bom.length} comp.</span></div>))}</div></div><div className="bg-slate-900/50 border border-slate-800/50 p-6 rounded-xl"><h2 className="text-lg font-bold text-slate-200 mb-4">Piano Produzione</h2>{plan.map((row, idx) => (<div key={idx} className="flex gap-2 items-end mb-2"><div className="flex-grow"><label className="text-xs text-slate-400">Prodotto</label><select className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" value={row.productId} onChange={(e) => handlePlanChange(idx, 'productId', e.target.value)}><option value="">Select...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div className="w-24"><label className="text-xs text-slate-400">Qty</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" value={row.quantity} onChange={(e) => handlePlanChange(idx, 'quantity', e.target.value)} /></div>{plan.length>1 && <button onClick={()=>setPlan(plan.filter((_,i)=>i!==idx))} className="text-red-400 p-2"><XIcon/></button>}</div>))}<button onClick={()=>setPlan([...plan,{productId:'',quantity:0}])} className="text-xs text-electric-blue">+ Riga</button><button onClick={calculateForecast} className="w-full mt-6 bg-electric-blue text-white font-bold py-2 rounded shadow-lg hover:bg-electric-blue/90">Calcola</button></div></div><div className="lg:col-span-2 bg-slate-900/50 border border-slate-800/50 p-6 rounded-xl flex flex-col min-h-[500px]"><div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold text-slate-200">Risultato</h2>{results && <button onClick={exportForecast} className="text-green-400 border border-green-500/30 px-3 py-1 rounded text-sm">Export Excel</button>}</div>{!results ? <div className="flex-grow flex items-center justify-center text-slate-500"><p>Imposta piano e calcola.</p></div> : <div className="overflow-x-auto"><table className="w-full text-sm text-left text-slate-300"><thead className="text-xs text-slate-400 bg-slate-800/50"><tr><th className="p-3">Codice</th><th className="p-3">Desc</th><th className="p-3 text-center">Totale</th><th className="p-3">Dettagli</th></tr></thead><tbody className="divide-y divide-slate-800">{results.map((r, i) => (<tr key={i} className="hover:bg-slate-800/30"><td className="p-3 font-mono text-electric-blue">{r.code}</td><td className="p-3 truncate max-w-xs">{r.desc}</td><td className="p-3 text-center font-bold text-white">{r.tot}</td><td className="p-3 text-xs text-slate-400">{r.b.map((b,bi)=><div key={bi}>{b.p}: {b.tot}</div>)}</td></tr>))}</tbody></table></div>}</div></div>);
};

// --- TABLE COMPONENTI ---
const ComponentTable = ({ components, onEdit, onDelete }) => {
  if (components.length === 0) return <div className="text-center p-12 bg-slate-900/50 border border-slate-800/50 rounded-lg shadow-md"><h2 className="text-xl text-slate-400">Nessun componente trovato.</h2></div>;
  return (
    <div className="bg-slate-500/5 dark:bg-slate-900/50 border border-slate-300/10 dark:border-slate-800/50 rounded-xl overflow-hidden shadow-2xl shadow-slate-950/50">
      <div className="overflow-x-auto"><table className="w-full text-sm text-left text-slate-600 dark:text-slate-300"><thead className="text-xs text-slate-700 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/80"><tr><th scope="col" className="px-6 py-4 font-medium tracking-wider">Codici</th><th scope="col" className="px-6 py-4 font-medium tracking-wider">Descrizione</th><th scope="col" className="px-6 py-4 font-medium tracking-wider text-center">Fornitori</th><th scope="col" className="px-6 py-4 font-medium tracking-wider text-right">Azioni</th></tr></thead><tbody className="divide-y divide-slate-200/5 dark:divide-slate-800/80">{components.map((component) => (<tr key={component.id} className="hover:bg-slate-400/5 dark:hover:bg-slate-800/70 transition-colors duration-200 group"><td className="px-6 py-4 whitespace-nowrap"><span className="font-mono text-electric-blue">{component.sekoCode}</span>{component.aselCode && <span className="font-sans text-green-400 ml-2">({component.aselCode})</span>}</td><td className="px-6 py-4 max-w-xs truncate" title={component.description}>{component.description}</td><td className="px-6 py-4 text-center"><span className="bg-electric-blue/10 text-electric-blue-light text-xs font-bold px-3 py-1 rounded-full border border-electric-blue/20">{component.suppliers.length}</span></td><td className="px-6 py-4 text-right"><div className="flex justify-end items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity"><button onClick={() => onEdit(component)} className="p-2 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-electric-blue transition-colors"><EditIcon /></button><button onClick={() => onDelete(component.id)} className="p-2 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-red-500 transition-colors"><TrashIcon /></button></div></td></tr>))}</tbody></table></div>
    </div>
  );
};

// --- DASHBOARD (REINSERITA!) ---
const Dashboard = ({ components }) => {
    const stats = useMemo(() => {
        const totalComponents = components.length;
        const suppliers = new Set(components.flatMap(c => c.suppliers.map(s => s.name)));
        const totalSuppliers = suppliers.size;
        const bestPriceSuppliers = {};
        components.forEach(c => { if (c.suppliers && c.suppliers.length > 0) { const bestSupplier = c.suppliers.reduce((min, s) => s.cost < min.cost ? s : min, c.suppliers[0]); bestPriceSuppliers[bestSupplier.name] = (bestPriceSuppliers[bestSupplier.name] || 0) + 1; } });
        const sortedBestSuppliers = Object.entries(bestPriceSuppliers).sort(([, a], [, b]) => b - a).slice(0, 5);
        return { totalComponents, totalSuppliers, sortedBestSuppliers };
    }, [components]);

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-900/50 border border-slate-800/50 p-6 rounded-xl"><h2 className="text-sm font-medium text-slate-400">Componenti Totali</h2><p className="text-4xl font-bold text-electric-blue mt-2">{stats.totalComponents}</p></div>
                <div className="bg-slate-900/50 border border-slate-800/50 p-6 rounded-xl"><h2 className="text-sm font-medium text-slate-400">Fornitori Unici</h2><p className="text-4xl font-bold text-electric-blue mt-2">{stats.totalSuppliers}</p></div>
            </div>
             <div className="bg-slate-900/50 border border-slate-800/50 p-6 rounded-xl"><h2 className="text-lg font-semibold text-slate-200 mb-4">Top Fornitori per Miglior Prezzo</h2>{stats.sortedBestSuppliers.length > 0 ? (<ul className="space-y-3">{stats.sortedBestSuppliers.map(([name, count], index) => (<li key={name} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg"><div className="flex items-center gap-4"><span className="text-sm font-bold text-slate-500 w-6 text-center">{index + 1}</span><p className="font-semibold text-slate-100">{name}</p></div><p className="text-sm text-electric-blue font-semibold bg-electric-blue/10 px-3 py-1 rounded-full">{count}</p></li>))}</ul>) : (<p className="text-slate-500 text-center py-4">Nessun dato sui prezzi disponibile.</p>)}</div>
        </div>
    );
};

// --- COMPONENTS VIEW ---
const ComponentsView = ({ components, onEdit, onDelete, onOpenModal, onOpenBomModal, onOpenCsvModal, onOpenAselUpdateModal, filteredComponents, searchQuery, setSearchQuery, handleExportView }) => (
    <div>
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-700 dark:text-slate-200 tracking-tight">Componenti Elettronici</h1>
            <div className="flex items-center gap-2 flex-wrap">
                <button onClick={onOpenAselUpdateModal} className="flex items-center gap-2 bg-orange-500/10 text-orange-400 font-semibold py-2 px-4 rounded-lg border border-orange-500/30 hover:bg-orange-500/20">Aggiorna Asel da CSV</button>
                <button onClick={onOpenCsvModal} className="flex items-center gap-2 bg-purple-500/10 text-purple-400 font-semibold py-2 px-4 rounded-lg border border-purple-500/30 hover:bg-purple-500/20">Importa Nuovi</button>
                <button onClick={onOpenBomModal} className="flex items-center gap-2 bg-green-500/10 text-green-400 font-semibold py-2 px-4 rounded-lg border border-green-500/30 hover:bg-green-500/20">Quota BOM</button>
                <button onClick={() => onOpenModal(null)} className="flex items-center gap-2 bg-electric-blue text-white font-bold py-2 px-5 rounded-lg shadow-lg shadow-electric-blue/20 hover:bg-electric-blue/90"><PlusIcon /> Aggiungi</button>
            </div>
        </div>
        
        <div className="mb-8 flex flex-wrap gap-4 items-center">
            <div className="relative flex-grow"><span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500"><SearchIcon /></span><input type="text" placeholder="Cerca..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800/50 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-electric-blue" /></div>
             <button onClick={handleExportView} className="flex items-center gap-2 bg-blue-500/10 text-blue-400 font-semibold py-2 px-4 rounded-lg border border-blue-500/30 hover:bg-blue-500/20"><FileExcelIcon /> Esporta Vista</button>
        </div>
        <ComponentTable components={filteredComponents} onEdit={onEdit} onDelete={onDelete} />
    </div>
);


// --- HEADER & APP MAIN ---
const Header = ({ theme, toggleTheme, user, onLogout }) => ( <header className="sticky top-0 z-40 bg-slate-100/80 dark:bg-slate-950/75 backdrop-blur-lg border-b border-slate-300/10 dark:border-slate-500/30 transition-colors"><div className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center"><h1 className="text-2xl font-bold text-electric-blue dark:text-electric-blue tracking-wider">GESTIONALE</h1><div className="flex items-center gap-4">{user && (<div className="flex items-center gap-2"><span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">{user.email}</span><button onClick={onLogout} className="text-sm bg-slate-200/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold py-1.5 px-3 rounded-md hover:bg-slate-300 dark:hover:bg-slate-700/80 transition-colors">Logout</button></div>)}<button onClick={toggleTheme} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/50 transition-colors">{theme === 'light' ? <MoonIcon /> : <SunIcon />}</button></div></div></header>);

const App = () => {
    const [user, setUser] = useState(null); const [authReady, setAuthReady] = useState(false); const [loginError, setLoginError] = useState(null); const [configError, setConfigError] = useState(null);
    const [components, setComponents] = useState([]); const [products, setProducts] = useState([]); const [loading, setLoading] = useState(true); const [dbError, setDbError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false); const [isBomModalOpen, setIsBomModalOpen] = useState(false); const [isCsvModalOpen, setIsCsvModalOpen] = useState(false); const [isAselUpdateModalOpen, setIsAselUpdateModalOpen] = useState(false); const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingComponent, setEditingComponent] = useState(null); const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark'); const [searchQuery, setSearchQuery] = useState(''); const [currentView, setCurrentView] = useState('dashboard');

    useEffect(() => {
        if (!checkFirebaseConfig(firebaseConfig)) { setConfigError("Configurazione Firebase mancante."); return; }
        try { const app = initializeApp(firebaseConfig); const auth = getAuth(app); const db = getFirestore(app);
            setPersistence(auth, browserLocalPersistence).then(() => {
                const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
                    setUser(currentUser); setAuthReady(true);
                    if (currentUser) { setLoading(true);
                       const unsubComp = onSnapshot(collection(db, 'components'), (snap) => { setComponents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setLoading(false); }, (err) => { console.error(err); setDbError("Err Comp."); setLoading(false); });
                       const unsubProd = onSnapshot(collection(db, 'products'), (snap) => { setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });
                       return () => { unsubComp(); unsubProd(); };
                    } else { setComponents([]); setProducts([]); setLoading(false); }
                }); return () => unsubscribeAuth();
            }).catch(console.error);
        } catch (error) { console.error(error); setConfigError("Errore Init."); }
    }, []);
    useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('theme', theme); }, [theme]);
    const filteredComponents = useMemo(() => { if (!searchQuery) return components; const q = searchQuery.toLowerCase(); return components.filter(c => (c.sekoCode||'').toLowerCase().includes(q) || (c.description||'').toLowerCase().includes(q) || (c.aselCode||'').toLowerCase().includes(q) || c.suppliers.some(s => (s.name||'').toLowerCase().includes(q))); }, [components, searchQuery]);
    const handleLogin = async (e, p) => { setLoginError(null); try { await signInWithEmailAndPassword(getAuth(), e, p); } catch { setLoginError("Credenziali non valide."); } };
    const handleLogout = async () => await signOut(getAuth());
    const addLogEntry = (obj, action, details, note) => { if (!user) return obj; const newLog = { id: `log_${Date.now()}`, timestamp: Timestamp.now().toDate().toISOString(), userId: user.uid, username: user.email, action, details, note }; return { ...obj, logs: [newLog, ...(obj.logs || [])] }; };
    const handleSaveComponent = useCallback(async (data, note) => { if (!user) return; const db = getFirestore(); try { if (data.id) { const orig = components.find(c => c.id === data.id); const wLog = addLogEntry(orig, 'Modifica', 'Componente modificato.', note); const final = { ...data, logs: wLog.logs }; delete final.id; await setDoc(doc(db, "components", data.id), final); } else { const wLog = addLogEntry(data, 'Creazione', 'Componente creato.', note); delete wLog.id; await addDoc(collection(db, "components"), wLog); } setIsModalOpen(false); setEditingComponent(null); } catch (err) { alert("Errore salvataggio."); } }, [user, components]);
    const handleDeleteComponent = useCallback(async (id) => { if (window.confirm('Eliminare?')) await deleteDoc(doc(getFirestore(), "components", id)); }, []);
    const handleCsvImport = useCallback(async (list) => { if (!user) return; const db = getFirestore(); const batch = writeBatch(db); list.forEach(c => { const wl = addLogEntry(c, 'Import CSV', 'Creato.', 'Massiva'); const ref = doc(collection(db, 'components')); batch.set(ref, wl); }); try { await batch.commit(); alert("Import completato."); setIsCsvModalOpen(false); } catch (e) { alert(e.message); } }, [user]);
    const handleAselUpdate = useCallback(async (updates) => { if (!user) return; const db = getFirestore(); const batch = writeBatch(db); const map = new Map(components.map(c => [c.sekoCode, c])); updates.forEach(u => { const exist = map.get(u.sekoCode); if (exist && exist.aselCode !== u.aselCode) { const wl = addLogEntry(exist, 'Update Asel', `Da ${exist.aselCode} a ${u.aselCode}`, 'CSV Update'); batch.update(doc(db, "components", exist.id), { aselCode: u.aselCode, logs: wl.logs }); } }); try { await batch.commit(); alert("Aggiornamento completato."); setIsAselUpdateModalOpen(false); } catch(e) { alert(e.message); } }, [user, components]);
    const handleSaveProduct = useCallback(async (productData) => { if (!user) return; const db = getFirestore(); try { await addDoc(collection(db, "products"), { ...productData, createdAt: Timestamp.now().toDate().toISOString(), createdBy: user.email }); alert("Prodotto salvato."); } catch (e) { console.error(e); alert("Errore salvataggio."); } }, [user]);
    const handleExportView = useCallback(() => { const data = filteredComponents.flatMap(c => (c.suppliers.length ? c.suppliers : [{}]).map(s => ({ 'Codice': c.sekoCode, 'Descrizione': c.description, 'Fornitore': s.name||'N/D', 'Costo': s.cost||0 }))); XLSX.writeFile(XLSX.utils.book_newWithSheets({ "Vista": XLSX.utils.json_to_sheet(data) }), 'export.xlsx'); }, [filteredComponents]);
    const toggleTheme = () => setTheme(p => p === 'light' ? 'dark' : 'light');
    if (configError) return <ErrorScreen title="Config Error" message={configError} />; if (!authReady) return <LoadingScreen message="Auth..." />; if (!user) return <LoginPage onLogin={handleLogin} error={loginError} />;
    return (<div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-gray-800 dark:text-slate-200"><Header theme={theme} toggleTheme={toggleTheme} user={user} onLogout={handleLogout} /><main className="container mx-auto p-4 md:p-8"><div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-4 overflow-x-auto"><button onClick={() => setCurrentView('dashboard')} className={`flex items-center gap-2 font-semibold py-2 px-4 rounded-lg whitespace-nowrap transition-colors ${currentView === 'dashboard' ? 'bg-electric-blue text-white' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700'}`}><ChartBarIcon /> Dashboard</button><button onClick={() => setCurrentView('components')} className={`flex items-center gap-2 font-semibold py-2 px-4 rounded-lg whitespace-nowrap transition-colors ${currentView === 'components' ? 'bg-electric-blue text-white' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700'}`}><DocumentDuplicateIcon /> Componenti</button><button onClick={() => setCurrentView('forecast')} className={`flex items-center gap-2 font-semibold py-2 px-4 rounded-lg whitespace-nowrap transition-colors ${currentView === 'forecast' ? 'bg-electric-blue text-white' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700'}`}><CalculatorIcon /> Forecast & BOM</button></div>{loading ? <LoadingScreen message="Loading..." /> : dbError ? <ErrorScreen title="DB Error" message={dbError} /> : (<>{currentView === 'dashboard' && <Dashboard components={components} />}{currentView === 'components' && <ComponentsView components={components} onEdit={(c) => {setEditingComponent(c); setIsModalOpen(true);}} onDelete={handleDeleteComponent} onOpenModal={() => {setEditingComponent(null); setIsModalOpen(true);}} onOpenBomModal={() => setIsBomModalOpen(true)} onOpenCsvModal={() => setIsCsvModalOpen(true)} onOpenAselUpdateModal={() => setIsAselUpdateModalOpen(true)} filteredComponents={filteredComponents} searchQuery={searchQuery} setSearchQuery={setSearchQuery} handleExportView={handleExportView} />}{currentView === 'forecast' && <ForecastView products={products} components={components} onAddProduct={() => setIsProductModalOpen(true)} />}</>)}</main>{isModalOpen && <ComponentModal component={editingComponent} onClose={() => setIsModalOpen(false)} onSave={handleSaveComponent} />}{isBomModalOpen && <BomQuoteModal isOpen={isBomModalOpen} onClose={() => setIsBomModalOpen(false)} components={components} />}{isCsvModalOpen && <CsvImportModal isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} onImport={handleCsvImport} />}{isAselUpdateModalOpen && <AselUpdateModal isOpen={isAselUpdateModalOpen} onClose={() => setIsAselUpdateModalOpen(false)} onUpdate={handleAselUpdate} />}{isProductModalOpen && <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSave={handleSaveProduct} />}</div>);
};
export default App;
