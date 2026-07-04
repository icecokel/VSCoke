import { DoomGame } from "@/components/doom/doom-game";
import { useTranslations } from "next-intl";

export default function DoomPage() {
  const t = useTranslations("Doom");

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center bg-black p-4">
      <div data-testid="doom-layout" className="w-full max-w-5xl space-y-6">
        <header className="text-center space-y-2">
          <h1
            className="text-4xl md:text-6xl font-black text-red-600 tracking-tighter uppercase glitch-effect"
            style={{ textShadow: "0 0 20px rgba(220, 38, 38, 0.5)" }}
          >
            {t("title")}
          </h1>
          <p className="text-zinc-500 font-mono text-sm">{t("subtitle")}</p>
        </header>

        <main
          data-testid="doom-frame"
          className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-red-900/20"
          style={{ contain: "layout paint" }}
        >
          <DoomGame />
        </main>

        <footer className="text-center text-zinc-600 text-xs max-w-2xl mx-auto">
          <p>{t("footer")}</p>
        </footer>
      </div>
    </div>
  );
}
