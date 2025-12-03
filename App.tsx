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

const checkFirebaseConfig = (config: any) => {
    return Object.values(config).every(value => value && typeof value === 'string' && value.length > 0);
};

// --- COMPONENTI ICONE ---
const Icon = ({ children, className }: any) => (
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
const SpinnerIcon = ({ className }: any) => <Icon className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3m16.95 6.95l-2.12-2.12M7.05 7.05L4.93 4.93m14.14 0l-2.12 2.12M7.05 16.95l-2.12 2.12" /></Icon>;
const AlertTriangleIcon = () => <Icon className="w-12 h-12 text-red-500 mx-auto"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></Icon>;
const ChartBarIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></Icon>;
const DocumentDuplicateIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></Icon>;
const CalculatorIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></Icon>;
const FilePdfIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></Icon>;

// --- UI HELPERS ---
const LoadingScreen = ({ message }: any) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <h1 className="text-3xl font-bold text-center text-electric-blue mb-4 tracking-wider">GESTIONALE COMPONENTI</h1>
        <SpinnerIcon className="w-10 h-10 text-electric-blue animate-spin" />
        <p className="mt-4 text-slate-400">{message}</p>
    </div>
);

const ErrorScreen = ({ title, message, details }: any) => (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-lg bg-slate-900 border border-red-500/30 rounded-xl shadow-2xl p-8 text-center">
            <AlertTriangleIcon />
            <h2 className="mt-4 text-2xl font-bold text-red-400">{title}</h2>
            <p className="mt-2 text-slate-300">{message}</p>
            {details && <pre className="mt-4 text-left bg-slate-800/50 p-3 rounded-md text-xs text-slate-400 overflow-x-auto"><code>{details}</code></pre>}
        </div>
    </div>
);

