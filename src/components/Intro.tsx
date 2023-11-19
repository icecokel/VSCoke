"use client";

import useHistory from "@/hooks/useHistory";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const Intro = () => {
  const { current } = useHistory();
  const router = useRouter();
  useEffect(() => {
    if (current) {
      router.replace(current.path);
    }
  }, [current]);
  return (
    <div className="p-2 md:p-8">
      <Stack direction={"row"} justifyContent={"center"} alignItems={"center"} gap={"16px"}>
        <Typography variant="h3" fontWeight={700}>
          Welcome VSCoke
        </Typography>
      </Stack>
      <Divider className="my-5 border-white" />
      <div className="flex flex-col">
        <div className="p-2 md:px-10 pb-2 flex md:items-center flex-col md:flex-row">
          <div className="flex items-center gap-2">
            <Typography variant="h6">OS가 윈도우인 경우</Typography>
            <Intro.button label="F11" />
          </div>
          <Typography variant="h6">눌러 "전체 화면" 으로 보시면</Typography>
        </div>
        <div className="p-2 md:px-10 pb-2 flex md:items-center flex-col md:flex-row">
          <Typography variant="h6">OS가 MAC인 경우</Typography>
          <div className="flex items-center gap-2">
            <Intro.button label="command" />+
            <Intro.button label="shift" />+
            <Intro.button label="F" />
          </div>
          <Typography variant="h6">눌러 "전체 화면" 으로 보시면</Typography>
        </div>
        <div className="px-2 md:px-10 pb-5">
          <Typography variant="h6"> 더욱 좋은 경험이 될겁니다</Typography>
        </div>
      </div>
    </div>
  );
};

export default Intro;

Intro.button = ({ label }: { label: string }) => {
  return (
    <div className="my-2 md:m-2 w-fit rounded-md border py-1 px-2 text-center text-yellow-200">
      <Typography variant="h5" className="text-[16px] md:text-[20px]">
        {label}
      </Typography>
    </div>
  );
};
