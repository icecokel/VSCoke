import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Menubar from "@/components/menubar";
import Sidebar from "@/components/sidebar";
import HistoryTabs from "@/components/history-tabs";
import AppProvider from "@/contexts/AppProvider";
import { HistoryProvider } from "@/contexts/HistoryContext";
import { getExplorer } from "@/utils/get/explorer";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["100", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "VSCOKE",
  description: "Developer Portfolio & Blog",
};

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const explorer = await getExplorer();

  return (
    <html lang="ko" className={notoSansKr.className}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body>
        <HistoryProvider>
          <AppProvider explorer={explorer}>
            <Menubar>
              <Sidebar>
                <HistoryTabs>{children}</HistoryTabs>
              </Sidebar>
            </Menubar>
          </AppProvider>
        </HistoryProvider>
      </body>
    </html>
  );
};

export default RootLayout;
