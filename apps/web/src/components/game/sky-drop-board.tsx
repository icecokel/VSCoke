"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { GameConstants } from "./game-constants";
import { isSkyDropInDanger, type SkyDropState } from "./sky-drop-engine";
import styles from "./sky-drop.module.css";

interface SkyDropBoardProps {
  state: SkyDropState;
  onSelect: (column: number) => void;
}

const blockStyle = (column: number, row: number, color: number): CSSProperties => ({
  left: `calc(${column} * (100% + 8px) / 3)`,
  top: `${(row / 13) * 100}%`,
  backgroundColor: GameConstants.BLOCK_PALETTE[color],
});

export const SkyDropBoard = ({ state, onSelect }: SkyDropBoardProps) => {
  const t = useTranslations("Game.skyDrop");
  const game = useTranslations("Game");
  const isPlaying = state.status === "playing";
  const isDanger = isSkyDropInDanger(state);
  const blocks = state.columns.flatMap((column, columnIndex) =>
    column.map((block, row) => ({ ...block, column: columnIndex, row, held: false })),
  );
  if (state.held) {
    blocks.push({
      ...state.held.block,
      column: state.held.column,
      row: state.columns[state.held.column].length,
      held: true,
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="sky-drop-playfield">
      <div
        className={`${styles.board} ${isDanger ? styles.danger : ""}`}
        data-testid="sky-drop-board"
        data-paused={!isPlaying}
      >
        <div className="absolute inset-0 grid grid-cols-3 gap-2">
          {state.columns.map((column, index) => (
            <button
              key={index}
              type="button"
              disabled={!isPlaying}
              onClick={() => onSelect(index)}
              aria-label={t("column", {
                number: index + 1,
                count: column.length,
                key: ["Q", "W", "E"][index],
              })}
              aria-pressed={state.held?.column === index}
              aria-keyshortcuts={["Q", "W", "E"][index]}
              data-testid={`sky-drop-column-${index}`}
              data-count={column.length}
              className="touch-manipulation rounded-xl border border-border bg-muted/25 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-default"
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {blocks.map(block => (
            <span
              key={block.id}
              data-testid="sky-drop-block"
              data-color={block.color}
              data-column={block.column}
              data-row={block.row}
              data-held={block.held}
              className={`${styles.block} ${block.held ? styles.held : ""}`}
              style={blockStyle(block.column, block.row, block.color)}
            >
              {GameConstants.BLOCK_SYMBOLS[block.color]}
            </span>
          ))}
          {state.match?.blocks.map((block, row) => (
            <span
              key={`matched-${state.match!.id}-${block.id}`}
              className={`${styles.block} ${styles.matched}`}
              style={blockStyle(state.match!.column, state.match!.row + row, block.color)}
            >
              {GameConstants.BLOCK_SYMBOLS[block.color]}
            </span>
          ))}
          {state.match && (
            <span
              key={state.match.id}
              className={styles.points}
              style={{
                left: `${((state.match.column + 0.5) * 100) / 3}%`,
                top: `${Math.min(80, (state.match.row * 100) / 13)}%`,
              }}
            >
              +{state.match.points}
            </span>
          )}
          <div className={styles.deadline} />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className={isDanger ? "font-semibold text-destructive" : ""}>{game("deadline")}</span>
        <span>{t("limit", { count: GameConstants.MAX_STACK_HEIGHT })}</span>
      </div>
      <div className="mt-2 grid shrink-0 grid-cols-3 gap-2" aria-hidden="true">
        {["Q", "W", "E"].map((key, index) => (
          <div
            key={key}
            className="flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-xs text-muted-foreground"
          >
            <kbd className="font-mono font-semibold text-foreground">{key}</kbd>
            <span>
              {state.columns[index].length} / {GameConstants.MAX_STACK_HEIGHT}
            </span>
          </div>
        ))}
      </div>
      <p
        className="mt-3 min-h-10 shrink-0 text-center text-xs leading-5 text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {state.held ? t("placeHint") : t("pickHint")}
        <span className="block">{t("keyboardHint")}</span>
      </p>
    </div>
  );
};
