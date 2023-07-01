import type { AppProps } from "next/app";
import LayoutContext from "@/components/Layout";
import "@/styles/global.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LayoutContext>
      <Component {...pageProps} />
    </LayoutContext>
  );
}
