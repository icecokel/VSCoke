import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["100", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "VSCOKE",
  description: "Developer Portfolio & Blog",
  keywords: [
    "개발자",
    "포트폴리오",
    "블로그",
    "Developer",
    "Portfolio",
    "Blog",
    "React",
    "Next.js",
  ],
  authors: [{ name: "icecokel" }],
  openGraph: {
    title: "VSCOKE",
    description: "Developer Portfolio & Blog",
    url: "https://vscoke.vercel.app",
    siteName: "VSCOKE",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "VSCOKE",
    description: "Developer Portfolio & Blog",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html className={notoSansKr.className}>
      <body>{children}</body>
    </html>
  );
};

export default RootLayout;
