import { RayHit, Player, Enemy } from "../types/doom-types";

// Canvas 해상도 설정
export const CANVAS_WIDTH = 640;
export const CANVAS_HEIGHT = 400;

/**
 * 파스텔 하늘과 잔디 렌더링
 */
export const renderSkyAndFloor = (ctx: CanvasRenderingContext2D): void => {
  // 하늘 그라데이션 (밝은 파스텔 블루)
  const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT / 2);
  skyGradient.addColorStop(0, "#87CEEB"); // 하늘색
  skyGradient.addColorStop(0.5, "#B0E0E6"); // 파우더 블루
  skyGradient.addColorStop(1, "#E0F7FA"); // 밝은 시안
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT / 2);

  // 구름 (장식)
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.beginPath();
  ctx.arc(100, 50, 25, 0, Math.PI * 2);
  ctx.arc(130, 45, 30, 0, Math.PI * 2);
  ctx.arc(160, 50, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(450, 70, 20, 0, Math.PI * 2);
  ctx.arc(475, 65, 25, 0, Math.PI * 2);
  ctx.arc(500, 70, 20, 0, Math.PI * 2);
  ctx.fill();

  // 잔디 그라데이션 (밝은 녹색)
  const floorGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT / 2, 0, CANVAS_HEIGHT);
  floorGradient.addColorStop(0, "#90EE90"); // 밝은 녹색
  floorGradient.addColorStop(0.5, "#7CCD7C");
  floorGradient.addColorStop(1, "#6B8E23"); // 올리브 그린
  ctx.fillStyle = floorGradient;
  ctx.fillRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT / 2);
};

/**
 * 벽면 렌더링 (파스텔 벽돌)
 */
export const renderWalls = (
  ctx: CanvasRenderingContext2D,
  rays: RayHit[],
  screenWidth: number,
): number[] => {
  const wallDistances: number[] = [];
  const columnWidth = CANVAS_WIDTH / screenWidth;

  for (let x = 0; x < rays.length; x++) {
    const ray = rays[x];
    wallDistances.push(ray.distance);

    const lineHeight = Math.floor(CANVAS_HEIGHT / ray.distance);
    const drawStart = Math.max(0, Math.floor((CANVAS_HEIGHT - lineHeight) / 2));
    const drawEnd = Math.min(CANVAS_HEIGHT, Math.floor((CANVAS_HEIGHT + lineHeight) / 2));
    const wallHeight = drawEnd - drawStart;

    const fogFactor = Math.max(0.3, 1 - ray.distance / 14);

    // 파스텔 벽돌 색상
    const baseColors =
      ray.side === 0
        ? { r: 255, g: 182, b: 193 } // 핑크
        : { r: 221, g: 160, b: 221 }; // 플럼

    const gradient = ctx.createLinearGradient(0, drawStart, 0, drawEnd);
    const topR = Math.floor(baseColors.r * fogFactor);
    const topG = Math.floor(baseColors.g * fogFactor);
    const topB = Math.floor(baseColors.b * fogFactor);

    gradient.addColorStop(
      0,
      `rgb(${Math.min(255, topR + 30)}, ${Math.min(255, topG + 30)}, ${Math.min(255, topB + 30)})`,
    );
    gradient.addColorStop(0.5, `rgb(${topR}, ${topG}, ${topB})`);
    gradient.addColorStop(
      1,
      `rgb(${Math.floor(topR * 0.7)}, ${Math.floor(topG * 0.7)}, ${Math.floor(topB * 0.7)})`,
    );

    ctx.fillStyle = gradient;
    ctx.fillRect(Math.floor(x * columnWidth), drawStart, Math.ceil(columnWidth) + 1, wallHeight);
  }

  return wallDistances;
};

/**
 * 미니맵 렌더링 (귀여운 스타일)
 */
export const renderMinimap = (
  ctx: CanvasRenderingContext2D,
  map: number[][],
  player: Player,
  enemies: Enemy[],
): void => {
  const mapSize = 80;
  const tileSize = mapSize / map.length;
  const offsetX = CANVAS_WIDTH - mapSize - 10;
  const offsetY = 10;

  // 배경 (부드러운 둥근 사각형)
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.beginPath();
  ctx.roundRect(offsetX - 4, offsetY - 4, mapSize + 8, mapSize + 8, 10);
  ctx.fill();

  ctx.strokeStyle = "#FFB6C1";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 타일
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] > 0) {
        ctx.fillStyle = "#DDA0DD";
        ctx.fillRect(
          offsetX + x * tileSize,
          offsetY + y * tileSize,
          tileSize - 0.5,
          tileSize - 0.5,
        );
      }
    }
  }

  // 적 (하트)
  ctx.fillStyle = "#FF69B4";
  for (const enemy of enemies) {
    if (enemy.state !== "dead") {
      const ex = offsetX + enemy.position.x * tileSize;
      const ey = offsetY + enemy.position.y * tileSize;
      ctx.font = "6px Arial";
      ctx.fillText("♥", ex - 3, ey + 2);
    }
  }

  // 플레이어 (별)
  ctx.fillStyle = "#32CD32";
  const px = offsetX + player.position.x * tileSize;
  const py = offsetY + player.position.y * tileSize;
  ctx.font = "8px Arial";
  ctx.fillText("★", px - 4, py + 3);
};

