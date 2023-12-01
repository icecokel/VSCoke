"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Grow from "@mui/material/Grow";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";
import { twMerge } from "tailwind-merge";

const Resume = () => {
  const data: IPageProps[] = sampleData;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Stack direction={"row"} justifyContent={"space-between"}>
      {/* TODO 클릭 시 이동 버그  */}
      <Stack gap={5} marginLeft={5} marginTop={5} position={"fixed"} className="hidden xl:block">
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
      <div className="xl:ml-[180px]">
        {data.map(item => {
          return <Resume.stepPanel {...item} key={item.step} />;
        })}
      </div>
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
    <div className="p-[12px] md:p-[32px]">
      <ul>
        {items &&
          items.map(({ title, periodStart, periodEnd: PeriodEnd, jobs, skills }) => {
            return (
              <li key={title} id={`resume_${step}`}>
                <div className="flex flex-col md:flex-row gap-1 md:items-end mt-[20px] ">
                  <Typography variant="h6" fontWeight={700}>
                    {title}
                  </Typography>
                  <Typography className="text-gray-300" variant="body2">
                    {periodStart} ~ {PeriodEnd}
                  </Typography>
                </div>
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
    </div>
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
  - i18n 국제화 작업
  - 국제화 자동화 시스템
    -> google sheet 연결
    -> i18next-scanner

2. ga4 & gtm
  - 전자상거래
  - 유저 특정 이벤트 클릭 집계

3. 사용자 경험 개선
  - 페이지 이동 마다 로더 추가
  - 인피니티 스크롤 리스토레이션 개선

4. 스트림 위젯 
  - 유저의 구매, 응모를 짦은 주기로 확인 가능한 페이지 작성
  - 인터넷 방송인들이 사용할 수 있도록 ...
  -  
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
      {
        title: "상품 보험 가입 반응형 웹 및 연계 라이브러리 제작 설계 및 유지 보수",
        periodStart: "2022.10",
        periodEnd: "2023.03",
        jobs: `
1. 쇼핑몰 상품 보험 가입 반응형 웹
- 요청사항 및 기술 스택 등 기획 검토
- 프로젝트 설계 및 구축
- 초기 렌더링 속도 개선 
  첫 백지 시간을 줄이기 위해 로더를 추가 진행 
백지 현상을 1290ms 에서 208ms으로 향상

2. 고객사 쇼핑몰에서 사용될 라이브러리 작성 (cdn  배포 예정)
- 반응형 웹으로 연계용으로 사용될 라이브러리 작성
- 기존 스타일과 충돌 방지를 위한 css 해시화
- 번들링(경량화, 난독화)

3. 페이즈 2 설계 & 구현
- React -> Next로 전환
- LCP 평균 2.4 -> 0.6으로 렌더링 속도 증가 (한국 기준)
- LCP 평균 4.6 -> 0.6으로 렌더링 속도 증가 (일본 기준)
- 에러페이지 추가 404,500,401,403,415
- next - dynamoDb 연동

4. 구글 애널리틱스, opensearch를 통해 사용자 행동 패턴, 사용자 타입 분석 적용
        `,
        skills: [
          "Next",
          "React",
          "TypeScript",
          "Context API",
          "Webpack",
          "DynamoDB",
          "gitLab",
          "CI/CD",
          "sass",
        ],
      },
      {
        title: "iChain 관리사이트 FE 디자인 개선 및 리펙토링",
        periodStart: "2022.07",
        periodEnd: "2022.07",
        jobs: `
관리 사이트 디자인 개선 및 리펙토링
- 프로젝트 디자인 전면 수정
- 소스 리펙토링 ( 중복 작업 함수화 )
- 비사용 CSS 항목 제거
        `,
        skills: ["React", "TypeScript", "gitLab", "CI/CD", "sass"],
      },
      {
        title: "allofthem 크리에이터 펀딩 프로젝트(가칭)",
        periodStart: "2022.07",
        periodEnd: "2022.11",
        jobs: `
인터넷 방송하는 크리에이터 및 그들의 팬을 위한 플랫폼 서비스

클라이언트 반응형 웹 
- 기술 조사 민 선정
- 초기 프로젝트 설계

관리자 페이지
- 기술 조사 및 선정
- 초기 프로젝트 설계
        `,
        skills: ["Next", "React", "TypeScript", "Redux", "React-query", "gitLab", "CI/CD", "sass"],
      },
      {
        title: "allofthem 사내 기여 FE",
        periodStart: "2022.01",
        jobs: `
React 베이스 프로젝트 
- 환경변수화 작업 및 예시코드 작성
- 전역 상태 관리 추가(ContextApi) 
- 공통 컴포넌트 의존성 제거
- 공통 컴포넌트 추가 개발 Modal, Loader

사내 문서 작성
- React 지식 공유 문서 작성
- Js & Ts 지식 공유 문서 작성

CSR 베이스 프로젝트 SSR 프로젝트로 변경 진행 (동결)
        `,
        skills: ["Next", "React", "TypeScript", "Redux", "React-query", "gitLab", "CI/CD", "sass"],
      },
      {
        title: "반응형 암보험 상품 수정 개발 FE ",
        periodStart: "2022.04",
        periodEnd: "2022.07",
        jobs: `
반응형 암보험 상품 수정 개발 및 기능 및 디자인 개선
- PC, 태블릿, 스마트폰 기준 반응형 개발
- 히라가나입력시 가타카나 자동 입력 유틸 개발
- 가타카나 입력시 영어 이름 자동 입력 유틸 개발
        `,
        skills: ["React", "TypeScript", "Redux", "React-saga", "gitLab", "CI/CD", "sass"],
      },
      {
        title: "AIG 기업 상품 가입 신청 페이지 FE 및 유지 보수",
        periodStart: "2021.11",
        periodEnd: "2022.08",
        jobs: `
페이즈 1
1. AIG 기업 상품 가입 신청페이지 반응형 웹 설계
2. AIG 기업 상품 가입 신청페이지 반응형 웹 구축
3. 전역 상태 관리 추가
  - 베이스 프로젝트에 전역 상태 관리 기능 추가

페이즈 2
1. 결제 기능 추가
  - 결제 정보 입력 화면 및 결제 api 연계
2. 로더 컴포넌트 추가
  - 기존에 메시지로 표시되던 부분을 Loader를 작성하여 화면에 표출

* 특이사항 : 서버리스 프로젝트(API Gateway, Lambda) 테이블 단위로만 조회가능, 초기 설계 문제로 인한 callBack hell 이슈발생,api 통신쪽 비동기 처리하여 callback hell 이슈 해결
        `,
        skills: ["React", "TypeScript", "context API", "gitLab", "CI/CD", "sass"],
      },
      {
        title: "iChain 관리사이트 FE",
        periodStart: "2021.09",
        periodEnd: "2022.05",
        jobs: `
프로젝트 페이즈2  기능 추가 및 개선

1. 화면 설계 및 제작
  - 고객 조회 화면 및 Api 연계
  - 고객 상세 화면 및 Api 연계
  - 캠페인 조회, csv 등록, 다운로드 화면 및 Api 연계
  - 앱가입 연계 작성 (csv 업로드) 화면 및 Api 연계
  - 환경 변수 추가
  - 네이게이션 기능이 일부 페이지를 건너뜀 형상을 픽스
  - ApiOption에 따라 통신 endpoint, 에러처리가 분기되도록 통신 유틸 수정
        `,
        skills: ["React", "TypeScript", "context API", "gitLab", "CI/CD", "sass"],
      },
      {
        title: "iChain 라쿠텐, 사쿠라 보험 BE",
        periodStart: "2021.09",
        periodEnd: "2022.05",
        jobs: `
프로젝트 구축 및 기능 개선
1. 보험 결제 웹뷰 작성 (마이페이지) 
  - 계약된 보험 정보
  - 미납 결제 
  - 결제정보 수정 (크레딧 카드 정보 수정)

2. 관리사이트 연계
  - 보험 고객 조회 API 작성 및 테스트 코드 작성(Junit) 
  - 보험  고객 정보 상세 API 작성 및 테스트 코드 작성(Junit) 
  - 고객 탈퇴 API 작성 및 테스트 코드 작성(Junit) 

3. 고객 탈퇴 로직 변경
  - 기존 DB 물리 삭제에서 논리 삭제로 전면 수정

4. 파일 다운로드 공통 모듈 작성
- PDF, CSV등 파일 다운로드 Api에 사용될 공통 모듈 작성

5. S3 업로드 공통 모듈 작성
        `,
        skills: ["Java", "SpringBoot", "Mysql", "Doma2", "Thymeleaf", "GitLab", "CI/CD", "sass"],
      },
      {
        title: "보험사 관리 사이트 FE",
        periodStart: "2021.07",
        periodEnd: "2021.09",
        jobs: `
프로젝트 버그 픽스 및 기능 개선
1. 기존 프로젝트 버그 픽스 
2. 리펙터링
  - 공통 컴포넌트 작업 (중복제거, 파일업/다운로드 공통 컨포넌트 작성)
  - 코드 리펙터링 ( 중복 코드 함수화, 함수 리네이밍 )
  - 함수 별 주석작업
  - TS를 활용한 데이터 모델링 작업
  - 타입 미지정(any)에 데이터 모델링 적용
        `,
        skills: ["React", "TypeScript", "gitLab", "CI/CD", "sass"],
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
        periodStart: "2021.01",
        periodEnd: "2021.07",
        jobs: `
운영 및 유지보수
1. 상담 어플리케이션 외부 API 개발 ( 설문조사, DB 배치서버 )
2. 상담 어플리케이션 기능 개선 및 SR 처리 ( 미처리 버그 픽스)
3. 개발환경 구축 (서버 OS 설치, 타 서비스 개발 서버 연계 )
4. 영사콜센터 무료전화앱 트러블 슈팅
        `,
        skills: ["Java", "JavaScript", "Egov", "MyBatis", "Mysql", "Oracle"],
      },
      {
        title: "외교부 영사콜센터 구축",
        periodStart: "2020.09",
        periodEnd: "2020.12",
        jobs: `
영사콜센터 구축 참여
1. 외교부 영사콜센터 콜 서비스 테스트
2. sns(카카오톡) 서비스 테스트
3. 위치기반앱(gis) 서비스 테스트 
        `,
        skills: ["Java", "JavaScript", "Egov", "MyBatis", "Mysql", "Oracle"],
      },
      {
        title: "Smart-Dis 개발 (etl)",
        periodStart: "2020.08",
        periodEnd: "2020.09",
        jobs: `
데이터 마이그레이션 서비스 개발
1. 온라인 전용 소프트웨어 인트라넷 상용가능 소프트웨어으로 전환 (라이브러리 전환)
2. 기존 오라클 query와 같은 기능을 하는 mariadb query 추가
3. linux 전용 소프트웨어에 window 기능 추가 및 매뉴얼링
        `,
        skills: ["Java", "JavaScript", "Egov", "MyBatis", "Mysql", "Oracle"],
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
        title: "국무조정실 운영 및 유지보수",
        periodStart: "2018.05",
        periodEnd: "2019.06",
        jobs: `
운영 및 유지보수
1. 운영 및 유지보수 인프라 파트
  - 세종 및 서울 국무조정실 인프라 관리
  - 서버 및 네트워크 (L2, L3, BB) 장비 관리 및 트러블 슈팅
  - 보안장비(FW, IPS, TMS)및 솔루션 관리
  - 자원관리 및 백업 작업
  - 사무실 세팅 및 국정감사 인프라 세팅
  - 보안감사 대응
        `,
        skills: ["L2", "L3", "백본", "IPS", "방화벽"],
      },
      {
        title: "사회보장정보원 고도화 사업",
        periodStart: "2018.01",
        periodEnd: "2018.02",
        jobs: `
고도화 사업
1. 인프라파트 업무 진행
  - 장비 검수 및 마운팅
  - 설치 테스트 및 모니터링(설치 테스트)
        `,
        skills: ["L2", "L3", "방화벽"],
      },
      {
        title: "아동보호전문기관 구축 및 유지보수",
        periodStart: "2017.08",
        periodEnd: "2017.12",
        jobs: `
아동보호 전문기관 콜센터 유지보수 인프라 파트 업무 진행
1. 월 점검

2. 사무실 이전 작업
  - 장비 해제 및 재설치

3. 노원아동보호전문 기관 구축
        `,
        skills: ["콜시스템"],
      },
    ],
  },
];
