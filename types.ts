
// Data structures for the application

export enum ViewState {
  HOME = 'HOME',
  ANALYSIS = 'ANALYSIS',
  HISTORY = 'HISTORY',
  FAVORITES = 'FAVORITES',
  DAILY_STUDY = 'DAILY_STUDY'
}

export interface WordBreakdown {
  word: string;
  partOfSpeech: string;
  ipa: string;
  definition: string;
  etymology: string;
}

export interface LearningAnalysis {
  originalText: string;
  translation: string;
  breakdown: WordBreakdown[];
  examples: string[];
  visualAidPrompt: string;
  grammarNotes: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  data: LearningAnalysis;
  isFavorite: boolean;
  generatedImageUrl?: string; // Cache the image if generated
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface StoryResponse {
  title: string;
  content: string;
  englishContent: string; // The raw English text for TTS and display
}

// --- Daily Study Types ---

export type UserLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface UserPreferences {
  level: UserLevel;
  dailyGoal: number; // Number of items
  lastStudyDate?: string; // ISO Date string
  streak: number;
}

export type LessonItemType = 'sentence' | 'vocabulary';

export interface DailyLessonItem {
  id: string;
  type: LessonItemType;
  content: string; // The sentence or the target word
  translation: string;
  
  // For Sentence Type
  grammarFocus?: string; // The grammatical concept being taught
  keyWords?: WordBreakdown[]; // Words inside the sentence
  
  // For Vocabulary Type
  definition?: string; // English definition
  options?: string[]; // For multiple choice (one is correct translation, others distractors)
  correctOptionIndex?: number;
  contextSentence?: string;
}

// Gemini Types helper
export interface ContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}
