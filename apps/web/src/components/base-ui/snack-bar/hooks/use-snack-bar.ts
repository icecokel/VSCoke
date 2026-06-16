import { SnackBarContext } from "@/components/base-ui/snack-bar/context/snack-bar-provider";
import { ISnackBar } from "@/components/base-ui/snack-bar/types/types";
import { useContext } from "react";

const useSnackBar = ({ message, duration = 5000 }: Omit<ISnackBar, "open">) => {
  const { setOption } = useContext(SnackBarContext);

  const open = () => {
    setOption({ message, duration, open: true });
  };

  return { open };
};

export default useSnackBar;
