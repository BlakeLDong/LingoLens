import React, { useState } from 'react';
import { HistoryItem, LearningAnalysis } from '../types';
import { generateMnemonicImage } from '../services/geminiService';
import { ChatWidget } from './ChatWidget';
import { Button } from './Button';
import { Volume2, Star, Image as ImageIcon, ArrowLeft, BookOpen } from 'lucide-react';

interface AnalysisCardProps {
  item: HistoryItem;
  onBack: () => void;
  onToggleFavorite: (id: string) => void;
  onUpdateImage: (id: string, url: string) => void;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({ item, onBack, onToggleFavorite, onUpdateImage }) => {
  const { data } = item;
  const [generatingImage, setGeneratingImage] = useState(false);

  const handleSpeak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const handleGenerateImage = async () => {
    if (item.generatedImageUrl) return;
    setGeneratingImage(true);
    try {
      const url = await generateMnemonicImage(data.visualAidPrompt);
      if (url) {
        onUpdateImage(item.id, url);
      }
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div className="pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={20} className="mr-1" /> Back
        </button>
        <div className="flex gap-2">
            <button 
                onClick={() => onToggleFavorite(item.id)}
                className={`p-2 rounded-full transition-colors ${item.isFavorite ? 'bg-yellow-100 text-yellow-500' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
            >
                <Star size={20} fill={item.isFavorite ? "currentColor" : "none"} />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Text & Translation */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-2">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Original Text</h2>
                <button onClick={() => handleSpeak(data.originalText)} className="text-blue-600 hover:text-blue-800">
                    <Volume2 size={18} />
                </button>
            </div>
            <p className="text-xl font-medium text-slate-800 leading-relaxed">{data.originalText}</p>
            
            <div className="mt-6 pt-6 border-t border-slate-100">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Translation</h2>
                <p className="text-lg text-slate-600">{data.translation}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Grammar Notes</h2>
            <p className="text-slate-700 text-sm leading-relaxed">{data.grammarNotes}</p>
          </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Example Sentences</h2>
                <ul className="space-y-3">
                    {data.examples.map((ex, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-700">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>{ex}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>

        {/* Right Column: Visual & Keywords */}
        <div className="space-y-6">
          
          {/* Visual Aid */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Visual Memory Aid</h2>
            
            {item.generatedImageUrl ? (
                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-100">
                    <img src={item.generatedImageUrl} alt="Mnemonic" className="object-cover w-full h-full" />
                </div>
            ) : (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-slate-500 italic mb-4">"{data.visualAidPrompt}"</p>
                    <Button 
                        onClick={handleGenerateImage} 
                        isLoading={generatingImage}
                        icon={<ImageIcon size={16} />}
                        variant="secondary"
                        className="w-full"
                    >
                        {generatingImage ? 'Dreaming up image...' : 'Generate Mnemonic Image'}
                    </Button>
                </div>
            )}
          </div>

          {/* Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <BookOpen size={16} className="text-slate-400"/>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Vocabulary Breakdown</h2>
             </div>
             <div className="divide-y divide-slate-100">
                {data.breakdown && data.breakdown.length > 0 ? (
                    data.breakdown.map((word, idx) => (
                        <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-lg text-slate-800">{word.word}</span>
                                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">{word.partOfSpeech}</span>
                                </div>
                                {word.ipa && <span className="text-sm text-slate-500 font-mono">/{word.ipa}/</span>}
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-slate-800 font-medium">{word.definition}</p>
                                {word.etymology && (
                                    <p className="text-xs text-slate-500 flex gap-1">
                                        <span className="font-semibold">Note:</span> {word.etymology}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-6 text-center text-slate-400 text-sm">
                        No specific vocabulary words extracted.
                    </div>
                )}
             </div>
          </div>

        </div>
      </div>

      {/* Chat Section */}
      <ChatWidget context={data} />
    </div>
  );
};