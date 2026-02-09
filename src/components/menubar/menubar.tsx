"use client";

import OpenProjectModal from "./open-project-modal";
import { useBoolean } from "@/hooks/use-boolean";
import BaseText from "@/components/base-ui/text";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { routing, Locale } from "@/i18n/routing";

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

const LANGUAGES: Record<Locale, { label: string }> = {
  "ko-KR": { label: "한국어" },
  "en-US": { label: "English" },
};

const Menubar = () => {
  const t = useTranslations("menu");
  const pathname = usePathname();

  const project = useBoolean();

  const handleChangeLanguage = (newLocale: Locale) => {
    // window.location 방식으로 언어 변경 (Vercel CDN 캐싱 문제 회피)
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    window.location.href = `/${newLocale}${pathname}`;
  };

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
    {
      key: "2",
      name: t("language"),
      items: routing.locales.map(code => ({
        name: LANGUAGES[code].label,
        onClick: () => handleChangeLanguage(code),
      })),
    },
    { key: "3", name: t("help"), items: [{ name: t("preparing") }] },
  ];

  return (
    <>
      <div id="menubar" className="bg-gray-900 p-1 flex border-b-2 border-b-gray-500 relative z-50">
        {MENULIST.map((item, index) => (
          <DropdownMenu key={`${item.key}_${index}`}>
            <DropdownMenuTrigger asChild>
              <div className="hover:bg-gray-300 text-gray-300 hover:text-black hover:rounded-xs cursor-pointer">
                <BaseText type="body1" className="px-3 select-none">
                  {item.name}
                </BaseText>
              </div>
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
        ))}
      </div>

      <OpenProjectModal open={project.value} onClose={project.onFalse} />
    </>
  );
};

export default Menubar;
