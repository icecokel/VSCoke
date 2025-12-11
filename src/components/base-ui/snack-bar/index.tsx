import { SnackBarContext } from "./context/snack-bar-provider";
import BaseText from "@/components/base-ui/text";
import { useContext, useEffect } from "react";
import { createPortal } from "react-dom";

const SnackBar = () => {
  const { open, message, duration, setOption } = useContext(SnackBarContext);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setOption(prev => ({ ...prev, open: false }));
      }, duration);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [open]);

  return (
    <>
      {open &&
        createPortal(
          <div className="fixed left-0 right-0 top-[120px] flex justify-center z-40 animate-[snackbar-mount_0.2s_ease-out]">
            <div className="bg-blue-100 rounded min-h-10 p-5 flex items-center justify-center shadow-[5px_5px_2px] shadow-gray-900">
              <BaseText type="body1" className="text-gray-900 font-bold">
                {message}
              </BaseText>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default SnackBar;
