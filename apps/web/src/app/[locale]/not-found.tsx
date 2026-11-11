"use client";

import { useHistory } from "@/hooks/use-history";
import Container from "@/components/base-ui/container";
import BaseText from "@/components/base-ui/text";
import Icon from "@/components/base-ui/icon";
import { useEffect, useRef } from "react";
import { getPathname, usePathname, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";

const NotFound = () => {
  const { recoverFromNotFound, isHydrated, currentPath } = useHistory();
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("notFound");
  const recoveredPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isHydrated || recoveredPathRef.current === currentPath) return;

    recoveredPathRef.current = currentPath;
    const target = recoverFromNotFound(currentPath);
    if (target === currentPath) return;

    if (target.split("?", 1)[0] === pathname) {
      // Next 15의 404 경계는 query 변경만으로 초기화되지 않는다.
      window.location.replace(getPathname({ locale, href: target }));
    } else {
      router.replace(target);
    }
  }, [currentPath, isHydrated, locale, pathname, recoverFromNotFound, router]);

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
