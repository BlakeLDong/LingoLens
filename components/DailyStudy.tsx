
import React, { useState, useEffect } from 'react';
import { DailyLessonItem, UserLevel, UserPreferences, WordBreakdown } from '../types';
import { generateDailyLesson } from '../services/geminiService';
import { Button } from './Button';
import { Settings, Play, CheckCircle, XCircle, BookOpen, HelpCircle, ChevronRight, Save, Volume2 } from 'lucide-react';

interface DailyStudyProps {
  onWordClick: (word: string) => void; // For analyzing specific words in sentences
  onSaveItem: (item: any) => void; // To save a sentence to favorites/history
  systemLanguage: string;
}

const LEVELS: { id: UserLevel; label: string; desc: string; color: string }[] = [
  { id: 'A1', label: 'Beginner', desc: 'Basic phrases & survival English', color: 'bg-green-100 text-green-800' },
  { id: 'A2', label: 'Elementary', desc: 'Routine tasks & simple exchanges', color: 'bg-green-200 text-green-900' },
  { id: 'B1', label: 'Intermediate', desc: 'Work, school & leisure topics', color: 'bg-blue-100 text-blue-800' },
  { id: 'B2', label: 'Upper Intermediate', desc: 'Complex texts & technical discussions', color: 'bg-blue-200 text-blue-900' },
  { id: 'C1', label: 'Advanced', desc: 'Social, academic & professional fluency', color: 'bg-purple-100 text-purple-800' },
  { id: 'C2', label: 'Mastery', desc: 'Nuanced & complex scenarios', color: 'bg-purple-200 text-purple-900' },
];

