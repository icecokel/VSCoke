import "./globals.css";
import HistoryTabs from "@/components/HistoryTabs";
import Sidebar from "@/components/Sidebar";
import LoaderProvider from "@/contexts/LoaderProvider";
import MuiConfigProvider from "@/contexts/MuiConfigProvider";
import { SWRProvider } from "@/contexts/SWRProvider";
import { IHaveChildren } from "@/models/common";

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
