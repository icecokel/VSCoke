"use client";

import Tooltip from "../baseUi/Tooltip";
import useHistory from "@/hooks/useHistory";
import Avatar from "@ui/Avatar";
import BaseText from "@ui/Text";

const NameCard = () => {
  const { add } = useHistory();
  const handleClickLink = () => {
    add({ path: "/profile", isActive: true, title: "profile" });
  };
  return (
    <div className="p-5 bg-blue-300/20 rounded-md mt-10">
      <Tooltip text="이력서 보러가기">
        <button className="flex gap-5 items-center" onClick={handleClickLink}>
          <Avatar
            size={120}
            className="h-[120px] w-[120px] border-2 border-gray-300"
            src={"profileImg.jpg"}
          />
          <div className="flex flex-col items-start">
            <BaseText type="h6">얼음콜라</BaseText>
            <BaseText type="body2">소심한 관종 개발자</BaseText>
          </div>
        </button>
      </Tooltip>
    </div>
  );
};

export default NameCard;
