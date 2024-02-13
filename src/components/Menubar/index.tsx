"use client";

import Menu from "../baseUi/Menu";
import OpenProjectModal from "./OpenProjectModal";
import { IHaveChildren } from "@/models/common";
import BaseText from "@ui/Text";
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

const Menubar = ({ children }: IHaveChildren) => {
  const [currentEl, setCurrentEl] = useState<null | HTMLElement>(null);
  const [openProject, setOpenProject] = useState(false);

  const MENULIST: IMenu[] = [
    {
      key: "1",
      name: "File",
      items: [
        {
          name: "Open Project",
          onClick: () => {
            setOpenProject(true);
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
            <div key={`${item.key}_${index}`} onClick={handleClickMenu} id={item.name}>
              <BaseText type="body1" className="text-gray-300 px-3 select-none">
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

      <OpenProjectModal
        open={openProject}
        onClose={() => {
          setOpenProject(false);
        }}
      />

      {children}
    </>
  );
};

export default Menubar;
