import styles from "./style.module.css";
import useClickOutSide from "@/hooks/useClickOutSide";
import useShortCut from "@/hooks/useShortCut";
import { IHaveChildren } from "@/models/common";
import { createPortal } from "react-dom";

export interface IModalProps extends IHaveChildren {
  open: boolean;
  onClose: () => void;
  disabledEscape?: boolean;
}

const Modal = ({ onClose, open, children, disabledEscape = false }: IModalProps) => {
  const ref = useClickOutSide(onClose);
  const key = disabledEscape ? [] : ["escape"];
  useShortCut(key, onClose);
  return (
    <>
      {open &&
        createPortal(
          <div className={styles.wrapper}>
            <div className={styles.contents} ref={ref}>
              {children}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default Modal;
