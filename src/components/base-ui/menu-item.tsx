import { TParentNode } from "@/models/common";

interface IMenuItemProps extends TParentNode {
  onClick?: () => void;
}

const MenuItem = ({ onClick, children }: IMenuItemProps) => {
  return (
    <li
      onClick={onClick}
      className="text-sm leading-5 py-1 px-3 z-30 hover:bg-white/20 hover:text-yellow-200 hover:font-bold"
    >
      {children}
    </li>
  );
};

export default MenuItem;