/**
 * 귀여운 적 스프라이트 렌더링 (슬라임!)
 */
export const renderEnemySprites = (
  ctx: CanvasRenderingContext2D,
  enemies: Enemy[],
  player: Player,
  wallDistances: number[],
  screenWidth: number,
): void => {
  const sortedEnemies = [...enemies]
    .filter(e => e.state !== "dead")
    .map(enemy => {
      const dx = enemy.position.x - player.position.x;
      const dy = enemy.position.y - player.position.y;
      return { enemy, distance: Math.sqrt(dx * dx + dy * dy) };
    })
    .sort((a, b) => b.distance - a.distance);

  for (const { enemy, distance } of sortedEnemies) {
    const dx = enemy.position.x - player.position.x;
    const dy = enemy.position.y - player.position.y;

    const invDet =
      1.0 / (player.plane.x * player.direction.y - player.direction.x * player.plane.y);
    const transformX = invDet * (player.direction.y * dx - player.direction.x * dy);
    const transformY = invDet * (-player.plane.y * dx + player.plane.x * dy);

    if (transformY <= 0.5) continue;

    const spriteScreenX = Math.floor((CANVAS_WIDTH / 2) * (1 + transformX / transformY));
    const spriteHeight = Math.abs(Math.floor(CANVAS_HEIGHT / transformY));
    const spriteWidth = spriteHeight;

    const drawStartY = Math.floor((CANVAS_HEIGHT - spriteHeight) / 2);
    const drawStartX = Math.floor(spriteScreenX - spriteWidth / 2);

    const columnWidth = CANVAS_WIDTH / screenWidth;
    const checkX = Math.floor(spriteScreenX / columnWidth);

    if (checkX >= 0 && checkX < wallDistances.length && distance < wallDistances[checkX]) {
      const centerX = drawStartX + spriteWidth / 2;
      const centerY = drawStartY + spriteHeight * 0.6;

      // 슬라임 색상 (상태에 따라)
      let slimeColor: string;
      let highlightColor: string;
      switch (enemy.state) {
        case "attack":
          slimeColor = "#FF6B9D"; // 핑크
          highlightColor = "#FFB6C1";
          break;
        case "chase":
          slimeColor = "#87CEEB"; // 하늘색
          highlightColor = "#B0E0E6";
          break;
        default:
          slimeColor = "#98FB98"; // 연두색
          highlightColor = "#AFFFAF";
      }

      // 슬라임 몸체 (타원)
      const bodyGradient = ctx.createRadialGradient(
        centerX - spriteWidth * 0.1,
        centerY - spriteHeight * 0.1,
        0,
        centerX,
        centerY,
        spriteWidth * 0.5,
      );
      bodyGradient.addColorStop(0, highlightColor);
      bodyGradient.addColorStop(0.7, slimeColor);
      bodyGradient.addColorStop(1, slimeColor);

      ctx.fillStyle = bodyGradient;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, spriteWidth * 0.4, spriteHeight * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // 테두리
      ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 눈 (반짝이는 큰 눈)
      const eyeY = centerY - spriteHeight * 0.05;
      const eyeSize = Math.max(4, spriteWidth * 0.12);
      const eyeSpacing = spriteWidth * 0.2;

      // 흰자
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(centerX - eyeSpacing, eyeY, eyeSize, eyeSize * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(centerX + eyeSpacing, eyeY, eyeSize, eyeSize * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 눈동자
      ctx.fillStyle = "#333333";
      ctx.beginPath();
      ctx.arc(centerX - eyeSpacing, eyeY + eyeSize * 0.2, eyeSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX + eyeSpacing, eyeY + eyeSize * 0.2, eyeSize * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // 눈 하이라이트
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(
        centerX - eyeSpacing - eyeSize * 0.2,
        eyeY - eyeSize * 0.2,
        eyeSize * 0.25,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        centerX + eyeSpacing - eyeSize * 0.2,
        eyeY - eyeSize * 0.2,
        eyeSize * 0.25,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // 볼터치
      ctx.fillStyle = "rgba(255, 182, 193, 0.6)";
      ctx.beginPath();
      ctx.ellipse(
        centerX - eyeSpacing * 1.5,
        eyeY + spriteHeight * 0.08,
        eyeSize * 0.6,
        eyeSize * 0.4,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
        centerX + eyeSpacing * 1.5,
        eyeY + spriteHeight * 0.08,
        eyeSize * 0.6,
        eyeSize * 0.4,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // 웃는 입 (또는 놀란 입)
      ctx.strokeStyle = "#333333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (enemy.state === "chase" || enemy.state === "attack") {
        // O 모양 입
        ctx.arc(centerX, eyeY + spriteHeight * 0.15, eyeSize * 0.4, 0, Math.PI * 2);
      } else {
        // 웃는 입
        ctx.arc(centerX, eyeY + spriteHeight * 0.08, eyeSize * 0.5, 0.1 * Math.PI, 0.9 * Math.PI);
      }
      ctx.stroke();
    }
  }
};

/**
 * 귀여운 무기 렌더링 (마법 지팡이!)
 */
export const renderWeapon = (ctx: CanvasRenderingContext2D, isFiring: boolean): void => {
  const x = CANVAS_WIDTH / 2;
  const y = CANVAS_HEIGHT - 50;

  const offset = isFiring ? Math.random() * 4 - 2 : 0;
  const fireOffset = isFiring ? -10 : 0;

  // 지팡이 막대
  const wandGradient = ctx.createLinearGradient(x - 8, y, x + 8, y);
  wandGradient.addColorStop(0, "#DEB887");
  wandGradient.addColorStop(0.5, "#D2691E");
  wandGradient.addColorStop(1, "#8B4513");
  ctx.fillStyle = wandGradient;
  ctx.beginPath();
  ctx.roundRect(x - 8 + offset, y + 30 + fireOffset, 16, 80, 5);
  ctx.fill();

  // 별 모양 끝
  ctx.fillStyle = "#FFD700";
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = isFiring ? 20 : 10;
  drawStar(ctx, x + offset, y + 15 + fireOffset, 5, 20, 10);
  ctx.shadowBlur = 0;

  // 발사 이펙트 (별 파티클)
  if (isFiring) {
    const colors = ["#FFD700", "#FF69B4", "#87CEEB", "#98FB98"];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 30 + Math.random() * 30;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * dist + offset,
        y + 15 + Math.sin(angle) * dist + fireOffset,
        4 + Math.random() * 4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // 반짝이
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 5; i++) {
      const sparkX = x + (Math.random() - 0.5) * 80 + offset;
      const sparkY = y + (Math.random() - 0.5) * 60 + fireOffset;
      drawStar(ctx, sparkX, sparkY, 4, 5, 2);
    }
  }
};

/**
 * 별 그리기 헬퍼
 */
const drawStar = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
): void => {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }

  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
};

/**
 * 귀여운 HUD
 */
export const renderHUDOverlay = (
  ctx: CanvasRenderingContext2D,
  health: number,
  ammo: number,
): void => {
  // 하단 HUD 바 (둥근 모서리)
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.beginPath();
  ctx.roundRect(10, CANVAS_HEIGHT - 50, CANVAS_WIDTH - 20, 45, 15);
  ctx.fill();

  ctx.strokeStyle = "#FFB6C1";
  ctx.lineWidth = 3;
  ctx.stroke();

  // 체력 (하트)
  const heartX = 30;
  const heartY = CANVAS_HEIGHT - 28;

  ctx.fillStyle = "#FF69B4";
  ctx.font = "24px Arial";
  ctx.fillText("❤️", heartX, heartY + 7);

  // 체력 바
  const healthBarWidth = 120;
  const healthBarHeight = 18;
  const healthBarX = heartX + 35;

  ctx.fillStyle = "#FFE4E1";
  ctx.beginPath();
  ctx.roundRect(healthBarX, heartY - 8, healthBarWidth, healthBarHeight, 8);
  ctx.fill();

  const healthRatio = health / 100;
  const healthColor = health > 50 ? "#FF69B4" : health > 25 ? "#FFA07A" : "#FF6347";
  ctx.fillStyle = healthColor;
  ctx.beginPath();
  ctx.roundRect(healthBarX, heartY - 8, healthBarWidth * healthRatio, healthBarHeight, 8);
  ctx.fill();

  ctx.fillStyle = "#333";
  ctx.font = "bold 12px Arial";
  ctx.fillText(`${health}`, healthBarX + healthBarWidth / 2 - 10, heartY + 5);

  // 탄약 (별)
  const ammoX = CANVAS_WIDTH - 100;
  ctx.fillStyle = "#FFD700";
  ctx.font = "24px Arial";
  ctx.fillText("⭐", ammoX, heartY + 7);

  ctx.fillStyle = "#333";
  ctx.font = "bold 16px Arial";
  ctx.fillText(`${ammo}`, ammoX + 30, heartY + 5);
};

/**
 * 전체 프레임 렌더링
 */
export const renderFrame = (
  ctx: CanvasRenderingContext2D,
  rays: RayHit[],
  player: Player,
  enemies: Enemy[],
  map: number[][],
  screenWidth: number,
  isFiring: boolean,
): void => {
  renderSkyAndFloor(ctx);
  const wallDistances = renderWalls(ctx, rays, screenWidth);
  renderEnemySprites(ctx, enemies, player, wallDistances, screenWidth);
  renderWeapon(ctx, isFiring);
  renderMinimap(ctx, map, player, enemies);
  renderHUDOverlay(ctx, player.health, player.ammo);
};
