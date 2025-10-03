import React from 'react';
import { ElectronicComponent } from '../types';
import { EditIcon, TrashIcon } from './Icons';

interface ComponentTableProps {
  components: ElectronicComponent[];
  onEdit: (component: ElectronicComponent) => void;
  onDelete: (componentId: string) => void;
}

const ComponentTable: React.FC<ComponentTableProps> = ({ components, onEdit, onDelete }) => {
  if (components.length === 0) {
    return (
      <div className="text-center p-12 bg-slate-900/50 border border-slate-800/50 rounded-lg shadow-md">
        <h2 className="text-xl text-slate-400">Nessun componente trovato.</h2>
        <p className="text-slate-500 mt-2">Inizia aggiungendo un nuovo componente.</p>
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
              <th scope="col" className="px-6 py-4 font-medium tracking-wider">Codice Asel</th>
              <th scope="col" className="px-6 py-4 font-medium tracking-wider">Codice LF_WMS</th>
              <th scope="col" className="px-6 py-4 font-medium tracking-wider">Descrizione</th>
              <th scope="col" className="px-6 py-4 font-medium tracking-wider text-center">Fornitori</th>
              <th scope="col" className="px-6 py-4 font-medium tracking-wider text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/5 dark:divide-slate-800/80">
            {components.map((component) => (
              <tr key={component.id} className="hover:bg-slate-400/5 dark:hover:bg-slate-800/70 transition-colors duration-200 group">
                <td className="px-6 py-4 font-mono text-electric-blue whitespace-nowrap">{component.sekoCode}</td>
                <td className="px-6 py-4 font-mono whitespace-nowrap">{component.aselCode}</td>
                <td className="px-6 py-4 font-mono font-bold whitespace-nowrap">{component.lfWmsCode}</td>
                <td className="px-6 py-4 max-w-xs truncate" title={component.description}>{component.description}</td>
                <td className="px-6 py-4 text-center">
                  <span className="bg-electric-blue/10 text-electric-blue-light text-xs font-bold px-3 py-1 rounded-full border border-electric-blue/20">
                    {component.suppliers.length}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(component)} className="p-2 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-electric-blue transition-colors" aria-label="Modifica">
                      <EditIcon />
                    </button>
                    <button onClick={() => onDelete(component.id)} className="p-2 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-red-500 transition-colors" aria-label="Elimina">
                       <TrashIcon />
                    </button>
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

export default ComponentTable;