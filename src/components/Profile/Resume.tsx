"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Grow from "@mui/material/Grow";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { twMerge } from "tailwind-merge";

const Resume = () => {
  const data: IPageProps[] = sampleData;

  return (
    <Stack direction={"row"} justifyContent={"space-between"}>
      <Stack gap={5} marginLeft={5} marginTop={5} position={"fixed"}>
        {data.map((item, index) => (
          <Grow in={true} timeout={500 * index + 1} key={item.step}>
            <a href={`#resume_${index + 1}`}>
              <Typography
                variant="body1"
                fontWeight={700}
                className={twMerge("text-white")}
                fontSize={18}
              >
                {item.corporate}
              </Typography>
              <Typography variant="body2" className={twMerge("text-white")}>
                {item.periodStart} ~ {item.periodEnd}
              </Typography>
            </a>
          </Grow>
        ))}
      </Stack>
      <Box marginLeft={"180px"}>
        {data.map(item => {
          return <Resume.stepPanel {...item} key={item.step} />;
        })}
      </Box>
    </Stack>
  );
};

export default Resume;

interface IPageProps {
  step: number;
  corporate: string;
  team: string;
  description: string;
  periodStart: string;
  periodEnd?: string;
  items?: IPageItem[];
}

interface IPageItem {
  title: string;
  periodStart: string;
  periodEnd?: string;
  jobs: string;
  skills: string[];
}

Resume.stepPanel = ({ items, step }: IPageProps) => {
  return (
    <Box padding={"32px"}>
      <ul>
        {items &&
          items.map(({ title, periodStart, periodEnd: PeriodEnd, jobs, skills }) => {
            return (
              <li key={title} id={`resume_${step}`}>
                <Stack direction={"row"} alignItems={"end"} gap={1}>
                  <Typography variant="h6" fontWeight={700}>
                    {title}
                  </Typography>
                  <Typography className="text-gray-300" variant="body2">
                    {periodStart} ~ {PeriodEnd}
                  </Typography>
                </Stack>
                <Box className="ml-3 text-[14px] font-medium">
                  <pre>
                    <code>{jobs}</code>
                  </pre>
                </Box>
                <Typography variant="body2" className="my-4">
                  사용된 기술
                </Typography>
                <Box>
                  {skills.map((item, index) => (
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
    step: 1,
    corporate: "코드 크레용",
    team: "개발팀",
    periodStart: "2023.05",
    description: "초기 멤버로 합류했으며, FE 개발을 했습니다.",
    items: [
      {
        title: "셀렉터스 FE",
        periodStart: "2023.05",
        jobs: `
1. 국제화 
  - FE i18n국제화 작업
  - 국제화 편의를 위한 google sheet 연결

2. ga4
  - 전자상거래 추가

3. 사용자 경험 개선
  - 페이지 이동 마다 로더 추가
  - 인피니티 스크롤 개선
`,
        skills: ["Next", "React", "TypeScript", "CI/CD", "github", "mui", "tailwind"],
      },
    ],
  },
  {
    step: 2,
    corporate: "Allofthem",
    team: "개발팀",
    periodStart: "2021.07",
    periodEnd: "2023.04",
    description:
      "Allofthem은 일본에 있는 회사이며, 한국팀에서 재택으로 근무를 했으며, 주로 FE 필요에 따라 BE를 했습니다.",
    items: [
      {
        title: "상품 보험 가입 관리 사이트 제작",
        periodStart: "2023.03",
        periodEnd: "2023.04",
        jobs: `
1. 기획, 설계 검토

2. 보고서 페이지 작성
  - 일/월/년 별 가입한 사용자 통계 차트 화면 개발 
  - 차트 정보 API 개발
  - 파일 내보내기 기능 개발
  
3. 관리자 가입 페이지 작성
        `,
        skills: [
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
    step: 3,
    corporate: "데이터로직스",
    periodStart: "2020.08",
    periodEnd: "2021.07",
    description:
      "개발팀으로 합류하여, SmartDis 개발과, 기재부, 외교부등 유지보수 개발을 진행 했습니다.",
    team: "개발팀",
    items: [
      {
        title: "상품 보험 가입 관리 사이트 제작",
        periodStart: "2023.03",
        periodEnd: "2023.04",
        jobs: `
1. 기획, 설계 검토

2. 보고서 페이지 작성
  - 일/월/년 별 가입한 사용자 통계 차트 화면 개발 
  - 차트 정보 API 개발
  - 파일 내보내기 기능 개발
  
3. 관리자 가입 페이지 작성
        `,
        skills: [
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
    step: 4,
    corporate: "데이터로직스",
    team: "인프라",
    periodStart: "2017.08",
    periodEnd: "2019.05",
    description: "SI1팀으로 입사하여, 인프라로 콜시스템과 보안 시스템을 전담하여 운영했습니다.",
    items: [
      {
        title: "상품 보험 가입 관리 사이트 제작",
        periodStart: "2023.03",
        periodEnd: "2023.04",
        jobs: `
1. 기획, 설계 검토

2. 보고서 페이지 작성
  - 일/월/년 별 가입한 사용자 통계 차트 화면 개발 
  - 차트 정보 API 개발
  - 파일 내보내기 기능 개발
  
3. 관리자 가입 페이지 작성
        `,
        skills: [
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
