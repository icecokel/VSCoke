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
    <div className="p-8">
      <Stack direction={"row"} justifyContent={"center"} alignItems={"center"} gap={"16px"}>
        <Typography variant="h3" fontWeight={700}>
          Welcome VSCoke
        </Typography>
      </Stack>
      <Divider className="my-5 border-white" />
      <Stack gap={2}>
        <Stack alignItems={"center"} className="px-10 pb-2" direction={"row"}>
          <Typography variant="h6">OS가 윈도우인 경우</Typography>

          <KeyButton label="F11" />
          <Typography variant="h6">눌러 "전체 화면" 으로 보시면</Typography>
        </Stack>
        <Stack alignItems={"center"} className="px-10 pb-2" direction={"row"}>
          <Typography variant="h6">OS가 MAC인 경우</Typography>
          <KeyButton label="command" />+
          <KeyButton label="shift" />+
          <KeyButton label="F" />
          <Typography variant="h6">눌러 "전체 화면" 으로 보시면</Typography>
        </Stack>
        <Stack alignItems={"center"} className="px-10 pb-5" direction={"row"}>
          <Typography variant="h6"> 더욱 좋은 경험이 될겁니다</Typography>
        </Stack>
      </Stack>
    </div>
  );
};

export default Intro;

const KeyButton = ({ label }: { label: string }) => {
  return (
    <div className="m-2 w-fit rounded-md border py-1 px-2 text-center">
      <Typography variant="h5">{label}</Typography>
    </div>
  );
};
