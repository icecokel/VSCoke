import { DoomGame } from "@/components/doom/doom-game";
import { useTranslations } from "next-intl";

export default function DoomPage() {
  const t = useTranslations("Doom");

  return (
    <div className="w-full min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="max-w-5xl w-full space-y-6">
        <header className="text-center space-y-2">
          <h1
            className="text-4xl md:text-6xl font-black text-red-600 tracking-tighter uppercase glitch-effect"
            style={{ textShadow: "0 0 20px rgba(220, 38, 38, 0.5)" }}
          >
            {t("title")}
          </h1>
          <p className="text-zinc-500 font-mono text-sm">{t("subtitle")}</p>
        </header>

        <main className="w-full aspect-[4/3] bg-zinc-900 rounded-xl overflow-hidden shadow-2xl shadow-red-900/20 border border-zinc-800 relative">
          <DoomGame />
        </main>

        <footer className="text-center text-zinc-600 text-xs max-w-2xl mx-auto">
          <p>{t("footer")}</p>
        </footer>
      </div>
    </div>
  );
}
