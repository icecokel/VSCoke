import styles from "./style.module.css";
import Icon from "@/components/baseUi/Icon";
import { TParentNode } from "@/models/common";

type TTipType = "info";

export interface IMdxTipProps extends TParentNode {
  type?: TTipType;
}

const MdxTip = ({ children, type = "info" }: IMdxTipProps) => {
  return (
    <div className={`${styles.wrapper} ${styles[type]}`}>
      <Icon kind="info" className={styles.icon} />
      {children}
    </div>
  );
};

export default MdxTip;
