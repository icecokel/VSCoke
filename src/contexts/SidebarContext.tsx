import { TSidebar } from "@/models/enum/sidebar";
import { createContext, ReactNode, useState, useContext } from "react";

interface ISidebar {
  isOpen: boolean;
  mode: TSidebar;
}

interface ISidebarProps extends ISidebar {
  open: (props: ISidebar) => void;
}

export const SidebarContext = createContext<ISidebarProps>({
  isOpen: false,
  mode: "explore",
  open: () => {},
});

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<TSidebar>("explore");

  const open = ({ isOpen, mode }: ISidebar) => {
    setIsOpen(isOpen);
    setMode(mode);
  };

  return (
    <SidebarContext.Provider value={{ isOpen, mode, open }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  return useContext(SidebarContext);
};
