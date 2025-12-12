"use client";

import Avatar from "@/components/base-ui/avatar";
import Button from "@/components/base-ui/button";
import Icon from "@/components/base-ui/icon";
import BaseText from "@/components/base-ui/text";
import Tooltip from "@/components/base-ui/tooltip";
import { TParentNode } from "@/models/common";
import Image from "next/image";
import Link from "next/link";
import Github from "public/images/icons/github.svg";
import resumeData from "@/../resume.json";
import { Fragment } from "react";

/**
 * 이력서 페이지
 * @returns 이력서 컴포넌트
 */
const Profile = () => {
  const { introduction, contact } = resumeData;
  return (
    <div className="p-3 flex flex-col gap-1 md:gap-5">
      <div className="flex items-center flex-col gap-1 md:flex-row md:gap-3 md:items-start">
        <Avatar
          className="h-[180px] w-[180px] border-4 border-yellow-200 md:h-[200px] md:w-[200px]"
          src={"profileImg.jpg"}
          size={180}
        />
        <div className="md:ml-3 mt-[25px] md:mt-0">
          <BaseText type="h5" className="text-center">
            코딩만 하지 않는 <br className="md:hidden" />
            개발자 이상민입니다.
          </BaseText>
          <div className="mt-5 w-full max-w-sm bg-blue-100/20 rounded-sm p-4 gap-4 flex flex-col">
            <Tooltip text="이메일 보내기">
              <BaseText
                type="body1"
                className="flex items-center gap-x-1 hover:text-yellow-200 font-bold"
              >
                <Icon kind="mail" />
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </BaseText>
            </Tooltip>
            <Tooltip text="전화하기">
              <BaseText type="body1" className="flex items-center hover:text-yellow-200 font-bold">
                <Icon kind="call" />
                <a href={`tel:${contact.phone}`}>{contact.phone}</a>
              </BaseText>
            </Tooltip>
          </div>
        </div>
      </div>
      <Profile.item title="간단 소개글">
        <BaseText>
          {introduction.map((text, index) => {
            return (
              <Fragment key={`introduction_${index}`}>
                {text}
                <br />
              </Fragment>
            );
          })}
        </BaseText>
      </Profile.item>
      <Profile.item title="링크">
        <div className="flex gap-2 mb-4 w-fit hover:text-yellow-200">
          <Image src={Github} width={24} height={24} alt="git-hub" />
          <Link href={"https://github.com/icecokel"} target="_blank">
            https://github.com/icecokel
          </Link>
        </div>
        <div className="flex gap-2 mb-4 w-fit hover:text-yellow-200">
          <Icon kind="bookmark" />
          <Link href={"https://icecokel.tistory.com"} target="_blank">
            https://icecokel.tistory.com
          </Link>
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
          <Button
            type="contained"
            className="bg-yellow-200 text-black! hover:text-blue-300! rounded-[24px]! flex items-center gap-x-2 shadow-[2px_4px_4px_rgb(0,0,0,0.4)]"
          >
            <BaseText type="body2">경력 보러가기</BaseText>
            <Icon kind="navigation" className="rotate-90" />
          </Button>
        </div>
      </Link>
    </div>
  );
};

const ProfileItem = ({ title, children }: IItemProps) => {
  return (
    <div className="mt-10">
      <BaseText type="h5">{title}</BaseText>
      <hr className="my-5 border-white" />
      <div>{children}</div>
    </div>
  );
};

Profile.item = ProfileItem;

export default Profile;

interface IItemProps extends TParentNode {
  title: string;
}
