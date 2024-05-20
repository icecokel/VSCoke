import styles from "./style.module.css";
import BaseText from "@ui/Text";

interface IChipProps {
  label: string;
  className?: string;
}

const Chip = ({ label, className }: IChipProps) => {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      <BaseText type="caption">{label}</BaseText>
    </div>
  );
};

export default Chip;
