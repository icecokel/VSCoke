"use client";

interface DoomHUDProps {
  health: number;
  ammo: number;
}

/**
 * 헤드업 디스플레이: 체력, 탄약 표시
 */
export const DoomHUD = ({ health, ammo }: DoomHUDProps) => {
  const healthColor =
    health > 50 ? "text-green-400" : health > 25 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="absolute bottom-20 sm:bottom-4 left-0 right-0 flex justify-center gap-8 font-mono text-sm pointer-events-none">
      <div className={`px-4 py-2 bg-black/70 rounded ${healthColor}`}>❤️ {health}</div>
      <div className="px-4 py-2 bg-black/70 rounded text-yellow-400">🔫 {ammo}</div>
    </div>
  );
};
