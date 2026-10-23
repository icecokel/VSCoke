import { getTrustProxySetting } from './trust-proxy.util';

describe('getTrustProxySetting', () => {
  it('미설정이나 공백이면 loopback만 신뢰한다', () => {
    expect(getTrustProxySetting(undefined)).toBe('loopback');
    expect(getTrustProxySetting('   ')).toBe('loopback');
  });

  it('설정값은 공백을 제거해 그대로 전달한다', () => {
    expect(getTrustProxySetting(' loopback, uniquelocal ')).toBe(
      'loopback, uniquelocal',
    );
  });
});
