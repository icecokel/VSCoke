"use client";

import Avatar from "@/components/base-ui/avatar";
import Button from "@/components/base-ui/button";
import Icon from "@/components/base-ui/icon";
import BaseText from "@/components/base-ui/text";
import Tooltip from "@/components/base-ui/tooltip";
import Image from "next/image";
import Github from "public/images/icons/github.svg";
import resumeData from "@/../resume.json";
import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ProfileItem from "./profile-item";

/**
 * 이력서 페이지
 * @returns 이력서 컴포넌트
 */
const Profile = () => {
  const t = useTranslations("profile");
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
            {t("notOnlyCoding")} <br className="md:hidden" />
            {t("developerName")}
          </BaseText>
          <div className="mt-5 w-full max-w-sm bg-blue-100/20 rounded-sm p-4 gap-4 flex flex-col">
            <Tooltip text={t("sendEmail")}>
              <BaseText
                type="body1"
                className="flex items-center gap-x-1 hover:text-yellow-200 font-bold"
              >
                <Icon kind="mail" />
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </BaseText>
            </Tooltip>
            <Tooltip text={t("call")}>
              <BaseText type="body1" className="flex items-center hover:text-yellow-200 font-bold">
                <Icon kind="call" />
                <a href={`tel:${contact.phone}`}>{contact.phone}</a>
              </BaseText>
            </Tooltip>
          </div>
        </div>
      </div>
      <ProfileItem title={t("introduction")}>
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
      </ProfileItem>
      <ProfileItem title={t("links")}>
        <div className="flex gap-2 mb-4 w-fit hover:text-yellow-200">
          <Image src={Github} width={24} height={24} alt="git-hub" />
          <a href="https://github.com/icecokel" target="_blank" rel="noopener noreferrer">
            https://github.com/icecokel
          </a>
        </div>
        <div className="flex gap-2 mb-4 w-fit hover:text-yellow-200">
          <Icon kind="bookmark" />
          <a href="https://icecokel.tistory.com" target="_blank" rel="noopener noreferrer">
            https://icecokel.tistory.com
          </a>
        </div>
      </ProfileItem>

      <ProfileItem title={t("education")}>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center ">
          <div className="mb-5 min-w-[140px]">2019.08 - 2020.03</div>
          <div className="mb-5">
            <BaseText type="h6">{t("hybridCourse")}</BaseText>
            <BaseText type="body2">
              {t("hybridDesc")} <br />
              {t("hybridDesc2")}
            </BaseText>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center ">
          <div className="mb-5 min-w-[140px]">2010.03 - 2017.02</div>
          <div className="mb-5">
            <BaseText type="h6">{t("university")}</BaseText>
            <BaseText type="body2">{t("major")}</BaseText>
          </div>
        </div>
      </ProfileItem>
      <Link href="/profile/resume">
        <div className="flex justify-end">
          <Button
            type="contained"
            className="bg-yellow-200 text-black! hover:text-blue-300! rounded-[24px]! flex items-center gap-x-2 shadow-[2px_4px_4px_rgb(0,0,0,0.4)]"
          >
            <BaseText type="body2">{t("viewCareer")}</BaseText>
            <Icon kind="navigation" className="rotate-90" />
          </Button>
        </div>
      </Link>
    </div>
  );
};

export default Profile;
