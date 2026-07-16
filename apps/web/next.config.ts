/**
 * Next.js Configuration
 *
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js
 */
import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl 플러그인 설정 (i18n 요청 핸들러 경로 지정)
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const monorepoRoot = path.resolve(process.cwd(), "../..");
const productionApiOrigin = "https://api.icecoke.kr";

export const normalizeConnectSource = (value: string | undefined) => {
  if (!value) return undefined;

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }

    return url.origin;
  } catch {
    return undefined;
  }
};

export const toWebSocketConnectSource = (value: string | undefined) => {
  const origin = normalizeConnectSource(value);

  if (!origin) return undefined;

  const url = new URL(origin);
  url.protocol = url.protocol === "http:" ? "ws:" : "wss:";

  return url.origin;
};

export const createConnectSources = (apiUrl: string | undefined) => {
  const apiOrigins = [productionApiOrigin, normalizeConnectSource(apiUrl)].filter(
    (source): source is string => Boolean(source),
  );

  return Array.from(
    new Set(
      [
        "'self'",
        ...apiOrigins.flatMap(origin => [origin, toWebSocketConnectSource(origin)]),
        "https://www.google-analytics.com",
        "https://region1.google-analytics.com",
        "https://analytics.google.com",
        "https://stats.g.doubleclick.net",
        "https://www.googletagmanager.com",
      ].filter((source): source is string => Boolean(source)),
    ),
  );
};

const connectSources = createConnectSources(process.env.NEXT_PUBLIC_API_URL);

const contentSecurityPolicy = `connect-src ${connectSources.join(" ")};`;

const nextConfig: NextConfig = {
  // React Strict Mode (개발 환경에서 잠재적 문제 감지)
  // false: 비활성화 - 이중 렌더링 방지
  reactStrictMode: false,

  // E2E는 전용 산출물 디렉터리를 사용해 일반 개발 캐시와 충돌하지 않도록 한다.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  typescript: {
    tsconfigPath: process.env.NEXT_TYPESCRIPT_CONFIG_PATH ?? "tsconfig.json",
  },

  // 모노레포 루트를 명시해 workspace package 참조와 lockfile 탐지를 안정화한다.
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ["@vscoke/poke-lounge-battle"],
  webpack(config) {
    config.resolve.alias["@vscoke/poke-lounge-battle"] = path.join(
      monorepoRoot,
      "packages/poke-lounge-battle/src/browser.ts",
    );
    return config;
  },

  // 외부 이미지 도메인 허용 설정 (next/image 컴포넌트용)
  images: {
    remotePatterns: [
      // AWS S3 - 블로그 이미지
      {
        protocol: "https",
        hostname: "icecokel-blog-dev.s3.ap-northeast-2.amazonaws.com",
        port: "",
        pathname: "/images/**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
