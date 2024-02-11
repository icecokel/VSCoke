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
          <div className="fixed bg-gray-900/60 inset-0 flex items-center justify-center">
            <div className="flex flex-col bg-white p-3 rounded min-w-[200px]" ref={ref}>
              {children}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default Modal;
