import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["100", "400", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vscoke.vercel.app"),
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
    "Mini Game",
    "Sky Drop",
    "Web Game",
  ],
  authors: [{ name: "icecokel" }],
  openGraph: {
    title: "VSCOKE",
    description: "Developer Portfolio & Blog",
    url: "https://vscoke.vercel.app",
    siteName: "VSCOKE",
    locale: "ko_KR",
    type: "website",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary",
    title: "VSCOKE",
    description: "Developer Portfolio & Blog",
    images: ["/og.png"],
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
    <html className={`${notoSansKr.className} dark`}>
      <body>{children}</body>
    </html>
  );
};

export default RootLayout;
