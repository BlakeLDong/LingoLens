
import React from 'react';
import { ViewState } from '../types';
import { BookOpen, Clock, Home, Menu, X, Star, Calendar } from 'lucide-react';

interface LayoutProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  children: React.ReactNode;
  systemLanguage: string;
  onSystemLanguageChange: (lang: string) => void;
}

const SYSTEM_LANGUAGES = [
    'Chinese', 'English', 'Spanish', 'Japanese', 'Korean', 'French', 'German'
];

export const Layout: React.FC<LayoutProps> = ({ 
    currentView, 
    onNavigate, 
    children,
    systemLanguage,
    onSystemLanguageChange
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => {
        onNavigate(view);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        currentView === view
          ? 'bg-blue-50 text-blue-700'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200">
        <div className="p-6 border-b border-slate-100 flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">L</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800">LingoLens</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem view={ViewState.HOME} icon={Home} label="New Analysis" />
          <NavItem view={ViewState.DAILY_STUDY} icon={Calendar} label="Daily Study" />
          <NavItem view={ViewState.FAVORITES} icon={Star} label="Vocabulary Book" />
          <NavItem view={ViewState.HISTORY} icon={Clock} label="History" />
        </nav>

        {/* Language Settings Footer */}
        <div className="p-4 border-t border-slate-100">
            <label className="text-xs text-slate-400 font-bold uppercase block mb-2">System Language</label>
            <select 
                value={systemLanguage} 
                onChange={(e) => onSystemLanguageChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
            >
                {SYSTEM_LANGUAGES.map(l => (
                    <option key={l} value={l}>{l}</option>
                ))}
            </select>
            <div className="text-xs text-slate-300 text-center mt-4">
                Powered by Gemini 2.5
            </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20">
        <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className="font-bold text-lg text-slate-800">LingoLens</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-10 pt-20 px-4 flex flex-col">
          <nav className="space-y-2 flex-1">
            <NavItem view={ViewState.HOME} icon={Home} label="New Analysis" />
            <NavItem view={ViewState.DAILY_STUDY} icon={Calendar} label="Daily Study" />
            <NavItem view={ViewState.FAVORITES} icon={Star} label="Vocabulary Book" />
            <NavItem view={ViewState.HISTORY} icon={Clock} label="History" />
          </nav>
          <div className="p-4 border-t border-slate-100 mb-8">
            <label className="text-xs text-slate-400 font-bold uppercase block mb-2">System Language</label>
             <select 
                value={systemLanguage} 
                onChange={(e) => onSystemLanguageChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-3"
            >
                {SYSTEM_LANGUAGES.map(l => (
                    <option key={l} value={l}>{l}</option>
                ))}
            </select>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:p-8 p-4 pt-20 md:pt-8 w-full">
        <div className="max-w-4xl mx-auto h-full">
            {children}
        </div>
      </main>
    </div>
  );
};