const InputField = ({ label, name, value, onChange, required, type = "text", readOnly = false, placeholder = '', step = null }: any) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
        <input 
            type={type} name={name} id={name} value={value} onChange={onChange} required={required} readOnly={readOnly} placeholder={placeholder} step={step}
            className={`w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:ring-1 focus:ring-electric-blue focus:border-electric-blue transition-colors ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
        />
    </div>
);

const LoginPage = ({ onLogin, error }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(email, password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-electric-blue mb-8 tracking-wider">GESTIONALE COMPONENTI</h1>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div><label className="block text-sm font-medium text-slate-400 mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:ring-1 focus:ring-electric-blue text-slate-200" /></div>
            <div><label className="block text-sm font-medium text-slate-400 mb-1">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:ring-1 focus:ring-electric-blue text-slate-200" /></div>
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <div><button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-electric-blue hover:bg-electric-blue/90 disabled:bg-slate-600">{loading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : 'Accedi'}</button></div>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- MODALI ---
const ComponentModal = ({ component, onClose, onSave }: any) => {
    const [formData, setFormData] = useState<any>({ sekoCode: '', aselCode: '', description: '', suppliers: [], logs: [] });
    const [lfWmsCode, setLfWmsCode] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [note, setNote] = useState('');
    const [supplierForm, setSupplierForm] = useState<any>({ name: '', partNumber: '', cost: 0, leadTime: '', packaging: '' });
    const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('details');
  
    useEffect(() => {
      if (component) {
        setFormData({
          sekoCode: component.sekoCode || '',
          aselCode: component.aselCode || '',
          description: component.description || '',
          suppliers: component.suppliers ? [...component.suppliers] : [],
          logs: component.logs ? [...component.logs].sort((a:any,b:any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : []
        });
        setLfWmsCode(component.lfWmsCode || '');
      } else {
        setFormData({ sekoCode: '', aselCode: '', description: '', suppliers: [], logs: [] });
        setLfWmsCode('');
      }
    }, [component]);

    useEffect(() => { setLfWmsCode(formData.sekoCode ? `AS${formData.sekoCode}` : ''); }, [formData.sekoCode]);

    const handleInputChange = (e: any) => setFormData((prev:any) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSupplierFormChange = (e: any) => setSupplierForm((prev:any) => ({ ...prev, [e.target.name]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }));
    
    const resetSupplierForm = () => {
      setEditingSupplierId(null);
      setSupplierForm({ name: '', partNumber: '', cost: 0, leadTime: '', packaging: '' });
    };
    
    const handleAddOrUpdateSupplier = () => {
      if (!supplierForm.name || !supplierForm.partNumber) { alert("Nome fornitore e Part number sono obbligatori."); return; }
      if (editingSupplierId) {
        setFormData((prev:any) => ({ ...prev, suppliers: prev.suppliers.map((s:any) => s.id === editingSupplierId ? { ...supplierForm, id: editingSupplierId } : s) }));
      } else {
        setFormData((prev:any) => ({ ...prev, suppliers: [...prev.suppliers, { id: `s_${Date.now()}`, ...supplierForm }] }));
      }
      resetSupplierForm();
    };
  
    const handleEditSupplier = (supplier: any) => {
      setActiveTab('details');
      setEditingSupplierId(supplier.id);
      setSupplierForm({ name: supplier.name, partNumber: supplier.partNumber, cost: supplier.cost, leadTime: supplier.leadTime, packaging: supplier.packaging });
    };
    
    const handleRemoveSupplier = (supplierId: string) => {
      if (editingSupplierId === supplierId) resetSupplierForm();
      setFormData((prev:any) => ({ ...prev, suppliers: prev.suppliers.filter((s:any) => s.id !== supplierId) }));
    };
  
    const handleConfirmSave = async () => {
      if (note.trim() === '') { alert('La nota è obbligatoria per salvare le modifiche.'); return; }
      const componentToSave = { id: component?.id, ...formData, lfWmsCode, };
      await onSave(componentToSave, note);
      setIsConfirmModalOpen(false);
      setNote('');
    };
  
    return (
      <>
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <header className="flex justify-between items-center p-5 border-b border-slate-800">
              <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-slate-100">{component ? 'Modifica Componente' : 'Nuovo Componente'}</h2>
                  {component && (
                      <div className="flex items-center text-sm border border-slate-700 rounded-lg p-0.5 bg-slate-800/50">
                          <button onClick={() => setActiveTab('details')} className={`px-3 py-1 rounded-md transition-colors ${activeTab === 'details' ? 'bg-electric-blue text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>Dettagli</button>
                          <button onClick={() => setActiveTab('logs')} className={`px-3 py-1 rounded-md transition-colors ${activeTab === 'logs' ? 'bg-electric-blue text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>Log Modifiche</button>
                      </div>
                  )}
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-100 transition-colors"><XIcon /></button>
            </header>
            
            <div className="flex-grow overflow-y-auto">
                {activeTab === 'details' ? (
                    <>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label htmlFor="description" className="block text-sm font-medium text-slate-400 mb-1">Descrizione</label>
                            <textarea name="description" value={formData.description} onChange={handleInputChange} rows={2} required className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:ring-1 focus:ring-electric-blue focus:border-electric-blue transition-colors"/>
                        </div>
                        <InputField label="Codice Seko" name="sekoCode" value={formData.sekoCode} onChange={handleInputChange} required />
                        <InputField label="Codice Asel" name="aselCode" value={formData.aselCode} onChange={handleInputChange} />
                        <InputField label="Codice LF_WMS (Auto-generato)" name="lfWmsCode" value={lfWmsCode} readOnly />
                    </div>
                    <div className="p-6 border-t border-slate-800">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">{editingSupplierId ? 'Modifica Fornitore' : 'Aggiungi Fornitore'}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-800/40 rounded-lg border border-slate-700/80 mb-6">
                            <InputField label="Nome Fornitore" name="name" placeholder="Es. Mouser" value={supplierForm.name} onChange={handleSupplierFormChange} />
                            <InputField label="Part Number" name="partNumber" placeholder="Codice del fornitore" value={supplierForm.partNumber} onChange={handleSupplierFormChange} />
                            <InputField label="Confezione" name="packaging" placeholder="Es. Bobina" value={supplierForm.packaging} onChange={handleSupplierFormChange} />
                            <div>
                                <label className="text-xs font-medium text-slate-400">Costo</label>
                                <div className="relative"><span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">€</span><input type="number" name="cost" placeholder="0.00000" value={supplierForm.cost} onChange={handleSupplierFormChange} step="0.00001" className="w-full mt-1 pl-7 pr-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-electric-blue focus:border-electric-blue"/></div>
                            </div>
                            <div className="lg:col-span-2 flex items-end gap-2">
                                <div className="w-full">
                                   <InputField label="Lead Time" name="leadTime" placeholder="Es. 10 giorni / STOCK" value={supplierForm.leadTime} onChange={handleSupplierFormChange} />
                                </div>
                                {editingSupplierId && (<button type="button" onClick={resetSupplierForm} className="bg-slate-600 text-white rounded-md p-2 hover:bg-slate-500 transition shadow-sm h-10 w-10 flex items-center justify-center self-end flex-shrink-0" title="Annulla Modifica"><XIcon /></button>)}
                                <button type="button" onClick={handleAddOrUpdateSupplier} className="bg-electric-blue text-white rounded-md p-2 hover:bg-electric-blue/90 transition shadow-sm h-10 w-10 flex items-center justify-center self-end flex-shrink-0" title={editingSupplierId ? "Salva Modifiche" : "Aggiungi Fornitore"}>
                                    {editingSupplierId ? <SaveIcon /> : <PlusIcon />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {formData.suppliers.map((sup:any) => (
                                <div key={sup.id} className={`flex flex-wrap items-center justify-between p-3 bg-slate-800/70 border rounded-lg shadow-sm gap-4 transition-colors ${editingSupplierId === sup.id ? 'border-electric-blue/80' : 'border-slate-700/50'}`}>
                                    <div className="flex-1 min-w-[200px]"><p className="font-semibold text-slate-100">{sup.name}</p><p className="text-slate-400 font-mono text-sm">{sup.partNumber}</p><p className="text-slate-500 text-xs mt-1">Confezione: {sup.packaging || 'N/D'}</p></div>
                                    <div className="flex items-center gap-4 text-sm text-right"><p className="text-slate-200 font-medium">{sup.cost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 5, maximumFractionDigits: 5 })}</p><p className="text-slate-300 bg-slate-700/50 px-2 py-1 rounded-md">{sup.leadTime}</p>
                                        <div className="flex items-center gap-1">
                                            <button type="button" onClick={() => handleEditSupplier(sup)} className="text-slate-400/70 hover:text-electric-blue p-1 rounded-full hover:bg-electric-blue/10 transition-colors"><EditIcon /></button>
                                            <button type="button" onClick={() => handleRemoveSupplier(sup.id)} className="text-red-500/70 hover:text-red-500 p-1 rounded-full hover:bg-red-500/10 transition-colors"><TrashIcon /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {formData.suppliers.length === 0 && <p className="text-center text-slate-500 py-6">Nessun fornitore aggiunto.</p>}
                        </div>
                    </div>
                    </>
                ) : (
                    <div className="p-6 space-y-4">
                      {(formData.logs && formData.logs.length > 0) ? formData.logs.map((log:any) => (
                        <div key={log.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                          <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                            <span className="font-semibold text-electric-blue">{log.username}</span>
                            <span>{new Date(log.timestamp).toLocaleString('it-IT')}</span>
                          </div>
                          <p className="text-sm text-slate-200 mb-1"><span className="font-semibold">Azione:</span> {log.action}</p>
                          <p className="text-sm text-slate-300 whitespace-pre-wrap"><span className="font-semibold">Dettagli:</span> {log.details}</p>
                          <p className="text-sm text-slate-300 mt-2 pt-2 border-t border-slate-700/50"><span className="font-semibold">Nota:</span> <em className="text-slate-400">"{log.note}"</em></p>
                        </div>
                      )) : <p className="text-center text-slate-500 py-10">Nessuna modifica registrata.</p>}
                    </div>
                )}
            </div>
  
            <footer className="flex justify-end items-center p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-xl">
              <button type="button" onClick={onClose} className="bg-slate-700/50 text-slate-300 font-semibold py-2 px-4 rounded-lg mr-2 hover:bg-slate-700/80 transition">Annulla</button>
              <button type="button" onClick={() => setIsConfirmModalOpen(true)} className="flex items-center gap-2 bg-electric-blue text-white font-bold py-2 px-5 rounded-lg shadow-lg shadow-electric-blue/20 hover:bg-electric-blue/90 hover:shadow-electric-blue/40 transition-all duration-300"><SaveIcon /> Salva Componente</button>
            </footer>
          </div>
        </div>
        {isConfirmModalOpen && (
            <div className="fixed inset-0 bg-black/80 z-[60] flex justify-center items-center p-4">
                 <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md">
                     <header className="p-4 border-b border-slate-800"><h3 className="text-lg font-bold text-slate-100">Conferma Modifica</h3></header>
                     <div className="p-6">
                          <label htmlFor="note" className="block text-sm font-medium text-slate-300 mb-2">Aggiungi una nota per questa modifica (obbligatoria):</label>
                          <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Es. Aggiornamento listino Q3..." className="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-md focus:ring-1 focus:ring-electric-blue focus:border-electric-blue" />
                     </div>
                     <footer className="flex justify-end p-4 bg-slate-900/50 rounded-b-xl">
                          <button onClick={() => setIsConfirmModalOpen(false)} className="bg-slate-700/50 text-slate-300 font-semibold py-2 px-4 rounded-lg mr-2 hover:bg-slate-700/80 transition">Annulla</button>
                          <button onClick={handleConfirmSave} className="bg-electric-blue text-white font-bold py-2 px-4 rounded-lg hover:bg-electric-blue/90 transition">Conferma e Salva</button>
                     </footer>
                 </div>
            </div>
        )}
      </>
    );
  };

const BomQuoteModal = ({ isOpen, onClose, components }: any) => { 
    const [sekoCodes, setSekoCodes] = useState('');
    const [quoteResults, setQuoteResults] = useState<any[]>([]);
    const [searched, setSearched] = useState(false);

    const handleSearch = () => {
        const codes = sekoCodes.split(/\r?\n/).map(code => code.trim()).filter(code => code);
        const results = codes.map(code => {
            const foundComponent = components.find((c:any) => c.sekoCode === code);
            if (foundComponent) {
                return { inputSeko: code, status: 'Trovato', component: foundComponent };
            }
            return { inputSeko: code, status: 'Non Trovato' };
        });
        setQuoteResults(results);
        setSearched(true);
    };
    
    const handleExport = () => {
        const dataToExport = quoteResults.map(res => {
            if (res.status === 'Trovato' && res.component.suppliers && res.component.suppliers.length > 0) {
                const bestSupplier = res.component.suppliers.reduce((best:any, current:any) => {
                    return current.cost < best.cost ? current : best;
                }, res.component.suppliers[0]);

                return {
                    'Codice Seko (Input)': res.inputSeko,
                    'Codice Asel': res.component.aselCode || '',
                    'Stato': res.status,
                    'Descrizione': res.component.description,
                    'Fornitore': bestSupplier.name,
                    'Part Number Fornitore': bestSupplier.partNumber,
                    'Confezione': bestSupplier.packaging || '',
                    'Costo (€)': bestSupplier.cost,
                    'Lead Time': bestSupplier.leadTime,
                };
            }
            return {
                'Codice Seko (Input)': res.inputSeko,
                'Codice Asel': res.component?.aselCode || '',
                'Stato': res.status === 'Trovato' ? 'Senza Fornitori' : 'Non Trovato',
                'Descrizione': res.component?.description || '-',
                'Fornitore': '-', 'Part Number Fornitore': '-', 'Confezione': '-', 'Costo (€)': '-', 'Lead Time': '-',
            };
        });
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Quotazione BOM Migliore');
        XLSX.writeFile(workbook, 'quotazione_bom_migliore.xlsx');
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-5 border-b border-slate-800"><h2 className="text-xl font-bold text-slate-100">Quotazione Distinta Base (BOM)</h2><button onClick={onClose} className="text-slate-500 hover:text-slate-100"><XIcon /></button></header>
                <div className="p-6 flex-grow overflow-y-auto space-y-6">
                     {/* ISTRUZIONI AGGIUNTE */}
                     <div className="mb-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 text-sm text-slate-300">
                        <p className="font-semibold text-electric-blue mb-1">Istruzioni:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Incolla i codici <strong>Seko</strong> nella casella sottostante.</li>
                            <li>Inserisci <strong>un codice per riga</strong>.</li>
                            <li>Il sistema cercherà il miglior prezzo tra i fornitori censiti.</li>
                        </ul>
                    </div>
                    
                    <div><label htmlFor="bom-input" className="block text-sm font-medium text-slate-400 mb-2">Incolla i codici Seko (uno per riga)</label><textarea id="bom-input" rows={8} className="w-full p-3 font-mono bg-slate-800/50 border border-slate-700 rounded-md" placeholder="514846&#10;823301" value={sekoCodes} onChange={(e) => setSekoCodes(e.target.value)} /></div>
                    {searched && (<div><h3 className="text-lg font-semibold mb-4">Risultati</h3>
                        <div className="border border-slate-800 rounded-lg overflow-hidden"><table className="w-full text-sm">
                            <thead className="text-xs bg-slate-800/80 text-slate-400"><tr><th className="px-4 py-3 font-medium tracking-wider">Seko Input</th><th className="px-4 py-3 font-medium tracking-wider">Stato</th><th className="px-4 py-3 font-medium tracking-wider">Descrizione</th><th className="px-4 py-3 font-medium tracking-wider">Fornitore (Tutti)</th><th className="px-4 py-3 font-medium tracking-wider">Costo</th></tr></thead>
                            <tbody className="divide-y divide-slate-800">{quoteResults.map((res, index) => (
                               <React.Fragment key={index}>{res.status === 'Trovato' && res.component.suppliers.length > 0 ? res.component.suppliers.map((sup:any, supIndex:any) => (
                                   <tr key={`${index}-${supIndex}`} className={`hover:bg-slate-800/70 ${supIndex > 0 ? 'text-slate-500' : ''}`}>
                                       <td className="px-4 py-2 font-mono text-electric-blue">{supIndex === 0 ? res.inputSeko : ''}</td>
                                       <td className="px-4 py-2">{supIndex === 0 ? <span className="px-2 py-1 text-xs bg-green-500/10 text-green-400 rounded-full border border-green-500/20">Trovato</span> : ''}</td>
                                       <td className="px-4 py-2">{supIndex === 0 ? res.component.description : ''}</td>
                                       <td className="px-4 py-2">{sup.name}</td>
                                       <td className="px-4 py-2">{sup.cost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 5, maximumFractionDigits: 5 })}</td>
                                   </tr>
                               )) : (
                                   <tr className="hover:bg-slate-800/70"><td className="px-4 py-2 font-mono text-electric-blue">{res.inputSeko}</td><td className="px-4 py-2"><span className={`px-2 py-1 text-xs ${res.status === 'Trovato' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'} rounded-full`}>{res.status === 'Trovato' ? 'Senza Fornitori' : 'Non Trovato'}</span></td><td className="px-4 py-2">{res.component?.description || '-'}</td><td className="px-4 py-2" colSpan={2}>-</td></tr>
                               )}</React.Fragment>
                            ))}</tbody>
                        </table></div>
                    </div>)}
                </div>
                <footer className="flex justify-between items-center p-4 border-t border-slate-800">
                    <div>{quoteResults.length > 0 && <button onClick={handleExport} className="flex items-center gap-2 bg-green-500/10 text-green-400 font-semibold py-2 px-4 rounded-lg border border-green-500/30 hover:bg-green-500/20"><FileExcelIcon /> Esporta Migliore</button>}</div>
                    <div className="flex items-center gap-3"><button onClick={onClose} className="bg-slate-700/50 text-slate-300 font-semibold py-2 px-4 rounded-lg hover:bg-slate-700/80">Chiudi</button><button onClick={handleSearch} className="flex items-center gap-2 bg-electric-blue text-white font-bold py-2 px-5 rounded-lg shadow-lg shadow-electric-blue/20 hover:bg-electric-blue/90"><SearchIcon /> Cerca</button></div>
                </footer>
            </div>
        </div>
    );
};

