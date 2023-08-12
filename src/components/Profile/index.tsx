"use client";

import { IHaveChildren } from "@/models/common";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import GitHubIcon from "@mui/icons-material/GitHub";
import NavigationIcon from "@mui/icons-material/Navigation";
import PanToolAltOutlinedIcon from "@mui/icons-material/PanToolAltOutlined";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Fab from "@mui/material/Fab";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Link from "next/link";

/**
 * 이력서 페이지
 * @returns 이력서 컴포넌트
 */
const Profile = () => {
  return (
    <Stack flexDirection={"column"} gap={{ sm: 1, md: 5 }} className="p-3">
      <Stack
        flexDirection={{ sm: "column", md: "row" }}
        gap={{ sm: 1, md: 3 }}
        alignItems={{ xs: "center", md: "flex-start" }}
      >
        <Avatar
          className="h-[180px] w-[180px] border-4 border-yellow-200 md:h-[200px] md:w-[200px] "
          src="https://icecokel-blog-dev.s3.ap-northeast-2.amazonaws.com/images/profileImg.jpg"
        />
        <Box className="ml-5 sm:mt-5">
          <Typography variant="h4" className="text-center">
            코딩만 하지 않는 <br className="md:hidden" />
            개발자 이상민입니다.
          </Typography>
          <Alert severity="info" icon={false} className="mt-5 w-full max-w-sm">
            <Typography variant="body1" className="mb-3" fontWeight={700}>
              이상민
            </Typography>
            <Tooltip title="이메일 보내기" placement="right">
              <Typography variant="body1" className="mb-3" fontWeight={700}>
                <a href="mailto:red9runge@gmail.com">red9runge@gmail.com</a>
                <PanToolAltOutlinedIcon className="ml-2 rotate-[90deg] scale-y-[-1]" />
              </Typography>
            </Tooltip>
            <Tooltip title="전화하기" placement="right">
              <Typography variant="body1" className="mb-3" fontWeight={700}>
                <a href="tel:01020809652">010-2080-9652</a>
                <PanToolAltOutlinedIcon className="ml-2 rotate-[90deg] scale-y-[-1]" />
              </Typography>
            </Tooltip>
          </Alert>
        </Box>
      </Stack>
      <Profile.item title="간단 소개글">
        <Typography>
          안녕하세요.
          <br />
          <br /> 정보통신학과를 졸업하고 인프라 엔지니어로 3년 정도 근무하다가, 반복되는 일을
          자동화하고, 비효율적인 프로세스를 개선하는 것을 중요하게 생각했고, 저의 이런 성격이
          개발자에 적합하다고 판단하여 개발자로 전향하게 되었습니다. <br />
          <br />
          일본에 있는 AllofThem이라는 회사에서 재직 중이며, FE로 근무 중이며, 필요에 따라 BE도
          진행할 때도 있습니다. <br />
          <br />
          주로 신규 프로젝트 시 구축 설계 등을 진행하고 있으며, 기존 프로젝트를 진행하면 성능 개선
          및 리팩토링을 주로 하고 있습니다. 경력
        </Typography>
      </Profile.item>
      <Profile.item title="링크">
        <Stack flexDirection={"row"} gap={2} className="mb-4 w-fit hover:text-yellow-200">
          <GitHubIcon />
          <Link href={"https://github.com/icecokel"} target="_blank">
            https://github.com/icecokel
          </Link>
        </Stack>
        <Stack flexDirection={"row"} gap={2} className="mb-4 w-fit hover:text-yellow-200">
          <BookmarkIcon />
          <Link href={"https://icecokel.tistory.com"} target="_blank">
            https://icecokel.tistory.com
          </Link>
        </Stack>
      </Profile.item>
      <Profile.item title="스킬">
        <Box>
          {SKILLS.map((item, index) => (
            <Chip
              key={`skill_${index}`}
              label={item}
              size="small"
              variant="outlined"
              className="mb-2 mr-2 select-none p-1 text-white hover:border-yellow-200 hover:text-yellow-200"
            />
          ))}
        </Box>
      </Profile.item>

      <Profile.item title="학력 / 교육">
        <Stack flexDirection={"row"}></Stack>
        <Grid container className="mb-5">
          <Grid item xs={3}>
            2019.08 - 2020.03
          </Grid>
          <Grid item xs={9}>
            <Typography variant="h6">
              하이브리드 앱개발(ISO&안드로이드) 및 웹 개발자 양성 과정
            </Typography>
            <Typography variant="body2">
              Java, Spring 기반의 웹 개발 기초 (스프링 기초, Restapi) <br />
              안드로이드, IOS 앱개발 기초
            </Typography>
          </Grid>
        </Grid>
        <Grid container className="mb-5">
          <Grid item xs={3}>
            2010.03 - 2017.02
          </Grid>
          <Grid item xs={9}>
            <Typography variant="h6">서일대학교</Typography>
            <Typography variant="body2">정보통신학과</Typography>
          </Grid>
        </Grid>
      </Profile.item>
      <Link href={"/profile/resume"}>
        <Box className="flex justify-end">
          <Fab variant="extended" className="bg-yellow-200 text-gray-800 hover:text-blue-100">
            경력 보러가기
            <NavigationIcon sx={{ mr: 1 }} className="rotate-[90deg]" />
          </Fab>
        </Box>
      </Link>
    </Stack>
  );
};

export default Profile;

interface IItemProps extends IHaveChildren {
  title: string;
}

Profile.item = ({ title, children }: IItemProps) => {
  return (
    <Box className="mt-10">
      <Typography variant="h5">{title}</Typography>
      <Divider className="my-5 border-white" />
      <Box>{children}</Box>
    </Box>
  );
};

const SKILLS = [
  "React",
  "CSS",
  "JavaScript",
  "TypeScript",
  "HTML5",
  "Java",
  "Spring Boot",
  "Spring Framework",
  "AWS",
  "Git",
  "GitLab",
  "MySQL",
  "Figma",
  "GraphQL",
  "Github",
];
