"use client";

import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

const Intro = () => {
  return (
    <div className="p-8">
      <Stack justifyContent={"center"} alignItems={"center"}>
        <Typography variant="h3" fontWeight={700}>
          Welcome VSCoke
        </Typography>
      </Stack>
      <Divider className="my-5 border-white" />
      <Stack
        alignItems={"center"}
        className="px-10 pb-2 pt-5"
        flexDirection={"row"}
      >
        <Typography variant="h6">OS가 윈도우인 경우</Typography>
        <div className="m-2 w-fit rounded-md border p-2">
          <Typography variant="h5">F11</Typography>
        </div>
        <Typography variant="h6">눌러 "전체 화면" 으로 보시면</Typography>
      </Stack>
      <Stack alignItems={"center"} className="px-10 pb-5" flexDirection={"row"}>
        <Typography variant="h6"> 더욱 좋은 경험이 될겁니다</Typography>
      </Stack>
    </div>
  );
};

export default Intro;
