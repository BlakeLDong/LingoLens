
import React, { useState, useEffect, useRef } from 'react';
import { generateStoryFromWords, generateTextToSpeech } from '../services/geminiService';
import { Button } from './Button';
import { Play, Square, Sparkles, RefreshCw } from 'lucide-react';

interface StoryGeneratorProps {
  words: string[];
  onWordClick: (word: string) => void;
}

const THEMES = [
  'Daily Life',
  'Business & Workplace',
  'Sci-Fi & Technology',
  'Fantasy & Adventure',
  'Romance',
  'Mystery',
  'Travel'
];

export const StoryGenerator: React.FC<StoryGeneratorProps> = ({ words, onWordClick }) => {
  const [theme, setTheme] = useState(THEMES[0]);
  const [story, setStory] = useState<{ title: string; content: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const handleGenerate = async () => {
    if (words.length === 0) return;
    setIsLoading(true);
    stopAudio();
    setAudioBase64(null);
    
    try {
      const result = await generateStoryFromWords(words, theme);
      setStory(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async () => {
    if (!story) return;
    
    // If we already have the audio data, just play it
    if (audioBase64) {
        playFromBase64(audioBase64);
        return;
    }

    setIsGeneratingAudio(true);
    try {
        const b64 = await generateTextToSpeech(story.content);
        if (b64) {
            setAudioBase64(b64);
            playFromBase64(b64);
        }
    } catch (e) {
        console.error("TTS Error", e);
    } finally {
        setIsGeneratingAudio(false);
    }
  };

  const playFromBase64 = async (base64: string) => {
    try {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        const ctx = audioContextRef.current;
        
        // Decode Base64 to ArrayBuffer
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Decode Audio Data
        // Note: Gemini 2.5 TTS returns raw PCM usually, but we'll try standardized decode first.
        // The SDK guidelines suggest creating a buffer manually if it's raw PCM.
        // However, for the simplified integration, let's attempt standard decode.
        // If standard decode fails, it means we need the raw PCM logic.
        // Update: The standard pattern for Gemini TTS output in web apps often requires specific PCM handling
        // but `decodeAudioData` is robust enough for many wav-like containers if provided. 
        // Since SDK implies raw PCM, let's assume raw PCM 24kHz 1 channel for safety if decode fails?
        // Actually, SDK guidelines provided a specific decodeAudioData function. Let's implement that logic.
        
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) {
            channelData[i] = dataInt16[i] / 32768.0;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setIsPlaying(false);
        
        sourceNodeRef.current = source;
        source.start(0);
        setIsPlaying(true);

    } catch (e) {
        console.error("Audio Playback Error", e);
        setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  // Helper to make text interactive
  const renderInteractiveText = (text: string) => {
    // Split by spaces but keep punctuation attached to words for visual flow, 
    // but strip it for the click handler.
    return text.split(/(\s+)/).map((segment, i) => {
      if (segment.trim() === '') return <span key={i}>{segment}</span>;
      
      // Remove punctuation for the lookup value
      const cleanWord = segment.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, "");
      
      return (
        <span 
          key={i} 
          onClick={() => onWordClick(cleanWord)}
          className="inline-block cursor-pointer hover:bg-yellow-200 hover:text-yellow-800 rounded px-0.5 transition-colors"
          title="Click to analyze"
        >
          {segment}
        </span>
      );
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-fade-in">
      {/* Configuration Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center gap-4 justify-between">
         <div className="flex items-center gap-2 w-full md:w-auto">
             <span className="text-sm font-medium text-slate-600 whitespace-nowrap">Story Theme:</span>
             <select 
                value={theme} 
                onChange={(e) => setTheme(e.target.value)}
                className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
             >
                {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
             </select>
         </div>
         
         <Button 
            onClick={handleGenerate} 
            isLoading={isLoading}
            icon={<Sparkles size={16} />}
            className="w-full md:w-auto"
         >
            Generate Story
         </Button>
      </div>

      {/* Content Area */}
      <div className="p-6 min-h-[200px]">
         {!story && !isLoading && (
            <div className="text-center text-slate-400 py-10">
                <p>Select a theme and click Generate to create a story from your saved words.</p>
            </div>
         )}

         {isLoading && (
            <div className="space-y-4 animate-pulse">
                <div className="h-8 bg-slate-100 rounded w-1/3 mx-auto"></div>
                <div className="h-4 bg-slate-100 rounded w-full"></div>
                <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                <div className="h-4 bg-slate-100 rounded w-4/6"></div>
            </div>
         )}

         {story && !isLoading && (
            <div className="space-y-6">
                <div className="text-center">
                    <h3 className="text-2xl font-serif font-bold text-slate-800 mb-2">{story.title}</h3>
                    <div className="flex justify-center gap-2">
                         {isPlaying ? (
                            <button 
                                onClick={stopAudio}
                                className="flex items-center gap-2 px-4 py-1.5 bg-red-100 text-red-600 rounded-full text-sm font-medium hover:bg-red-200 transition-colors"
                            >
                                <Square size={14} fill="currentColor" /> Stop Audio
                            </button>
                         ) : (
                            <button 
                                onClick={playAudio}
                                disabled={isGeneratingAudio}
                                className="flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors disabled:opacity-50"
                            >
                                {isGeneratingAudio ? <RefreshCw size={14} className="animate-spin"/> : <Play size={14} fill="currentColor" />}
                                {isGeneratingAudio ? 'Loading Voice...' : 'Listen to Story'}
                            </button>
                         )}
                    </div>
                </div>

                <div className="prose prose-lg prose-slate mx-auto text-slate-700 font-serif leading-relaxed p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p>{renderInteractiveText(story.content)}</p>
                </div>
                
                <p className="text-xs text-center text-slate-400">
                    Click any word in the story to analyze it in depth.
                </p>
            </div>
         )}
      </div>
    </div>
  );
};
