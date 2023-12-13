"use client";

import useHistory from "@/hooks/useHistory";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Link from "next/link";

const NameCard = () => {
  const { add } = useHistory();
  const handleClickLink = () => {
    add({ path: "/profile", isActive: true, title: "profile" });
  };
  return (
    <div className="border-t-[1px] p-[20px] border-t-gray-500">
      <button className="flex gap-5 items-center" onClick={handleClickLink}>
        <Avatar
          className="h-[120px] w-[120px] border-2 border-gray-300"
          src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}profileImg.jpg`}
        />
        <div>
          <Typography variant="h6">얼음콜라</Typography>
          <Typography variant="body2" color={"text.secondary"}>
            소심한 관종 개발자
          </Typography>
        </div>
      </button>
    </div>
  );
};

export default NameCard;
