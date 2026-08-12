"use client";

import Avatar from "@/components/base-ui/avatar";
import Icon from "@/components/base-ui/icon";
import BaseText from "@/components/base-ui/text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import Image from "next/image";
import Github from "public/images/icons/github.svg";
import { Fragment } from "react";
import { useLocale, useTranslations } from "next-intl";
import ProfileItem from "./profile-item";
import Resume from "./resume/resume";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { ShareQrDialog } from "@/components/share/share-qr-dialog";
import { CustomLink } from "@/components/custom-link";
import { siteUrl as productionSiteUrl } from "@/lib/site-url";

/**
 * 이력서 페이지
 * @returns 이력서 컴포넌트
 */
const Profile = () => {
  const t = useTranslations("profile");
  const tResume = useTranslations("resume");
  const tPreview = useTranslations("resumePreview");
  const locale = useLocale();
  const introduction = tResume.raw("introduction") as string[];
  const contact = tResume.raw("contact");
  const siteUrl = `${productionSiteUrl}/${locale}`;
  const blogUrl = `${siteUrl}/blog/dashboard`;

  return (
    <div className="p-3 flex flex-col gap-1 md:gap-5">
      <div className="flex flex-wrap justify-end gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" size="sm" className="bg-blue-300 text-gray-900 hover:bg-blue-200">
              <Icon kind="mail" size={16} />
              {t("proposal")}
            </Button>
          </DialogTrigger>
          <DialogContent className="border-gray-600 bg-gray-800 text-gray-100 sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("proposalTitle")}</DialogTitle>
              <DialogDescription>{t("proposalDescription")}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Button asChild className="bg-blue-300 text-gray-900 hover:bg-blue-200">
                <a href={`mailto:${contact.email}`}>
                  <Icon kind="mail" size={16} />
                  {t("sendEmail")}
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-gray-600 bg-gray-700 text-gray-100 hover:bg-gray-600 hover:text-gray-100"
              >
                <a href={`tel:${contact.phone}`}>
                  <Icon kind="call" size={16} />
                  {t("call")}
                </a>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <CustomLink
          href="/resume/preview"
          title={tPreview("metaTitle")}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-600 px-3 text-sm font-medium text-gray-100 transition-colors hover:border-gray-400 hover:bg-gray-800"
        >
          <Icon kind="description" size={16} />
          {tPreview("openPreview")}
        </CustomLink>
        <ShareLinkButton />
        <ShareQrDialog />
      </div>

      {/* 간단 소개글 섹션 */}
      <div className="flex items-center flex-col gap-1 md:flex-row md:gap-3 md:items-start">
        <Avatar
          className="h-[180px] w-[180px] border-4 border-yellow-200 md:h-[200px] md:w-[200px]"
          src="profile-image.jpg"
          alt={t("developerName")}
          size={180}
        />
        <div className="md:ml-3 mt-[25px] md:mt-0">
          <BaseText type="h5" className="text-center">
            {tResume("title")}
          </BaseText>
          <div className="mt-5 w-full max-w-sm bg-blue-100/20 rounded-sm p-4 gap-4 flex flex-col">
            <Tooltip>
              <TooltipTrigger asChild>
                <BaseText
                  type="body2"
                  className="flex items-center gap-x-1 hover:text-yellow-200 cursor-pointer"
                >
                  <Icon kind="mail" size={14} className="mr-1" />
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </BaseText>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 border-gray-700 text-white">
                {t("sendEmail")}
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <BaseText
                    type="body2"
                    className="flex items-center hover:text-yellow-200 cursor-pointer"
                  >
                    <Icon kind="call" size={14} className="mr-1" />
                    <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                  </BaseText>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 border-gray-700 text-white">
                  {t("call")}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="cursor-pointer rounded p-1 transition-colors hover:bg-gray-700"
                    onClick={() => navigator.clipboard.writeText(contact.phone)}
                  >
                    <Icon kind="content_copy" size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 border-gray-700 text-white">
                  {t("copyPhone")}
                </TooltipContent>
              </Tooltip>
            </div>
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
      {/* Resume 섹션 */}
      <Resume />

      <ProfileItem title={t("education")}>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center ">
          <div className="mb-5 min-w-[140px]">2020.03</div>
          <div className="mb-5">
            <BaseText type="h6">{t("hybridCourse")}</BaseText>
            <ul className="mt-2 ml-4 list-disc">
              <li className="text-sm text-gray-300">{t("hybridDesc")}</li>
            </ul>
          </div>
        </div>
      </ProfileItem>

      {/* 링크 섹션 */}
      <ProfileItem title={t("links")}>
        <div className="flex gap-2 mb-4 w-fit hover:text-yellow-200">
          <Icon kind="navigation" />
          <a href={siteUrl} target="_blank" rel="noopener noreferrer">
            {siteUrl}
          </a>
        </div>
        <div className="flex gap-2 mb-4 w-fit hover:text-yellow-200">
          <Image src={Github} width={24} height={24} alt="git-hub" />
          <a href="https://github.com/icecokel" target="_blank" rel="noopener noreferrer">
            https://github.com/icecokel
          </a>
        </div>
        <div className="flex gap-2 mb-4 w-fit hover:text-yellow-200">
          <Icon kind="bookmark" />
          <a href={blogUrl} target="_blank" rel="noopener noreferrer">
            {blogUrl}
          </a>
        </div>
      </ProfileItem>
    </div>
  );
};

export default Profile;