const CsvImportModal = ({ isOpen, onClose, onImport }: any) => {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const handleFileProcess = useCallback((file: any) => {
        if (!file) { setError("Nessun file selezionato."); return; }
        setError(null); setProcessing(true);
        const reader = new FileReader();
        reader.onload = (e: any) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });

                const componentsMap = new Map();
                json.forEach((row: any) => {
                    const sekoCode = String(row.sekoCode || '').trim();
                    if (!sekoCode) return;

                    if (!componentsMap.has(sekoCode)) {
                        componentsMap.set(sekoCode, {
                            sekoCode,
                            aselCode: String(row.aselCode || ''),
                            lfWmsCode: `AS${sekoCode}`,
                            description: String(row.description || ''),
                            suppliers: [],
                        });
                    }
                    const component = componentsMap.get(sekoCode);
                    const supplierName = String(row.supplierName || '').trim();
                    if (supplierName) {
                        component.suppliers.push({
                            id: `s_${sekoCode}_${component.suppliers.length}`,
                            name: supplierName,
                            partNumber: String(row.supplierPartNumber || ''),
                            cost: parseFloat(String(row.cost || '0').replace(',', '.')) || 0,
                            leadTime: String(row.leadTime || ''),
                            packaging: String(row.packaging || ''),
                        });
                    }
                });

                const componentsToImport = Array.from(componentsMap.values());
                if (componentsToImport.length === 0) {
                    setError("Nessun componente valido trovato.");
                    setProcessing(false);
                    return;
                }
                onImport(componentsToImport);
            } catch (err: any) { setError(`Errore elaborazione file: ${err.message}`); } 
            finally { setProcessing(false); }
        };
        reader.readAsBinaryString(file);
    }, [onImport]);

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4"><div className="bg-slate-900/80 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-slate-700">
            <header className="flex justify-between items-center p-5 border-b border-slate-800"><h2 className="text-xl font-bold">Importa Componenti</h2><button onClick={onClose} className="text-slate-500 hover:text-slate-100"><XIcon /></button></header>
            <div className="p-6 flex-grow overflow-y-auto">
                {/* ISTRUZIONI AGGIUNTE */}
                <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 text-sm">
                    <p className="font-semibold text-slate-200 mb-2">Struttura del file (Excel/CSV):</p>
                    <p className="text-slate-400 mb-2">La prima riga deve contenere le seguenti intestazioni (esatte):</p>
                    <ul className="list-disc list-inside text-slate-300 font-mono space-y-1">
                        <li><span className="text-electric-blue">sekoCode</span> (Obbligatorio)</li>
                        <li>aselCode</li>
                        <li>description</li>
                        <li>supplierName</li>
                        <li>supplierPartNumber</li>
                        <li>cost</li>
                        <li>leadTime</li>
                        <li>packaging</li>
                    </ul>
                </div>

                <div onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }} onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFileProcess(e.dataTransfer.files[0]); }}
                    className={`relative border-2 border-dashed rounded-lg p-10 text-center transition-colors ${isDragging ? 'border-electric-blue bg-electric-blue/10' : 'border-slate-600'}`}>
                    <FileImportIcon className="mx-auto h-12 w-12 text-slate-500"/>
                    <p className="mt-2"><span className="font-semibold text-electric-blue">Trascina un file</span> o clicca</p>
                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => { if (e.target.files?.[0]) handleFileProcess(e.target.files[0]); }} accept=".csv,.xlsx,.xls" />
                </div>
                {processing && <p className="text-center mt-4 text-electric-blue">Elaborazione...</p>}
                {error && <div className="mt-4 p-3 bg-red-500/10 text-red-400 rounded-md border border-red-500/30">{error}</div>}
            </div>
            <footer className="flex justify-end p-4 border-t border-slate-800"><button onClick={onClose} className="bg-slate-700/50 text-slate-300 font-semibold py-2 px-4 rounded-lg hover:bg-slate-700/80">Chiudi</button></footer>
        </div></div>
    );
};

