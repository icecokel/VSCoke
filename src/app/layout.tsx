import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { SWRProvider } from "@/contexts/SWRProvider";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <SWRProvider>
          <Sidebar>{children}</Sidebar>
        </SWRProvider>
      </body>
    </html>
  );
}
