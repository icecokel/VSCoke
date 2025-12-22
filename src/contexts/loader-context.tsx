"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface LoaderContextType {
  isLoading: boolean;
  startLoader: () => void;
  endLoader: () => void;
}

const LoaderContext = createContext<LoaderContextType | null>(null);

interface LoaderProviderProps {
  children: ReactNode;
}

export const LoaderProvider = ({ children }: LoaderProviderProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const startLoader = useCallback(() => {
    setIsLoading(true);
  }, []);

  const endLoader = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <LoaderContext.Provider value={{ isLoading, startLoader, endLoader }}>
      {children}
    </LoaderContext.Provider>
  );
};

export const useLoader = () => {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error("useLoader must be used within LoaderProvider");
  }
  return context;
};
