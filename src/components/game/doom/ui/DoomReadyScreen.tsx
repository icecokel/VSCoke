"use client";

import { useCustomRouter } from "@/hooks/use-custom-router";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface DoomReadyScreenProps {
  onStart: () => void;
  isMobile: boolean;
}

/**
 * ASCII DOOM 게임 시작 화면
 */
export const DoomReadyScreen = ({ onStart, isMobile }: DoomReadyScreenProps) => {
  const t = useTranslations("Game");
  const router = useCustomRouter();

  const onClickBack = () => {
    router.back();
  };

  // ASCII 아트 로고
  const asciiLogo = [
    "██████╗  ██████╗  ██████╗ ███╗   ███╗",
    "██╔══██╗██╔═══██╗██╔═══██╗████╗ ████║",
    "██║  ██║██║   ██║██║   ██║██╔████╔██║",
    "██║  ██║██║   ██║██║   ██║██║╚██╔╝██║",
    "██████╔╝╚██████╔╝╚██████╔╝██║ ╚═╝ ██║",
    "╚═════╝  ╚═════╝  ╚═════╝ ╚═╝     ╚═╝",
  ];

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-black text-green-400 ${isMobile ? "p-2" : "p-4"}`}
    >
      {/* ASCII 로고 */}
      <div className="mb-8 text-center">
        <pre className="font-mono text-[8px] sm:text-xs md:text-sm leading-tight text-green-400">
          {asciiLogo.join("\n")}
        </pre>
        <p className="text-green-600 text-xs mt-2 font-mono">[ ASCII VERSION ]</p>
      </div>

      {/* 미리보기 영역 */}
      <div
        className="w-full max-w-xs aspect-[4/3] bg-black rounded-lg border-2 border-green-900 mb-8 flex items-center justify-center overflow-hidden"
        style={{ maxHeight: "30vh" }}
      >
        <pre className="font-mono text-[6px] sm:text-[8px] leading-none text-green-400/50 whitespace-pre">
          {`        @@@@@@@@@@@@@@@@@@@        
      @@@@###########@@@@@@      
    @@@#####++++++#####@@@@@@    
   @@####+++======+++####@@@@   
  @@###+++==------==+++###@@@  
 @@###++==--......--==++###@@@ 
 @###++==--........--==++###@@ 
@@###++==--........--==++###@@
@@###++==--........--==++###@@
 @###++==--........--==++###@@ 
 @@###++==--......--==++###@@@ 
  @@###+++==------==+++###@@@  
   @@####+++======+++####@@@@   
    @@@#####++++++#####@@@@@@    
      @@@@###########@@@@@@      
        @@@@@@@@@@@@@@@@@@@        `}
        </pre>
      </div>

      {/* 조작 안내 */}
      <div className="mb-6 text-center font-mono text-xs text-green-600">
        <p>WASD / Arrows: Move & Turn</p>
        <p>Space: Fire | E: Use</p>
      </div>

      {/* 버튼 */}
      <div className="flex flex-col gap-4 w-full items-center">
        <Button
          onClick={onStart}
          size="lg"
          aria-label="Start Game"
          className="text-xl px-12 py-6 bg-green-600 hover:bg-green-500 text-black font-bold font-mono rounded transition-all hover:scale-105"
        >
          {t("start")}
        </Button>

        <Button
          onClick={onClickBack}
          variant="ghost"
          aria-label="Exit Game"
          className="text-green-600 hover:text-green-400 transition-colors font-mono"
        >
          {t("exit")}
        </Button>
      </div>
    </div>
  );
};
