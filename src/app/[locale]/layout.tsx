import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import Menubar from "@/components/menubar/menubar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileSidebarTrigger } from "@/components/mobile-sidebar-trigger";
import { HistoryTabs } from "@/components/history-tabs/history-tabs";
import AppProvider from "@/contexts/app-provider";
import { HistoryProvider } from "@/contexts/history-context";
import { LoaderProvider } from "@/contexts/loader-context";
import { GameProvider } from "@/contexts/game-context";
import { Loader } from "@/components/loader";
import { getExplorer } from "@/utils/get/explorer";
import { routing } from "@/i18n/routing";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const generateStaticParams = () => {
  return routing.locales.map(locale => ({ locale }));
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const keywords = t("keywords").split(", ");

  return {
    title: t("title"),
    description: t("description"),
    keywords,
    authors: [{ name: "icecokel" }],
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "https://vscoke.vercel.app",
      siteName: t("title"),
      locale: locale === "ko-KR" ? "ko_KR" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: t("title"),
      description: t("description"),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

const LocaleLayout = async ({ children, params }: Props) => {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const explorer = await getExplorer();

  return (
    <NextIntlClientProvider messages={messages}>
      <LoaderProvider>
        <HistoryProvider>
          <GameProvider>
            <AppProvider explorer={explorer}>
              <Loader />
              <Toaster position="top-center" richColors />
              <div className="flex flex-col h-screen overflow-hidden">
                <Menubar />
                <div className="flex-1 overflow-hidden">
                  <SidebarProvider defaultOpen={false}>
                    <AppSidebar />
                    <SidebarInset>
                      <div className="flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-auto bg-gray-900">
                          <HistoryTabs>{children}</HistoryTabs>
                        </div>
                      </div>
                    </SidebarInset>
                    <MobileSidebarTrigger />
                  </SidebarProvider>
                </div>
              </div>
            </AppProvider>
          </GameProvider>
        </HistoryProvider>
      </LoaderProvider>
    </NextIntlClientProvider>
  );
};

export default LocaleLayout;
