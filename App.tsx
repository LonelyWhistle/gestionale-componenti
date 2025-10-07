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
    Timestamp
} from 'firebase/firestore';

// Dichiarazione per la libreria XLSX (per l'import/export)
declare const XLSX: any;

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


// --- COMPONENTI UI ---
const LoadingScreen = ({ message }) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <h1 className="text-3xl font-bold text-center text-electric-blue mb-4 tracking-wider">GESTIONALE COMPONENTI</h1>
        <SpinnerIcon className="w-10 h-10 text-electric-blue animate-spin" />
        <p className="mt-4 text-slate-400">{message}</p>
    </div>
);

const ErrorScreen = ({ title, message, details }) => (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-lg bg-slate-900 border border-red-500/30 rounded-xl shadow-2xl p-8 text-center">
            <AlertTriangleIcon />
            <h2 className="mt-4 text-2xl font-bold text-red-400">{title}</h2>
            <p className="mt-2 text-slate-300">{message}</p>
            {details && (
                 <pre className="mt-4 text-left bg-slate-800/50 p-3 rounded-md text-xs text-slate-400 overflow-x-auto">
                    <code>{details}</code>
                </pre>
            )}
        </div>
    </div>
);

// --- PAGINA DI LOGIN ---
const LoginPage = ({ onLogin, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(email, password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-electric-blue mb-8 tracking-wider">
          GESTIONALE COMPONENTI
        </h1>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:ring-1 focus:ring-electric-blue focus:border-electric-blue transition-colors text-slate-200"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-400 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:ring-1 focus:ring-electric-blue focus:border-electric-blue transition-colors text-slate-200"
              />
            </div>
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-electric-blue hover:bg-electric-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-electric-blue/50 transition-all duration-300 shadow-electric-blue/20 hover:shadow-electric-blue/40 disabled:bg-slate-600 disabled:shadow-none"
              >
                {loading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : 'Accedi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- CAMPO INPUT RIUTILIZZABILE ---
const InputField = ({ label, name, value, onChange, required, type = "text", readOnly = false, placeholder = '', step = null }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
        <input 
            type={type} 
            name={name} 
            id={name}
            value={value} 
            onChange={onChange} 
            required={required}
            readOnly={readOnly}
            placeholder={placeholder}
            step={step}
            className={`w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:ring-1 focus:ring-electric-blue focus:border-electric-blue transition-colors ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
        />
    </div>
);

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
  
  const resetSupplierForm = () => {
    setEditingSupplierId(null);
    setSupplierForm({ name: '', partNumber: '', cost: 0, leadTime: '', packaging: '' });
  };
  
  const handleAddOrUpdateSupplier = () => {
    if (!supplierForm.name || !supplierForm.partNumber) { alert("Nome fornitore e Part number sono obbligatori."); return; }
    if (editingSupplierId) {
      setFormData(prev => ({ ...prev, suppliers: prev.suppliers.map(s => s.id === editingSupplierId ? { ...supplierForm, id: editingSupplierId } : s) }));
    } else {
      setFormData(prev => ({ ...prev, suppliers: [...prev.suppliers, { id: `s_${Date.now()}`, ...supplierForm }] }));
    }
    resetSupplierForm();
  };

  const handleEditSupplier = (supplier) => {
    setActiveTab('details');
    setEditingSupplierId(supplier.id);
    setSupplierForm({ name: supplier.name, partNumber: supplier.partNumber, cost: supplier.cost, leadTime: supplier.leadTime, packaging: supplier.packaging });
  };
  
  const handleRemoveSupplier = (supplierId) => {
    if (editingSupplierId === supplierId) resetSupplierForm();
    setFormData(prev => ({ ...prev, suppliers: prev.suppliers.filter(s => s.id !== supplierId) }));
  };

  const handleConfirmSave = async () => {
    if (note.trim() === '') { alert('La nota è obbligatoria per salvare le modifiche.'); return; }
    const componentToSave = { id: component?.id, ...formData, lfWmsCode, };
    await onSave(componentToSave, note);
    setIsConfirmModalOpen(false);
    setNote('');
  };

  const renderDetailsTab = () => (
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
              {formData.suppliers.map(sup => (
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
  );

  const renderLogsTab = () => (
    <div className="p-6 space-y-4">
      {(formData.logs && formData.logs.length > 0) ? formData.logs.map(log => (
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
  );

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
              {activeTab === 'details' ? renderDetailsTab() : renderLogsTab()}
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

const BomQuoteModal = ({ isOpen, onClose, components }) => { 
    const [sekoCodes, setSekoCodes] = useState('');
    const [quoteResults, setQuoteResults] = useState([]);
    const [searched, setSearched] = useState(false);

    const handleSearch = () => {
        const codes = sekoCodes.split(/\r?\n/).map(code => code.trim()).filter(code => code);
        const results = codes.map(code => {
            const foundComponent = components.find(c => c.sekoCode === code);
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
                // Trova il fornitore con il costo più basso
                const bestSupplier = res.component.suppliers.reduce((best, current) => {
                    return current.cost < best.cost ? current : best;
                }, res.component.suppliers[0]);

                return {
                    'Codice Seko (Input)': res.inputSeko,
                    'Codice Asel': res.component.aselCode || '',
                    'Stato': res.status,
                    'Descrizione': res.component.description,
                    'Fornitore': bestSupplier.name,
                    'Part Number Fornitore': bestSupplier.partNumber,
                    'Costo (€)': bestSupplier.cost,
                    'Lead Time': bestSupplier.leadTime,
                };
            }
            
            // Gestisce i componenti non trovati o senza fornitori
            return {
                'Codice Seko (Input)': res.inputSeko,
                'Codice Asel': res.component?.aselCode || '',
                'Stato': res.status === 'Trovato' ? 'Senza Fornitori' : 'Non Trovato',
                'Descrizione': res.component?.description || '-',
                'Fornitore': '-', 
                'Part Number Fornitore': '-', 
                'Costo (€)': '-', 
                'Lead Time': '-',
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
                    <div><label htmlFor="bom-input" className="block text-sm font-medium text-slate-400 mb-2">Incolla i codici Seko (uno per riga)</label><textarea id="bom-input" rows={8} className="w-full p-3 font-mono bg-slate-800/50 border border-slate-700 rounded-md" placeholder="514846&#10;823301" value={sekoCodes} onChange={(e) => setSekoCodes(e.target.value)} /></div>
                    {searched && (<div><h3 className="text-lg font-semibold mb-4">Risultati</h3>
                        <div className="border border-slate-800 rounded-lg overflow-hidden"><table className="w-full text-sm">
                            <thead className="text-xs bg-slate-800/80 text-slate-400"><tr><th className="px-4 py-3 font-medium tracking-wider">Seko Input</th><th className="px-4 py-3 font-medium tracking-wider">Stato</th><th className="px-4 py-3 font-medium tracking-wider">Descrizione</th><th className="px-4 py-3 font-medium tracking-wider">Fornitore (Tutti)</th><th className="px-4 py-3 font-medium tracking-wider">Costo</th></tr></thead>
                            <tbody className="divide-y divide-slate-800">{quoteResults.map((res, index) => (
                               <React.Fragment key={index}>{res.status === 'Trovato' && res.component.suppliers.length > 0 ? res.component.suppliers.map((sup, supIndex) => (
                                   <tr key={`${index}-${supIndex}`} className={`hover:bg-slate-800/70 ${supIndex > 0 ? 'text-slate-500' : ''}`}>
                                       <td className="px-4 py-2 font-mono text-electric-blue">{supIndex === 0 ? res.inputSeko : ''}</td>
                                       <td className="px-4 py-2">{supIndex === 0 ? <span className="px-2 py-1 text-xs bg-green-500/10 text-green-400 rounded-full border border-green-500/20">Trovato</span> : ''}</td>
                                       <td className="px-4 py-2">{supIndex === 0 ? res.component.description : ''}</td>
                                       <td className="px-4 py-2">{sup.name}</td>
                                       <td className="px-4 py-2">{sup.cost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 5, maximumFractionDigits: 5 })}</td>
                                   </tr>
                               )) : (
                                   <tr className="hover:bg-slate-800/70"><td className="px-4 py-2 font-mono text-electric-blue">{res.inputSeko}</td><td className="px-4 py-2"><span className={`px-2 py-1 text-xs ${res.status === 'Trovato' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'} rounded-full`}>{res.status === 'Trovato' ? 'Senza Fornitori' : 'Non Trovato'}</span></td><td className="px-4 py-2">{res.component?.description || '-'}</td><td className="px-4 py-2" colSpan="2">-</td></tr>
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
const CsvImportModal = ({ isOpen, onClose, onImport }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);

    const handleFileProcess = useCallback((file) => {
        if (!file) { setError("Nessun file selezionato."); return; }
        setError(null); setProcessing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });

                const componentsMap = new Map();
                json.forEach((row) => {
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
                onImport(Array.from(componentsMap.values()));
            } catch (err) { setError(`Errore elaborazione file: ${err.message}`); } 
            finally { setProcessing(false); }
        };
        reader.onerror = () => { setError("Impossibile leggere il file."); setProcessing(false); };
        reader.readAsBinaryString(file);
    }, [onImport]);

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4"><div className="bg-slate-900/80 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-slate-700">
            <header className="flex justify-between items-center p-5 border-b border-slate-800"><h2 className="text-xl font-bold">Importa CSV</h2><button onClick={onClose} className="text-slate-500 hover:text-slate-100"><XIcon /></button></header>
            <div className="p-6 flex-grow overflow-y-auto">
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


// --- COMPONENTI PRINCIPALI ---
const Header = ({ theme, toggleTheme, user, onLogout }) => (
    <header className="sticky top-0 z-40 bg-slate-100/80 dark:bg-slate-950/75 backdrop-blur-lg border-b border-slate-300/10 dark:border-slate-500/30 transition-colors">
      <div className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-electric-blue dark:text-electric-blue tracking-wider">
          GESTIONALE
        </h1>
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">
                {user.email}
              </span>
              <button
                onClick={onLogout}
                className="text-sm bg-slate-200/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold py-1.5 px-3 rounded-md hover:bg-slate-300 dark:hover:bg-slate-700/80 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/50 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </div>
    </header>
);

const ComponentTable = ({ components, onEdit, onDelete }) => {
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
              <th scope="col" className="px-6 py-4 font-medium tracking-wider">Codice Seko</th>
              <th scope="col" className="px-6 py-4 font-medium tracking-wider">Descrizione</th>
              <th scope="col" className="px-6 py-4 font-medium tracking-wider text-center">Fornitori</th>
              <th scope="col" className="px-6 py-4 font-medium tracking-wider text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/5 dark:divide-slate-800/80">
            {components.map((component) => (
              <tr key={component.id} className="hover:bg-slate-400/5 dark:hover:bg-slate-800/70 transition-colors duration-200 group">
                <td className="px-6 py-4 font-mono text-electric-blue whitespace-nowrap">{component.sekoCode}</td>
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

// --- APPLICAZIONE PRINCIPALE ---
const App = () => {
    // --- STATO ---
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [loginError, setLoginError] = useState(null);
    const [configError, setConfigError] = useState(null);
    
    const [components, setComponents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dbError, setDbError] = useState(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBomModalOpen, setIsBomModalOpen] = useState(false);
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [editingComponent, setEditingComponent] = useState(null);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [searchQuery, setSearchQuery] = useState('');
    
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
                           const componentsCol = collection(db, 'components');
                           const unsubscribeDb = onSnapshot(componentsCol, (snapshot) => {
                               const componentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                               setComponents(componentsList);
                               setLoading(false);
                           }, (error) => {
                               console.error("Errore Firestore: ", error);
                               setDbError("Impossibile caricare i componenti.");
                               setLoading(false);
                           });
                           return () => unsubscribeDb();
                        } else {
                            setComponents([]);
                            setLoading(false);
                        }
                    });
                     return () => unsubscribeAuth();
                })
                .catch((error) => {
                    console.error("Errore persistenza: ", error);
                    setConfigError("Errore di configurazione dell'autenticazione.");
                });
        } catch (error) {
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
            (component.lfWmsCode || '').toLowerCase().includes(lowercasedQuery)
        );
    }, [components, searchQuery]);

    const handleLogin = async (email, password) => {
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

    const addLogEntry = (component, action, details, note) => {
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

    const handleSaveComponent = useCallback(async (componentToSave, note) => {
        if (!user) return;
        const db = getFirestore();
        const isEditing = !!componentToSave.id;

        try {
            if (isEditing) {
                const originalComponent = components.find(c => c.id === componentToSave.id);
                const componentWithLog = addLogEntry(originalComponent, 'Modifica', 'Componente modificato.', note);
                const finalComponent = { ...componentToSave, logs: componentWithLog.logs }; // Merge logs with new data
                delete finalComponent.id;
                await setDoc(doc(db, "components", componentToSave.id), finalComponent);
            } else {
                const componentWithLog = addLogEntry(componentToSave, 'Creazione', 'Componente creato.', note);
                delete componentWithLog.id;
                await addDoc(collection(db, "components"), componentWithLog);
            }
            handleCloseModal();
        } catch (err) {
            console.error("Errore salvataggio:", err);
            alert("Errore durante il salvataggio.");
        }
    }, [user, components]);

    const handleDeleteComponent = useCallback(async (componentId) => {
        if (window.confirm('Sei sicuro di voler eliminare questo componente? L\'azione è irreversibile.')) {
            const db = getFirestore();
            await deleteDoc(doc(db, "components", componentId));
        }
    }, []);

    const handleCsvImport = useCallback(async (newComponents) => {
        if (!user) return;
        const db = getFirestore();
        const batch = writeBatch(db);
        newComponents.forEach(comp => {
            const compWithLog = addLogEntry(comp, 'Importazione CSV', 'Componente creato da importazione.', 'Importazione massiva');
            const newDocRef = doc(collection(db, 'components'));
            batch.set(newDocRef, compWithLog);
        });
        await batch.commit();
        handleCloseCsvModal();
    }, [user]);

    const handleOpenModal = useCallback((component) => { setEditingComponent(component); setIsModalOpen(true); }, []);
    const handleCloseModal = useCallback(() => { setIsModalOpen(false); setEditingComponent(null); }, []);
    const handleOpenBomModal = useCallback(() => setIsBomModalOpen(true), []);
    const handleCloseBomModal = useCallback(() => setIsBomModalOpen(false), []);
    const handleOpenCsvModal = useCallback(() => setIsCsvModalOpen(true), []);
    const handleCloseCsvModal = useCallback(() => setIsCsvModalOpen(false), []);
    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    if (configError) return <ErrorScreen title="Errore di Configurazione" message={configError} />;
    if (!authReady) return <LoadingScreen message="Autenticazione in corso..." />;
    if (!user) return <LoginPage onLogin={handleLogin} error={loginError} />;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-gray-800 dark:text-slate-200">
            <Header theme={theme} toggleTheme={toggleTheme} user={user} onLogout={handleLogout} />
            <main className="container mx-auto p-4 md:p-8">
                 <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-700 dark:text-slate-200 tracking-tight">Componenti Elettronici</h1>
                    <div className="flex items-center gap-4">
                        <button onClick={handleOpenCsvModal} className="flex items-center gap-2 bg-purple-500/10 text-purple-400 font-semibold py-2 px-5 rounded-lg border border-purple-500/30 hover:bg-purple-500/20"><FileImportIcon /> Importa CSV</button>
                        <button onClick={handleOpenBomModal} className="flex items-center gap-2 bg-green-500/10 text-green-400 font-semibold py-2 px-5 rounded-lg border border-green-500/30 hover:bg-green-500/20"><UploadIcon /> Quota BOM</button>
                        <button onClick={() => handleOpenModal(null)} className="flex items-center gap-2 bg-electric-blue text-white font-bold py-2 px-5 rounded-lg shadow-lg shadow-electric-blue/20 hover:bg-electric-blue/90"><PlusIcon /> Aggiungi</button>
                    </div>
                </div>
                
                <div className="mb-8">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                            <SearchIcon />
                        </span>
                        <input
                            type="text"
                            placeholder="Cerca per codice o descrizione..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800/50 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-electric-blue focus:border-electric-blue transition-colors"
                        />
                    </div>
                </div>

                {loading ? <LoadingScreen message="Caricamento componenti..." /> : dbError ? <ErrorScreen title="Errore Database" message={dbError} /> : <ComponentTable components={filteredComponents} onEdit={handleOpenModal} onDelete={handleDeleteComponent} />}
            </main>
            {isModalOpen && <ComponentModal component={editingComponent} onClose={handleCloseModal} onSave={handleSaveComponent} />}
            {isBomModalOpen && <BomQuoteModal isOpen={isBomModalOpen} onClose={handleCloseBomModal} components={components} />}
            {isCsvModalOpen && <CsvImportModal isOpen={isCsvModalOpen} onClose={handleCloseCsvModal} onImport={handleCsvImport} />}
        </div>
    );
};

export default App;