const AselUpdateModal = ({ isOpen, onClose, onUpdate }: any) => {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const handleFileProcess = useCallback((file: any) => {
        if (!file) { setError("Nessun file selezionato."); return; }
        setError(null); setProcessing(true);
        const reader = new FileReader();
        reader.onload = (e: any) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, header: ['sekoCode', 'aselCode'] });
                if (json[0] && (json[0] as any).sekoCode.toLowerCase().trim() === 'sekocode') json.shift();
                const updates = json.map((row: any) => ({ sekoCode: String(row.sekoCode || '').trim(), aselCode: String(row.aselCode || '').trim(), })).filter((row: any) => row.sekoCode);
                if (updates.length === 0) setError("Dati non validi."); else onUpdate(updates);
            } catch (err: any) { setError(`Errore: ${err.message}`); } finally { setProcessing(false); }
        };
        reader.readAsBinaryString(file);
    }, [onUpdate]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4">
            <div className="bg-slate-900/80 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-slate-700">
                <header className="flex justify-between items-center p-5 border-b border-slate-800">
                    <h2 className="text-xl font-bold">Aggiorna Codici Asel da CSV</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-100"><XIcon /></button>
                </header>
                <div className="p-6 flex-grow overflow-y-auto">
                    {/* ISTRUZIONI AGGIUNTE */}
                    <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 text-sm">
                        <p className="font-semibold text-slate-200 mb-2">Istruzioni per l'aggiornamento:</p>
                        <ul className="list-disc list-inside text-slate-300 space-y-1">
                            <li>Carica un file Excel o CSV.</li>
                            <li><strong>Colonna A:</strong> Codice Seko.</li>
                            <li><strong>Colonna B:</strong> Nuovo Codice Asel.</li>
                            <li>La prima riga (intestazione) viene ignorata se contiene "sekoCode".</li>
                        </ul>
                    </div>

                    <div 
                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }} 
                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }} 
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} 
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFileProcess(e.dataTransfer.files[0]); }}
                        className={`relative border-2 border-dashed rounded-lg p-10 text-center transition-colors ${isDragging ? 'border-electric-blue bg-electric-blue/10' : 'border-slate-600'}`}
                    >
                        <FileImportIcon className="mx-auto h-12 w-12 text-slate-500"/>
                        <p className="mt-2 text-slate-300"><span className="font-semibold text-electric-blue">Trascina un file</span> o clicca</p>
                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => { if (e.target.files?.[0]) handleFileProcess(e.target.files[0]); }} accept=".csv,.xlsx,.xls" />
                    </div>
                    {processing && <p className="text-center mt-4 text-electric-blue">Elaborazione...</p>}
                    {error && <div className="mt-4 p-3 bg-red-500/10 text-red-400 rounded-md border border-red-500/30">{error}</div>}
                </div>
                <footer className="flex justify-end p-4 border-t border-slate-800">
                    <button onClick={onClose} className="bg-slate-700/50 text-slate-300 font-semibold py-2 px-4 rounded-lg hover:bg-slate-700/80">Chiudi</button>
                </footer>
            </div>
        </div>
    );
};

