import React, { useState } from 'react';
import { ElectronicComponent, Supplier } from '../types';
import { XIcon, SearchIcon, FileExcelIcon } from './Icons';

declare const XLSX: any;

interface BomQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: ElectronicComponent[];
}

interface QuoteResult {
    inputSeko: string;
    status: 'Trovato' | 'Non Trovato';
    component?: ElectronicComponent;
    supplier?: Supplier;
}

const BomQuoteModal: React.FC<BomQuoteModalProps> = ({ isOpen, onClose, components }) => {
    const [sekoCodes, setSekoCodes] = useState('');
    const [quoteResults, setQuoteResults] = useState<QuoteResult[]>([]);
    const [searched, setSearched] = useState(false);

    const handleSearch = () => {
        const codes = sekoCodes.split(/\r?\n/).map(code => code.trim()).filter(code => code);
        const results: QuoteResult[] = [];
        
        codes.forEach(code => {
            const foundComponent = components.find(c => c.sekoCode === code);
            if (foundComponent) {
                if (foundComponent.suppliers.length > 0) {
                    foundComponent.suppliers.forEach(supplier => {
                        results.push({ inputSeko: code, status: 'Trovato', component: foundComponent, supplier });
                    });
                } else {
                     results.push({ inputSeko: code, status: 'Trovato', component: foundComponent });
                }
            } else {
                results.push({ inputSeko: code, status: 'Non Trovato' });
            }
        });
        setQuoteResults(results);
        setSearched(true);
    };

    const handleExport = () => {
        if (typeof XLSX === 'undefined') {
            alert('La libreria per l\'esportazione non è stata caricata.');
            return;
        }

        const dataToExport = quoteResults.map(res => ({
            'Codice Seko (Input)': res.inputSeko,
            'Stato': res.status,
            'Codice LF_WMS': res.component?.lfWmsCode || '',
            'Descrizione': res.component?.description || '',
            'Fornitore': res.supplier?.name || (res.status === 'Trovato' ? 'Nessun fornitore' : ''),
            'Part Number Fornitore': res.supplier?.partNumber || '',
            'Costo (€)': res.supplier ? parseFloat(res.supplier.cost.toFixed(5)) : null,
            'Lead Time': res.supplier?.leadTime || '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Quotazione BOM');
        XLSX.writeFile(workbook, 'quotazione_bom.xlsx');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-5 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-slate-100">Quotazione Distinta Base (BOM)</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-100 transition-colors">
                        <XIcon />
                    </button>
                </header>

                <div className="p-6 flex-grow overflow-y-auto space-y-6">
                    <div>
                        <label htmlFor="bom-input" className="block text-sm font-medium text-slate-400 mb-2">
                            Incolla i codici Seko (uno per riga)
                        </label>
                        <textarea
                            id="bom-input"
                            rows={8}
                            className="w-full p-3 font-mono text-slate-300 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:ring-1 focus:ring-electric-blue focus:border-electric-blue transition-colors"
                            placeholder="514846&#10;823301&#10;999999"
                            value={sekoCodes}
                            onChange={(e) => setSekoCodes(e.target.value)}
                        />
                    </div>
                    
                    {searched && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-200 mb-4">Risultati Quotazione</h3>
                            {quoteResults.length > 0 ? (
                                <div className="border border-slate-800 rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-slate-400 bg-slate-800/80">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium tracking-wider">Seko Input</th>
                                                    <th className="px-4 py-3 font-medium tracking-wider">Stato</th>
                                                    <th className="px-4 py-3 font-medium tracking-wider">Descrizione</th>
                                                    <th className="px-4 py-3 font-medium tracking-wider">Fornitore</th>
                                                    <th className="px-4 py-3 font-medium tracking-wider">Costo</th>
                                                    <th className="px-4 py-3 font-medium tracking-wider">Lead Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800 text-slate-300">
                                                {quoteResults.map((res, index) => (
                                                    <tr key={index} className="hover:bg-slate-800/70">
                                                        <td className="px-4 py-2 font-mono text-electric-blue whitespace-nowrap">{res.inputSeko}</td>
                                                        <td className="px-4 py-2">
                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${res.status === 'Trovato' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                              {res.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 max-w-xs truncate" title={res.component?.description}>{res.component?.description || '-'}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap">{res.supplier?.name || '-'}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap">{res.supplier ? res.supplier.cost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 5, maximumFractionDigits: 5 }) : '-'}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap">{res.supplier?.leadTime || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : <p className="text-center text-slate-500 py-6">Nessun codice valido inserito per la ricerca.</p>}
                        </div>
                    )}
                </div>

                <footer className="flex justify-between items-center p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-xl">
                    <div>
                        {quoteResults.length > 0 && (
                             <button onClick={handleExport} className="flex items-center gap-2 bg-green-500/10 text-green-400 font-semibold py-2 px-4 rounded-lg border border-green-500/30 hover:bg-green-500/20 transition-all duration-300">
                                <FileExcelIcon />
                                Esporta in Excel
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="bg-slate-700/50 text-slate-300 font-semibold py-2 px-4 rounded-lg hover:bg-slate-700/80 transition">
                            Chiudi
                        </button>
                        <button onClick={handleSearch} className="flex items-center gap-2 bg-electric-blue text-white font-bold py-2 px-5 rounded-lg shadow-lg shadow-electric-blue/20 hover:bg-electric-blue/90 hover:shadow-electric-blue/40 transition-all duration-300">
                            <SearchIcon />
                            Cerca
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default BomQuoteModal;