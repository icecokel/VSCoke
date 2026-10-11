import type { GameId } from "@/services/beat-jev-service";
import styles from "./beat-jev-game.module.css";

export const PixelJev = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 28" className={className} shapeRendering="crispEdges" aria-hidden="true">
    <path
      fill="#10160f"
      d="M11 0h2v4h-2zM5 4h14v2h2v2h2v12h-2v2h-2v2H5v-2H3v-2H1V8h2V6h2zM4 24h6v4H2v-2h2zM14 24h6v2h2v2h-8z"
    />
    <path fill="#c8f56a" d="M11 0h2v2h-2zM1 10h2v8H1zM21 10h2v8h-2zM7 24h3v2H7zM14 24h3v2h-3z" />
    <path fill="#ecebd5" d="M5 6h14v2h2v12h-2v2H5v-2H3V8h2z" />
    <path fill="#a7b39a" d="M5 20h14v2H5zM19 8h2v12h-2zM5 6h14v2H5z" />
    <path fill="#253323" d="M5 10h14v8H5z" />
    <g className={styles.eyes} fill="#c8f56a">
      <path d="M7 12h3v3H7zM14 12h3v3h-3z" />
    </g>
    <path fill="#10160f" d="M9 19h6v1H9z" />
    <path fill="#fffef0" d="M5 8h2v2H5zM17 8h2v2h-2z" />
  </svg>
);

export const PixelPlayer = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 28" className={className} shapeRendering="crispEdges" aria-hidden="true">
    <path fill="#10160f" d="M7 2h10v2h2v2h2v12h-2v4h2v6h-8v-4h-2v4H3v-6h2v-4H3V6h2V4h2z" />
    <path fill="#c8f56a" d="M7 4h10v2h2v4H5V6h2zM5 18h14v4h-2v4h-4v-4h-2v4H7v-4H5z" />
    <path fill="#ecebd5" d="M5 10h14v6h-2v2H7v-2H5z" />
    <path fill="#10160f" d="M7 11h2v2H7zM15 11h2v2h-2zM10 15h4v1h-4z" />
    <path fill="#7b9650" d="M5 8h14v2H5zM7 22h4v2H7zM13 22h4v2h-4z" />
  </svg>
);

const iconPixels: Record<GameId, string[]> = {
  "connect-four": ["1111111", "1010101", "1111111", "1010101", "1111111", "1010101", "1111111"],
  othello: ["0011100", "0111110", "1111001", "1110001", "1100011", "0111110", "0011100"],
  "dots-and-boxes": ["1010101", "1000001", "1011101", "1010101", "1011101", "1000001", "1010101"],
  isolation: ["0001000", "0011100", "0001000", "0111110", "0001000", "0010100", "0100010"],
  battleship: ["0001000", "0001100", "0001010", "0001000", "1111111", "0111110", "1010101"],
  codebreaker: ["0011100", "0100010", "0100010", "1111111", "1101011", "1110111", "1111111"],
  "yacht-dice": ["1111111", "1000001", "1100101", "1001001", "1010011", "1000001", "1111111"],
  "dice-stop": ["0111110", "1100011", "1000001", "1011101", "1000001", "1100011", "0111110"],
  "bomb-dodge": ["0000110", "0001000", "0011100", "0111110", "1111111", "1111111", "0111110"],
  "blind-card": ["0111110", "0100010", "0101010", "0111110", "0101010", "0100010", "0111110"],
};

export const PixelGameIcon = ({
  gameId,
  className = "",
}: {
  gameId: GameId;
  className?: string;
}) => (
  <svg
    viewBox="0 0 9 9"
    className={className}
    fill="currentColor"
    shapeRendering="crispEdges"
    aria-hidden="true"
  >
    <path
      d={iconPixels[gameId]
        .flatMap((row, y) =>
          [...row].map((pixel, x) => (pixel === "1" ? `M${x + 1} ${y + 1}h1v1h-1z` : "")),
        )
        .join("")}
    />
  </svg>
);

const diePips = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];

export const PixelDie = ({ face }: { face: number }) => (
  <span className={styles.dieFace} aria-hidden="true">
    {Array.from({ length: 9 }, (_, index) => (
      <i key={index} data-pip={diePips[face - 1]?.includes(index) || undefined} />
    ))}
  </span>
);
