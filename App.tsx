
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ViewState, LearningAnalysis, HistoryItem } from './types';
import { analyzeContent } from './services/geminiService';
import { Button } from './components/Button';
import { AnalysisCard } from './components/AnalysisCard';
import { StoryGenerator } from './components/StoryGenerator';
import { DailyStudy } from './components/DailyStudy';
import { Modal } from './components/Modal';
import { Search, Image as ImageIcon, XCircle, Clock, Star, ArrowRightLeft, BookOpen, Loader } from 'lucide-react';

const LANGUAGES = [
  'English', 
  'Chinese', 
  'Japanese', 
  'Spanish', 
  'French', 
  'German', 
  'Korean', 
  'Italian',
  'Portuguese',
  'Russian'
];

function App() {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  
  // Input State
  const [textInput, setTextInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Quick View Modal State
  const [quickViewItem, setQuickViewItem] = useState<HistoryItem | null>(null);
  const [isQuickAnalyzing, setIsQuickAnalyzing] = useState(false);
  
  // Language Settings
  const [sourceLang, setSourceLang] = useState('Auto');
  const [targetLang, setTargetLang] = useState('Chinese');
  const [systemLanguage, setSystemLanguage] = useState('Chinese');

  // Story Mode Toggle
  const [showStoryMode, setShowStoryMode] = useState(false);

  // Load persistence
  useEffect(() => {
    const savedHistory = localStorage.getItem('lingo_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load history");
      }
    }
    
    const savedSystemLang = localStorage.getItem('lingo_system_lang');
    if (savedSystemLang) {
        setSystemLanguage(savedSystemLang);
    }
  }, []);

  // Save persistence
  useEffect(() => {
    localStorage.setItem('lingo_history', JSON.stringify(history));
  }, [history]);
  
  const handleSystemLanguageChange = (lang: string) => {
      setSystemLanguage(lang);
      localStorage.setItem('lingo_system_lang', lang);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async (inputText: string = textInput) => {
    if (!inputText && !selectedImage) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const base64Data = selectedImage ? selectedImage.split(',')[1] : null;
      
      const result: LearningAnalysis = await analyzeContent(
        inputText, 
        base64Data, 
        sourceLang, 
        targetLang
      );
      
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        data: result,
        isFavorite: false,
      };

      setHistory(prev => [newItem, ...prev]);
      setCurrentId(newItem.id);
      setView(ViewState.ANALYSIS);
      
      // Clear inputs
      setTextInput('');
      setSelectedImage(null);
      // Reset specific states
      setShowStoryMode(false);

    } catch (err) {
      setError("Failed to analyze content. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Quick Lookup (Modal) Logic
  const handleQuickLookup = async (word: string) => {
    if (!word) return;
    setIsQuickAnalyzing(true);
    setQuickViewItem(null); // Open modal in loading state

    try {
        const result: LearningAnalysis = await analyzeContent(
            word, 
            null, 
            sourceLang === 'Auto' ? 'English' : sourceLang, // Assume English context usually if auto
            targetLang
        );

        const newItem: HistoryItem = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            data: result,
            isFavorite: false,
        };
        
        setHistory(prev => [newItem, ...prev]);
        setQuickViewItem(newItem);
    } catch (e) {
        console.error("Quick lookup failed", e);
        // Could show error in modal
    } finally {
        setIsQuickAnalyzing(false);
    }
  };

  // Wrapper to save from Daily Study
  const handleSaveDailyItem = (analysisData: LearningAnalysis) => {
     const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        data: analysisData,
        isFavorite: true, // Auto favorite saved items from daily
      };
      setHistory(prev => [newItem, ...prev]);
  };

  const toggleFavorite = (id: string) => {
    setHistory(prev => prev.map(item => 
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    ));
    // Update modal state if open
    if (quickViewItem && quickViewItem.id === id) {
        setQuickViewItem(prev => prev ? ({...prev, isFavorite: !prev.isFavorite}) : null);
    }
  };

  const updateGeneratedImage = (id: string, url: string) => {
    setHistory(prev => prev.map(item => 
      item.id === id ? { ...item, generatedImageUrl: url } : item
    ));
    // Update modal state if open
    if (quickViewItem && quickViewItem.id === id) {
        setQuickViewItem(prev => prev ? ({...prev, generatedImageUrl: url}) : null);
    }
  };

  const swapLanguages = () => {
    if (sourceLang === 'Auto') return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const currentItem = history.find(h => h.id === currentId);

  // Render Helpers
  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-2xl space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-slate-800">LingoLens Dictionary</h1>
            <p className="text-slate-500 text-lg">Translate, analyze, and learn any language with AI.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 w-full transition-all focus-within:ring-2 focus-within:ring-blue-100 overflow-hidden">
            {/* Language Selector Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-3 flex items-center gap-2">
              <div className="flex-1">
                <select 
                  value={sourceLang} 
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="w-full bg-transparent font-medium text-slate-700 text-sm focus:outline-none cursor-pointer hover:text-blue-600"
                >
                  <option value="Auto">Detect Language (Auto)</option>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              
              <button 
                onClick={swapLanguages} 
                disabled={sourceLang === 'Auto'}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30"
              >
                <ArrowRightLeft size={16} />
              </button>

              <div className="flex-1 text-right">
                <select 
                  value={targetLang} 
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full bg-transparent font-medium text-blue-600 text-sm focus:outline-none text-right cursor-pointer hover:text-blue-800"
                >
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Input Area */}
            <textarea 
                className="w-full p-6 text-lg bg-white text-slate-900 rounded-none focus:outline-none resize-none min-h-[140px] placeholder:text-slate-300"
                placeholder="Type text to analyze..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
            />
            
            {selectedImage && (
                <div className="relative mx-6 mb-4 inline-block">
                    <div className="relative group">
                      <img src={selectedImage} alt="Preview" className="h-24 w-auto rounded-lg border border-slate-200 shadow-sm" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                    </div>
                    <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-red-500 border border-slate-200 rounded-full p-1 shadow-sm transition-colors"
                    >
                        <XCircle size={16} fill="currentColor" className="bg-white rounded-full"/>
                    </button>
                </div>
            )}

            {/* Action Footer */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-50">
                <div className="flex items-center">
                    <label className="cursor-pointer flex items-center space-x-2 text-slate-500 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors group">
                        <ImageIcon size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium">Image</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                </div>
                <Button 
                    onClick={() => handleAnalyze()} 
                    isLoading={isAnalyzing}
                    disabled={(!textInput && !selectedImage) || isAnalyzing}
                    className="!rounded-xl !px-6 shadow-sm hover:shadow-md"
                    icon={<Search size={18} />}
                >
                    Analyze
                </Button>
            </div>
        </div>

        {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm text-center">
                {error}
            </div>
        )}
      </div>
    </div>
  );

  const renderHistoryOrFavorites = (isFavorites: boolean) => {
    const items = isFavorites ? history.filter(h => h.isFavorite) : history;
    
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    {isFavorites ? <Star className="text-yellow-500" fill="currentColor" /> : <Clock />}
                    {isFavorites ? 'Vocabulary Book' : 'History'}
                </h2>
                
                {isFavorites && items.length > 0 && (
                    <Button 
                        variant="secondary" 
                        onClick={() => setShowStoryMode(!showStoryMode)}
                        icon={showStoryMode ? <XCircle size={16} /> : <BookOpen size={16} />}
                        className="text-sm"
                    >
                        {showStoryMode ? 'Close Story Mode' : 'AI Story Mode'}
                    </Button>
                )}
            </div>

            {showStoryMode && isFavorites ? (
                <StoryGenerator 
                    words={items.map(i => i.data.originalText)} 
                    onWordClick={handleQuickLookup}
                />
            ) : (
                <>
                    {items.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed">
                            <p>No items found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {items.map(item => (
                                <div 
                                    key={item.id} 
                                    onClick={() => {
                                        setCurrentId(item.id);
                                        setView(ViewState.ANALYSIS);
                                    }}
                                    className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 pr-4">
                                            <p className="font-medium text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                                {item.data.originalText}
                                            </p>
                                            <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                                                {item.data.translation}
                                            </p>
                                        </div>
                                        <span className="text-xs text-slate-400 shrink-0">
                                            {new Date(item.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
  };

  return (
    <Layout 
        currentView={view} 
        onNavigate={(v) => { setView(v); setShowStoryMode(false); }}
        systemLanguage={systemLanguage}
        onSystemLanguageChange={handleSystemLanguageChange}
    >
        {view === ViewState.HOME && renderHome()}
        {view === ViewState.ANALYSIS && currentItem && (
            <AnalysisCard 
                item={currentItem} 
                onBack={() => setView(ViewState.HOME)}
                onToggleFavorite={toggleFavorite}
                onUpdateImage={updateGeneratedImage}
            />
        )}
        {view === ViewState.HISTORY && renderHistoryOrFavorites(false)}
        {view === ViewState.FAVORITES && renderHistoryOrFavorites(true)}
        {view === ViewState.DAILY_STUDY && (
            <DailyStudy 
                onWordClick={handleQuickLookup} 
                onSaveItem={handleSaveDailyItem}
                systemLanguage={systemLanguage}
            />
        )}

        {/* Quick Analysis Modal */}
        <Modal isOpen={isQuickAnalyzing || !!quickViewItem} onClose={() => { setQuickViewItem(null); setIsQuickAnalyzing(false); }}>
             {isQuickAnalyzing ? (
                 <div className="flex flex-col items-center justify-center py-24">
                    <Loader className="animate-spin text-blue-600 mb-4" size={40} />
                    <p className="text-slate-500 font-medium animate-pulse">Analyzing...</p>
                 </div>
             ) : quickViewItem ? (
                 <AnalysisCard 
                    item={quickViewItem}
                    onBack={() => setQuickViewItem(null)} // Acts as Close
                    onToggleFavorite={toggleFavorite}
                    onUpdateImage={updateGeneratedImage}
                 />
             ) : null}
        </Modal>
    </Layout>
  );
}

export default App;
