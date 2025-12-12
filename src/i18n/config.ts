import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import koKR from "./locales/ko-KR.json";
import enUS from "./locales/en-US.json";

export const LANGUAGES = {
  "ko-KR": { label: "한국어", resource: koKR },
  "en-US": { label: "English", resource: enUS },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

export const DEFAULT_LANGUAGE: LanguageCode = "ko-KR";
export const LANGUAGE_STORAGE_KEY = "vscoke-language";

const resources = {
  "ko-KR": { translation: koKR },
  "en-US": { translation: enUS },
};

i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
