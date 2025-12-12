"use client";

import OpenProjectModal from "./open-project-modal";
import { useBoolean } from "@/hooks/use-boolean";
import { TParentNode } from "@/models/common";
import Menu from "@/components/base-ui/menu";
import BaseText from "@/components/base-ui/text";
import { MouseEventHandler, useState } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES, LANGUAGE_STORAGE_KEY, LanguageCode } from "@/i18n";

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
  const { t, i18n } = useTranslation();

  const project = useBoolean();

  const handleChangeLanguage = (lang: LanguageCode) => {
    i18n.changeLanguage(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    setCurrentEl(null);
  };

  const MENULIST: IMenu[] = [
    {
      key: "1",
      name: t("menu.file"),
      items: [
        {
          name: t("menu.openProject"),
          onClick: () => {
            project.onTrue();
            setCurrentEl(null);
          },
        },
      ],
    },
    {
      key: "2",
      name: t("menu.language"),
      items: Object.entries(LANGUAGES).map(([code, { label }]) => ({
        name: label,
        onClick: () => handleChangeLanguage(code as LanguageCode),
      })),
    },
    { key: "3", name: t("menu.help"), items: [{ name: t("menu.preparing") }] },
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
              className="hover:bg-gray-300 text-gray-300 hover:text-black hover:rounded-xs"
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
