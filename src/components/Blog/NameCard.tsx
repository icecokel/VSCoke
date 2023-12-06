"use client";

import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";

const NameCard = () => {
  return (
    <div className="flex gap-5 items-center border-t-[1px] p-[20px] border-t-gray-500">
      <Avatar
        className="h-[120px] w-[120px] border-4 border-yellow-200"
        src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}profileImg.jpg`}
      />
      <div>
        <Typography variant="h6">얼음콜라의 블로그</Typography>
      </div>
    </div>
  );
};

export default NameCard;
