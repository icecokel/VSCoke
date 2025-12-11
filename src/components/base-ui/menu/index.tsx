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
      className="absolute min-w-40 p-2 bg-gray-800 text-white rounded-sm flex gap-2 flex-col border-gray-900 z-30 cursor-pointer"
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
    <li onClick={onClick} className="text-sm leading-5 py-1 px-3 z-30 hover:bg-white/20 hover:text-yellow-200 hover:font-bold">
      {children}
    </li>
  );
};
