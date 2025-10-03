import React from 'react';
import { MoonIcon, SunIcon } from './Icons';
import { User } from '../types';

interface HeaderProps {
  theme: string;
  toggleTheme: () => void;
  user: User | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, user, onLogout }) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-100/80 dark:bg-slate-950/75 backdrop-blur-lg border-b border-slate-300/10 dark:border-slate-500/30 transition-colors">
      <div className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-electric-blue dark:text-electric-blue tracking-wider">
          GESTIONALE
        </h1>
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">
                Benvenuto, <span className="font-semibold text-slate-700 dark:text-slate-200">{user.username}</span>
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
};

export default Header;
