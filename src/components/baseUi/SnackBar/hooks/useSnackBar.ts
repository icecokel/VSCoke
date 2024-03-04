import { SnackBarContext } from "../context/SnackBarProvider";
import { ISnackBar } from "../type/type";
import { useContext } from "react";

const useSnackBar = ({ message, duration = 5000 }: Omit<ISnackBar, "open">) => {
  const { setOption } = useContext(SnackBarContext);

  const open = () => {
    setOption({ message, duration, open: true });
  };

  return { open };
};

export default useSnackBar;
