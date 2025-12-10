import BaseText from "@ui/text";

interface IChipProps {
  label: string;
  className?: string;
}

const Chip = ({ label, className }: IChipProps) => {
  return (
    <div className={`inline-flex border border-white rounded-2xl px-2 py-1 justify-center items-center m-1 ${className}`}>
      <BaseText type="caption">{label}</BaseText>
    </div>
  );
};

export default Chip;
