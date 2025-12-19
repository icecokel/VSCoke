"use client";

import Container from "@/components/base-ui/container";
import BaseText from "@/components/base-ui/text";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { useTranslations } from "next-intl";

const NotFound = () => {
  const path = usePathname();
  const router = useRouter();
  const t = useTranslations("notFound");

  return (
    <Container maxWidth="sm">
      <div className="mt-20 gap-[10px] flex flex-col">
        <BaseText type="h4" className="text-center text-red-400/90 border-b pb-4">
          {t("title")}
        </BaseText>
        <div className="bg-beige-400 py-2 px-4 rounded-sm text-black">
          <div className="flex items-end">
            <BaseText type="body1" className="text-yellow-200 font-bold mx-[0.5em]">
              {t("descPrefix")}
              {path}
              {t("descPrefix")}
            </BaseText>
            <BaseText type="body2">{t("descSuffix")}</BaseText>
          </div>
          <BaseText type="body2">{t("guide")}</BaseText>
        </div>
        <Button className="mt-4" onClick={() => router.push("/")}>
          {t("button")}
        </Button>
      </div>
    </Container>
  );
};

export default NotFound;
