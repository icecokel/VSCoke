import useClickOutSide from "@/hooks/use-click-out-side";
import useShortCut from "@/hooks/use-short-cut";
import { TParentNode } from "@/models/common";
import { createPortal } from "react-dom";

export interface IModalProps extends TParentNode {
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
          <div className="fixed bg-black/60 inset-0 flex items-center justify-center z-40">
            <div className="flex flex-col bg-white rounded-sm w-full md:min-w-[200px] md:w-auto" ref={ref}>
              {children}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default Modal;
