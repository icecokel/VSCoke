import Icon from "./Icon";
import Modal, { IModalProps } from "./Modal";
import BaseText from "./Text";

interface IDialogProps extends IModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
}

const Dialog = ({ open, title, children, onClose }: IDialogProps) => {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex justify-between items-center mb-3">
        {title && <BaseText type="h6">{title}</BaseText>}
        <Icon kind="close" className="text-gray-500" />
      </div>
      <div>{children}</div>
    </Modal>
  );
};

export default Dialog;