export const DailyStudy: React.FC<DailyStudyProps> = ({ onWordClick, onSaveItem, systemLanguage }) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lesson, setLesson] = useState<DailyLessonItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  
  // Vocabulary Quiz State
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Settings Form State
  const [tempLevel, setTempLevel] = useState<UserLevel>('B1');
  const [tempGoal, setTempGoal] = useState(5);

  useEffect(() => {
    const savedPrefs = localStorage.getItem('lingo_daily_prefs');
    if (savedPrefs) {
      setPreferences(JSON.parse(savedPrefs));
    }
  }, []);

  const savePreferences = () => {
    const newPrefs: UserPreferences = {
      level: tempLevel,
      dailyGoal: tempGoal,
      streak: preferences?.streak || 0,
      lastStudyDate: preferences?.lastStudyDate
    };
    setPreferences(newPrefs);
    localStorage.setItem('lingo_daily_prefs', JSON.stringify(newPrefs));
  };

  const startDailySession = async () => {
    if (!preferences) return;
    setIsLoading(true);
    try {
      // Get history to flavor the lesson (mocking simpler retrieval here)
      const historyRaw = localStorage.getItem('lingo_history');
      const historyWords = historyRaw 
        ? JSON.parse(historyRaw).map((h: any) => h.data.originalText).slice(0, 10) 
        : [];

      const newLesson = await generateDailyLesson(preferences.level, preferences.dailyGoal, historyWords, systemLanguage);
      setLesson(newLesson);
      setCurrentIndex(0);
      setCompleted(false);
      setSelectedOption(null);
      setIsCorrect(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < lesson.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsCorrect(null);
    } else {
      setCompleted(true);
      // Update streak logic could go here
    }
  };

  const handleQuizAnswer = (index: number, correctIndex: number) => {
    if (selectedOption !== null) return; // Prevent multiple guesses
    setSelectedOption(index);
    setIsCorrect(index === correctIndex);
  };

  const handleSpeak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // --- Render Interactive Sentence Words ---
  const renderClickableSentence = (text: string) => {
    return text.split(/(\s+)/).map((segment, i) => {
        if (segment.trim() === '') return <span key={i}>{segment}</span>;
        const cleanWord = segment.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, "");
        return (
            <span 
                key={i} 
                onClick={() => onWordClick(cleanWord)}
                className="cursor-pointer hover:bg-blue-200 rounded px-0.5 transition-colors"
            >
                {segment}
            </span>
        );
    });
  };

  // --- VIEW: Settings / Onboarding ---
  if (!preferences) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Personalize Your Learning</h2>
          <p className="text-slate-500">Tell us your level to get started with daily lessons.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">English Level</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setTempLevel(lvl.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    tempLevel === lvl.id 
                      ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800">{lvl.label}</span>
                    <span className={`text-xs px-2 py-1 rounded font-bold ${lvl.color}`}>{lvl.id}</span>
                  </div>
                  <p className="text-xs text-slate-500">{lvl.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Daily Goal (Items)</label>
            <div className="flex items-center gap-4">
               <input 
                 type="range" 
                 min="3" 
                 max="10" 
                 step="1"
                 value={tempGoal}
                 onChange={(e) => setTempGoal(parseInt(e.target.value))}
                 className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
               />
               <span className="font-bold text-slate-800 min-w-[3rem] text-center">{tempGoal}</span>
            </div>
          </div>

          <Button onClick={savePreferences} className="w-full justify-center">
            Start Learning
          </Button>
        </div>
      </div>
    );
  }

  // --- VIEW: Dashboard (Before Start) ---
  if (lesson.length === 0 && !completed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
            <BookOpen size={40} />
        </div>
        <div>
            <h2 className="text-3xl font-bold text-slate-800">Daily Study</h2>
            <p className="text-slate-500 mt-2">Ready for your {preferences.dailyGoal} items today?</p>
        </div>
        <div className="flex gap-2 items-center text-sm text-slate-400 bg-slate-50 px-4 py-2 rounded-full">
            <span>Level: {preferences.level}</span>
            <span>•</span>
            <span>Streak: {preferences.streak} days</span>
        </div>
        <Button 
            onClick={startDailySession} 
            isLoading={isLoading}
            className="!px-8 !py-3 !text-lg shadow-lg shadow-blue-200"
            icon={<Play size={20} fill="currentColor" />}
        >
            Start Session
        </Button>
        <button onClick={() => setPreferences(null)} className="text-slate-400 hover:text-slate-600 flex items-center text-sm mt-4">
            <Settings size={14} className="mr-1" /> Adjust Level
        </button>
      </div>
    );
  }

  // --- VIEW: Summary (Completed) ---
  if (completed) {
      return (
        <div className="max-w-xl mx-auto text-center space-y-8 py-10 animate-fade-in">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto">
                <CheckCircle size={48} />
            </div>
            <div>
                <h2 className="text-3xl font-bold text-slate-800">Session Complete!</h2>
                <p className="text-slate-500 mt-2">You've studied {lesson.length} items today.</p>
            </div>
            <Button onClick={() => setLesson([])} variant="secondary">
                Back to Dashboard
            </Button>
        </div>
      );
  }

  // --- VIEW: Active Lesson Item ---
  const item = lesson[currentIndex];

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-12">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-6 text-sm font-medium text-slate-500">
        <span>Item {currentIndex + 1} of {lesson.length}</span>
        <span className={`uppercase px-2 py-1 rounded text-xs ${item.type === 'sentence' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
            {item.type}
        </span>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full mb-8 overflow-hidden">
        <div 
            className="bg-blue-600 h-full transition-all duration-500 ease-out" 
            style={{ width: `${((currentIndex + 1) / lesson.length) * 100}%` }}
        />
      </div>

      {/* Card Content */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden min-h-[400px] flex flex-col">
        
        {/* SENTENCE MODE */}
        {item.type === 'sentence' && (
            <div className="p-8 flex flex-col h-full">
                <div className="flex-1">
                    <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-4">Analysis & Grammar</h3>
                    <div className="flex gap-3 items-start mb-6">
                        <p className="text-2xl md:text-3xl font-serif text-slate-800 leading-relaxed flex-1">
                            {renderClickableSentence(item.content)}
                        </p>
                        <button 
                            onClick={() => handleSpeak(item.content)}
                            className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shrink-0 mt-1"
                        >
                            <Volume2 size={24} />
                        </button>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                        <div className="flex items-start gap-3">
                            <HelpCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
                            <div>
                                <h4 className="font-bold text-slate-700 text-sm">Grammar Focus ({systemLanguage})</h4>
                                <p className="text-slate-600 mt-1">{item.grammarFocus}</p>
                            </div>
                        </div>
                    </div>

                    {item.keyWords && item.keyWords.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase">Key Vocabulary</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {item.keyWords.map((kw, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                                        <div className="flex-1 min-w-0 mr-2">
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-bold text-slate-800 truncate">{kw.word}</span>
                                                <span className="text-xs text-slate-400">/{kw.ipa || ''}/</span>
                                            </div>
                                            <p className="text-xs text-slate-500 truncate">{kw.definition}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">{kw.partOfSpeech}</span>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSpeak(kw.word);
                                                }}
                                                className="p-1.5 text-blue-400 hover:text-blue-600 rounded-full hover:bg-blue-50"
                                            >
                                                <Volume2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                     <Button 
                        variant="secondary" 
                        icon={<Save size={18} />}
                        onClick={() => onSaveItem({
                            originalText: item.content,
                            translation: item.translation,
                            grammarNotes: item.grammarFocus,
                            breakdown: item.keyWords || [],
                            examples: [],
                            visualAidPrompt: "A visual representation of the grammar concept"
                        })}
                    >
                        Save
                    </Button>
                    <Button onClick={handleNext} icon={<ChevronRight size={18} />} className="flex-row-reverse">
                        Next
                    </Button>
                </div>
            </div>
        )}

        {/* VOCABULARY MODE */}
        {item.type === 'vocabulary' && (
            <div className="p-8 flex flex-col h-full">
                <div className="flex-1 text-center">
                    <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-8">Vocabulary Quiz</h3>
                    
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <h2 className="text-4xl font-bold text-slate-800">{item.content}</h2>
                        <button 
                            onClick={() => handleSpeak(item.content)}
                            className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                            <Volume2 size={24} />
                        </button>
                    </div>
                    
                    {item.contextSentence && (
                         <p className="text-slate-500 text-lg mb-8 italic">"{item.contextSentence}"</p>
                    )}

                    <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
                        {item.options?.map((opt, idx) => {
                            let btnClass = "bg-white border-2 border-slate-200 hover:border-blue-400 text-slate-700";
                            
                            if (selectedOption !== null) {
                                if (idx === item.correctOptionIndex) {
                                    btnClass = "bg-green-50 border-2 border-green-500 text-green-700";
                                } else if (idx === selectedOption && idx !== item.correctOptionIndex) {
                                    btnClass = "bg-red-50 border-2 border-red-500 text-red-700";
                                } else {
                                    btnClass = "opacity-50 border-slate-100";
                                }
                            }

                            return (
                                <button
                                    key={idx}
                                    disabled={selectedOption !== null}
                                    onClick={() => handleQuizAnswer(idx, item.correctOptionIndex || 0)}
                                    className={`p-4 rounded-xl font-medium transition-all ${btnClass}`}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                    
                    {/* Feedback Reveal */}
                    {selectedOption !== null && (
                         <div className={`mt-8 p-4 rounded-lg ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-blue-50 text-blue-800'} animate-fade-in`}>
                            <p className="font-bold mb-1">{isCorrect ? 'Correct!' : 'Keep Learning!'}</p>
                            <p className="text-sm">{item.definition}</p>
                         </div>
                    )}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                    {selectedOption !== null && (
                        <Button onClick={handleNext} icon={<ChevronRight size={18} />} className="flex-row-reverse">
                            Next
                        </Button>
                    )}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
