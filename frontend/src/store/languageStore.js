import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const LANGUAGE_CODES = LANGUAGES.map((language) => language.code);

export function normalizeLanguage(value) {
  const code = String(value || 'en').toLowerCase().split('-')[0];
  return LANGUAGE_CODES.includes(code) ? code : 'en';
}

export const useLanguageStore = create(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language: normalizeLanguage(language) }),
    }),
    {
      name: 'civicpulse-language',
      partialize: (state) => ({ language: state.language }),
    },
  ),
);
