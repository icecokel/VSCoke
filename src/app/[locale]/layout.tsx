import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Menubar from "@/components/menubar/menubar";
import Sidebar from "@/components/sidebar/sidebar";
import HistoryTabs from "@/components/history-tabs/history-tabs";
import AppProvider from "@/contexts/app-provider";
import { HistoryProvider } from "@/contexts/history-context";
import { getExplorer } from "@/utils/get/explorer";
import { routing } from "@/i18n/routing";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const generateStaticParams = () => {
  return routing.locales.map(locale => ({ locale }));
};

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
      <HistoryProvider>
        <AppProvider explorer={explorer}>
          <Menubar>
            <Sidebar>
              <HistoryTabs>{children}</HistoryTabs>
            </Sidebar>
          </Menubar>
        </AppProvider>
      </HistoryProvider>
    </NextIntlClientProvider>
  );
};

export default LocaleLayout;
