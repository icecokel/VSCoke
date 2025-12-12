"use client";

import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE, LanguageCode } from "@/i18n";
import { TParentNode } from "@/models/common";

const I18nProvider = ({ children }: TParentNode) => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    } else {
      i18n.changeLanguage(DEFAULT_LANGUAGE);
    }
    setIsInitialized(true);
  }, []);

  if (!isInitialized) {
    return null;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default I18nProvider;
