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

const nextConfig: NextConfig = {
  // React Strict Mode (개발 환경에서 잠재적 문제 감지)
  // false: 비활성화 - 이중 렌더링 방지
  reactStrictMode: false,

  // 루트 추론을 고정해 lockfile 다중 탐지 경고를 방지
  outputFileTracingRoot: path.resolve(process.cwd()),

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
};

export default withNextIntl(nextConfig);
