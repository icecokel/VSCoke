"use client";

import Chip from "@/components/base-ui/chip";
import BaseText from "@/components/base-ui/text";
import { Description } from "./types";

interface DescriptionItemProps {
  description: Description;
}

const DescriptionItem = ({ description }: DescriptionItemProps) => {
  return (
    <div className="mb-4 ml-4">
      <BaseText type="body1" className="text-white font-medium mb-2">
        {description.subtitle}
      </BaseText>

      {description.detail && (
        <BaseText type="body2" className="text-gray-300 mb-2">
          {description.detail}
        </BaseText>
      )}

      {description.skills && (
        <div className="mb-3">
          <BaseText type="body2" className="text-gray-400 mb-2">
            기술 스택
          </BaseText>
          <div className="flex flex-wrap gap-2">
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

      {description.achievement && (
        <div className="mt-3 p-3 bg-blue-300/10 rounded-sm border-l-4 border-blue-300">
          <BaseText type="body2" className="text-blue-100 font-medium">
            💡 성과
          </BaseText>
          <BaseText type="body2" className="text-gray-300 mt-1 whitespace-pre-line">
            {description.achievement}
          </BaseText>
        </div>
      )}
    </div>
  );
};

export default DescriptionItem;
