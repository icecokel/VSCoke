"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import useSWR from "swr";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Resume = () => {
  const [tabValue, setPage] = useState(1);

  const {} = useSWR("/api/getPage?id=a2e9e58d2f6c4b23ac52d45e7cb17af1");
  const data: IPageProps[] = sampleData;

  const info = data.find((row) => row.page === tabValue);

  const handleChangeTabs = (event: React.SyntheticEvent, newValue: number) => {
    setPage(newValue);
  };

  if (!info) return <></>;
  return (
    <Box>
      <Tabs
        value={tabValue}
        onChange={handleChangeTabs}
        textColor="inherit"
        variant="fullWidth"
      >
        {data.map((item) => {
          return (
            <Tab
              label={
                <Box className="flex items-end gap-1">
                  <Typography variant="h6" fontWeight={700} fontSize={18}>
                    {item.corporate}
                  </Typography>
                  <Typography variant="body2" className="text-gray-300">
                    {item.team}
                  </Typography>
                </Box>
              }
              value={item.page}
            />
          );
        })}
      </Tabs>
      {data.map((item) => {
        return (
          <TabPanel value={item.page} index={tabValue}>
            <Resume.page {...item} />
          </TabPanel>
        );
      })}
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

Resume.page = ({ items }: IPageProps) => {
  return (
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
    corporate: "데이터로직스",
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
    page: 4,
    corporate: "데이터로직스",
    team: "인프라",
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
