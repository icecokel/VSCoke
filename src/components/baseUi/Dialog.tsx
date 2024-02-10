import Icon from "./Icon";
import BaseText from "./Text";
import useClickOutSide from "@/hooks/useClickOutSide";
import { IHaveChildren } from "@/models/common";
import { createPortal } from "react-dom";

interface IModalProps extends IHaveChildren {
  open: boolean;
  title?: string;
  onClose: () => void;
}

const Dialog = ({ open, title, children, onClose }: IModalProps) => {
  const ref = useClickOutSide(onClose);
  return (
    <>
      {open &&
        createPortal(
          <div className="fixed bg-gray-900/60 inset-0 flex items-center justify-center">
            <div className="flex flex-col bg-white p-3 rounded min-w-[200px]" ref={ref}>
              <div className="flex justify-between items-center mb-3">
                {title && <BaseText type="h6">{title}</BaseText>}
                <Icon kind="close" className="text-gray-500" />
              </div>
              <div>{children}</div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default Dialog;
