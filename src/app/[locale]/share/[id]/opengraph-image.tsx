import { ImageResponse } from "next/og";
import { getSkyDropMedal } from "@/utils/sky-drop-util";
import { getGameResult } from "@/services/score-service";

export const runtime = "edge";
export const alt = "Game Result";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const OGImage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const result = await getGameResult(id);

  if (!result) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1e293b",
          color: "#fff",
          fontSize: 48,
        }}
      >
        Game Result Not Found
      </div>,
      { ...size },
    );
  }

  const isSkyDrop = result.gameType === "SKY_DROP";
  const gameTitle = isSkyDrop ? "SKY DROP" : "GAME";
  const medal = isSkyDrop ? getSkyDropMedal(result.score) : null;

  // Colors
  const titleColor = isSkyDrop ? "#4ECDC4" : "#FFD93D";
  const accentGradient = isSkyDrop
    ? "linear-gradient(90deg, #4ECDC4, #FF6B6B)"
    : "linear-gradient(90deg, #FFD93D, #FF8E3C)";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* 게임 로고 */}
      <div
        style={{
          fontSize: 64,
          fontWeight: "bold",
          color: titleColor,
          marginBottom: 16,
          letterSpacing: "0.1em",
          display: "flex", // Flexbox for text alignment
        }}
      >
        {gameTitle}
      </div>

      {/* 구분선 */}
      <div
        style={{
          width: 120,
          height: 6,
          background: accentGradient,
          borderRadius: 3,
          margin: "24px 0",
        }}
      />

      {/* 점수 라벨 */}
      <div
        style={{
          fontSize: 28,
          color: "#9ca3af",
          marginBottom: 8,
        }}
      >
        SCORE
      </div>

      {/* 점수 및 메달 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {medal && <div style={{ fontSize: 100 }}>{medal}</div>}
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            color: "white",
            letterSpacing: "0.1em",
            textShadow: `0 0 40px ${titleColor}80`, // Slight transparency
          }}
        >
          {result.score.toLocaleString()}
        </div>
      </div>

      {/* CTA */}
      <div
        style={{
          marginTop: 40,
          padding: "16px 48px",
          background: accentGradient,
          borderRadius: 16,
          fontSize: 28,
          fontWeight: "bold",
          color: "#1a1a2e",
          display: "flex",
        }}
      >
        도전해보세요!
      </div>

      {/* 브랜딩 */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          fontSize: 20,
          color: "#6b7280",
        }}
      >
        vscoke.vercel.app
      </div>
    </div>,
    { ...size },
  );
};

export default OGImage;
