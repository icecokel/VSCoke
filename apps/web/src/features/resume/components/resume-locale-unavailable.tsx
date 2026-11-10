import { getTranslations } from "next-intl/server";
import { LanguagesIcon } from "lucide-react";
import { routing } from "@/i18n/routing";

interface ResumeLocaleUnavailableProps {
  path: string;
}

/**
 * 요청한 언어의 이력서 본문이 없을 때 다른 언어 본문으로 가장하지 않고 기본 언어 이력서로 안내한다.
 */
export const ResumeLocaleUnavailable = async ({ path }: ResumeLocaleUnavailableProps) => {
  const t = await getTranslations("resumeLocaleUnavailable");

  return (
    <main
      className="flex min-h-full flex-col items-center justify-center gap-3 px-4 py-16 text-center text-gray-100"
      data-testid="resume-locale-unavailable"
    >
      <LanguagesIcon className="size-12 text-gray-500" aria-hidden="true" />
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="max-w-md text-sm leading-6 text-gray-400">{t("description")}</p>
      {/* 언어 전환은 메뉴바와 같이 전체 문서를 다시 받아 UI 언어도 함께 바꾼다. */}
      <a
        href={`/${routing.defaultLocale}${path}`}
        hrefLang={routing.defaultLocale}
        className="mt-2 inline-flex h-9 items-center rounded-md bg-blue-300 px-4 text-sm font-medium text-gray-900 transition-colors hover:bg-blue-200 focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:outline-none"
      >
        {t("openDefaultLocale")}
      </a>
    </main>
  );
};
