import { CustomLink } from "@/components/custom-link";
import { getTranslations } from "next-intl/server";

const ShareResultNotFound = async () => {
  const t = await getTranslations("Game");

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-900 p-6 text-center text-white">
      <div className="max-w-md">
        <h1 className="text-3xl font-bold">{t("resultNotFoundTitle")}</h1>
        <p className="mt-3 text-gray-400">{t("resultNotFoundDescription")}</p>
        <CustomLink
          href="/game"
          className="mt-8 inline-flex rounded-xl border border-gray-600 px-6 py-3 font-semibold text-gray-100 transition-colors hover:border-gray-400 hover:bg-gray-800"
        >
          {t("backToGame")}
        </CustomLink>
      </div>
    </main>
  );
};

export default ShareResultNotFound;
