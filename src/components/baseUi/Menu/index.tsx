import useClickOutSide from "@/hooks/useClickOutSide";
import { IHaveChildren } from "@/models/common";

interface IMenuProps extends IHaveChildren {
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
      className="absolute min-w-[10em] py-2 px-1 bg-gray-800 text-white rounded gap-2 flex flex-col border-gray-900 z-50"
      ref={ref}
    >
      {children}
    </ul>
  );
};

export default Menu;

interface IMenuItemProps extends IHaveChildren {
  onClick?: () => void;
}

Menu.item = ({ onClick, children }: IMenuItemProps) => {
  return (
    <li
      onClick={onClick}
      className="hover:bg-white/20 text-sm py-1 px-3 hover:text-yellow-200 hover:font-bold z-50 cursor-pointer"
    >
      {children}
    </li>
  );
};
