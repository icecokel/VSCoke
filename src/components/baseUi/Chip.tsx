import BaseText from "@ui/Text";

interface IChipProps {
  label: string;
  className: string;
}

const Chip = ({ label, className }: IChipProps) => {
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        border: "1px solid white",
        borderRadius: "15px",
        padding: "0.25em 0.5em",
        justifyContent: "center",
        alignItems: "center",
        margin: "0.25em",
      }}
    >
      <BaseText type="caption">{label}</BaseText>
    </div>
  );
};

export default Chip;
