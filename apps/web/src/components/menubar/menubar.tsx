"use client";

import OpenProjectModal from "./open-project-modal";
import { useBoolean } from "@/hooks/use-boolean";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import { Fragment } from "react";
import { LanguageMenu } from "./language-menu";

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

const Menubar = () => {
  const t = useTranslations("menu");

  const project = useBoolean();

  const MENULIST: IMenu[] = [
    {
      key: "1",
      name: t("file"),
      items: [
        {
          name: t("openProject"),
          onClick: () => {
            project.onTrue();
          },
        },
      ],
    },
    { key: "3", name: t("help"), items: [{ name: t("preparing") }] },
  ];

  return (
    <>
      <div id="menubar" className="bg-gray-900 p-1 flex border-b-2 border-b-gray-500 relative z-50">
        {MENULIST.map((item, index) => (
          <Fragment key={`${item.key}_${index}`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="cursor-pointer text-gray-300 hover:rounded-xs hover:bg-gray-300 hover:text-black focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:outline-none"
                >
                  <span className="block px-3 text-base leading-6 select-none">{item.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
                {item.items.map((menuItem, menuIndex) => (
                  <DropdownMenuItem
                    key={`${item.name}_item_${menuIndex}`}
                    onClick={menuItem.onClick}
                    className="hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
                  >
                    {menuItem.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {index === 0 && <LanguageMenu />}
          </Fragment>
        ))}
      </div>

      <OpenProjectModal open={project.value} onClose={project.onFalse} />
    </>
  );
};

export default Menubar;
