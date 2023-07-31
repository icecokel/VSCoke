"use client";

import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

const Intro = () => {
  return (
    <div className="p-8">
      <div className="flex justify-center">
        <Typography variant="h3" fontWeight={700}>
          Welcome VSCoke
        </Typography>
      </div>
      <Divider className="my-5 border-white" />
      <div className="flex items-end px-10 pb-2 pt-5">
        <Typography variant="h6">OS가 윈도우인 경우</Typography>
        <div className="m-2 w-fit rounded-md border p-2">
          <Typography variant="h5">F11</Typography>
        </div>
        <Typography variant="h6">눌러 "전체 화면" 으로 보시면</Typography>
      </div>
      <div className="flex items-end px-10 pb-5">
        <Typography variant="h6"> 더욱 좋은 경험이 될겁니다</Typography>
      </div>
    </div>
  );
};

export default Intro;
