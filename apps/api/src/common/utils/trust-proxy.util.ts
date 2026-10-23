const DEFAULT_TRUST_PROXY = 'loopback';

// Express `trust proxy` 설정값. 호스트에서 직접 실행하면 cloudflared가 loopback으로 들어오지만,
// Docker compose 운영에서는 Docker 게이트웨이(uniquelocal)를 거치므로 compose가 값을 주입한다.
export const getTrustProxySetting = (value: string | undefined): string => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : DEFAULT_TRUST_PROXY;
};
