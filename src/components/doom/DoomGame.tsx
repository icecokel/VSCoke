"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";

interface DosCommandInterface {
  exit: () => void;
}

interface DosFileSystem {
  extract: (url: string) => Promise<void>;
}

interface DosMainFn {
  (args: string[]): Promise<DosCommandInterface>;
}

interface DosOptions {
  wdosboxUrl?: string;
  cycles?: number | string;
  autolock?: boolean;
}

interface DosInstance {
  ready: (callback: (fs: DosFileSystem, main: DosMainFn) => void) => void;
}

declare global {
  interface Window {
    Dos: (element: HTMLCanvasElement, options: DosOptions) => DosInstance;
  }
}

export const DoomGame = () => {
  const t = useTranslations("Doom");
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false); // Game started (downloading/running)
  const [isGameRunning, setIsGameRunning] = useState(false); // Game actually running (hidden overlay)
  const [isMuted, setIsMuted] = useState(false);
  const rootRef = useRef<HTMLCanvasElement>(null);
  const dosInstance = useRef<DosCommandInterface | null>(null);

  // Local .jsdos bundle (Lazy loaded, avoids CORS issues)
  const DOOM_BUNDLE_URL = "/doom.jsdos";

  const handleStart = async () => {
    if (!window.Dos || !rootRef.current) return;

    setIsPlaying(true);

    try {
      const Dos = window.Dos;

      // V6 API - Performance Tuning: cycles: "auto"
      Dos(rootRef.current, {
        wdosboxUrl: "https://js-dos.com/6.22/current/wdosbox.js",
        cycles: "auto",
        autolock: false,
      }).ready((fs: DosFileSystem, main: DosMainFn) => {
        fs.extract(DOOM_BUNDLE_URL).then(() => {
          // Doom shareware usually runs doom.exe
          const args = isMuted ? ["-c", "doom.exe -nosfx -nomusic"] : ["-c", "doom.exe"];
          main(args).then((ci: DosCommandInterface) => {
            dosInstance.current = ci;
            // Give it a moment to boot before hiding loading screen
            setTimeout(() => setIsGameRunning(true), 1000);
          });
        });
      });
    } catch (e) {
      console.error("Doom Start Error:", e);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup function
      if (dosInstance.current) {
        try {
          dosInstance.current.exit();
        } catch (e) {
          console.warn("Dos exit error", e);
        }
      }
    };
  }, []);

  return (
    <>
      <Script src="https://js-dos.com/6.22/current/js-dos.js" onLoad={() => setIsReady(true)} />
      <link rel="stylesheet" href="https://js-dos.com/6.22/current/js-dos.css" />

      <div className="w-full h-full bg-black relative top-0 left-0 overflow-hidden font-mono">
        <canvas ref={rootRef} className="w-full h-full block" />

        {/* Initial Start Screen */}
        {!isPlaying && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900/95 backdrop-blur-sm p-6 text-center">
            <div className="max-w-md space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white uppercase tracking-widest">
                  {t("warningTitle")}
                </h3>
                <p className="text-zinc-400 whitespace-pre-line">{t("warningDesc")}</p>
              </div>

              {/* Mute Toggle */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`px-4 py-2 text-sm border transition-all uppercase tracking-wider font-bold ${isMuted ? "border-red-500 text-red-500 bg-red-900/10" : "border-green-600 text-green-600 bg-green-900/10"}`}
                >
                  {isMuted ? t("soundOff") : t("soundOn")}
                </button>
                <p className="text-[10px] text-zinc-500">{t("muteLabel")}</p>
              </div>

              <button
                onClick={handleStart}
                disabled={!isReady}
                className="group relative px-12 py-6 bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold tracking-widest uppercase transition-all overflow-hidden rounded-lg shadow-lg shadow-red-900/40 active:scale-95"
              >
                <span className="relative z-10 text-xl md:text-2xl">
                  {isReady ? t("buttonStart") : t("buttonLoading")}
                </span>
                {isReady && (
                  <div className="absolute inset-0 bg-red-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                )}
              </button>

              <p className="text-xs text-zinc-600 mt-4 font-mono">{t("footer")}</p>
            </div>
          </div>
        )}

        {/* Loading / Guide Overlay */}
        {isPlaying && !isGameRunning && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black text-green-500 p-8 font-mono">
            <div className="max-w-2xl w-full border-2 border-green-800 p-6 rounded bg-green-950/20 relative overflow-hidden">
              {/* Retro Scanline Effect */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none bg-[length:100%_4px,3px_100%]" />

              <div className="relative z-10 space-y-8">
                <header className="border-b border-green-800 pb-4 mb-4">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tighter animate-pulse">
                    {t("loadingTitle")}
                  </h2>
                  <p className="text-xs text-green-400 opacity-70 mt-1">{t("loadingStatus")}</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm md:text-base">
                  <div className="space-y-4">
                    <h4 className="text-green-300 font-bold border-1 border-green-800 inline-block px-2">
                      KEYBOARD
                    </h4>
                    <ul className="space-y-2 opacity-90">
                      <li className="flex items-center space-x-2">
                        <span className="w-4 h-4 border border-green-600 flex items-center justify-center text-[10px]">
                          ↑
                        </span>
                        <span>{t("guideMovement")}</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="px-1 border border-green-600 text-[10px]">CTRL</span>
                        <span>{t("guideFire")}</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="px-1 border border-green-600 text-[10px]">SPC</span>
                        <span>{t("guideOpen")}</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="px-1 border border-green-600 text-[10px]">ALT</span>
                        <span>{t("guideStrafe")}</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-green-300 font-bold border-1 border-green-800 inline-block px-2">
                      MOBILE
                    </h4>
                    <p className="opacity-80 text-xs leading-relaxed">
                      Virtual gamepad automatically enabled.
                      <br />
                      Touch screen to interact.
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="w-full bg-green-900/30 h-1 mt-2 overflow-hidden">
                    <div
                      className="h-full bg-green-500 w-full animate-[progress_15s_ease-in-out_infinite]"
                      style={{ transformOrigin: "left" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
