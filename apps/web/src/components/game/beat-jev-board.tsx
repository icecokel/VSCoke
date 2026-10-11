"use client";

import { memo, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { GameView, Side } from "@/services/beat-jev-service";
import styles from "./beat-jev-board.module.css";
import { PixelDie } from "./beat-jev-pixel-art";

interface BoardProps {
  game: GameView;
  onAction: (action: string) => void;
  isBusy: boolean;
}

const isSide = (value: unknown): value is Side => value === "PLAYER" || value === "JEV";
const isOwner = (value: unknown): value is Side | null => value === null || isSide(value);

const readBoard = (value: unknown, size: number): (Side | null)[][] | null => {
  if (
    !Array.isArray(value) ||
    value.length !== size ||
    !value.every(row => Array.isArray(row) && row.length === size && row.every(isOwner))
  ) {
    return null;
  }
  return value as (Side | null)[][];
};

const readNumbers = (value: unknown): number[] | null =>
  Array.isArray(value) && value.every(item => Number.isInteger(item)) ? value : null;

const readInteger = (value: unknown): number | null =>
  Number.isInteger(value) ? (value as number) : null;

const readRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const cellClass = `${styles.cell} flex aspect-square min-h-10 items-center justify-center text-base font-bold disabled:cursor-default sm:min-h-12`;
const playableClass = styles.playable;

const Piece = ({
  owner,
  motionClass = "",
  sizeClass = "size-7 sm:size-8",
}: {
  owner: Side | null;
  motionClass?: string;
  sizeClass?: string;
}) => {
  const t = useTranslations("Game.beatJev");
  if (!owner) return <span className={styles.emptyCell} aria-hidden />;
  return (
    <span
      className={`${styles.piece} ${sizeClass} ${motionClass}`}
      data-owner={owner}
      aria-label={t(owner === "PLAYER" ? "you" : "jev")}
    >
      {owner === "PLAYER" ? "P" : "J"}
    </span>
  );
};

const ContractError = () => {
  const t = useTranslations("Game.beatJev");
  return (
    <p role="alert" className="py-8 text-sm text-red-400">
      {t("invalidState")}
    </p>
  );
};

const ConnectFourBoard = ({ game, onAction, isBusy }: BoardProps) => {
  const t = useTranslations("Game.beatJev");
  const board = readBoard(game.data.board, 5);
  if (!board) return <ContractError />;

  return (
    <div className="mx-auto w-full max-w-sm space-y-2" data-testid="beat-jev-connect-four">
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 5 }, (_, column) => {
          const action = `column:${column}`;
          return (
            <Button
              key={column}
              type="button"
              size="sm"
              variant="outline"
              className="h-10 border-[var(--arcade-accent)]/40"
              disabled={isBusy || !game.legalActions.includes(action)}
              onClick={() => onAction(action)}
              aria-label={t("columnAction", { number: column + 1 })}
            >
              ↓ {column + 1}
            </Button>
          );
        })}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {board.flatMap((row, rowIndex) =>
          row.map((owner, column) => (
            <div
              key={`${rowIndex}-${column}`}
              className={cellClass}
              role="img"
              aria-label={t("boardCell", {
                row: rowIndex + 1,
                column: column + 1,
                owner: t(owner === "PLAYER" ? "you" : owner === "JEV" ? "jev" : "empty"),
              })}
            >
              <Piece key={owner ?? "empty"} owner={owner} motionClass={styles.connectDrop} />
            </div>
          )),
        )}
      </div>
    </div>
  );
};

