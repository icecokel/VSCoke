import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Menubar from "@/components/menubar/menubar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
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
          <SidebarProvider defaultOpen={false}>
            <AppSidebar />
            <SidebarInset>
              <div className="flex flex-col h-full overflow-hidden">
                <Menubar />
                <div className="flex-1 overflow-auto bg-gray-900">
                  <HistoryTabs>{children}</HistoryTabs>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </AppProvider>
      </HistoryProvider>
    </NextIntlClientProvider>
  );
};

export default LocaleLayout;
