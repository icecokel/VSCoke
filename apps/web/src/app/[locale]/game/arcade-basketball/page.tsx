import { ArcadeBasketballGame } from "@/components/game/arcade-basketball-game";

export default function ArcadeBasketballPage() {
  return (
    <main className="flex h-full min-h-0 w-full items-center justify-center bg-background p-2 [container-type:size] sm:p-4">
      <ArcadeBasketballGame />
    </main>
  );
}
