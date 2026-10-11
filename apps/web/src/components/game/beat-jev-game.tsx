"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
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
  gameIds,
  type MatchSnapshot,
} from "@/services/beat-jev-service";
import { BeatJevBoard } from "./beat-jev-board";
import { PixelGameIcon, PixelJev, PixelPlayer } from "./beat-jev-pixel-art";
import styles from "./beat-jev-game.module.css";

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
      className={styles.arcade}
      data-testid="beat-jev-game"
      data-mode={match ? "playing" : "intro"}
    >
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              +
            </span>
            <span>{t("eyebrow")}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            className={styles.back}
            onClick={() => router.push("/game")}
          >
            <ArrowLeft aria-hidden="true" /> {t("backToGames")}
          </Button>
        </header>

        {!isLoaded ? (
          <div className={styles.loading} role="status">
            <Loader2
              className="size-7 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span className="sr-only">{t("loading")}</span>
          </div>
        ) : !match ? (
          <>
            <section className={styles.hero}>
              <div className={styles.heroCopy}>
                <p className={styles.kicker}>
                  <span aria-hidden="true">▶</span> {t("challengeTitle")}
                </p>
                <h1 className={styles.heroTitle}>{t("title")}</h1>
                <p className={styles.intro}>{t("intro")}</p>
                <Button
                  type="button"
                  size="lg"
                  className={styles.start}
                  onClick={start}
                  disabled={busy !== null}
                >
                  {busy === "start" ? (
                    <Loader2
                      className="animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <span aria-hidden="true">▶</span>
                  )}
                  {t("startMatch")}
                  <span className={styles.startArrow} aria-hidden="true">
                    ↗
                  </span>
                </Button>
                {error && (
                  <div role="alert" className={styles.error}>
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
              </div>
              <div className={styles.heroArt} aria-hidden="true">
                <span className={styles.enemyLabel}>{t("arcade.opponent")}</span>
                <span className={styles.sparkOne}>+</span>
                <span className={styles.sparkTwo}>+</span>
                <div className={styles.mascot}>
                  <PixelJev className={styles.heroSprite} />
                </div>
                <div className={styles.platform} />
                <span className={styles.enemyName}>{t("jev")}</span>
              </div>
            </section>
            <div className={styles.matchRecipe}>
              {(
                [
                  ["03", "rounds"],
                  ["02", "wins"],
                  ["10", "games"],
                ] as const
              ).map(([number, label]) => (
                <div key={label}>
                  <strong>{number}</strong>
                  <span>{t(`arcade.${label}`)}</span>
                </div>
              ))}
            </div>
            <section className={styles.catalog} aria-labelledby="beat-jev-pool-title">
              <div className={styles.catalogHeader}>
                <h2 id="beat-jev-pool-title">{t("arcade.gamePool")}</h2>
                <p>{t("gameMix")}</p>
              </div>
              <ul className={styles.gamePool}>
                {gameIds.map(gameId => (
                  <li key={gameId}>
                    <PixelGameIcon gameId={gameId} className={styles.poolIcon} />
                    <span>{t(`games.${gameId}.title`)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <>
            <h1 className={styles.matchTitle}>{t("title")}</h1>
            <section className={styles.scoreHud} aria-label={t("matchScore")}>
              <div className={styles.contender}>
                <PixelPlayer className={styles.avatar} />
                <div>
                  <span className={styles.playerName}>{t("you")}</span>
                  <div className={styles.winMarks} aria-hidden="true">
                    {[0, 1].map(index => (
                      <i key={index} data-earned={index < match.playerWins || undefined} />
                    ))}
                  </div>
                </div>
                <strong key={match.playerWins} className={styles.playerScore}>
                  {match.playerWins}
                </strong>
              </div>
              <div className={styles.versus}>
                <span>{t("arcade.firstToTwo")}</span>
                <b>{t("arcade.versus")}</b>
              </div>
              <div className={`${styles.contender} ${styles.opponent}`}>
                <PixelJev className={styles.avatar} />
                <div>
                  <span className={styles.playerName}>{t("jev")}</span>
                  <div className={styles.winMarks} aria-hidden="true">
                    {[0, 1].map(index => (
                      <i key={index} data-earned={index < match.jevWins || undefined} />
                    ))}
                  </div>
                </div>
                <strong key={match.jevWins} className={styles.playerScore}>
                  {match.jevWins}
                </strong>
              </div>
            </section>
            <ol className={styles.rounds} aria-label={t("matchGames")}>
              {match.games.map((gameId, index) => (
                <li
                  key={`${gameId}-${index}`}
                  data-active={(index === match.gameIndex && !isComplete) || undefined}
                >
                  <span className={styles.roundIndex}>{String(index + 1).padStart(2, "0")}</span>
                  {gameId ? (
                    <PixelGameIcon gameId={gameId} className={styles.roundIcon} />
                  ) : (
                    <span className={styles.roundUnknown} aria-hidden="true">
                      ?
                    </span>
                  )}
                  <span>{gameId ? t(`games.${gameId}.title`) : t("hiddenGame")}</span>
                </li>
              ))}
            </ol>
            {game && (
              <div key={`${match.id}-${match.gameIndex}`} className={styles.workspace}>
                <section className={styles.gameSection} aria-labelledby="beat-jev-current-title">
                  <div className={styles.gameHeading}>
                    <PixelGameIcon gameId={game.gameId} className={styles.currentIcon} />
                    <div>
                      <p className={styles.kicker}>
                        {t("gameNumber", { number: match.gameIndex + 1 })} ·{" "}
                        {t(`games.${game.gameId}.kind`)}
                      </p>
                      <h2 id="beat-jev-current-title">{t(`games.${game.gameId}.title`)}</h2>
                    </div>
                  </div>
                  <p className={styles.gameRules}>{t(`games.${game.gameId}.rules`)}</p>
                  <div
                    className={styles.boardStage}
                    data-testid="beat-jev-board"
                    data-game={game.gameId}
                  >
                    <BeatJevBoard
                      key={`${match.id}-${match.gameIndex}-${match.history.length}-${game.gameId}`}
                      game={game}
                      onAction={act}
                      isBusy={isBusy}
                    />
                  </div>
                </section>
                <aside className={styles.aside}>
                  <div
                    className={styles.status}
                    role="status"
                    aria-live="polite"
                    data-result={game.result ?? undefined}
                  >
                    <p className={styles.kicker}>{t("status")}</p>
                    <p
                      key={`${match.gameIndex}-${match.status}-${game.turn}-${game.result}`}
                      className={styles.statusText}
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
                      <p className={styles.busy}>
                        <Loader2
                          className="size-4 animate-spin motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                        {t(busy === "jev" ? "jevThinking" : "saving")}
                      </p>
                    )}
                  </div>
                  {error && (
                    <div role="alert" className={styles.error}>
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
                      className={styles.primaryButton}
                      onClick={next}
                      disabled={busy !== null || error !== null}
                    >
                      {t(game.result === "DRAW" ? "replay" : "nextGame")}
                    </Button>
                  )}
                  {isComplete && (
                    <Button
                      type="button"
                      className={styles.primaryButton}
                      onClick={start}
                      disabled={busy !== null}
                    >
                      {t("playAgain")}
                    </Button>
                  )}
                  <details className={styles.rules}>
                    <summary>{t("rules")}</summary>
                    <p>{t(`games.${game.gameId}.rules`)}</p>
                  </details>
                  {match.history.length > 0 && (
                    <div className={styles.history}>
                      <h3>{t("history")}</h3>
                      <ol>
                        {match.history.map((item, index) => (
                          <li key={`${item.gameId}-${index}`}>
                            <span>{t(`games.${item.gameId}.title`)}</span>
                            <span data-won={item.result === "PLAYER" || undefined}>
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
                    className={styles.refresh}
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
