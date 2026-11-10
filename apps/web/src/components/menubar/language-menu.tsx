"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface LanguageMenuProps {
  className?: string;
}

const LANGUAGES: Record<Locale, { label: string }> = {
  "ko-KR": { label: "한국어" },
  "en-US": { label: "English" },
  "ja-JP": { label: "日本語" },
};

export const LanguageMenu = ({ className }: LanguageMenuProps) => {
  const t = useTranslations("menu");

  const handleChangeLanguage = (newLocale: Locale) => {
    // window.location 방식으로 언어 변경 (Vercel CDN 캐싱 문제 회피)
    const localePrefix = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);
    const normalizedPath = window.location.pathname.replace(localePrefix, "") || "/";
    const nextPath = normalizedPath === "/" ? `/${newLocale}` : `/${newLocale}${normalizedPath}`;

    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    window.location.href = `${nextPath}${window.location.search}${window.location.hash}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "cursor-pointer text-gray-300 hover:rounded-xs hover:bg-gray-300 hover:text-black focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:outline-none",
            className,
          )}
        >
          <span className="block px-3 text-base leading-6 select-none">{t("language")}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
        {routing.locales.map(code => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleChangeLanguage(code)}
            className="hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
          >
            {LANGUAGES[code].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
