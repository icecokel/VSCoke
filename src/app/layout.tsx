import "./globals.css";
import HistoryTabs from "@/components/HistoryTabs";
import Sidebar from "@/components/Sidebar";
import AppProvider from "@/contexts/AppProvider";
import { IHaveChildren } from "@/models/common";
import { getExplorer } from "@/utils/get/explorer";
import { getPosts } from "@/utils/get/post";
import { Metadata } from "next";
import "prismjs/themes/prism-tomorrow.css";
import "react-notion/src/styles.css";
import "swiper/css";
import "swiper/css/navigation";

export const metadata: Metadata = {
  title: "VSCOKE",
};

export default async function RootLayout({ children }: IHaveChildren) {
  const blogs = await getPosts();
  const explorer = await getExplorer();

  return (
    <html lang="ko">
      <body>
        <AppProvider blogs={blogs} explorer={explorer}>
          <Sidebar>
            <HistoryTabs>{children}</HistoryTabs>
          </Sidebar>
        </AppProvider>
      </body>
    </html>
  );
}
