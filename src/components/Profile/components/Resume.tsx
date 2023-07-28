"use client";

import NorthIcon from "@mui/icons-material/North";
import RefreshIcon from "@mui/icons-material/Refresh";
import SouthIcon from "@mui/icons-material/South";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Step from "@mui/material/Step";
import StepContent from "@mui/material/StepContent";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

const Resume = () => {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    setStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setStep(0);
  };

  const data: IPageProps[] = sampleData;

  const info = data.find((row) => row.step === step);

  if (!info) return <></>;
  return (
    <Box className="flex">
      <Stepper activeStep={step} orientation="vertical" className="h-fit">
        {data.map((step, index) => (
          <Step key={step.step}>
            <StepLabel>
              <Typography
                variant="body1"
                fontWeight={700}
                className="text-white"
                fontSize={18}
              >
                {step.corporate}
                <Typography className="text-gray-300" variant="body2">
                  {step.periodStart} ~ {step.periodEnd}
                </Typography>
              </Typography>
            </StepLabel>
            <StepContent>
              <Typography
                className="max-w-[10em] text-gray-100"
                variant="body2"
                fontSize={12}
              >
                {step.description}
              </Typography>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  disabled={index === 0}
                  onClick={handleBack}
                  sx={{ width: "fit-content", minWidth: "4em" }}
                >
                  <NorthIcon />
                </Button>
                <Button
                  variant="contained"
                  onClick={index + 1 !== data.length ? handleNext : handleReset}
                  sx={{ width: "fit-content", minWidth: "4em" }}
                >
                  {index + 1 !== data.length ? <SouthIcon /> : <RefreshIcon />}
                </Button>
              </div>
            </StepContent>
          </Step>
        ))}
      </Stepper>
      <Box>
        {data.map((item) => {
          return (
            <Resume.stepPanel {...item} currentStep={step} key={item.step} />
          );
        })}
      </Box>
    </Box>
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
  currentStep?: number;
}

interface IPageItem {
  title: string;
  periodStart: string;
  periodEnd?: string;
  jobs: string;
  skiils: string[];
}

Resume.stepPanel = ({ items, currentStep: index, step }: IPageProps) => {
  return (
    <div hidden={step !== index}>
      <Box className="p-8">
        <ul>
          {items &&
            items.map(
              ({ title, periodStart, periodEnd: PeriodEnd, jobs, skiils }) => {
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
                    <Typography
                      variant="body1"
                      fontWeight={600}
                      className="ml-3"
                    >
                      <pre>
                        <code>{jobs}</code>
                      </pre>
                    </Typography>
                    <Typography variant="body2" className="my-4">
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
              }
            )}
        </ul>
      </Box>
    </div>
  );
};

const sampleData: IPageProps[] = [
  {
    step: 0,
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
        skiils: [
          "Next",
          "React",
          "TypeScript",
          "CI/CD",
          "github",
          "mui",
          "tailwind",
        ],
      },
    ],
  },
  {
    step: 1,
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
    step: 2,
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
    step: 3,
    corporate: "데이터로직스",
    team: "인프라",
    periodStart: "2017.08",
    periodEnd: "2019.05",
    description:
      "SI1팀으로 입사하여, 인프라로 콜시스템과 보안 시스템을 전담하여 운영했습니다.",
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
