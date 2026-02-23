"use client";

import { useHistory } from "@/hooks/use-history";
import Container from "@/components/base-ui/container";
import BaseText from "@/components/base-ui/text";
import Icon from "@/components/base-ui/icon";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

const NotFound = () => {
  const { history, remove } = useHistory();
  const pathname = usePathname();
  const router = useRouter();

  // ref를 사용하여 최신 history 상태 추적 및 중복 실행 방지
  const historyRef = useRef(history);
  const hasRemovedRef = useRef(false);

  // history 변경 시 ref 업데이트
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  // 존재하지 않는 경로의 탭 자동 제거 및 다음 탭으로 이동 (1회만 실행)
  useEffect(() => {
    if (hasRemovedRef.current) return;

    const currentHistory = historyRef.current;
    const invalidTabIndex = currentHistory.findIndex(item => item.path === pathname);

    if (invalidTabIndex !== -1) {
      hasRemovedRef.current = true;

      // 다음 이동할 탭 결정 (오른쪽 → 왼쪽 → 홈)
      const nextTab = currentHistory[invalidTabIndex + 1] || currentHistory[invalidTabIndex - 1];

      // 탭 제거
      remove(currentHistory[invalidTabIndex]);

      // 다음 탭으로 이동 (없으면 홈으로)
      router.replace(nextTab?.path || "/");
    }
  }, [pathname, remove, router]);

  return (
    <Container className="min-h-screen flex flex-col items-center justify-center text-white">
      <Icon kind="folder" size={64} className="text-gray-500 mb-4" />
      <BaseText type="h5" className="text-gray-300 mb-2">
        페이지를 찾을 수 없습니다
      </BaseText>
      <BaseText type="body2" className="text-gray-500">
        요청하신 경로가 존재하지 않거나 삭제되었습니다.
      </BaseText>
      <BaseText type="caption" className="text-gray-600 mt-4">
        {pathname}
      </BaseText>
    </Container>
  );
};

export default NotFound;
