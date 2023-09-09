import "./globals.css";
import HistoryTabs from "@/components/HistoryTabs";
import Sidebar from "@/components/Sidebar";
import LoaderProvider from "@/contexts/LoaderProvider";
import MuiConfigProvider from "@/contexts/MuiConfigProvider";
import { SWRProvider } from "@/contexts/SWRProvider";
import { IHaveChildren } from "@/models/common";
import { Metadata } from "next";
import "prismjs/themes/prism-tomorrow.css";
import "react-notion/src/styles.css";

export const metadata: Metadata = {
  title: "VSCOKE",
};

export default async function RootLayout({ children }: IHaveChildren) {
  return (
    <html lang="ko">
      <body>
        <SWRProvider>
          <MuiConfigProvider>
            <LoaderProvider>
              <Sidebar>
                <HistoryTabs>{children}</HistoryTabs>
              </Sidebar>
            </LoaderProvider>
          </MuiConfigProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
