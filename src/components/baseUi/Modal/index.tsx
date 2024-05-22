import styles from "./style.module.css";
import useClickOutSide from "@/hooks/useClickOutSide";
import { IHaveChildren } from "@/models/common";
import { createPortal } from "react-dom";

export interface IModalProps extends IHaveChildren {
  open: boolean;
  onClose: () => void;
}

const Modal = ({ onClose, open, children }: IModalProps) => {
  const ref = useClickOutSide(onClose);
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
