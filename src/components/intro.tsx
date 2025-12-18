"use client";

import BaseText from "@/components/base-ui/text";
import { useTranslations } from "next-intl";

const Intro = () => {
  const t = useTranslations("intro");

  return (
    <div className="p-2 md:p-8">
      <div className="flex justify-center items-center gap-4">
        <BaseText type="h3">{t("title")}</BaseText>
      </div>
      <hr className="my-5 border-white" />
      <div className="flex flex-col">
        <div className="p-2 md:px-10 pb-2 flex md:items-center flex-col md:flex-row">
          <div className="flex items-center gap-2">
            <BaseText type="h6">{t("osWindow")}</BaseText>
            <Intro.button label="F11" />
          </div>
          <BaseText type="h6">{t("fullScreenGuide")}</BaseText>
        </div>
        <div className="p-2 md:px-10 pb-2 flex md:items-center flex-col md:flex-row">
          <BaseText type="h6">{t("osMac")}</BaseText>
          <div className="flex items-center gap-2">
            <Intro.button label="command" />+
            <Intro.button label="shift" />+
            <Intro.button label="F" />
          </div>
          <BaseText type="h6">{t("fullScreenGuide")}</BaseText>
        </div>
        <div className="px-2 md:px-10 pb-5">
          <BaseText type="h6"> {t("experience")}</BaseText>
        </div>
      </div>
    </div>
  );
};

export default Intro;

Intro.button = ({ label }: { label: string }) => {
  return (
    <div className="my-2 md:m-2 w-fit rounded-md border py-1 px-2 text-center text-yellow-200">
      <BaseText type="h5" className="text-[16px] md:text-[20px]">
        {label}
      </BaseText>
    </div>
  );
};
