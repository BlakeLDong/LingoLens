
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { LearningAnalysis, ChatMessage, StoryResponse, UserLevel, DailyLessonItem } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models
const ANALYSIS_MODEL = "gemini-2.5-flash";
const CHAT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-2.5-flash-image";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

/**
 * Analyzes text or image input to produce structured learning data.
 */
export const analyzeContent = async (
  text: string | null,
  imageBase64: string | null,
  sourceLang: string,
  targetLang: string
): Promise<LearningAnalysis> => {
  
  const prompt = `
    You are an expert language tutor and dictionary assistant.
    
    Configuration:
    - Input Language: ${sourceLang === 'Auto' ? 'Detect automatically' : sourceLang}
    - Output/Explanation Language: ${targetLang}

    Analyze the provided input (text or image containing text).
    
    Return a JSON object with the following:
    1. "originalText": The detected input text (corrected if there are OCR errors).
    2. "translation": Natural translation in ${targetLang}.
    3. "breakdown": Extract key vocabulary from the input. 
       - If the input is a sentence, identify difficult or important words. 
       - If the input is a single word, analyze that word.
       - For each item, provide:
         - "word": The lemma/root form.
         - "partOfSpeech": e.g., Noun, Verb.
         - "ipa": Phonetic transcription.
         - "definition": Clear definition in ${targetLang}.
         - "etymology": Origin or mnemonic tip in ${targetLang}.
    4. "examples": 2-3 example sentences using the main words or grammar structure (in the original input language).
    5. "grammarNotes": Brief explanation of grammar points, sentence structure, or nuance in ${targetLang}.
    6. "visualAidPrompt": A descriptive English prompt for generating an image that represents the core meaning or a mnemonic for the input. Keep it under 40 words, visual and vivid.
  `;

  const parts: any[] = [{ text: prompt }];

  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64,
      },
    });
    parts.push({ text: "Extract the text from this image and analyze it." });
  } else if (text) {
    parts.push({ text: `Analyze this text: "${text}"` });
  } else {
    throw new Error("No input provided");
  }

  // Schema Definition
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      originalText: { type: Type.STRING },
      translation: { type: Type.STRING },
      breakdown: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            ipa: { type: Type.STRING },
            definition: { type: Type.STRING },
            etymology: { type: Type.STRING },
          },
        },
      },
      examples: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      grammarNotes: { type: Type.STRING },
      visualAidPrompt: { type: Type.STRING },
    },
    required: ["originalText", "translation", "breakdown", "examples", "visualAidPrompt", "grammarNotes"],
  };

  try {
    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response from AI");
    return JSON.parse(resultText) as LearningAnalysis;

  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

/**
 * Generates a mnemonic image based on the prompt provided by the analysis.
 * Uses gemini-2.5-flash-image for generation.
 */
export const generateMnemonicImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    
    return "";

  } catch (error) {
    console.error("Image generation failed", error);
    return "";
  }
};

/**
 * Context-aware chat with the tutor.
 */
export const sendChatMessage = async (
  currentHistory: ChatMessage[],
  newMessage: string,
  context: LearningAnalysis
): Promise<string> => {
  
  const systemInstruction = `
    You are a helpful language tutor. The user is currently studying the following content:
    Original: "${context.originalText}"
    Translation: "${context.translation}"
    Grammar: "${context.grammarNotes}"

    Answer the user's questions specifically related to this content. 
    Be encouraging, concise, and use markdown for formatting.
  `;

  const chat = ai.chats.create({
    model: CHAT_MODEL,
    config: { systemInstruction },
    history: currentHistory.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }))
  });

  const response = await chat.sendMessage({ message: newMessage });
  return response.text || "I couldn't generate a response.";
};

/**
 * Generates a creative short story using a list of vocabulary words.
 */
