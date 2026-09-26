"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, RotateCcw, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/contexts/game-context";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { ApiError } from "@/lib/api-client";
import {
  continueBeatJevMatch,
  createBeatJevMatch,
  getBeatJevMatch,
  nextBeatJevGame,
  playBeatJevAction,
  type MatchSnapshot,
} from "@/services/beat-jev-service";
import { BeatJevBoard } from "./beat-jev-board";

const storageKey = "beat-jev-match-id";

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const forgetExpiredMatch = () => {
  sessionStorage.removeItem(storageKey);
};

const isMissingMatch = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 404;

export const BeatJevGame = () => {
  const t = useTranslations("Game.beatJev");
  const router = useCustomRouter();
  const { setGamePlaying } = useGame();
  const [match, setMatch] = useState<MatchSnapshot | null>(null);
  const [isLoaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<"start" | "action" | "jev" | "next" | "refresh" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    const matchId = sessionStorage.getItem(storageKey);
    if (!matchId) {
      setLoaded(true);
      return;
    }
    getBeatJevMatch(matchId)
      .then(snapshot => {
        if (active) setMatch(snapshot);
      })
      .catch(cause => {
        if (!active) return;
        if (isMissingMatch(cause)) {
          forgetExpiredMatch();
          setMatch(null);
          setError(null);
        } else {
          setError(getErrorMessage(cause, t("requestFailed")));
        }
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    setGamePlaying(match !== null && match.status !== "COMPLETE");
    return () => setGamePlaying(false);
  }, [match, setGamePlaying]);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    const matchId = match?.id ?? sessionStorage.getItem(storageKey);
    if (!matchId) {
      setError(null);
      return;
    }
    inFlight.current = true;
    setBusy("refresh");
    try {
      const snapshot = await getBeatJevMatch(matchId);
      setMatch(snapshot);
      setError(null);
    } catch (cause) {
      if (isMissingMatch(cause)) {
        forgetExpiredMatch();
        setMatch(null);
        setError(null);
      } else {
        setError(getErrorMessage(cause, t("requestFailed")));
      }
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }, [match?.id, t]);

  const runMutation = useCallback(
    async (
      operation: "start" | "action" | "jev" | "next",
      request: () => Promise<MatchSnapshot>,
    ) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(operation);
      try {
        const snapshot = await request();
        setMatch(snapshot);
        sessionStorage.setItem(storageKey, snapshot.id);
        setError(null);
      } catch (cause) {
        if (isMissingMatch(cause) && operation !== "start") {
          forgetExpiredMatch();
          setMatch(null);
          setError(null);
        } else if (match?.id && operation !== "start") {
          setError(getErrorMessage(cause, t("requestFailed")));
          try {
            setMatch(await getBeatJevMatch(match.id));
          } catch (readError) {
            if (isMissingMatch(readError)) {
              forgetExpiredMatch();
              setMatch(null);
              setError(null);
            }
          }
        } else {
          setError(getErrorMessage(cause, t("requestFailed")));
        }
      } finally {
        inFlight.current = false;
        setBusy(null);
      }
    },
    [match?.id, t],
  );

  useEffect(() => {
    if (
      !match ||
      !isLoaded ||
      busy ||
      error ||
      match.status !== "PLAYING" ||
      match.game?.turn !== "JEV"
    ) {
      return;
    }
    void runMutation("jev", () => continueBeatJevMatch(match.id, match.revision));
  }, [match, isLoaded, busy, error, runMutation]);

  const start = () => {
    void runMutation("start", createBeatJevMatch);
  };
  const act = (action: string) => {
    if (!match || !match.game?.legalActions.includes(action) || match.status !== "PLAYING") return;
    void runMutation("action", () => playBeatJevAction(match.id, match.revision, action));
  };
  const next = () => {
    if (!match || match.status !== "ROUND_END") return;
    void runMutation("next", () => nextBeatJevGame(match.id, match.revision));
  };
  const game = match?.game;
  const isBusy = busy !== null || error !== null || match?.status !== "PLAYING";
  const isComplete = match?.status === "COMPLETE";

  return (
    <main
      className="min-h-full bg-gray-900 px-4 py-5 text-white sm:px-7 sm:py-8"
      data-testid="beat-jev-game"
    >
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-400">
              {t("eyebrow")}
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="text-gray-200 hover:bg-white/10 hover:text-white"
            onClick={() => router.push("/game")}
          >
            <ArrowLeft aria-hidden="true" /> {t("backToGames")}
          </Button>
        </header>

        {!isLoaded ? (
          <div className="grid min-h-64 place-items-center" role="status">
            <Loader2
              className="size-7 animate-spin text-teal-400 motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span className="sr-only">{t("loading")}</span>
          </div>
        ) : !match ? (
          <section className="mx-auto flex min-h-[28rem] max-w-lg flex-col items-center justify-center py-12 text-center">
            <div className="mb-6 grid size-20 place-items-center rounded-2xl border border-teal-400/30 bg-teal-400/10 text-teal-400">
              <Swords className="size-10" aria-hidden="true" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("challengeTitle")}</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-gray-300">{t("intro")}</p>
            <p className="mt-3 text-xs text-gray-400">{t("gameMix")}</p>
            <Button
              type="button"
              size="lg"
              className="mt-8 min-h-12 min-w-44 bg-teal-400 font-semibold text-gray-900 hover:bg-teal-500"
              onClick={start}
              disabled={busy !== null}
            >
              {busy === "start" ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Swords aria-hidden="true" />
              )}
              {t("startMatch")}
            </Button>
            {error && (
              <div role="alert" className="mt-5 space-y-3 text-sm text-red-400">
                <p>
                  {t("requestFailed")}: {error}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void refresh()}
                  disabled={busy !== null}
                >
                  {t("retry")}
                </Button>
              </div>
            )}
          </section>
        ) : (
          <>
            <section
              className="grid items-center gap-5 py-7 sm:grid-cols-[1fr_auto_1fr]"
              aria-label={t("matchScore")}
            >
              <div className="text-center sm:text-right">
                <span className="block text-sm text-gray-300">{t("you")}</span>
                <strong
                  key={match.playerWins}
                  className="animate-in zoom-in-75 text-5xl font-bold tabular-nums text-teal-400 duration-300 motion-reduce:animate-none"
                >
                  {match.playerWins}
                </strong>
              </div>
              <div className="hidden text-lg text-gray-500 sm:block" aria-hidden="true">
                —
              </div>
              <div className="text-center sm:text-left">
                <span className="block text-sm text-gray-300">{t("jev")}</span>
                <strong
                  key={match.jevWins}
                  className="animate-in zoom-in-75 text-5xl font-bold tabular-nums duration-300 motion-reduce:animate-none"
                >
                  {match.jevWins}
                </strong>
              </div>
            </section>

            <ol
              className="grid grid-cols-3 gap-2 border-b border-white/10 pb-6"
              aria-label={t("matchGames")}
            >
              {match.games.map((gameId, index) => (
                <li
                  key={`${gameId}-${index}`}
                  className={`min-w-0 rounded-lg border px-2 py-2 text-center text-xs sm:px-3 sm:text-sm ${index === match.gameIndex && !isComplete ? "animate-in fade-in zoom-in-95 border-teal-400/60 bg-teal-400/10 text-teal-400 duration-300 motion-reduce:animate-none" : "border-white/10 text-gray-400"}`}
                >
                  <span className="mr-1 font-mono">{String(index + 1).padStart(2, "0")}</span>
                  <span className="font-semibold">
                    {gameId ? t(`games.${gameId}.title`) : t("hiddenGame")}
                  </span>
                </li>
              ))}
            </ol>

            {game && (
              <div
                key={`${match.id}-${match.gameIndex}`}
                className="animate-in fade-in slide-in-from-bottom-2 grid gap-8 py-7 duration-300 motion-reduce:animate-none lg:grid-cols-[minmax(0,1fr)_17rem]"
              >
                <section className="min-w-0" aria-labelledby="beat-jev-current-title">
                  <div className="mb-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">
                      {t("gameNumber", { number: match.gameIndex + 1 })} ·{" "}
                      {t(`games.${game.gameId}.kind`)}
                    </p>
                    <h2 id="beat-jev-current-title" className="mt-2 text-2xl font-bold sm:text-3xl">
                      {t(`games.${game.gameId}.title`)}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-gray-300">
                      {t(`games.${game.gameId}.rules`)}
                    </p>
                  </div>
                  <div
                    className="rounded-2xl border border-white/10 bg-gray-800/60 px-4 py-7 sm:px-7"
                    data-testid="beat-jev-board"
                  >
                    <BeatJevBoard
                      key={`${match.id}-${match.gameIndex}-${match.history.length}-${game.gameId}`}
                      game={game}
                      onAction={act}
                      isBusy={isBusy}
                    />
                  </div>
                </section>

                <aside className="space-y-6 lg:border-l lg:border-white/10 lg:pl-7">
                  <div role="status" aria-live="polite">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      {t("status")}
                    </p>
                    <p
                      key={`${match.gameIndex}-${match.status}-${game.turn}-${game.result}`}
                      className="animate-in fade-in mt-2 text-lg font-semibold duration-200 motion-reduce:animate-none"
                    >
                      {isComplete
                        ? t(match.playerWins > match.jevWins ? "matchWon" : "matchLost")
                        : match.status === "ROUND_END"
                          ? t(
                              game.result === "PLAYER"
                                ? "roundWon"
                                : game.result === "JEV"
                                  ? "roundLost"
                                  : "roundDraw",
                            )
                          : busy === "jev" || game.turn === "JEV"
                            ? t("jevThinking")
                            : t("yourTurn")}
                    </p>
                    {busy && (
                      <p className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                        <Loader2
                          className="size-4 animate-spin motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                        {t(busy === "jev" ? "jevThinking" : "saving")}
                      </p>
                    )}
                  </div>
                  {error && (
                    <div role="alert" className="space-y-3 text-sm text-red-400">
                      <p>
                        {t("requestFailed")}: {error}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void refresh()}
                        disabled={busy !== null}
                      >
                        <RotateCcw aria-hidden="true" />
                        {t("retry")}
                      </Button>
                    </div>
                  )}
                  {match.status === "ROUND_END" && (
                    <Button
                      type="button"
                      className="min-h-11 w-full bg-teal-400 font-semibold text-gray-900 hover:bg-teal-500"
                      onClick={next}
                      disabled={busy !== null || error !== null}
                    >
                      {t(game.result === "DRAW" ? "replay" : "nextGame")}
                    </Button>
                  )}
                  {isComplete && (
                    <Button
                      type="button"
                      className="min-h-11 w-full bg-teal-400 font-semibold text-gray-900 hover:bg-teal-500"
                      onClick={start}
                      disabled={busy !== null}
                    >
                      {t("playAgain")}
                    </Button>
                  )}
                  <details className="text-sm text-gray-300">
                    <summary className="cursor-pointer font-semibold text-white">
                      {t("rules")}
                    </summary>
                    <p className="mt-2 leading-6">{t(`games.${game.gameId}.rules`)}</p>
                  </details>
                  {match.history.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">{t("history")}</h3>
                      <ol className="space-y-2 text-sm text-gray-300">
                        {match.history.map((item, index) => (
                          <li
                            key={`${item.gameId}-${index}`}
                            className="flex justify-between gap-2 border-t border-white/10 pt-2"
                          >
                            <span>{t(`games.${item.gameId}.title`)}</span>
                            <span className={item.result === "PLAYER" ? "text-teal-400" : ""}>
                              {t(
                                item.result === "PLAYER"
                                  ? "win"
                                  : item.result === "JEV"
                                    ? "loss"
                                    : "draw",
                              )}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-gray-300 hover:bg-white/10 hover:text-white"
                    onClick={() => void refresh()}
                    disabled={busy !== null}
                    aria-label={t("refresh")}
                  >
                    <RotateCcw aria-hidden="true" />
                    {t("refresh")}
                  </Button>
                </aside>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};
