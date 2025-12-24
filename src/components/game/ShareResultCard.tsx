"use client";

import { forwardRef } from "react";

interface ShareResultCardProps {
  score: number;
  gameName?: string;
}

// html-to-image 캡처용 공유 카드 (인라인 스타일 사용)
export const ShareResultCard = forwardRef<HTMLDivElement, ShareResultCardProps>(
  ({ score, gameName = "SKY DROP" }, ref) => {
    const today = new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    return (
      <div
        ref={ref}
        style={{
          width: "400px",
          height: "300px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
          borderRadius: "16px",
          // 그라데이션 대신 단색 백그라운드 사용 (호환성 최적화) 또는 이미지
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          fontFamily: "sans-serif",
          boxSizing: "border-box", // 중요
        }}
      >
        {/* 게임 로고 */}
        <div
          style={{
            fontSize: "30px",
            fontWeight: "bold",
            color: "#4ECDC4",
            marginBottom: "8px",
            letterSpacing: "0.05em",
          }}
        >
          {gameName}
        </div>

        {/* 구분선 */}
        <div
          style={{
            width: "80px",
            height: "4px",
            background: "linear-gradient(90deg, #4ECDC4, #FF6B6B)",
            borderRadius: "2px",
            margin: "16px 0",
          }}
        />

        {/* 점수 */}
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              color: "#9ca3af",
              fontSize: "14px",
              marginBottom: "4px",
              margin: "0 0 4px 0",
            }}
          >
            {score >= 7000 ? (
              <span style={{ fontSize: "40px" }}>🥇</span>
            ) : score >= 6000 ? (
              <span style={{ fontSize: "40px" }}>🥈</span>
            ) : score >= 5000 ? (
              <span style={{ fontSize: "40px" }}>🥉</span>
            ) : null}
            SCORE
          </p>
          <div
            style={{
              fontSize: "48px",
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: "0.1em",
              margin: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
            }}
          >
            <span>{score.toLocaleString()}</span>
          </div>
        </div>

        {/* 날짜 및 브랜딩 */}
        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <p style={{ color: "#6b7280", fontSize: "12px", margin: "0 0 4px 0" }}>{today}</p>
          <p style={{ color: "#4b5563", fontSize: "12px", margin: 0 }}>vscoke.vercel.app</p>
        </div>
      </div>
    );
  },
);

ShareResultCard.displayName = "ShareResultCard";
