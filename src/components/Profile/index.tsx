"use client";

import { IHaveChildren } from "@/models/common";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import GitHubIcon from "@mui/icons-material/GitHub";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import MailIcon from "@mui/icons-material/Mail";
import NavigationIcon from "@mui/icons-material/Navigation";
import Fab from "@mui/material/Fab";
import Avatar from "@ui/Avatar";
import Chip from "@ui/Chip";
import BaseText from "@ui/Text";
import Tooltip from "@ui/Tooltip";
import Link from "next/link";

/**
 * 이력서 페이지
 * @returns 이력서 컴포넌트
 */
const Profile = () => {
  return (
    <div className="p-3 flex flex-col sm:gap-1 md:gap-5">
      <div className="flex sm:flex-col sm:gap-1 md:flex-row md:gap-3 xs:items-center md:items-start">
        <Avatar
          className="h-[180px] w-[180px] border-4 border-yellow-200 md:h-[200px] md:w-[200px]"
          src={"profileImg.jpg"}
          size={180}
        />
        <div className="ml-3 mt-[25px] md:mt-0">
          <BaseText type="h4" className="text-center">
            코딩만 하지 않는 <br className="md:hidden" />
            개발자 이상민입니다.
          </BaseText>
          <div className="mt-5 w-full max-w-sm bg-blue-100/20 rounded p-4 gap-4 flex flex-col">
            <Tooltip text="이메일 보내기">
              <BaseText type="body1" className="hover:text-yellow-200 font-bold">
                <MailIcon className="mr-1" />
                <a href="mailto:red9runge@gmail.com">red9runge@gmail.com</a>
              </BaseText>
            </Tooltip>
            <Tooltip text="전화하기">
              <BaseText type="body1" className="hover:text-yellow-200 font-bold">
                <LocalPhoneIcon className="mr-1" />
                <a href="tel:01020809652">전화 걸기</a>
              </BaseText>
            </Tooltip>
          </div>
        </div>
      </div>
      <Profile.item title="간단 소개글">
        <BaseText>
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
        </BaseText>
      </Profile.item>
      <Profile.item title="링크">
        <div className="flex gap-2 mb-4 w-fit hover:text-yellow-200">
          <GitHubIcon />
          <Link href={"https://github.com/icecokel"} target="_blank">
            https://github.com/icecokel
          </Link>
        </div>
        <div className="flex gap-2 mb-4 w-fit hover:text-yellow-200">
          <BookmarkIcon />
          <Link href={"https://icecokel.tistory.com"} target="_blank">
            https://icecokel.tistory.com
          </Link>
        </div>
      </Profile.item>
      <Profile.item title="스킬">
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((item, index) => (
            <Chip
              key={`skill_${index}`}
              label={item}
              className="select-none text-white hover:border-yellow-200 hover:text-yellow-200"
            />
          ))}
        </div>
      </Profile.item>

      <Profile.item title="학력 / 교육">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center ">
          <div className="mb-5 min-w-[140px]">2019.08 - 2020.03</div>
          <div className="mb-5">
            <BaseText type="h6">하이브리드 앱개발(ISO&안드로이드) 및 웹 개발자 양성 과정</BaseText>
            <BaseText type="body2">
              Java, Spring 기반의 웹 개발 기초 (스프링 기초, Restapi) <br />
              안드로이드, IOS 앱개발 기초
            </BaseText>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center ">
          <div className="mb-5 min-w-[140px]">2010.03 - 2017.02</div>
          <div className="mb-5">
            <BaseText type="h6">서일대학교</BaseText>
            <BaseText type="body2">정보통신학과</BaseText>
          </div>
        </div>
      </Profile.item>
      <Link href={"/profile/resume"}>
        <div className="flex justify-end">
          <Fab variant="extended" className="bg-yellow-200 text-gray-800 hover:text-blue-300">
            <BaseText type="body2">경력 보러가기</BaseText>
            <NavigationIcon sx={{ mr: 1 }} className="rotate-[90deg]" />
          </Fab>
        </div>
      </Link>
    </div>
  );
};

export default Profile;

interface IItemProps extends IHaveChildren {
  title: string;
}

Profile.item = ({ title, children }: IItemProps) => {
  return (
    <div className="mt-10">
      <BaseText type="h5">{title}</BaseText>
      <hr className="my-5 border-white" />
      <div>{children}</div>
    </div>
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
