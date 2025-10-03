import React, { useState, useEffect } from 'react';
import { ElectronicComponent, Supplier } from '../types';
import { PlusIcon, SaveIcon, TrashIcon, XIcon, EditIcon } from './Icons';

interface ComponentModalProps {
  component: ElectronicComponent | null;
  onClose: () => void;
  onSave: (component: ElectronicComponent) => void;
}

const ComponentModal: React.FC<ComponentModalProps> = ({ component, onClose, onSave }) => {
  const [formData, setFormData] = useState<Omit<ElectronicComponent, 'id' | 'lfWmsCode'>>({
    sekoCode: '',
    aselCode: '',
    description: '',
    suppliers: []
  });
  const [lfWmsCode, setLfWmsCode] = useState('');

  const initialSupplierFormState = {
    name: '',
    partNumber: '',
    cost: 0,
    leadTime: '',
    packaging: ''
  };

  const [supplierForm, setSupplierForm] = useState<Omit<Supplier, 'id'>>(initialSupplierFormState);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  useEffect(() => {
    if (component) {
      setFormData({
        sekoCode: component.sekoCode,
        aselCode: component.aselCode,
        description: component.description,
        suppliers: [...component.suppliers]
      });
      setLfWmsCode(component.lfWmsCode);
    } else {
      setFormData({ sekoCode: '', aselCode: '', description: '', suppliers: [] });
      setLfWmsCode('');
    }
  }, [component]);

  useEffect(() => {
    setLfWmsCode(formData.sekoCode ? `AS${formData.sekoCode}` : '');
  }, [formData.sekoCode]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSupplierFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSupplierForm(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  }

  const handleAddOrUpdateSupplier = () => {
    if(!supplierForm.name || !supplierForm.partNumber) {
        alert("Nome fornitore e Part number sono obbligatori.");
        return;
    }

    if (editingSupplierId) {
      setFormData(prev => ({
        ...prev,
        suppliers: prev.suppliers.map(s => s.id === editingSupplierId ? { ...supplierForm, id: editingSupplierId } : s)
      }));
    } else {
      const newSupplier: Supplier = { id: `s_${Date.now()}`, ...supplierForm };
      setFormData(prev => ({ ...prev, suppliers: [...prev.suppliers, newSupplier] }));
    }
    resetSupplierForm();
  }

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplierId(supplier.id);
    setSupplierForm({
      name: supplier.name,
      partNumber: supplier.partNumber,
      cost: supplier.cost,
      leadTime: supplier.leadTime,
      packaging: supplier.packaging
    });
  }

  const resetSupplierForm = () => {
    setEditingSupplierId(null);
    setSupplierForm(initialSupplierFormState);
  }
  
  const handleRemoveSupplier = (supplierId: string) => {
    if (editingSupplierId === supplierId) {
      resetSupplierForm();
    }
    setFormData(prev => ({ ...prev, suppliers: prev.suppliers.filter(s => s.id !== supplierId) }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const componentToSave: ElectronicComponent = {
      id: component?.id || `c_${Date.now()}`,
      ...formData,
      lfWmsCode,
    };
    onSave(componentToSave);
  };
  
  const InputField = ({ label, name, value, onChange = (_e) => {}, required = false, type = "text", readOnly = false, placeholder = '', className = '' }) => (
    <div className={className}>
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
            className={`w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:ring-1 focus:ring-electric-blue focus:border-electric-blue transition-colors ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
        />
    </div>
  );


  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <header className="flex justify-between items-center p-5 border-b border-slate-800">
          <h2 className="text-xl font-bold text-slate-100">{component ? 'Modifica Componente' : 'Nuovo Componente'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-100 transition-colors">
            <XIcon />
          </button>
        </header>
        
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-slate-400 mb-1">Descrizione</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows={2} required className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:ring-1 focus:ring-electric-blue focus:border-electric-blue transition-colors"/>
            </div>
            <InputField label="Codice Seko" name="sekoCode" value={formData.sekoCode} onChange={handleInputChange} required />
            <InputField label="Codice Asel" name="aselCode" value={formData.aselCode} onChange={handleInputChange} />
            <InputField label="Codice LF_WMS (Auto-generato)" name="lfWmsCode" value={lfWmsCode} readOnly className="md:col-span-2"/>
          </div>
          
          <div className="p-6 border-t border-slate-800">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">{editingSupplierId ? 'Modifica Fornitore' : 'Aggiungi Fornitore'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-800/40 rounded-lg border border-slate-700/80 mb-6">
                  <div>
                      <label className="text-xs font-medium text-slate-400">Nome Fornitore</label>
                      <input type="text" name="name" placeholder="Es. Mouser" value={supplierForm.name} onChange={handleSupplierFormChange} className="w-full mt-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-electric-blue focus:border-electric-blue"/>
                  </div>
                   <div>
                      <label className="text-xs font-medium text-slate-400">Part Number</label>
                      <input type="text" name="partNumber" placeholder="Codice del fornitore" value={supplierForm.partNumber} onChange={handleSupplierFormChange} className="w-full mt-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-electric-blue focus:border-electric-blue"/>
                  </div>
                   <div>
                      <label className="text-xs font-medium text-slate-400">Confezione</label>
                      <input type="text" name="packaging" placeholder="Es. Bobina" value={supplierForm.packaging} onChange={handleSupplierFormChange} className="w-full mt-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-electric-blue focus:border-electric-blue"/>
                  </div>
                  <div>
                      <label className="text-xs font-medium text-slate-400">Costo</label>
                      <div className="relative"><span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">€</span><input type="number" name="cost" placeholder="0.00000" value={supplierForm.cost} onChange={handleSupplierFormChange} step="0.00001" className="w-full mt-1 pl-7 pr-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-electric-blue focus:border-electric-blue"/></div>
                  </div>
                  <div className="lg:col-span-2 flex items-end gap-2">
                    <div className="w-full">
                        <label className="text-xs font-medium text-slate-400">Lead Time</label>
                        <input type="text" name="leadTime" placeholder="Es. 10 giorni / STOCK" value={supplierForm.leadTime} onChange={handleSupplierFormChange} className="w-full mt-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-electric-blue focus:border-electric-blue"/>
                    </div>
                    {editingSupplierId && (
                      <button type="button" onClick={resetSupplierForm} className="bg-slate-600 text-white rounded-md p-2 hover:bg-slate-500 transition shadow-sm h-10 w-10 flex items-center justify-center self-end flex-shrink-0" title="Annulla Modifica"><XIcon className="w-5 h-5"/></button>
                    )}
                    <button type="button" onClick={handleAddOrUpdateSupplier} className="bg-electric-blue text-white rounded-md p-2 hover:bg-electric-blue/90 transition shadow-sm h-10 w-10 flex items-center justify-center self-end flex-shrink-0" title={editingSupplierId ? "Salva Modifiche" : "Aggiungi Fornitore"}>
                      {editingSupplierId ? <SaveIcon className="w-5 h-5"/> : <PlusIcon className="w-5 h-5"/>}
                    </button>
                  </div>
              </div>

              <div className="space-y-3">
                {formData.suppliers.map(sup => (
                    <div key={sup.id} className={`flex flex-wrap items-center justify-between p-3 bg-slate-800/70 border rounded-lg shadow-sm gap-4 transition-colors ${editingSupplierId === sup.id ? 'border-electric-blue/80' : 'border-slate-700/50'}`}>
                        <div className="flex-1 min-w-[200px]">
                            <p className="font-semibold text-slate-100">{sup.name}</p>
                            <p className="text-slate-400 font-mono text-sm">{sup.partNumber}</p>
                             <p className="text-slate-500 text-xs mt-1">Confezione: {sup.packaging || 'N/D'}</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-right">
                           <p className="text-slate-200 font-medium">{sup.cost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 5, maximumFractionDigits: 5 })}</p>
                           <p className="text-slate-300 bg-slate-700/50 px-2 py-1 rounded-md">{sup.leadTime}</p>
                           <div className="flex items-center gap-1">
                            <button type="button" onClick={() => handleEditSupplier(sup)} className="text-slate-400/70 hover:text-electric-blue p-1 rounded-full hover:bg-electric-blue/10 transition-colors"><EditIcon className="w-5 h-5"/></button>
                            <button type="button" onClick={() => handleRemoveSupplier(sup.id)} className="text-red-500/70 hover:text-red-500 p-1 rounded-full hover:bg-red-500/10 transition-colors"><TrashIcon className="w-5 h-5"/></button>
                           </div>
                        </div>
                    </div>
                ))}
                {formData.suppliers.length === 0 && <p className="text-center text-slate-500 py-6">Nessun fornitore aggiunto.</p>}
              </div>
          </div>
        </form>

        <footer className="flex justify-end items-center p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-xl">
          <button type="button" onClick={onClose} className="bg-slate-700/50 text-slate-300 font-semibold py-2 px-4 rounded-lg mr-2 hover:bg-slate-700/80 transition">
            Annulla
          </button>
          <button type="submit" onClick={handleSubmit} className="flex items-center gap-2 bg-electric-blue text-white font-bold py-2 px-5 rounded-lg shadow-lg shadow-electric-blue/20 hover:bg-electric-blue/90 hover:shadow-electric-blue/40 transition-all duration-300">
            <SaveIcon />
            Salva Componente
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ComponentModal;
