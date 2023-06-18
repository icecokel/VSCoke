import "./globals.css";
import Explorer from "@/app/Explorer";

export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

const DefaultSideBar = () => {
  return <div className="w-12 bg-black">sample</div>;
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="utf-8">
      <body className="flex h-screen">
        <DefaultSideBar />
        <Explorer />
        {children}
      </body>
    </html>
  );
}
