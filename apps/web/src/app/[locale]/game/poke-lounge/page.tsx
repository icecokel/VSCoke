"use client";

import dynamic from "next/dynamic";

const PokeLoungeGame = dynamic(
  () => import("@/components/poke-lounge/poke-lounge-game").then(mod => mod.PokeLoungeGame),
  {
    ssr: false,
    loading: () => (
      <main className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-4 text-white">
        <p className="text-sm font-semibold tracking-wide">Loading Poke Lounge...</p>
      </main>
    ),
  },
);

export default function PokeLoungePage() {
  return <PokeLoungeGame />;
}
