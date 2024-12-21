import styles from "./style.module.css";
import useClickOutSide from "@/hooks/use-click-out-side";
import { TParentNode } from "@/models/common";

interface IMenuProps extends TParentNode {
  targetEl: null | HTMLElement;
  onClose: () => void;
}

const Menu = ({ targetEl, children, onClose }: IMenuProps) => {
  const open = Boolean(targetEl);
  const ref = useClickOutSide(onClose);

  if (!open) {
    return <></>;
  }

  const rect = targetEl?.getBoundingClientRect();
  return (
    <ul
      style={{
        top: rect?.bottom,
        left: rect?.left,
      }}
      className={styles.wrapper}
      ref={ref}
    >
      {children}
    </ul>
  );
};

export default Menu;

interface IMenuItemProps extends TParentNode {
  onClick?: () => void;
}

Menu.item = ({ onClick, children }: IMenuItemProps) => {
  return (
    <li onClick={onClick} className={styles.item}>
      {children}
    </li>
  );
};
