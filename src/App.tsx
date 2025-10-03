import React, { useState, useCallback, useEffect } from 'react';
import { ElectronicComponent, Supplier, User, LogEntry } from './types';
import { initialComponents } from './constants';
import Header from './components/Header';
import ComponentTable from './components/ComponentTable';
import ComponentModal from './components/ComponentModal';
import BomQuoteModal from './components/BomQuoteModal';
import CsvImportModal from './components/CsvImportModal';
import LoginPage from './components/LoginPage';
import { getCurrentUser, logout } from './auth';
import { PlusIcon, UploadIcon, FileImportIcon } from './components/Icons';
import { deepEqual } from './utils';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [components, setComponents] = useState<ElectronicComponent[]>(initialComponents);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isBomModalOpen, setIsBomModalOpen] = useState<boolean>(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [editingComponent, setEditingComponent] = useState<ElectronicComponent | null>(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (localStorage.getItem('theme') === null) {
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    }
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
  };
  
  const handleOpenModal = useCallback((component: ElectronicComponent | null) => {
    setEditingComponent(component);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingComponent(null);
  }, []);
  
  const handleOpenBomModal = useCallback(() => setIsBomModalOpen(true), []);
  const handleCloseBomModal = useCallback(() => setIsBomModalOpen(false), []);
  
  const handleOpenCsvModal = useCallback(() => setIsCsvModalOpen(true), []);
  const handleCloseCsvModal = useCallback(() => setIsCsvModalOpen(false), []);

  const handleSaveComponent = useCallback((componentToSave: ElectronicComponent, note: string) => {
    if (!currentUser) {
        alert("Sessione scaduta. Effettua nuovamente il login.");
        handleLogout();
        return;
    }

    setComponents(prevComponents => {
        const originalComponent = prevComponents.find(c => c.id === componentToSave.id);
        const newLogs: LogEntry[] = originalComponent ? (originalComponent.logs || []) : [];

        if (originalComponent) { // Modifica
            const changes: string[] = [];
            
            // Confronto fornitori
            componentToSave.suppliers.forEach(newSupplier => {
                const oldSupplier = originalComponent.suppliers.find(s => s.id === newSupplier.id);
                if (!oldSupplier) {
                    changes.push(`Aggiunto fornitore ${newSupplier.name} (${newSupplier.partNumber})`);
                } else if (!deepEqual(oldSupplier, newSupplier)) {
                    const supplierChanges: string[] = [];
                    if (oldSupplier.cost !== newSupplier.cost) supplierChanges.push(`costo (${oldSupplier.cost.toFixed(5)} -> ${newSupplier.cost.toFixed(5)})`);
                    if (oldSupplier.leadTime !== newSupplier.leadTime) supplierChanges.push(`lead time ('${oldSupplier.leadTime}' -> '${newSupplier.leadTime}')`);
                    if (oldSupplier.packaging !== newSupplier.packaging) supplierChanges.push(`confezione ('${oldSupplier.packaging}' -> '${newSupplier.packaging}')`);
                    if (oldSupplier.partNumber !== newSupplier.partNumber) supplierChanges.push(`part number ('${oldSupplier.partNumber}' -> '${newSupplier.partNumber}')`);
                     if (supplierChanges.length > 0) {
                        changes.push(`Modificato fornitore ${newSupplier.name}: ${supplierChanges.join(', ')}`);
                    }
                }
            });

            originalComponent.suppliers.forEach(oldSupplier => {
                if (!componentToSave.suppliers.some(s => s.id === oldSupplier.id)) {
                    changes.push(`Rimosso fornitore ${oldSupplier.name} (${oldSupplier.partNumber})`);
                }
            });

            if (changes.length > 0) {
                newLogs.unshift({
                    id: `log_${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    userId: currentUser.id,
                    username: currentUser.username,
                    action: "Modifica",
                    details: changes.join('; '),
                    note: note,
                });
            }
        } else { // Nuovo componente
             newLogs.unshift({
                id: `log_${Date.now()}`,
                timestamp: new Date().toISOString(),
                userId: currentUser.id,
                username: currentUser.username,
                action: "Creazione",
                details: "Componente creato.",
                note: note,
            });
        }
        
        const componentWithLogs = { ...componentToSave, logs: newLogs };
        
        if (originalComponent) {
            return prevComponents.map(c => c.id === componentToSave.id ? componentWithLogs : c);
        } else {
            return [...prevComponents, componentWithLogs];
        }
    });
    handleCloseModal();
}, [currentUser, handleCloseModal]);
  
  const handleCsvImport = useCallback((newComponents: ElectronicComponent[]) => {
    setComponents(prev => [...prev, ...newComponents]);
    handleCloseCsvModal();
  }, [handleCloseCsvModal]);

  const handleDeleteComponent = useCallback((componentId: string) => {
    if(window.confirm('Sei sicuro di voler eliminare questo componente?')) {
        setComponents(prev => prev.filter(c => c.id !== componentId));
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };
  
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-gray-800 dark:text-slate-200">
      <Header theme={theme} toggleTheme={toggleTheme} user={currentUser} onLogout={handleLogout} />
      <main className="container mx-auto p-4 md:p-8">
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-700 dark:text-slate-200 tracking-tight">Componenti Elettronici</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleOpenCsvModal}
              className="flex items-center gap-2 bg-purple-500/10 text-purple-400 font-semibold py-2 px-5 rounded-lg border border-purple-500/30 hover:bg-purple-500/20 transition-all duration-300"
            >
              <FileImportIcon />
              Importa CSV
            </button>
             <button
              onClick={handleOpenBomModal}
              className="flex items-center gap-2 bg-green-500/10 text-green-400 font-semibold py-2 px-5 rounded-lg border border-green-500/30 hover:bg-green-500/20 transition-all duration-300"
            >
              <UploadIcon />
              Quota BOM
            </button>
            <button
              onClick={() => handleOpenModal(null)}
              className="flex items-center gap-2 bg-electric-blue text-white font-bold py-2 px-5 rounded-lg shadow-lg shadow-electric-blue/20 hover:bg-electric-blue/90 hover:shadow-electric-blue/40 transition-all duration-300"
            >
              <PlusIcon />
              Aggiungi
            </button>
          </div>
        </div>
        <ComponentTable 
          components={components} 
          onEdit={handleOpenModal}
          onDelete={handleDeleteComponent}
        />
      </main>
      {isModalOpen && (
        <ComponentModal
          component={editingComponent}
          onClose={handleCloseModal}
          onSave={handleSaveComponent}
        />
      )}
      {isBomModalOpen && (
        <BomQuoteModal 
          isOpen={isBomModalOpen}
          onClose={handleCloseBomModal}
          components={components}
        />
      )}
       {isCsvModalOpen && (
        <CsvImportModal
          isOpen={isCsvModalOpen}
          onClose={handleCloseCsvModal}
          onImport={handleCsvImport}
        />
      )}
    </div>
  );
};

export default App;
