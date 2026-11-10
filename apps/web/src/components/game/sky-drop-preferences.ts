const MUTED_KEY = "skyDropMuted";

// 저장소 값은 "1"/"0"만 믿는다. 그 외 값이나 접근 실패는 기본값(소리 켬)으로 본다.
export const parseSkyDropMuted = (raw: string | null): boolean => raw === "1";

export const readSkyDropMuted = (): boolean => {
  try {
    return parseSkyDropMuted(localStorage.getItem(MUTED_KEY));
  } catch {
    return false;
  }
};

export const writeSkyDropMuted = (muted: boolean): void => {
  try {
    localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
  } catch {
    // 저장소가 차단돼도 이번 세션의 음소거는 유지된다.
  }
};

interface TrappedFocusInput {
  shiftKey: boolean;
  active: Element | null;
  first: HTMLElement | null;
  last: HTMLElement | null;
}

// 일시정지 오버레이 안에서 Tab이 첫·마지막 버튼을 넘어가면 반대쪽 버튼을 돌려준다.
// 오버레이 안에 머물 때는 null을 돌려 브라우저 기본 이동에 맡긴다.
export const resolveTrappedFocus = ({
  shiftKey,
  active,
  first,
  last,
}: TrappedFocusInput): HTMLElement | null => {
  if (!first || !last) return null;
  if (shiftKey && (active === first || active === null)) return last;
  if (!shiftKey && active === last) return first;
  return null;
};
