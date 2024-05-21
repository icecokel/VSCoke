import Icon from "../Icon";
import Modal, { IModalProps } from "../Modal";
import BaseText from "../Text";
import styles from "./style.module.css";

interface IDialogProps extends IModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
}

const Dialog = ({ open, title, children, onClose }: IDialogProps) => {
  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.wrapper}>
        {title && <BaseText type="h6">{title}</BaseText>}
        <Icon kind="close" className={styles.icon} />
      </div>
      <div>{children}</div>
    </Modal>
  );
};

export default Dialog;
