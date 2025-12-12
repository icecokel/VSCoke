import Icon, { TKind } from "@/components/base-ui/icon";
import BaseText from "@/components/base-ui/text";
import { twMerge } from "tailwind-merge";

interface OpenProjectModalItemProps {
  label: string;
  iconKind: TKind;
  enabledArrow?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

const OpenProjectModalItem = ({
  iconKind,
  label,
  enabledArrow,
  isActive,
  onClick,
}: OpenProjectModalItemProps) => {
  return (
    <div
      className={twMerge(
        "flex items-center gap-x-2 hover:bg-blue-300/50 hover:text-white px-2 py-1 rounded-xs",
        isActive && "bg-blue-300",
      )}
      onClick={onClick}
    >
      <Icon kind={iconKind} className={twMerge(!isActive && "text-blue-300")} />
      <BaseText type="body2" className="font-bold flex-1">
        {label}
      </BaseText>
      <div className="hidden md:block">{enabledArrow && <Icon kind="chevron_right" />}</div>
    </div>
  );
};

export default OpenProjectModalItem;
