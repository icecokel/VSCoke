import Icon from "./icon";
import Modal, { IModalProps } from "./modal";
import BaseText from "./text";

interface IDialogProps extends IModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
}

const Dialog = ({ open, title, children, onClose }: IDialogProps) => {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        {title && <BaseText type="h6">{title}</BaseText>}
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <Icon kind="close" className="text-gray-500" />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </Modal>
  );
};

export default Dialog;
