import BaseText from "../Text";
import { SnackBarContext } from "./context/SnackBarProvider";
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

  // TODO 디자인 다시 고민
  return (
    <>
      {open &&
        createPortal(
          <div className="fixed inset-x-0 top-10 flex justify-center z-40">
            <div className="border-2 border-beige-400 bg-beige-400/90 h-10 p-5 flex items-center justify-center rounded shadow-[4px_6px_6px_rgb(0,0,0,0.6)]">
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
