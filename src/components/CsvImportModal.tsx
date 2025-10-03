import React, { useState, useCallback } from 'react';
import { ElectronicComponent, Supplier } from '../types';
import { XIcon, FileImportIcon } from './Icons';

declare const XLSX: any;

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (components: ElectronicComponent[]) => void;
}

const REQUIRED_HEADERS = [
  'sekoCode', 'description', 'supplierName', 'supplierPartNumber', 'cost', 'leadTime'
];
const OPTIONAL_HEADERS = ['aselCode', 'packaging'];


const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFileProcess = useCallback((file: File) => {
    if (!file || !(file.name.endsWith('.csv') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx'))) {
        setError("Per favore, carica un file in formato CSV o Excel.");
        return;
    }
    
    setError(null);
    setProcessing(true);

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: true });

            if (json.length === 0) {
                throw new Error("Il file è vuoto o non contiene dati validi.");
            }

            const headers = Object.keys(json[0]);
            const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                throw new Error(`Intestazioni obbligatorie mancanti nel file: ${missingHeaders.join(', ')}`);
            }

            const componentsMap = new Map<string, ElectronicComponent>();

            json.forEach((row, index) => {
                const sekoCode = String(row.sekoCode || '').trim();
                const description = String(row.description || '').trim();
                const supplierName = String(row.supplierName || '').trim();
                const supplierPartNumber = String(row.supplierPartNumber || '').trim();
                const cost = row.cost;
                const leadTime = row.leadTime;

                if (!sekoCode || !description || !supplierName || !supplierPartNumber || cost == null || leadTime == null) {
                    console.warn(`Riga ${index + 2}: Dati obbligatori mancanti (sekoCode, description, supplierName, supplierPartNumber, cost, leadTime). La riga verrà saltata.`);
                    return;
                }

                if (!componentsMap.has(sekoCode)) {
                    const newComponent: Omit<ElectronicComponent, 'suppliers'> = {
                        id: `c_${sekoCode}_${Date.now()}`,
                        sekoCode,
                        aselCode: String(row.aselCode || ''),
                        lfWmsCode: `AS${sekoCode}`,
                        description: description,
                    };
                    componentsMap.set(sekoCode, {...newComponent, suppliers: []});
                }

                const component = componentsMap.get(sekoCode)!;
                
                const costString = String(cost || '0').trim().replace(',', '.');
                const parsedCost = parseFloat(costString);

                const newSupplier: Supplier = {
                    id: `s_${component.id}_${component.suppliers.length}`,
                    name: supplierName,
                    partNumber: supplierPartNumber,
                    cost: isNaN(parsedCost) ? 0 : parsedCost,
                    leadTime: String(leadTime).trim(),
                    packaging: String(row.packaging || '')
                };
                component.suppliers.push(newSupplier);
            });

            const newComponents = Array.from(componentsMap.values());
            onImport(newComponents);
            
        } catch (err: any) {
            console.error(err);
            setError(`Errore durante l'elaborazione del file: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    };

    reader.onerror = () => {
        setError("Impossibile leggere il file.");
        setProcessing(false);
    }

    reader.readAsBinaryString(file);

  }, [onImport]);

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, type: 'enter' | 'leave' | 'over') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'enter' || type === 'over') {
        setIsDragging(true);
    } else if (type === 'leave') {
        setIsDragging(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileProcess(e.dataTransfer.files[0]);
        e.dataTransfer.clearData();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        handleFileProcess(e.target.files[0]);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <header className="flex justify-between items-center p-5 border-b border-slate-800">
          <h2 className="text-xl font-bold text-slate-100">Importazione Massiva CSV</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-100 transition-colors">
            <XIcon />
          </button>
        </header>

        <div className="p-6 flex-grow overflow-y-auto">
            <div 
                className={`relative border-2 border-dashed rounded-lg p-10 text-center transition-colors duration-300 ${isDragging ? 'border-electric-blue bg-electric-blue/10' : 'border-slate-600 hover:border-slate-500'}`}
                onDragEnter={(e) => handleDragEvents(e, 'enter')}
                onDragLeave={(e) => handleDragEvents(e, 'leave')}
                onDragOver={(e) => handleDragEvents(e, 'over')}
                onDrop={handleDrop}
            >
                <FileImportIcon className="mx-auto h-12 w-12 text-slate-500"/>
                <p className="mt-2 text-sm text-slate-400">
                    <span className="font-semibold text-electric-blue">Trascina un file</span> o clicca per caricare
                </p>
                <p className="text-xs text-slate-600 mt-1">CSV, XLS, XLSX</p>
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileSelect} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
            </div>
            
            {processing && <p className="text-center text-electric-blue mt-4">Elaborazione in corso...</p>}
            
            {error && <div className="mt-4 p-3 bg-red-500/10 text-red-400 border border-red-500/30 rounded-md text-sm">{error}</div>}

            <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                <h4 className="font-semibold text-slate-300 mb-2">Formato File Richiesto</h4>
                <p className="text-sm text-slate-400 mb-3">Assicurati che il tuo file includa le seguenti colonne obbligatorie:</p>
                <div className="flex flex-wrap gap-2 text-xs mb-3">
                    {REQUIRED_HEADERS.map(h => <code key={h} className="bg-slate-700/70 text-slate-300 px-2 py-1 rounded-md font-bold">{h}</code>)}
                </div>
                 <p className="text-sm text-slate-400 mb-3">Le seguenti colonne sono opzionali:</p>
                <div className="flex flex-wrap gap-2 text-xs">
                    {OPTIONAL_HEADERS.map(h => <code key={h} className="bg-slate-700/70 text-slate-300 px-2 py-1 rounded-md">{h}</code>)}
                </div>
            </div>
        </div>

        <footer className="flex justify-end items-center p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-xl">
          <button type="button" onClick={onClose} className="bg-slate-700/50 text-slate-300 font-semibold py-2 px-4 rounded-lg hover:bg-slate-700/80 transition">
            Chiudi
          </button>
        </footer>
      </div>
    </div>
  );
};

export default CsvImportModal;