// --- COMPONENTE PRODUCT MODAL (PDF ROW-SCAN + EXCEL FLEX HEADER) ---
const ProductModal = ({ isOpen, onClose, onSave, product }: any) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [bom, setBom] = useState<any[]>([]);
    const [fileError, setFileError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (product) {
            setName(product.name);
            setCode(product.code);
            setBom(product.bom || []);
        } else {
            setName('');
            setCode('');
            setBom([]);
        }
    }, [product]);

    const cleanCode = (c: any) => String(c).replace(/^0+/, '').trim();

    // --- ALGORITMO PDF ---
    const extractBomDataSmartly = (items: any[]) => {
        const extracted: any[] = [];
        const yTolerance = 5;
        items.sort((a, b) => b.y - a.y);

        const lines: any[] = [];
        if (items.length > 0) {
            let currentLine = [items[0]];
            let currentY = items[0].y;
            for (let i = 1; i < items.length; i++) {
                if (Math.abs(items[i].y - currentY) < yTolerance) {
                    currentLine.push(items[i]);
                } else {
                    currentLine.sort((a, b) => a.x - b.x);
                    lines.push(currentLine);
                    currentLine = [items[i]];
                    currentY = items[i].y;
                }
            }
            currentLine.sort((a, b) => a.x - b.x);
            lines.push(currentLine);
        }

        lines.forEach((line) => {
            const lineText = line.map((i: any) => i.str).join(" ");
            const sekoRegex = /\b0000\d+\b/; 
            const genericCodeRegex = /\b[A-Z0-9\-\.]{5,}\b/;
            let match = lineText.match(sekoRegex) || lineText.match(genericCodeRegex);

            if (match) {
                const rawCode = match[0];
                if (['DESCRIPTION', 'REFERENCE', 'SECTION', 'CODICE', 'NUMBER', 'COMPILED', 'CHECKED', 'TITLE', 'DATE', 'REV', 'SHEET'].some(k => rawCode.toUpperCase().includes(k))) return;

                const cleanedCode = cleanCode(rawCode);
                const textWithoutCode = lineText.replace(rawCode, "");
                const numbers = textWithoutCode.match(/\b\d{1,4}\b/g);
                let qty = 1;

                if (numbers) {
                    const validNumbers = numbers.map((n: string) => parseFloat(n)).filter((n: number) => n > 0 && n < 5000);
                    if (validNumbers.length > 0) {
                        const likelyQty = validNumbers.find((n: number) => n < 50); 
                        if (likelyQty) qty = likelyQty;
                        else qty = validNumbers[0];
                    }
                }

                if (cleanedCode) {
                    if (!extracted.some(e => e.sekoCode === cleanedCode)) {
                        extracted.push({ sekoCode: cleanedCode, quantity: qty });
                    }
                }
            }
        });
        return extracted;
    };

    const handleFile = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileError(null);
        setIsProcessing(true);

        // --- GESTIONE PDF ---
        if (file.type === 'application/pdf') {
            try {
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                
                const fileUrl = URL.createObjectURL(file);
                const pdf = await pdfjsLib.getDocument(fileUrl).promise;
                
                let allItems: any[] = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageItems = textContent.items.map((item: any) => ({ 
                        str: item.str, 
                        x: item.transform[4], 
                        y: item.transform[5],
                        w: item.width
                    })).filter((i: any) => i.str.trim().length > 0);
                    
                    allItems = [...allItems, ...pageItems];
                }

                const extracted = extractBomDataSmartly(allItems);
                if (extracted && extracted.length > 0) setBom(extracted);
                else setFileError("Nessun componente trovato nel PDF.");

            } catch (err: any) { 
                console.error(err); 
                setFileError("Errore lettura PDF: " + err.message); 
            }
            setIsProcessing(false);
            return;
        }

        // --- GESTIONE EXCEL (XLSX e XLS) ---
        const reader = new FileReader();
        reader.onload = (evt: any) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                
                // Leggiamo tutte le righe come array di array
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                
                const newBom: any[] = [];
                let codeIdx = -1;
                let qtyIdx = -1;
                let startRow = 0;

                // Parole chiave per cercare le colonne (Case Insensitive)
                const codeKeywords = ['part code', 'partcode', 'part no', 'codice', 'code', 'part number'];
                const qtyKeywords = ['q.ty', 'q.ta', 'qta', 'qty', 'quantity', 'quantità'];

                // 1. Cerca la riga di intestazione (scansiona fino a 20 righe)
                for (let r = 0; r < Math.min(20, data.length); r++) {
                    const row = data[r];
                    if (!row || row.length === 0) continue;

                    // Cerca le colonne in questa riga
                    for (let c = 0; c < row.length; c++) {
                        const cellValue = String(row[c]).toLowerCase().trim();
                        if (codeKeywords.some(k => cellValue === k || cellValue.includes(k))) codeIdx = c;
                        if (qtyKeywords.some(k => cellValue === k || cellValue.includes(k))) qtyIdx = c;
                    }

                    // Se abbiamo trovato entrambe, ci fermiamo
                    if (codeIdx !== -1 && qtyIdx !== -1) {
                        startRow = r + 1; // I dati iniziano dalla riga successiva
                        console.log(`Header trovato alla riga ${r}. Codice: Col ${codeIdx}, Qta: Col ${qtyIdx}`);
                        break;
                    }
                }

                // 2. Fallback se non trova intestazioni esatte
                if (codeIdx === -1) {
                    console.log("Header non trovato, provo colonne standard A e D (o B)...");
                    // Nel tuo screenshot: A=Part Code (0), D=Q.ty (3)
                    // Proviamo a vedere se la colonna 0 contiene codici
                    const sampleRow = data[startRow + 2] || data[startRow + 3]; // Prendi una riga a caso
                    if (sampleRow && String(sampleRow[0]).trim().length > 4) {
                        codeIdx = 0;
                        // Cerchiamo una colonna numerica per la Qta
                        // Priorità: Colonna D (3) -> Colonna B (1) -> Colonna C (2)
                        if (sampleRow[3] && !isNaN(parseFloat(sampleRow[3]))) qtyIdx = 3;
                        else if (sampleRow[1] && !isNaN(parseFloat(sampleRow[1]))) qtyIdx = 1;
                        else qtyIdx = 1; // Default
                    }
                }

                // 3. Estrai i dati
                if (codeIdx !== -1) {
                    for (let r = startRow; r < data.length; r++) {
                        const row = data[r];
                        if (!row) continue;

                        const rawCode = row[codeIdx];
                        // Se qtyIdx non è stato trovato, assumiamo 1
                        const rawQty = qtyIdx !== -1 ? row[qtyIdx] : 1;

                        if (rawCode) {
                            const codeStr = String(rawCode).trim();
                            // Ignora se sembra ancora un'intestazione
                            if (codeKeywords.some(k => codeStr.toLowerCase().includes(k))) continue;

                            const cleaned = cleanCode(codeStr);
                            // Pulisci la quantità (gestisce '1', '4', ma anche stringhe spurie)
                            let q = 1;
                            if (rawQty) {
                                const qStr = String(rawQty).replace(',', '.');
                                const parsed = parseFloat(qStr);
                                if (!isNaN(parsed) && parsed > 0) q = parsed;
                            }

                            // Filtro di validità: il codice deve essere sensato
                            if (cleaned.length >= 4) {
                                newBom.push({ sekoCode: cleaned, quantity: q });
                            }
                        }
                    }
                }

                if (newBom.length === 0) setFileError("Nessun dato valido trovato in Excel. Verifica che ci siano le colonne 'Part Code' e 'Q.ty'.");
                else setBom(newBom);

            } catch (err) { 
                console.error(err);
                setFileError("Errore durante la lettura del file Excel."); 
            }
            setIsProcessing(false);
        };
        reader.readAsBinaryString(file);
    };

    const handleSubmit = () => { 
        if (!name || !code || bom.length === 0) { alert("Dati mancanti."); return; } 
        onSave({ ...product, name, code, bom }); 
        onClose(); 
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="p-5 border-b border-slate-800 flex justify-between"><h2 className="text-xl font-bold text-white">{product ? 'Modifica Prodotto' : 'Nuovo Prodotto'}</h2><button onClick={onClose} className="text-slate-500 hover:text-white"><XIcon /></button></header>
                <div className="p-6 space-y-4 flex-grow overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Nome Prodotto" name="pname" value={name} onChange={(e:any) => setName(e.target.value)} required />
                        <InputField label="Codice Prodotto" name="pcode" value={code} onChange={(e:any) => setCode(e.target.value)} required />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Carica BOM (Sovrascrive esistente)</label>
                        <div className="relative border border-slate-700 bg-slate-800/50 rounded-md p-4 text-center hover:bg-slate-800 transition-colors">
                            <input type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={handleFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                            <div className="flex flex-col items-center">
                                {isProcessing ? <SpinnerIcon className="animate-spin text-electric-blue w-8 h-8"/> : <div className="flex gap-2 text-electric-blue"><FileExcelIcon /><FilePdfIcon /></div>}
                                <p className="text-sm text-slate-300 mt-2">{isProcessing ? "Analisi in corso..." : "Trascina file PDF o Excel qui"}</p>
                            </div>
                        </div>
                        {fileError && <p className="text-red-400 text-sm mt-2 p-2 bg-red-500/10 rounded border border-red-500/20">{fileError}</p>}
                    </div>

                    {/* Anteprima BOM */}
                    {bom.length > 0 && (
                        <div className="mt-4">
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-sm font-medium text-slate-400">Anteprima BOM ({bom.length} componenti)</label>
                                <button onClick={() => setBom([])} className="text-xs text-red-400 hover:underline">Svuota</button>
                            </div>
                            <div className="border border-slate-700 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                <table className="w-full text-sm text-left text-slate-300">
                                    <thead className="bg-slate-800 text-slate-400 sticky top-0">
                                        <tr>
                                            <th className="p-2">Codice</th>
                                            <th className="p-2 text-center">Q.tà</th>
                                            <th className="p-2 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {bom.map((b, i) => (
                                            <tr key={i} className="hover:bg-slate-800/50">
                                                <td className="p-2 font-mono">{b.sekoCode}</td>
                                                <td className="p-2 text-center">{b.quantity}</td>
                                                <td className="p-2 text-center"><button onClick={() => setBom(bom.filter((_,idx)=>idx!==i))} className="text-slate-500 hover:text-red-400"><XIcon className="w-4 h-4"/></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
                <footer className="p-4 border-t border-slate-800 flex justify-end">
                    <button onClick={onClose} className="mr-2 px-4 py-2 text-slate-300 hover:text-white">Annulla</button>
                    <button onClick={handleSubmit} disabled={bom.length === 0 || isProcessing} className="bg-electric-blue text-white font-bold py-2 px-4 rounded-lg hover:bg-electric-blue/90 disabled:bg-slate-700 disabled:text-slate-500 transition-all">
                        {product ? 'Aggiorna Prodotto' : 'Salva Prodotto'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

// --- HEADER ---
const Header = ({ theme, toggleTheme, user, onLogout }: any) => ( 
    <header className="sticky top-0 z-40 bg-slate-100/80 dark:bg-slate-950/75 backdrop-blur-lg border-b border-slate-300/10 dark:border-slate-500/30 transition-colors">
      <div className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-electric-blue dark:text-electric-blue tracking-wider">GESTIONALE</h1>
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">{user.email}</span>
              <button onClick={onLogout} className="text-sm bg-slate-200/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold py-1.5 px-3 rounded-md hover:bg-slate-300 dark:hover:bg-slate-700/80 transition-colors">Logout</button>
            </div>
          )}
          <button onClick={toggleTheme} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/50 transition-colors">{theme === 'light' ? <MoonIcon /> : <SunIcon />}</button>
        </div>
      </div>
    </header>
);

// --- TABLE COMPONENTI ---
const ComponentTable = ({ components, onEdit, onDelete }: any) => {
  if (components.length === 0) {
    return (
      <div className="text-center p-12 bg-slate-900/50 border border-slate-800/50 rounded-lg shadow-md">
        <h2 className="text-xl text-slate-400">Nessun componente trovato.</h2>
        <p className="text-slate-500 mt-2">Inizia aggiungendo un nuovo componente o modifica i filtri di ricerca.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-500/5 dark:bg-slate-900/50 border border-slate-300/10 dark:border-slate-800/50 rounded-xl overflow-hidden shadow-2xl shadow-slate-950/50">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
          <thead className="text-xs text-slate-700 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/80">
            <tr>
              <th scope="col" className="px-6 py-4 font-medium tracking-wider">Codici</th>
              <th scope="col" className="px-6 py-4 font-medium tracking-wider">Descrizione</th>
              <th scope="col" className="px-6 py-4 font-medium tracking-wider text-center">Fornitori</th>
              <th scope="col" className="px-6 py-4 font-medium tracking-wider text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/5 dark:divide-slate-800/80">
            {components.map((component: any) => (
              <tr key={component.id} className="hover:bg-slate-400/5 dark:hover:bg-slate-800/70 transition-colors duration-200 group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-mono text-electric-blue">{component.sekoCode}</span>
                  {component.aselCode && <span className="font-sans text-green-400 ml-2">({component.aselCode})</span>}
                </td>
                <td className="px-6 py-4 max-w-xs truncate" title={component.description}>{component.description}</td>
                <td className="px-6 py-4 text-center">
                  <span className="bg-electric-blue/10 text-electric-blue-light text-xs font-bold px-3 py-1 rounded-full border border-electric-blue/20">
                    {component.suppliers.length}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(component)} className="p-2 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-electric-blue transition-colors" aria-label="Modifica"><EditIcon /></button>
                    <button onClick={() => onDelete(component.id)} className="p-2 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-red-500 transition-colors" aria-label="Elimina"><TrashIcon /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- DASHBOARD ---
const Dashboard = ({ components }: any) => {
    const stats = useMemo(() => {
        const totalComponents = components.length;
        const suppliers = new Set(components.flatMap((c:any) => c.suppliers.map((s:any) => s.name)));
        const totalSuppliers = suppliers.size;

        const bestPriceSuppliers: any = {};
        components.forEach((c:any) => {
            if (c.suppliers && c.suppliers.length > 0) {
                const bestSupplier = c.suppliers.reduce((min:any, s:any) => s.cost < min.cost ? s : min, c.suppliers[0]);
                bestPriceSuppliers[bestSupplier.name] = (bestPriceSuppliers[bestSupplier.name] || 0) + 1;
            }
        });

        const sortedBestSuppliers = Object.entries(bestPriceSuppliers)
            .sort(([, a]:any, [, b]:any) => b - a)
            .slice(0, 5);

        return { totalComponents, totalSuppliers, sortedBestSuppliers };
    }, [components]);

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-900/50 border border-slate-800/50 p-6 rounded-xl">
                    <h2 className="text-sm font-medium text-slate-400">Componenti Totali</h2>
                    <p className="text-4xl font-bold text-electric-blue mt-2">{stats.totalComponents}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800/50 p-6 rounded-xl">
                    <h2 className="text-sm font-medium text-slate-400">Fornitori Unici</h2>
                    <p className="text-4xl font-bold text-electric-blue mt-2">{stats.totalSuppliers}</p>
                </div>
            </div>
             <div className="bg-slate-900/50 border border-slate-800/50 p-6 rounded-xl">
                <h2 className="text-lg font-semibold text-slate-200 mb-4">Top Fornitori per Miglior Prezzo</h2>
                {stats.sortedBestSuppliers.length > 0 ? (
                    <ul className="space-y-3">
                        {stats.sortedBestSuppliers.map(([name, count]:any, index:number) => (
                             <li key={name} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-bold text-slate-500 w-6 text-center">{index + 1}</span>
                                    <p className="font-semibold text-slate-100">{name}</p>
                                </div>
                                <p className="text-sm text-electric-blue font-semibold bg-electric-blue/10 px-3 py-1 rounded-full">{count} {count > 1 ? 'volte' : 'volta'}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-slate-500 text-center py-4">Nessun dato sui prezzi disponibile.</p>
                )}
            </div>
        </div>
    );
};

// --- COMPONENTS VIEW ---
const ComponentsView = ({ components, onEdit, onDelete, onOpenModal, onOpenBomModal, onOpenCsvModal, onOpenAselUpdateModal, filteredComponents, searchQuery, setSearchQuery, handleExportView }: any) => (
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
            <div className="relative flex-grow">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <SearchIcon />
                </span>
                <input
                    type="text"
                    placeholder="Cerca per codice, descrizione, fornitore..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800/50 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-electric-blue focus:border-electric-blue transition-colors"
                />
            </div>
             <button 
                onClick={handleExportView} 
                className="flex items-center gap-2 bg-blue-500/10 text-blue-400 font-semibold py-2 px-4 rounded-lg border border-blue-500/30 hover:bg-blue-500/20"
                title="Esporta la vista corrente in Excel"
            >
                <FileExcelIcon />
                Esporta Vista
            </button>
        </div>

        <ComponentTable components={filteredComponents} onEdit={onEdit} onDelete={onDelete} />
    </div>
);

// --- FORECAST VIEW ---
const ForecastView = ({ products, components, onAddProduct, onEditProduct, onDeleteProduct }: any) => {
    const [plan, setPlan] = useState([{ productId: '', quantity: 0 }]);
    const [results, setResults] = useState<any[] | null>(null);

    const handlePlanChange = (index: number, field: string, value: any) => {
        const newPlan: any = [...plan];
        newPlan[index][field] = value;
        setPlan(newPlan);
    };

    const addPlanRow = () => setPlan([...plan, { productId: '', quantity: 0 }]);
    const removePlanRow = (index: number) => setPlan(plan.filter((_, i) => i !== index));

    const calculateForecast = () => {
        const aggregation: any = {}; // Map: sekoCode -> { totalQty: 0, breakdown: [] }

        plan.forEach(item => {
            const product = products.find((p:any) => p.id === item.productId);
            const qtyToProduce = parseFloat(item.quantity as any);
            if (product && qtyToProduce > 0) {
                product.bom.forEach((comp:any) => {
                    if (!aggregation[comp.sekoCode]) {
                        aggregation[comp.sekoCode] = { totalQty: 0, breakdown: [] };
                    }
                    const needed = comp.quantity * qtyToProduce;
                    aggregation[comp.sekoCode].totalQty += needed;
                    aggregation[comp.sekoCode].breakdown.push({
                        productName: product.name,
                        productQty: qtyToProduce,
                        qtyPerUnit: comp.quantity,
                        totalForProduct: needed
                    });
                });
            }
        });

        const resultList = Object.keys(aggregation).map(code => {
            const compDetails = components.find((c:any) => c.sekoCode === code);
            return {
                code,
                description: compDetails ? compDetails.description : 'N/D',
                totalQty: aggregation[code].totalQty,
                breakdown: aggregation[code].breakdown,
                component: compDetails
            };
        });

        setResults(resultList);
    };

    const exportForecast = () => {
        if (!results) return;
        const exportData = results.map(r => ({
            'Codice Componente': r.code,
            'Descrizione': r.description,
            'Quantità Totale': r.totalQty,
            'Dettaglio Utilizzo': r.breakdown.map((b:any) => `${b.productName} (${b.totalForProduct})`).join('; ')
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Forecast");
        XLSX.writeFile(wb, "forecast_fabbisogno.xlsx");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col: Plan & Products */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-900/50 border border-slate-800/50 p-6 rounded-xl">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-slate-200">Prodotti / BOM</h2>
                        <button onClick={onAddProduct} className="text-xs bg-electric-blue px-2 py-1 rounded text-white hover:bg-electric-blue/90">+ Nuovo</button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {products.length === 0 ? <p className="text-slate-500 text-sm">Nessun prodotto definito.</p> : products.map((p:any) => (
                            <div key={p.id} className="p-3 bg-slate-800/50 rounded border border-slate-700/50 flex justify-between items-center group">
                                <div><p className="font-bold text-slate-200 text-sm">{p.name}</p><p className="text-xs text-slate-400">{p.code}</p></div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">{p.bom.length}</span>
                                    <button onClick={() => onEditProduct(p)} className="text-slate-500 hover:text-electric-blue p-1"><EditIcon className="w-4 h-4"/></button>
                                    <button onClick={() => onDeleteProduct(p.id)} className="text-slate-500 hover:text-red-500 p-1"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/50 p-6 rounded-xl">
                    <h2 className="text-lg font-bold text-slate-200 mb-4">Piano di Produzione</h2>
                    <div className="space-y-3">
                        {plan.map((row, idx) => (
                            <div key={idx} className="flex gap-2 items-end">
                                <div className="flex-grow">
                                    <label className="text-xs text-slate-400">Prodotto</label>
                                    <select className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" value={row.productId} onChange={(e) => handlePlanChange(idx, 'productId', e.target.value)}>
                                        <option value="">Seleziona...</option>
                                        {products.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="w-24">
                                    <label className="text-xs text-slate-400">Quantità</label>
                                    <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" value={row.quantity} onChange={(e) => handlePlanChange(idx, 'quantity', e.target.value)} />
                                </div>
                                {plan.length > 1 && <button onClick={() => removePlanRow(idx)} className="p-2 text-red-400 hover:bg-red-500/10 rounded"><XIcon /></button>}
                            </div>
                        ))}
                        <button onClick={addPlanRow} className="text-xs text-electric-blue hover:underline">+ Aggiungi riga</button>
                    </div>
                    <button onClick={calculateForecast} className="w-full mt-6 bg-electric-blue text-white font-bold py-2 rounded-lg hover:bg-electric-blue/90 shadow-lg shadow-electric-blue/20">Calcola Fabbisogno</button>
                </div>
            </div>

            {/* Right Col: Results */}
            <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800/50 p-6 rounded-xl flex flex-col h-full min-h-[500px]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-200">Risultato Forecast</h2>
                    {results && <button onClick={exportForecast} className="flex items-center gap-2 bg-green-600/20 text-green-400 px-3 py-1.5 rounded hover:bg-green-600/30 border border-green-600/50 text-sm"><FileExcelIcon /> Esporta</button>}
                </div>
                
                {!results ? (
                    <div className="flex-grow flex items-center justify-center text-slate-500"><p>Configura il piano di produzione e calcola per vedere i risultati.</p></div>
                ) : (
                    <div className="overflow-x-auto flex-grow">
                        <table className="w-full text-sm text-left text-slate-300">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3">Codice</th>
                                    <th className="px-4 py-3">Descrizione</th>
                                    <th className="px-4 py-3 text-center">Totale Nec.</th>
                                    <th className="px-4 py-3">Dettaglio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {results.map((res, i) => (
                                    <tr key={i} className="hover:bg-slate-800/30">
                                        <td className="px-4 py-2 font-mono text-electric-blue">{res.code}</td>
                                        <td className="px-4 py-2 max-w-xs truncate">{res.description}</td>
                                        <td className="px-4 py-2 text-center font-bold text-white">{res.totalQty}</td>
                                        <td className="px-4 py-2 text-xs text-slate-400">
                                            {res.breakdown.map((b:any, bi:any) => (
                                                <div key={bi}>• {b.productName}: <span className="text-slate-200">{b.totalForProduct}</span></div>
                                            ))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- APPLICAZIONE PRINCIPALE ---
const App = () => {
    // --- STATO ---
    const [user, setUser] = useState<any>(null);
    const [authReady, setAuthReady] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [configError, setConfigError] = useState<string | null>(null);
    
    const [components, setComponents] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]); // BOM Products
    const [loading, setLoading] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBomModalOpen, setIsBomModalOpen] = useState(false);
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [isAselUpdateModalOpen, setIsAselUpdateModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false); // For Forecast BOMs

    const [editingComponent, setEditingComponent] = useState<any>(null);
    const [editingProduct, setEditingProduct] = useState<any>(null);

    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'components' | 'forecast'
    
    // --- INIZIALIZZAZIONE ---
    useEffect(() => {
        if (!checkFirebaseConfig(firebaseConfig)) {
            setConfigError("Configurazione Firebase mancante o incompleta. Controlla il tuo file .env.local.");
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            const db = getFirestore(app);

            setPersistence(auth, browserLocalPersistence)
                .then(() => {
                    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
                        setUser(currentUser);
                        setAuthReady(true);
                        if (currentUser) {
                           setLoading(true);
                           // Listener Componenti
                           const componentsCol = collection(db, 'components');
                           const unsubscribeComp = onSnapshot(componentsCol, (snapshot) => {
                               const componentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ElectronicComponent));
                               setComponents(componentsList);
                               setLoading(false);
                           }, (error) => {
                               console.error("Errore Firestore Componenti: ", error);
                               setDbError("Impossibile caricare i componenti.");
                               setLoading(false);
                           });

                           // Listener Prodotti (Forecast)
                           const productsCol = collection(db, 'products');
                           const unsubscribeProd = onSnapshot(productsCol, (snapshot) => {
                                const productsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
                                setProducts(productsList);
                           }, (error) => {
                                console.error("Errore Firestore Prodotti: ", error);
                           });

                           return () => { unsubscribeComp(); unsubscribeProd(); };
                        } else {
                            setComponents([]);
                            setProducts([]);
                            setLoading(false);
                        }
                    });
                     return () => unsubscribeAuth();
                })
                .catch((error) => {
                    console.error("Errore persistenza: ", error);
                    setConfigError("Errore di configurazione dell'autenticazione.");
                });
        } catch (error: any) {
            console.error("Errore inizializzazione Firebase:", error);
            setConfigError(`Errore di inizializzazione: ${error.message}`);
        }
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    // --- LOGICA DI FILTRAGGIO ---
    const filteredComponents = useMemo(() => {
        if (!searchQuery) {
            return components;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return components.filter(component =>
            (component.sekoCode || '').toLowerCase().includes(lowercasedQuery) ||
            (component.description || '').toLowerCase().includes(lowercasedQuery) ||
            (component.aselCode || '').toLowerCase().includes(lowercasedQuery) ||
            (component.lfWmsCode || '').toLowerCase().includes(lowercasedQuery) ||
            component.suppliers.some((supplier:any) => 
                (supplier.name || '').toLowerCase().includes(lowercasedQuery) ||
                (supplier.partNumber || '').toLowerCase().includes(lowercasedQuery)
            )
        );
    }, [components, searchQuery]);

    const handleLogin = async (email:any, password:any) => {
        setLoginError(null);
        const auth = getAuth();
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setLoginError("Email o password non validi.");
        }
    };
    
    const handleLogout = async () => {
        const auth = getAuth();
        await signOut(auth);
    };

    const addLogEntry = (component:any, action:any, details:any, note:any) => {
        if (!user) return component;
        const newLog = {
            id: `log_${Date.now()}`,
            timestamp: Timestamp.now().toDate().toISOString(),
            userId: user.uid,
            username: user.email,
            action,
            details,
            note,
        };
        return { ...component, logs: [newLog, ...(component.logs || [])] };
    };

    const handleSaveComponent = useCallback(async (componentToSave:any, note:any) => {
        if (!user) return;
        const db = getFirestore();
        const isEditing = !!componentToSave.id;

        try {
            if (isEditing) {
                const originalComponent = components.find(c => c.id === componentToSave.id);
                const componentWithLog = addLogEntry(originalComponent, 'Modifica', 'Componente modificato.', note);
                const finalComponent = { ...componentToSave, logs: componentWithLog.logs }; 
                delete finalComponent.id;
                await setDoc(doc(db, "components", componentToSave.id), finalComponent);
            } else {
                const componentWithLog = addLogEntry(componentToSave, 'Creazione', 'Componente creato.', note);
                delete componentWithLog.id;
                await addDoc(collection(db, "components"), componentWithLog);
            }
            setIsModalOpen(false);
            setEditingComponent(null);
        } catch (err) {
            console.error("Errore salvataggio:", err);
            alert("Errore durante il salvataggio.");
        }
    }, [user, components]);

    const handleDeleteComponent = useCallback(async (componentId:any) => {
        if (window.confirm('Sei sicuro di voler eliminare questo componente? L\'azione è irreversibile.')) {
            const db = getFirestore();
            await deleteDoc(doc(db, "components", componentId));
        }
    }, []);

    const handleCsvImport = useCallback(async (importedComponents:any[]) => {
        if (!user) return;
        const db = getFirestore();
        const batch = writeBatch(db);

        // Mappa dei componenti esistenti per lookup rapido
        const existingMap = new Map(components.map(c => [c.sekoCode, c]));

        let createdCount = 0;
        let updatedCount = 0;

        importedComponents.forEach(importedComp => {
            const existingComp = existingMap.get(importedComp.sekoCode);

            if (existingComp) {
                // --- LOGICA DI AGGIORNAMENTO (MERGE FORNITORI) ---
                
                // Estrai i nuovi fornitori dall'oggetto importato
                const newSuppliers = importedComp.suppliers || [];
                
                // Filtra i fornitori che sono GIA' presenti nel componente esistente
                // (Controlliamo se c'è già un fornitore con lo stesso nome E part number)
                const uniqueNewSuppliers = newSuppliers.filter((ns: any) => 
                    !existingComp.suppliers.some((es: any) => 
                        es.name === ns.name && es.partNumber === ns.partNumber
                    )
                );

                // Se ci sono fornitori veramente nuovi da aggiungere
                if (uniqueNewSuppliers.length > 0) {
                    const updatedSuppliers = [...existingComp.suppliers, ...uniqueNewSuppliers];
                    
                    const docRef = doc(db, 'components', existingComp.id);
                    
                    // Aggiungiamo un log per tracciare l'aggiornamento
                    const logEntry = {
                        id: `log_${Date.now()}_${Math.random()}`,
                        timestamp: Timestamp.now().toDate().toISOString(),
                        userId: user.uid,
                        username: user.email,
                        action: 'Importazione CSV (Aggiornamento)',
                        details: `Aggiunti ${uniqueNewSuppliers.length} fornitori.`,
                        note: 'Merge automatico da importazione'
                    };

                    const currentLogs = existingComp.logs || [];
                    
                    batch.update(docRef, { 
                        suppliers: updatedSuppliers,
                        logs: [logEntry, ...currentLogs]
                    });
                    updatedCount++;
                }
            } else {
                // --- LOGICA DI CREAZIONE (NUOVO COMPONENTE) ---
                const docRef = doc(collection(db, 'components'));
                
                // Aggiungiamo il log di creazione
                const compWithLog = {
                    ...importedComp,
                    logs: [{
                        id: `log_${Date.now()}_${Math.random()}`,
                        timestamp: Timestamp.now().toDate().toISOString(),
                        userId: user.uid,
                        username: user.email,
                        action: 'Importazione CSV (Creazione)',
                        details: 'Componente creato da importazione massiva.',
                        note: 'Importazione iniziale'
                    }]
                };
                
                batch.set(docRef, compWithLog);
                createdCount++;
            }
        });

        try {
            await batch.commit();
            alert(`Importazione completata!\n- Creati: ${createdCount}\n- Aggiornati: ${updatedCount}`);
            setIsCsvModalOpen(false);
        } catch (err:any) {
            console.error("Errore durante l'importazione CSV:", err);
            alert(`Errore batch: ${err.message}`);
        }
    }, [user, components]);

    const handleAselUpdateFromCsv = useCallback(async (updates:any) => {
        if (!user) return;
        const db = getFirestore();
        const batch = writeBatch(db);
        const componentsBySeko = new Map(components.map(c => [c.sekoCode, c]));

        let updatedCount = 0;
        
        for (const update of updates) {
            const existingComponent = componentsBySeko.get(update.sekoCode);
            if (existingComponent) {
                if (existingComponent.aselCode !== update.aselCode) {
                    const docRef = doc(db, "components", existingComponent.id);
                    const componentWithLog = addLogEntry(
                        existingComponent, 
                        'Aggiornamento Asel Code da CSV', 
                        `Codice Asel modificato da "${existingComponent.aselCode || ''}" a "${update.aselCode}"`,
                        'Aggiornamento massivo da file CSV'
                    );
                    batch.update(docRef, { 
                        aselCode: update.aselCode,
                        logs: componentWithLog.logs 
                    });
                    updatedCount++;
                }
            }
        }

        try {
            await batch.commit();
            alert(`Aggiornamento completato. ${updatedCount} componenti aggiornati.`);
            setIsAselUpdateModalOpen(false);
        } catch (error:any) {
            console.error("Errore durante l'aggiornamento massivo:", error);
            alert(`Si è verificato un errore: ${error.message}`);
        }
    }, [user, components]);

    // --- GESTIONE PRODOTTI (BOM) ---
    const handleSaveProduct = useCallback(async (productData: any) => {
        if (!user) return;
        const db = getFirestore();
        try {
            if (productData.id) {
                // Modifica
                const { id, ...data } = productData;
                await setDoc(doc(db, "products", id), { 
                    ...data, 
                    updatedAt: Timestamp.now().toDate().toISOString(),
                    updatedBy: user.email
                }, { merge: true });
                alert("Prodotto aggiornato con successo.");
            } else {
                // Creazione
                await addDoc(collection(db, "products"), {
                    ...productData,
                    createdAt: Timestamp.now().toDate().toISOString(),
                    createdBy: user.email
                });
                alert("Prodotto creato con successo.");
            }
        } catch (e) {
            console.error(e);
            alert("Errore durante il salvataggio del prodotto.");
        }
    }, [user]);

    const handleDeleteProduct = useCallback(async (productId: string) => {
        if (!user) return;
        if (window.confirm("Sei sicuro di voler eliminare questo prodotto e la sua BOM?")) {
            try {
                const db = getFirestore();
                await deleteDoc(doc(db, "products", productId));
            } catch(e: any) {
                alert("Errore eliminazione: " + e.message);
            }
        }
    }, [user]);

    const handleExportView = useCallback(() => {
        if (filteredComponents.length === 0) {
            alert("Nessun componente da esportare.");
            return;
        }

        const dataToExport: any[] = [];
        filteredComponents.forEach(component => {
            if (component.suppliers && component.suppliers.length > 0) {
                component.suppliers.forEach((supplier:any) => {
                    dataToExport.push({
                        'Codice Seko': component.sekoCode,
                        'Codice Asel': component.aselCode || '',
                        'Descrizione': component.description,
                        'Fornitore': supplier.name,
                        'Part Number Fornitore': supplier.partNumber,
                        'Confezione': supplier.packaging || '',
                        'Costo (€)': supplier.cost,
                        'Lead Time': supplier.leadTime || '',
                    });
                });
            } else {
                dataToExport.push({
                    'Codice Seko': component.sekoCode,
                    'Codice Asel': component.aselCode || '',
                    'Descrizione': component.description,
                    'Fornitore': 'N/D',
                    'Part Number Fornitore': 'N/D',
                    'Confezione': 'N/D',
                    'Costo (€)': 'N/D',
                    'Lead Time': 'N/D',
                });
            }
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Vista Componenti');
        XLSX.writeFile(workbook, 'esportazione_vista_componenti.xlsx');
    }, [filteredComponents]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    if (configError) return <ErrorScreen title="Errore di Configurazione" message={configError} />;
    if (!authReady) return <LoadingScreen message="Autenticazione in corso..." />;
    if (!user) return <LoginPage onLogin={handleLogin} error={loginError} />;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-gray-800 dark:text-slate-200">
            <Header theme={theme} toggleTheme={toggleTheme} user={user} onLogout={handleLogout} />
            <main className="container mx-auto p-4 md:p-8">
                 <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-4 overflow-x-auto">
                    <button onClick={() => setCurrentView('dashboard')} className={`flex items-center gap-2 font-semibold py-2 px-4 rounded-lg whitespace-nowrap transition-colors ${currentView === 'dashboard' ? 'bg-electric-blue text-white' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/80'}`}>
                        <ChartBarIcon /> Dashboard
                    </button>
                    <button onClick={() => setCurrentView('components')} className={`flex items-center gap-2 font-semibold py-2 px-4 rounded-lg whitespace-nowrap transition-colors ${currentView === 'components' ? 'bg-electric-blue text-white' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/80'}`}>
                       <DocumentDuplicateIcon /> Componenti
                    </button>
                    <button onClick={() => setCurrentView('forecast')} className={`flex items-center gap-2 font-semibold py-2 px-4 rounded-lg whitespace-nowrap transition-colors ${currentView === 'forecast' ? 'bg-electric-blue text-white' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/80'}`}>
                       <CalculatorIcon /> Forecast & BOM
                    </button>
                </div>

                {loading ? <LoadingScreen message="Caricamento componenti..." /> : dbError ? <ErrorScreen title="Errore Database" message={dbError} /> : (
                    <>
                        {currentView === 'dashboard' && <Dashboard components={components} />}
                        {currentView === 'components' && (
                            <ComponentsView 
                                components={components} 
                                onEdit={(c:any) => { setEditingComponent(c); setIsModalOpen(true); }} 
                                onDelete={handleDeleteComponent}
                                onOpenModal={() => { setEditingComponent(null); setIsModalOpen(true); }}
                                onOpenBomModal={() => setIsBomModalOpen(true)}
                                onOpenCsvModal={() => setIsCsvModalOpen(true)}
                                onOpenAselUpdateModal={() => setIsAselUpdateModalOpen(true)}
                                filteredComponents={filteredComponents}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                handleExportView={handleExportView}
                            />
                        )}
                        {currentView === 'forecast' && (
                            <ForecastView 
                                products={products} 
                                components={components} 
                                onAddProduct={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
                                onEditProduct={(p: any) => { setEditingProduct(p); setIsProductModalOpen(true); }}
                                onDeleteProduct={handleDeleteProduct}
                            />
                        )}
                    </>
                )}
            </main>
            {isModalOpen && <ComponentModal component={editingComponent} onClose={() => setIsModalOpen(false)} onSave={handleSaveComponent} />}
            {isBomModalOpen && <BomQuoteModal isOpen={isBomModalOpen} onClose={() => setIsBomModalOpen(false)} components={components} />}
            {isCsvModalOpen && <CsvImportModal isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} onImport={handleCsvImport} />}
            {isAselUpdateModalOpen && <AselUpdateModal isOpen={isAselUpdateModalOpen} onClose={() => setIsAselUpdateModalOpen(false)} onUpdate={handleAselUpdateFromCsv} />}
            {isProductModalOpen && <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSave={handleSaveProduct} product={editingProduct} />}
        </div>
    );
};

export default App;
