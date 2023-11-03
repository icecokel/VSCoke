/** @type {import('next').NextConfig} */
const debug = process.env.NODE_ENV !== "production";
const repository = "VSCoke";

const nextConfig = {
  reactStrictMode: false,
  basePath: "/VSCoke",
  assetPrefix: !debug ? `/${repository}/` : "",
  trailingSlash: true,
  output: "export",
  experimental: {
    appDir: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "icecokel-blog-dev.s3.ap-northeast-2.amazonaws.com",
        port: "",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "s3.us-west-2.amazonaws.com",
        port: "",
        pathname: "/secure.notion-static.com/**",
      },
      {
        protocol: "https",
        hostname: "prod-files-secure.s3.us-west-2.amazonaws.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
