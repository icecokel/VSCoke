"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useState } from "react";

const Resume = () => {
  const [page, setPage] = useState(1);
  const data: IPageProps[] = sampleData;

  const info = data.find((row) => row.page === page);

  if (!info) return <></>;
  return (
    <Box>
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
      <Typography>{corporate}</Typography>
      <Typography>{team}</Typography>
      <ul>
        {items &&
          items.map(({ title, periodStart, PeriodEnd, jobs, skiils }) => {
            return (
              <li key={title}>
                <Typography>{team}</Typography>
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
        jobs: `1. 기획, 설계 검토

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
