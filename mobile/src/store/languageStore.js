import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
];

const CODES = LANGUAGES.map((language) => language.code);

export function normalizeLanguage(value) {
  const code = String(value || 'en').toLowerCase().split('-')[0];
  return CODES.includes(code) ? code : 'en';
}

export const useLanguageStore = create((set) => ({
  language: 'en',
  initLanguage: async () => {
    const stored = await SecureStore.getItemAsync('language');
    set({ language: normalizeLanguage(stored) });
  },
  setLanguage: async (language) => {
    const normalized = normalizeLanguage(language);
    await SecureStore.setItemAsync('language', normalized);
    set({ language: normalized });
  },
}));
