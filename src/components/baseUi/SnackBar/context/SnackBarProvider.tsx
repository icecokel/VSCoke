import SnackBar from "..";
import { IHaveChildren } from "@/models/common";
import { ISnackBar } from "@ui/SnackBar/type/type";
import { Dispatch, SetStateAction, createContext, useState } from "react";

interface ISnackBarContext extends ISnackBar {
  setOption: Dispatch<SetStateAction<ISnackBar>>;
}

const DEFAULT_OPTION: ISnackBar = { open: false };

export const SnackBarContext = createContext<ISnackBarContext>({} as ISnackBarContext);

const SnackBarProvider = ({ children }: IHaveChildren) => {
  const [option, setOption] = useState<ISnackBar>(DEFAULT_OPTION);

  return (
    <SnackBarContext.Provider value={{ ...option, setOption }}>
      {children}
      <SnackBar />
    </SnackBarContext.Provider>
  );
};

export default SnackBarProvider;