export const generateStoryFromWords = async (
    words: string[],
    theme: string
): Promise<StoryResponse> => {
    const prompt = `
        Create a short, engaging story (approx. 100-150 words) that integrates the following vocabulary words:
        ${words.join(", ")}

        Theme: ${theme}

        Instructions:
        1. You MAY change the tense, form, or pluralization of the words to fit the story naturally.
        2. The story should be compelling and help with memorization.
        3. Return JSON.
        
        Output Schema:
        {
            "title": "A creative title",
            "englishContent": "The full story text in English",
            "content": "The full story text in English (same as above)"
        }
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            englishContent: { type: Type.STRING },
            content: { type: Type.STRING },
        },
        required: ["title", "englishContent", "content"]
    };

    try {
        const response = await ai.models.generateContent({
            model: ANALYSIS_MODEL,
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });
        
        const text = response.text;
        if (!text) throw new Error("No story generated");
        return JSON.parse(text) as StoryResponse;
    } catch (e) {
        console.error("Story generation failed", e);
        throw e;
    }
};

/**
 * Generates speech audio from text using Gemini TTS.
 * Returns Base64 audio string.
 */
export const generateTextToSpeech = async (text: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: TTS_MODEL,
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (e) {
        console.error("TTS generation failed", e);
        return null;
    }
};

/**
 * Generates a daily lesson plan.
 */
export const generateDailyLesson = async (
  level: UserLevel,
  count: number,
  previousTopics: string[],
  systemLanguage: string
): Promise<DailyLessonItem[]> => {
  
  const prompt = `
    Generate a daily English lesson plan for a student at level ${level}.
    Generate exactly ${count} distinct items.
    
    The items should be a mix of:
    1. "sentence": Complex sentences that teach specific grammar points relevant to ${level} level (e.g., conditionals, relative clauses, specific tenses).
    2. "vocabulary": Vocabulary words for testing.
    
    Context/Flavor (Optional): The student has recently studied: ${previousTopics.slice(0, 10).join(", ")}.

    For "sentence" items:
    - Provide the full sentence.
    - Explain the grammar focus in ${systemLanguage}.
    - Break down difficult words in the sentence.
    - Do NOT provide 'options' or 'correctOptionIndex'.

    For "vocabulary" items:
    - Provide the target word.
    - Provide a context sentence using the word (blanked out if you want, or full).
    - Provide 4 options for the ${systemLanguage} translation/meaning (one correct, three distractors).
    - Provide the English definition.

    Important: Ensure all JSON strings are clean and properly escaped. 'grammarFocus' and 'translation' MUST be in ${systemLanguage}.

    Return a strict JSON array.
  `;

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING }, 
        type: { type: Type.STRING, enum: ["sentence", "vocabulary"] },
        content: { type: Type.STRING, description: "The main sentence or the target vocabulary word" },
        translation: { type: Type.STRING, description: `${systemLanguage} translation of the sentence OR the correct answer for vocabulary` },
        
        // Sentence specific
        grammarFocus: { type: Type.STRING, description: `Grammar explanation in ${systemLanguage}` },
        keyWords: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              partOfSpeech: { type: Type.STRING },
              ipa: { type: Type.STRING },
              definition: { type: Type.STRING, description: `Short definition in ${systemLanguage}` },
              etymology: { type: Type.STRING, description: "Optional root/origin info" },
            },
            required: ["word", "partOfSpeech", "definition"]
          }
        },

        // Vocabulary specific
        definition: { type: Type.STRING },
        contextSentence: { type: Type.STRING },
        options: { type: Type.ARRAY, items: { type: Type.STRING } },
        correctOptionIndex: { type: Type.INTEGER },
      },
      required: ["type", "content", "translation"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response for daily lesson");
    
    // Post-process to ensure IDs exist
    const parsed = JSON.parse(resultText) as DailyLessonItem[];
    return parsed.map(item => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9)
    }));

  } catch (error) {
    console.error("Daily lesson generation failed:", error);
    throw error;
  }
};
