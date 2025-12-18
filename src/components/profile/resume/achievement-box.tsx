"use client";

import BaseText from "@/components/base-ui/text";

interface AchievementBoxProps {
  achievement: string;
}

import { useTranslations } from "next-intl";

const AchievementBox = ({ achievement }: AchievementBoxProps) => {
  const t = useTranslations("achievement");
  return (
    <div className="mt-3 p-3 bg-blue-300/10 rounded-sm border-l-4 border-blue-300">
      <BaseText type="body2" className="text-blue-100 font-medium">
        {t("label")}
      </BaseText>
      <br />
      <BaseText type="body2" className="text-gray-300 mt-1 whitespace-pre-line">
        {achievement}
      </BaseText>
    </div>
  );
};

export default AchievementBox;
