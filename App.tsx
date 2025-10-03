import React, { useState, useCallback, useEffect } from 'react';
import { ElectronicComponent } from './types';
import { initialComponents } from './constants';
import Header from './components/Header';
import ComponentTable from './components/ComponentTable';
import ComponentModal from './components/ComponentModal';
import BomQuoteModal from './components/BomQuoteModal';
import CsvImportModal from './components/CsvImportModal';
import { PlusIcon, UploadIcon, FileImportIcon } from './components/Icons';

const App: React.FC = () => {
  const [components, setComponents] = useState<ElectronicComponent[]>(initialComponents);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isBomModalOpen, setIsBomModalOpen] = useState<boolean>(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [editingComponent, setEditingComponent] = useState<ElectronicComponent | null>(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    // Force dark theme initially for the new design
    if (localStorage.getItem('theme') === null) {
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    }

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

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

  const handleSaveComponent = useCallback((componentToSave: ElectronicComponent) => {
    setComponents(prevComponents => {
      const isEditing = prevComponents.some(c => c.id === componentToSave.id);
      if (isEditing) {
        return prevComponents.map(c => c.id === componentToSave.id ? componentToSave : c);
      } else {
        return [...prevComponents, componentToSave];
      }
    });
    handleCloseModal();
  }, [handleCloseModal]);
  
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
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-gray-800 dark:text-slate-200">
      <Header theme={theme} toggleTheme={toggleTheme} />
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