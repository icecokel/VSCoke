"use client";

import OpenProjectModal from "./open-project-modal";
import { useBoolean } from "@/hooks/use-boolean";
import { TParentNode } from "@/models/common";
import Menu from "@ui/menu";
import BaseText from "@ui/text";
import { MouseEventHandler, useState } from "react";

interface IMenuItem {
  name: string;
  shortcut?: string;
  items?: IMenuItem[];
  onClick?: () => void;
}

interface IMenu {
  key: string;
  name: string;
  items: IMenuItem[];
}

const Menubar = ({ children }: TParentNode) => {
  const [currentEl, setCurrentEl] = useState<null | HTMLElement>(null);

  const project = useBoolean();

  const MENULIST: IMenu[] = [
    {
      key: "1",
      name: "File",
      items: [
        {
          name: "Open Project",
          onClick: () => {
            project.onTrue();
            setCurrentEl(null);
          },
        },
      ],
    },
    { key: "2", name: "Help", items: [{ name: "준비 중 ..." }] },
  ];
  const currentItems = MENULIST.find(({ name }) => name === currentEl?.id);

  const onClose = () => {
    setCurrentEl(null);
  };

  const handleClickMenu: MouseEventHandler<HTMLDivElement> = event => {
    event.preventDefault();
    setCurrentEl(event.currentTarget);
  };

  return (
    <>
      <div className="bg-gray-900 p-1 flex border-b-2 border-b-gray-500">
        {MENULIST.map((item, index) => {
          return (
            <div
              key={`${item.key}_${index}`}
              onClick={handleClickMenu}
              id={`${item.name}`}
              className="hover:bg-gray-300 text-gray-300 hover:text-black hover:rounded-sm"
            >
              <BaseText type="body1" className="px-3 select-none">
                {item.name}
              </BaseText>
            </div>
          );
        })}
      </div>
      <Menu targetEl={currentEl} onClose={onClose}>
        {currentItems?.items.map((item, index) => {
          return (
            <Menu.item key={`${currentItems.name}_item_${index}`} onClick={item.onClick}>
              {item.name}
            </Menu.item>
          );
        })}
      </Menu>

      <OpenProjectModal open={project.value} onClose={project.onFalse} />

      {children}
    </>
  );
};

export default Menubar;
