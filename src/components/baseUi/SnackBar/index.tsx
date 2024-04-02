import { SnackBarContext } from "./context/SnackBarProvider";
import styles from "./style.module.css";
import BaseText from "@ui/Text";
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
          <div className={styles.wrapper}>
            <div className={styles.snackBar}>
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
