/**
 * Next.js Configuration
 *
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js
 */
import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { siteUrl } from "./src/lib/site-url";

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

export const createConnectSources = (apiUrl: string | undefined) => {
  const apiOrigins = [productionApiOrigin, normalizeConnectSource(apiUrl)].filter(
    (source): source is string => Boolean(source),
  );

  return Array.from(
    new Set(
      [
        "'self'",
        ...apiOrigins,
        "https://www.google-analytics.com",
        "https://region1.google-analytics.com",
        "https://analytics.google.com",
        "https://stats.g.doubleclick.net",
        "https://www.googletagmanager.com",
      ].filter((source): source is string => Boolean(source)),
    ),
  );
};

export const createProductionDomainRedirects = () => [
  {
    source: "/:path*",
    has: [{ type: "host" as const, value: "vscoke.vercel.app" }],
    destination: `${siteUrl}/:path*`,
    permanent: true,
  },
];

const connectSources = createConnectSources(process.env.NEXT_PUBLIC_API_URL);

// 스크립트 nonce CSP는 GA·GTM 연동 확인이 필요해 아직 적용하지 않는다. 지금은 연결 대상 제한과
// 클릭재킹·플러그인·<base> 주입을 막는 지시어만 둔다. 이 사이트는 다른 사이트의 iframe에 넣지 않는다.
export const createContentSecurityPolicy = (sources: readonly string[]): string =>
  [
    `connect-src ${sources.join(" ")}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'none'",
  ].join("; ") + ";";

// 사이트가 쓰지 않는 강력한 기능은 막고, 공유·클립보드처럼 쓰는 기능은 브라우저 기본값을 둔다.
export const securityHeaders = (sources: readonly string[]) => [
  { key: "Content-Security-Policy", value: createContentSecurityPolicy(sources) },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

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

  async redirects() {
    return createProductionDomainRedirects();
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(connectSources),
      },
    ];
  },
};

export default withNextIntl(nextConfig);