const OthelloBoard = ({ game, onAction, isBusy }: BoardProps) => {
  const t = useTranslations("Game.beatJev");
  const board = readBoard(game.data.board, 8);
  if (!board) return <ContractError />;
  const discs = board.flat();
  return (
    <div className="mx-auto w-full max-w-md space-y-3" data-testid="beat-jev-othello">
      <p className="text-center text-sm text-muted-foreground" aria-live="polite">
        {t("othelloScore", {
          player: discs.filter(owner => owner === "PLAYER").length,
          jev: discs.filter(owner => owner === "JEV").length,
        })}
      </p>
      <div className="grid grid-cols-8 gap-1">
        {board.flatMap((row, rowIndex) =>
          row.map((owner, column) => {
            const action = `cell:${rowIndex * 8 + column}`;
            const isLegal = game.turn === "PLAYER" && game.legalActions.includes(action);
            const playable = !isBusy && isLegal;
            const cellLabel = t("boardCell", {
              row: rowIndex + 1,
              column: column + 1,
              owner: t(owner === "PLAYER" ? "you" : owner === "JEV" ? "jev" : "empty"),
            });
            return (
              <button
                type="button"
                key={action}
                className={`${styles.othelloCell} ${playable ? playableClass : ""}`}
                data-legal={isLegal || undefined}
                disabled={!playable}
                onClick={() => onAction(action)}
                aria-label={isLegal ? `${cellLabel} · ${t("legalMove")}` : cellLabel}
              >
                {owner ? (
                  <Piece
                    key={owner}
                    owner={owner}
                    motionClass={styles.othelloFlip}
                    sizeClass="size-[75%]"
                  />
                ) : isLegal ? (
                  <span className={styles.legalDot} aria-hidden="true" />
                ) : null}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
};

const DotsAndBoxesBoard = ({ game, onAction, isBusy }: BoardProps) => {
  const t = useTranslations("Game.beatJev");
  const { edges, boxes, scores } = game.data;
  const boxBoard = readBoard(boxes, 3);
  const scoreRecord = readRecord(scores);
  if (
    !Array.isArray(edges) ||
    !edges.every(edge => typeof edge === "string") ||
    !boxBoard ||
    !scoreRecord ||
    typeof scoreRecord.PLAYER !== "number" ||
    typeof scoreRecord.JEV !== "number"
  ) {
    return <ContractError />;
  }
  return (
    <div className="mx-auto w-full max-w-sm" data-testid="beat-jev-dots-and-boxes">
      <p className="mb-3 text-center text-sm text-muted-foreground">
        {t("boardScore", { player: scoreRecord.PLAYER, jev: scoreRecord.JEV })}
      </p>
      <div className="grid aspect-square grid-cols-7 grid-rows-7 gap-0.5">
        {Array.from({ length: 49 }, (_, index) => {
          const row = Math.floor(index / 7);
          const column = index % 7;
          if (row % 2 === 0 && column % 2 === 0) {
            return (
              <span key={index} className="m-auto size-2 rounded-none bg-foreground" aria-hidden />
            );
          }
          if (row % 2 === 1 && column % 2 === 1) {
            const owner = boxBoard[(row - 1) / 2][(column - 1) / 2];
            return (
              <span
                key={`${index}-${owner ?? "empty"}`}
                className={`grid place-items-center rounded-none text-xs font-bold ${owner ? styles.boxClaim : ""} ${owner === "PLAYER" ? "bg-[var(--arcade-accent)]/25 text-[var(--arcade-accent)]" : owner === "JEV" ? "bg-gray-500/40" : ""}`}
                aria-label={owner ? t(owner === "PLAYER" ? "yourBox" : "jevBox") : undefined}
              >
                {owner === "PLAYER" ? "P" : owner === "JEV" ? "J" : ""}
              </span>
            );
          }
          const action =
            row % 2 === 0
              ? `edge:h:${row / 2}:${(column - 1) / 2}`
              : `edge:v:${(row - 1) / 2}:${column / 2}`;
          const isFilled = edges.includes(action.slice(5));
          const playable = !isBusy && game.legalActions.includes(action);
          return (
            <button
              key={index}
              type="button"
              disabled={!playable}
              onClick={() => onAction(action)}
              className="grid size-full place-items-center rounded-none focus-visible:ring-2 focus-visible:ring-[var(--arcade-accent)]"
              aria-label={t("edgeAction", {
                direction: row % 2 === 0 ? t("horizontal") : t("vertical"),
                row: Math.floor(row / 2) + 1,
                column: Math.floor(column / 2) + 1,
              })}
            >
              <span
                key={isFilled ? "filled" : "empty"}
                className={`${row % 2 === 0 ? "h-2 w-full" : "h-full w-2"} rounded-none ${isFilled ? (row % 2 === 0 ? styles.horizontalLine : styles.verticalLine) : ""} ${isFilled ? "bg-foreground" : playable ? "bg-[var(--arcade-accent)]/40 group-hover:bg-[var(--arcade-accent)]" : "bg-border"}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

const IsolationBoard = ({ game, onAction, isBusy }: BoardProps) => {
  const t = useTranslations("Game.beatJev");
  const positions = readRecord(game.data.positions);
  const blocked = readNumbers(game.data.blocked);
  if (
    !positions ||
    !blocked ||
    !Number.isInteger(positions.PLAYER) ||
    !Number.isInteger(positions.JEV)
  ) {
    return <ContractError />;
  }
  return (
    <div
      className="mx-auto grid w-full max-w-sm grid-cols-5 gap-1.5"
      data-testid="beat-jev-isolation"
    >
      {Array.from({ length: 25 }, (_, cell) => {
        const action = `cell:${cell}`;
        const owner = positions.PLAYER === cell ? "PLAYER" : positions.JEV === cell ? "JEV" : null;
        const isBlocked = blocked.includes(cell);
        const playable = !isBusy && game.legalActions.includes(action);
        return (
          <button
            key={cell}
            type="button"
            className={`${cellClass} ${isBlocked ? "bg-muted/40 text-muted-foreground" : ""} ${playable ? playableClass : ""}`}
            data-blocked={isBlocked || undefined}
            disabled={!playable}
            onClick={() => onAction(action)}
            aria-label={t("boardCell", {
              row: Math.floor(cell / 5) + 1,
              column: (cell % 5) + 1,
              owner: t(
                owner === "PLAYER"
                  ? "you"
                  : owner === "JEV"
                    ? "jev"
                    : isBlocked
                      ? "blocked"
                      : "empty",
              ),
            })}
          >
            {owner ? (
              <Piece key={owner} owner={owner} motionClass={styles.isolationHop} />
            ) : isBlocked ? (
              <span key="blocked" className={styles.isolationBlock}>
                ×
              </span>
            ) : (
              <span className={styles.emptyCell} />
            )}
          </button>
        );
      })}
    </div>
  );
};

interface Shot {
  cell: number;
  hit: boolean;
  sunk: boolean;
}

const readShots = (value: unknown): Shot[] | null => {
  if (
    !Array.isArray(value) ||
    !value.every(
      shot =>
        readRecord(shot) &&
        Number.isInteger(shot.cell) &&
        typeof shot.hit === "boolean" &&
        typeof shot.sunk === "boolean",
    )
  ) {
    return null;
  }
  return value as Shot[];
};

const BattleshipBoard = ({ game, onAction, isBusy }: BoardProps) => {
  const t = useTranslations("Game.beatJev");
  const { ownShips, ownShots, opponentShots, round, pending } = game.data;
  const yourShots = readShots(ownShots);
  const jevShots = readShots(opponentShots);
  const roundNumber = readInteger(round);
  if (
    !Array.isArray(ownShips) ||
    !ownShips.every(ship => readNumbers(ship)) ||
    !yourShots ||
    !jevShots ||
    roundNumber === null ||
    typeof pending !== "boolean"
  ) {
    return <ContractError />;
  }
  const shipCells = ownShips.flatMap(ship => ship as number[]);
  return (
    <div className="w-full space-y-5" data-testid="beat-jev-battleship">
      <p className="text-center text-sm text-muted-foreground">
        {t("roundNumber", { number: roundNumber })}
        {pending ? ` · ${t("waitingReveal")}` : ""}
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-center text-sm font-semibold">{t("enemySea")}</h3>
          <div className="mx-auto grid max-w-xs grid-cols-4 gap-1.5">
            {Array.from({ length: 16 }, (_, cell) => {
              const shot = yourShots.find(item => item.cell === cell);
              const action = `cell:${cell}`;
              const playable = !isBusy && game.legalActions.includes(action);
              return (
                <button
                  key={cell}
                  type="button"
                  className={`${cellClass} ${playable ? playableClass : ""}`}
                  disabled={!playable}
                  onClick={() => onAction(action)}
                  aria-label={t("seaCell", {
                    row: Math.floor(cell / 4) + 1,
                    column: (cell % 4) + 1,
                    result: shot ? t(shot.sunk ? "sunk" : shot.hit ? "hit" : "miss") : t("untried"),
                  })}
                >
                  <span
                    key={shot ? `${shot.hit}-${shot.sunk}` : "untried"}
                    className={shot ? styles.shotReveal : ""}
                  >
                    {shot ? (shot.sunk ? "◆" : shot.hit ? "✕" : "·") : "?"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-center text-sm font-semibold">{t("yourSea")}</h3>
          <div className="mx-auto grid max-w-xs grid-cols-4 gap-1.5">
            {Array.from({ length: 16 }, (_, cell) => {
              const shot = jevShots.find(item => item.cell === cell);
              const hasShip = shipCells.includes(cell);
              return (
                <div
                  key={cell}
                  className={`${cellClass} ${hasShip ? "bg-[var(--arcade-accent)]/10" : ""}`}
                  data-ship={hasShip || undefined}
                  role="img"
                  aria-label={t("seaCell", {
                    row: Math.floor(cell / 4) + 1,
                    column: (cell % 4) + 1,
                    result: shot ? t(shot.hit ? "hit" : "miss") : hasShip ? t("ship") : t("sea"),
                  })}
                >
                  <span
                    key={shot ? `${shot.hit}` : "untried"}
                    className={shot ? styles.shotReveal : ""}
                  >
                    {shot ? (shot.hit ? "✕" : "·") : hasShip ? "▣" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const codeColors = ["rose", "amber", "teal", "violet"] as const;

const CodebreakerBoard = ({ game, onAction, isBusy }: BoardProps) => {
  const t = useTranslations("Game.beatJev");
  const [code, setCode] = useState("000");
  const { ownGuesses, round, remaining, pending } = game.data;
  const remainingCount = readInteger(remaining);
  if (
    !Array.isArray(ownGuesses) ||
    !ownGuesses.every(
      guess =>
        readRecord(guess) &&
        typeof guess.code === "string" &&
        typeof guess.exact === "number" &&
        typeof guess.colorOnly === "number",
    ) ||
    !Number.isInteger(round) ||
    remainingCount === null ||
    typeof pending !== "boolean"
  ) {
    return <ContractError />;
  }
  const action = `code:${code}`;
  return (
    <div className="mx-auto w-full max-w-sm space-y-5" data-testid="beat-jev-codebreaker">
      <p className="text-center text-sm text-muted-foreground">
        {t("guessesRemaining", { count: remainingCount })}
        {pending ? ` · ${t("waitingReveal")}` : ""}
      </p>
      <ol className="space-y-2">
        {ownGuesses.map((guess, index) => (
          <li
            key={index}
            className={`flex items-center justify-between rounded-none border border-border bg-card px-3 py-2 text-sm ${styles.guessReveal}`}
          >
            <div
              className="flex gap-1.5"
              role="group"
              aria-label={t("guessNumber", { number: index + 1 })}
            >
              {guess.code.split("").map((digit: string, position: number) => (
                <span
                  key={position}
                  className={`grid size-6 place-items-center rounded-none text-xs font-bold text-gray-900 ${["bg-rose-400", "bg-amber-400", "bg-teal-400", "bg-violet-400"][Number(digit)] ?? "bg-muted"}`}
                  role="img"
                  aria-label={t(`colors.${codeColors[Number(digit)] ?? "rose"}`)}
                  title={t(`colors.${codeColors[Number(digit)] ?? "rose"}`)}
                >
                  {digit}
                </span>
              ))}
            </div>
            <span>{t("guessHint", { exact: guess.exact, colorOnly: guess.colorOnly })}</span>
          </li>
        ))}
      </ol>
      <div className="flex items-end justify-center gap-2">
        {Array.from({ length: 3 }, (_, position) => (
          <label key={position} className="min-w-0 flex-1 text-xs text-muted-foreground">
            {t("colorPosition", { number: position + 1 })}
            <select
              value={code[position]}
              disabled={isBusy || game.legalActions.length === 0}
              onChange={event =>
                setCode(
                  previous =>
                    `${previous.slice(0, position)}${event.target.value}${previous.slice(position + 1)}`,
                )
              }
              className="mt-1 min-h-11 w-full rounded-none border border-border bg-card px-2 text-foreground focus-visible:ring-2 focus-visible:ring-[var(--arcade-accent)]"
            >
              {codeColors.map((color, index) => (
                <option key={color} value={index}>
                  {index} · {t(`colors.${color}`)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <Button
        type="button"
        className="w-full"
        disabled={isBusy || !game.legalActions.includes(action)}
        onClick={() => onAction(action)}
      >
        {t("submitCode")}
      </Button>
    </div>
  );
};

const scoreCategories = [
  "choice",
  "four-kind",
  "full-house",
  "small-straight",
  "large-straight",
  "yacht",
] as const;

const YachtDieFace = memo(
  function YachtDieFace({ face, isHeld }: { face: number; isHeld: boolean }) {
    return (
      <span className={`${styles.dieMotion} ${isHeld ? "" : styles.yachtRoll}`}>
        <PixelDie face={face} />
      </span>
    );
  },
  // 보유 상태만 바뀌면 주사위 굴림 모션을 다시 시작하지 않는다.
  (previous, next) => previous.face === next.face,
);

const YachtBoard = ({ game, onAction, isBusy }: BoardProps) => {
  const t = useTranslations("Game.beatJev");
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const dice = readNumbers(game.data.dice);
  const rounds = readRecord(game.data.rounds);
  const scorecards = readRecord(game.data.scorecards);
  const playerCard = readRecord(scorecards?.PLAYER);
  const jevCard = readRecord(scorecards?.JEV);
  const availableScores = readRecord(game.data.availableScores);
  const rollsUsed = readInteger(game.data.rollsUsed);
  const playerRound = readInteger(rounds?.PLAYER);
  const jevRound = readInteger(rounds?.JEV);
  useEffect(() => setHeld([false, false, false, false, false]), [game.turn, playerRound, jevRound]);
  if (
    !dice ||
    dice.length !== 5 ||
    !rounds ||
    !scorecards ||
    !playerCard ||
    !jevCard ||
    !availableScores ||
    rollsUsed === null ||
    playerRound === null ||
    jevRound === null ||
    !scoreCategories.every(category => readInteger(availableScores[category]) !== null)
  ) {
    return <ContractError />;
  }
  const holdAction = `hold:${held.map(value => (value ? "1" : "0")).join("")}`;
  const canHold = !isBusy && game.legalActions.some(action => action.startsWith("hold:"));
  return (
    <div className="w-full space-y-5" data-testid="beat-jev-yacht-dice">
      <p className="text-center text-sm text-muted-foreground">
        {t("rollNumber", { number: rollsUsed, total: 3 })} ·{" "}
        {t("turnCount", { player: playerRound, jev: jevRound })}
      </p>
      <div className="flex justify-center gap-2">
        {dice.map((face, index) => (
          <button
            key={index}
            type="button"
            disabled={!canHold}
            aria-pressed={held[index]}
            aria-label={t("dieLabel", {
              number: index + 1,
              face,
              state: held[index] ? t("held") : t("free"),
            })}
            onClick={() =>
              setHeld(previous =>
                previous.map((value, position) => (position === index ? !value : value)),
              )
            }
            className={`grid size-12 place-items-center border text-xl font-bold sm:size-14 ${styles.yachtDie} ${held[index] ? styles.heldDie : ""}`}
            data-held={held[index] || undefined}
          >
            <YachtDieFace
              key={`${rollsUsed}-${playerRound}-${jevRound}-${game.turn}-${face}`}
              face={face}
              isHeld={game.turn === "PLAYER" && held[index]}
            />
          </button>
        ))}
      </div>
      <div className="text-center">
        <Button
          type="button"
          variant="outline"
          disabled={isBusy || !game.legalActions.includes(holdAction)}
          onClick={() => onAction(holdAction)}
        >
          {t("reroll")}
        </Button>
      </div>
      <div className="overflow-hidden rounded-none border border-border">
        <div className="grid grid-cols-[1fr_3rem_3rem_3rem] bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
          <span>{t("category")}</span>
          <span className="text-center">{t("now")}</span>
          <span className="text-center">{t("you")}</span>
          <span className="text-center">{t("jev")}</span>
        </div>
        {scoreCategories.map(category => {
          const action = `score:${category}`;
          const playable = !isBusy && game.legalActions.includes(action);
          return (
            <div
              key={category}
              className="grid min-h-11 grid-cols-[1fr_3rem_3rem_3rem] items-center border-t border-border px-3 text-sm"
            >
              <button
                type="button"
                className={`text-left ${playable ? "font-semibold text-[var(--arcade-accent)] underline underline-offset-4" : ""}`}
                disabled={!playable}
                onClick={() => onAction(action)}
                aria-label={t("recordCategory", { category: t(`categories.${category}`) })}
              >
                {t(`categories.${category}`)}
              </button>
              <span className="text-center tabular-nums text-muted-foreground">
                {readInteger(availableScores[category])}
              </span>
              <span className="text-center tabular-nums">
                {typeof playerCard[category] === "number" ? playerCard[category] : "—"}
              </span>
              <span className="text-center tabular-nums">
                {typeof jevCard[category] === "number" ? jevCard[category] : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DiceStopBoard = ({ game, onAction, isBusy }: BoardProps) => {
  const t = useTranslations("Game.beatJev");
  const { rounds, totals, currentPoints, rollsUsed, lastRoll } = game.data;
  const roundRecord = readRecord(rounds);
  const totalRecord = readRecord(totals);
  const lastRollRecord = lastRoll === null ? null : readRecord(lastRoll);
  const playerRound = readInteger(roundRecord?.PLAYER);
  const jevRound = readInteger(roundRecord?.JEV);
  const playerTotal = readInteger(totalRecord?.PLAYER);
  const jevTotal = readInteger(totalRecord?.JEV);
  const currentScore = readInteger(currentPoints);
  const rollCount = readInteger(rollsUsed);
  const lastValue = readInteger(lastRollRecord?.value);
  if (
    !roundRecord ||
    !totalRecord ||
    playerRound === null ||
    jevRound === null ||
    playerTotal === null ||
    jevTotal === null ||
    currentScore === null ||
    rollCount === null ||
    (lastRoll !== null && (!lastRollRecord || !isSide(lastRollRecord.side) || lastValue === null))
  )
    return <ContractError />;
  return (
    <div className="mx-auto w-full max-w-sm space-y-5 text-center" data-testid="beat-jev-dice-stop">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-none border border-[var(--arcade-accent)]/30 bg-[var(--arcade-accent)]/5 p-4">
          <span className="block text-sm text-muted-foreground">{t("you")}</span>
          <strong className="text-3xl tabular-nums">{playerTotal}</strong>
        </div>
        <div className="rounded-none border border-border bg-card p-4">
          <span className="block text-sm text-muted-foreground">{t("jev")}</span>
          <strong className="text-3xl tabular-nums">{jevTotal}</strong>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("turnCount", { player: playerRound, jev: jevRound })} ·{" "}
        {t("rollNumber", { number: rollCount, total: 5 })}
      </p>
      <div
        className={`mx-auto grid size-24 place-items-center text-5xl font-bold ${styles.largeDie}`}
        aria-label={
          lastRollRecord && lastValue !== null
            ? t("lastRoll", {
                side: t(lastRollRecord.side === "PLAYER" ? "you" : "jev"),
                value: lastValue,
              })
            : undefined
        }
      >
        <span
          key={`${lastValue}-${rollCount}-${playerRound}-${jevRound}`}
          className={`${styles.dieMotion} ${lastValue !== null ? styles.diceStopRoll : ""}`}
        >
          {lastValue !== null ? <PixelDie face={lastValue} /> : "?"}
        </span>
      </div>
      <p>{t("currentPoints", { points: currentScore })}</p>
      <div className="flex justify-center gap-2">
        <Button
          type="button"
          disabled={isBusy || !game.legalActions.includes("roll")}
          onClick={() => onAction("roll")}
        >
          {t("roll")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isBusy || !game.legalActions.includes("stop")}
          onClick={() => onAction("stop")}
        >
          {t("stop")}
        </Button>
      </div>
    </div>
  );
};

const BombBoard = ({ game, onAction, isBusy }: BoardProps) => {
  const t = useTranslations("Game.beatJev");
  const opened = readNumbers(game.data.opened);
  const bomb = game.data.bombPosition;
  if (!opened || (bomb !== null && !Number.isInteger(bomb))) return <ContractError />;
  return (
    <div
      className="mx-auto grid w-full max-w-xs grid-cols-4 gap-2"
      data-testid="beat-jev-bomb-dodge"
    >
      {Array.from({ length: 16 }, (_, cell) => {
        const action = `pick:${cell}`;
        const isBomb = game.result !== null && bomb === cell;
        const isOpened = opened.includes(cell);
        const playable = !isBusy && game.legalActions.includes(action);
        const result = isBomb ? t("bomb") : isOpened ? t("safe") : t("hidden");
        return (
          <button
            key={cell}
            type="button"
            disabled={!playable}
            onClick={() => onAction(action)}
            className={`${cellClass} ${isBomb ? "border-red-400 bg-red-400/15 text-red-400" : isOpened ? "bg-[var(--arcade-accent)]/10 text-[var(--arcade-accent)]" : ""} ${playable ? playableClass : ""}`}
            data-result={isBomb ? "bomb" : isOpened ? "safe" : undefined}
            aria-label={t("seaCell", {
              row: Math.floor(cell / 4) + 1,
              column: (cell % 4) + 1,
              result,
            })}
          >
            <span
              key={isBomb ? "bomb" : isOpened ? "safe" : "hidden"}
              className={isBomb ? styles.bombReveal : isOpened ? styles.safeReveal : ""}
            >
              {isBomb ? "✹" : isOpened ? "✓" : "?"}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const BlindCardBoard = ({ game, onAction, isBusy }: BoardProps) => {
  const t = useTranslations("Game.beatJev");
  const available = readNumbers(game.data.available);
  const chosen = readRecord(game.data.chosenPositions);
  const revealed = game.data.revealed === null ? null : readRecord(game.data.revealed);
  if (!available || !chosen || (game.data.revealed !== null && !revealed)) return <ContractError />;
  return (
    <div className="mx-auto w-full max-w-md space-y-5" data-testid="beat-jev-blind-card">
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, position) => {
          const action = `pick:${position}`;
          const playable = !isBusy && game.legalActions.includes(action);
          const isChosen =
            chosen.PLAYER === position || (game.result !== null && chosen.JEV === position);
          return (
            <button
              key={position}
              type="button"
              disabled={!playable}
              onClick={() => onAction(action)}
              className={`${styles.blindCard} ${playable ? playableClass : ""}`}
              data-selected={isChosen || undefined}
              aria-label={t("cardPosition", {
                number: position + 1,
                state:
                  chosen.PLAYER === position
                    ? t("yourCard")
                    : game.result !== null && chosen.JEV === position
                      ? t("jevCard")
                      : t("hidden"),
              })}
            >
              <span
                key={isChosen ? "chosen" : "hidden"}
                className={isChosen ? styles.cardTurn : ""}
              >
                {isChosen ? (chosen.PLAYER === position ? "P" : "J") : "?"}
              </span>
            </button>
          );
        })}
      </div>
      {revealed && typeof revealed.PLAYER === "number" && typeof revealed.JEV === "number" && (
        <p className={`text-center text-sm ${styles.cardResult}`}>
          {t("revealedCards", { player: revealed.PLAYER, jev: revealed.JEV })}
        </p>
      )}
      {chosen.PLAYER !== null && game.result === null && (
        <p className="text-center text-sm text-muted-foreground">{t("waitingReveal")}</p>
      )}
      {available.length === 0 && game.result === null && <ContractError />}
    </div>
  );
};

export const BeatJevBoard = (props: BoardProps) => {
  switch (props.game.gameId) {
    case "connect-four":
      return <ConnectFourBoard {...props} />;
    case "othello":
      return <OthelloBoard {...props} />;
    case "dots-and-boxes":
      return <DotsAndBoxesBoard {...props} />;
    case "isolation":
      return <IsolationBoard {...props} />;
    case "battleship":
      return <BattleshipBoard {...props} />;
    case "codebreaker":
      return <CodebreakerBoard {...props} />;
    case "yacht-dice":
      return <YachtBoard {...props} />;
    case "dice-stop":
      return <DiceStopBoard {...props} />;
    case "bomb-dodge":
      return <BombBoard {...props} />;
    case "blind-card":
      return <BlindCardBoard {...props} />;
  }
};
