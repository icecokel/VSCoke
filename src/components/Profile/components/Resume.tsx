"use client";

import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import MobileStepper from "@mui/material/MobileStepper";
import Typography from "@mui/material/Typography";
import { useState } from "react";

const Resume = () => {
  const [page, setPage] = useState(1);
  const data: IPageProps[] = sampleData;

  const info = data.find((row) => row.page === page);

  const handleClickArrow = (type: "back" | "forward") => () => {
    setPage((prev) => (type === "back" ? prev - 1 : prev + 1));
  };

  if (!info) return <></>;
  return (
    <Box>
      <MobileStepper
        variant="progress"
        steps={data.length + 1}
        position="static"
        activeStep={page}
        className="mb-5 bg-gray-900"
        sx={{ flexGrow: 1 }}
        nextButton={
          <Button
            size="small"
            onClick={handleClickArrow("forward")}
            disabled={page === data.length}
          >
            Next
            <KeyboardArrowRight />
          </Button>
        }
        backButton={
          <Button
            size="small"
            onClick={handleClickArrow("back")}
            disabled={page === 1}
          >
            <KeyboardArrowLeft />
            Back
          </Button>
        }
      />
      <Resume.page {...info} />
    </Box>
  );
};

export default Resume;

interface IPageProps {
  page: number;
  corporate: string;
  team: string;
  items?: IPageItem[];
}

interface IPageItem {
  title: string;
  periodStart: string;
  PeriodEnd: string;
  jobs: string;
  skiils: string[];
}

Resume.page = ({ corporate, team, items }: IPageProps) => {
  return (
    <Box>
      <Box className="flex items-end gap-2">
        <Typography variant="h5" fontWeight={700}>
          {corporate}
        </Typography>
        <Typography
          variant="h6"
          fontSize={16}
          fontWeight={700}
          className="text-gray-300"
        >
          {team}
        </Typography>
      </Box>
      <Divider className="my-5 border-gray-50" />
      <ul>
        {items &&
          items.map(({ title, periodStart, PeriodEnd, jobs, skiils }) => {
            return (
              <li key={title}>
                <Box className="flex items-end gap-2">
                  <Typography variant="h6" fontWeight={700}>
                    {title}
                  </Typography>
                  <Typography className="text-gray-300" variant="body2">
                    {periodStart} ~ {PeriodEnd}
                  </Typography>
                </Box>
                <Typography variant="body1" fontWeight={600} className="ml-3">
                  <pre>
                    <code>{jobs}</code>
                  </pre>
                </Typography>
                <Typography variant="body2" className="mb-4">
                  사용된 기술
                </Typography>
                <Box>
                  {skiils.map((item, index) => (
                    <Chip
                      key={`skill_${index}`}
                      label={item}
                      size="small"
                      variant="outlined"
                      className="mb-2 mr-2 select-none p-1 text-white "
                    />
                  ))}
                </Box>
              </li>
            );
          })}
      </ul>
    </Box>
  );
};

const sampleData: IPageProps[] = [
  {
    page: 1,
    corporate: "코드 크레용",
    team: "개발팀",
  },
  {
    page: 2,
    corporate: "Allofthem",
    team: "개발팀",
    items: [
      {
        title: "상품 보험 가입 관리 사이트 제작",
        periodStart: "2023.03",
        PeriodEnd: "2023.04",
        jobs: `
1. 기획, 설계 검토

2. 보고서 페이지 작성
  - 일/월/년 별 가입한 사용자 통계 차트 화면 개발 
  - 차트 정보 API 개발
  - 파일 내보내기 기능 개발
  
3. 관리자 가입 페이지 작성
        `,
        skiils: [
          "Next",
          "React",
          "TypeScript",
          "Redux",
          "AppSync(GraphQL)",
          "DynamoDB",
          "gitLab",
          "CI/CD",
          "sass",
        ],
      },
    ],
  },
  {
    page: 3,
    corporate: "Allofthem",
    team: "개발팀",
    items: [
      {
        title: "상품 보험 가입 관리 사이트 제작",
        periodStart: "2023.03",
        PeriodEnd: "2023.04",
        jobs: `
1. 기획, 설계 검토

2. 보고서 페이지 작성
  - 일/월/년 별 가입한 사용자 통계 차트 화면 개발 
  - 차트 정보 API 개발
  - 파일 내보내기 기능 개발
  
3. 관리자 가입 페이지 작성
        `,
        skiils: [
          "Next",
          "React",
          "TypeScript",
          "Redux",
          "AppSync(GraphQL)",
          "DynamoDB",
          "gitLab",
          "CI/CD",
          "sass",
        ],
      },
    ],
  },
];
