import "./globals.css";
import HistoryTabs from "@/components/HistoryTabs";
import Menubar from "@/components/Menubar";
import Sidebar from "@/components/Sidebar";
import AppProvider from "@/contexts/AppProvider";
import { TParentNode } from "@/models/common";
import { getExplorer } from "@/utils/get/explorer";
import { getPosts } from "@/utils/get/post";
import { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { HistoryProvider } from "@/contexts/HistoryContext";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["100", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "VSCOKE",
};

export default async function RootLayout({ children }: TParentNode) {
  const posts = await getPosts();

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
          <AppProvider explorer={explorer} posts={posts}>
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
}
