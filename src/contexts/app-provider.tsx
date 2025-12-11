"use client";

import { ITree } from "@/hooks/use-explorer";
import { TParentNode } from "@/models/common";
import SnackBarProvider from "@/components/base-ui/snack-bar/context/snack-bar-provider";
import { createContext } from "react";

export const ExplorerContext = createContext<ITree[]>([]);

interface IAppProviderProps extends TParentNode {
  explorer: ITree[];
}

const AppProvider = ({ children, explorer }: IAppProviderProps) => {
  return (
    <SnackBarProvider>
      <ExplorerContext.Provider value={explorer}>{children}</ExplorerContext.Provider>
    </SnackBarProvider>
  );
};

export default AppProvider;
