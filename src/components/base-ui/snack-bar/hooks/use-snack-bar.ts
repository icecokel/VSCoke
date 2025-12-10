import { SnackBarContext } from "@ui/snack-bar/context/snack-bar-provider";
import { ISnackBar } from "@ui/snack-bar/type/type";
import { useContext } from "react";

const useSnackBar = ({ message, duration = 5000 }: Omit<ISnackBar, "open">) => {
  const { setOption } = useContext(SnackBarContext);

  const open = () => {
    setOption({ message, duration, open: true });
  };

  return { open };
};

export default useSnackBar;
