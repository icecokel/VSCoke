"use client";

import { useTranslations } from "next-intl";

import Chip from "@/components/base-ui/chip";

import AchievementBox from "./achievement-box";
import type { Description } from "./types";

interface DescriptionItemProps {
  description: Description;
}

const DescriptionItem = ({ description }: DescriptionItemProps) => {
  const t = useTranslations("descriptionItem");

  return (
    <section className="mb-4 ml-4">
      <h6 className="mb-2 text-base font-medium leading-6 text-white">{description.subtitle}</h6>

      {description.detail && (
        <p className="mb-2 text-sm leading-6 text-gray-300">{description.detail}</p>
      )}

      {description.skills && (
        <div className="mb-3">
          <p className="mb-2 text-sm leading-6 text-gray-400">{t("techStack")}</p>
          <div className="flex flex-wrap gap-2 p-1">
            {description.skills.split(", ").map((skill, index) => (
              <Chip
                key={index}
                label={skill}
                className="text-white hover:border-yellow-200 hover:text-yellow-200 select-none"
              />
            ))}
          </div>
        </div>
      )}

      {description.tasks && description.tasks.length > 0 && (
        <ul className="ml-4 mb-3">
          {description.tasks.map((task, index) => (
            <li key={index} className="text-gray-300 text-sm mb-1 list-disc">
              {task}
            </li>
          ))}
        </ul>
      )}

      {description.achievement && <AchievementBox achievement={description.achievement} />}
    </section>
  );
};

export default DescriptionItem;
