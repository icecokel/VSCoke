"use client";

import { useHistory } from "@/hooks/use-history";
import Container from "@/components/base-ui/container";
import BaseText from "@/components/base-ui/text";
import Icon from "@/components/base-ui/icon";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const NotFound = () => {
  const { history, remove, setHistory, isHydrated, currentPath } = useHistory();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("notFound");
  const hasRecoveredRef = useRef(false);
  const invalidPathRef = useRef(currentPath);

  useEffect(() => {
    const invalidPath = invalidPathRef.current;
    // URL 동기화가 복구 중 다시 추가한 실패 탭도 페이지 이탈 시 정리한다.
    return () => setHistory(prev => prev.filter(item => item.path !== invalidPath));
  }, [setHistory]);

  // 존재하지 않는 경로의 탭 자동 제거 및 다음 탭으로 이동 (1회만 실행)
  useEffect(() => {
    if (!isHydrated || hasRecoveredRef.current) return;

    hasRecoveredRef.current = true;
    const invalidTabIndex = history.findIndex(item => item.path === currentPath);

    if (invalidTabIndex !== -1) {
      // 다음 이동할 탭 결정 (오른쪽 → 왼쪽 → 홈)
      const nextTab = history[invalidTabIndex + 1] || history[invalidTabIndex - 1];

      // 탭 제거
      remove(history[invalidTabIndex]);

      // 다음 탭으로 이동 (없으면 홈으로)
      router.replace(nextTab?.path || "/");
      return;
    }

    router.replace("/");
  }, [currentPath, history, isHydrated, remove, router]);

  return (
    <Container className="min-h-screen flex flex-col items-center justify-center text-white">
      <Icon kind="folder" size={64} className="text-gray-500 mb-4" />
      <BaseText type="h5" className="text-gray-300 mb-2">
        {t("title")}
      </BaseText>
      <BaseText type="body2" className="text-gray-500">
        {t("descPrefix")}
        {pathname}
        {t("descSuffix")}
      </BaseText>
    </Container>
  );
};

export default NotFound;
