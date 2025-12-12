"use client";

import useHistory from "@/hooks/use-history";
import Container from "@/components/base-ui/container";
import BaseText from "@/components/base-ui/text";
import Icon from "@/components/base-ui/icon";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const NotFound = () => {
  const { history, remove } = useHistory();
  const pathname = usePathname();

  // 존재하지 않는 경로의 탭 자동 제거
  useEffect(() => {
    const invalidTab = history.find(item => item.path === pathname);
    if (invalidTab) {
      remove(invalidTab);
    }
  }, [pathname, history, remove]);

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
