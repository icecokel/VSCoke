"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, RefreshCw, Trophy } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CustomLink } from "@/components/custom-link";
import { getGameRanking, type GameHistory } from "@/services/score-service";
import styles from "./arcade-basketball-ready.module.css";

interface ReadyProps {
  onStart: () => void;
}

export const ArcadeBasketballReady = ({ onStart }: ReadyProps) => {
  const t = useTranslations("Game.arcadeBasketball");
  const common = useTranslations("Game");
  const headingId = useId();
  const [rankings, setRankings] = useState<GameHistory[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let isActive = true;
    setStatus("loading");
    getGameRanking("ARCADE_BASKETBALL")
      .then(rows => {
        if (!isActive) return;
        setRankings(rows);
        setStatus("loaded");
      })
      .catch(() => {
        if (isActive) setStatus("error");
      });
    return () => {
      isActive = false;
    };
  }, [reload]);

  return (
    <section className={styles.lobby} data-testid="basketball-ready" aria-label={t("title")}>
      <CustomLink href="/game" className={styles.back}>
        <ArrowLeft size={16} aria-hidden="true" />
        {common("goToDashboard")}
      </CustomLink>
      <div className={styles.layout}>
        <div className={styles.intro}>
          <h1>{t("title")}</h1>
          <p>{t("lobbyRules")}</p>
          <div className={styles.cabinet} aria-hidden="true">
            <Image
              src="/games/arcade-basketball/court-back.png"
              alt=""
              fill
              unoptimized
              loading="eager"
              draggable={false}
            />
            <Image
              src="/games/arcade-basketball/rim.png"
              alt=""
              width={72}
              height={45}
              unoptimized
              draggable={false}
              className={styles.rim}
            />
            <Image
              src="/games/arcade-basketball/ball.png"
              alt=""
              width={56}
              height={56}
              unoptimized
              draggable={false}
              className={styles.ball}
            />
          </div>
          <p className={styles.controls}>{t("lobbyControls")}</p>
        </div>

        <section className={styles.leaderboard} aria-labelledby={headingId}>
          <header className={styles.rankingHeader}>
            <h2 id={headingId}>
              <Trophy size={18} aria-hidden="true" />
              {t("rankingTitle")}
            </h2>
            <span>{t("topTen")}</span>
          </header>
          <p className={styles.rankingHint}>{t("rankingHint")}</p>
          <div
            className={styles.tableScroll}
            role="region"
            aria-labelledby={headingId}
            tabIndex={0}
          >
            <table className={styles.table} aria-busy={status === "loading"}>
              <caption className="sr-only">{t("rankingTitle")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("rankColumn")}</th>
                  <th scope="col">{t("playerColumn")}</th>
                  <th scope="col">{t("score")}</th>
                </tr>
              </thead>
              <tbody>
                {status === "loaded" &&
                  rankings.map((entry, index) => (
                    <tr key={entry.rank} data-first={index === 0}>
                      <td className={styles.place}>
                        <span>{String(entry.rank).padStart(2, "0")}</span>
                      </td>
                      <th scope="row">
                        {entry.user.displayName.trim() || common("unknownPlayer")}
                      </th>
                      <td className={styles.points}>{entry.score.toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {status === "loading" && (
              <p className={styles.message} role="status">
                {common("leaderboardLoading")}
              </p>
            )}
            {status === "loaded" && rankings.length === 0 && (
              <p className={styles.message}>{common("leaderboardEmpty")}</p>
            )}
            {status === "error" && (
              <div className={styles.message} role="status">
                <p>{common("loadFailed")}</p>
                <Button variant="ghost" onClick={() => setReload(value => value + 1)}>
                  <RefreshCw size={15} aria-hidden="true" />
                  {t("retry")}
                </Button>
              </div>
            )}
          </div>
          <p className={styles.loginHint}>{t("rankingLoginHint")}</p>
          <Button className={styles.start} size="lg" onClick={onStart}>
            {t("start")}
            <ArrowRight aria-hidden="true" />
          </Button>
        </section>
      </div>
    </section>
  );
};
