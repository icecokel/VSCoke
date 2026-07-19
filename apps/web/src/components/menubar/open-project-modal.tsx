"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import useSnackBar from "@/components/base-ui/snack-bar/hooks/use-snack-bar";
import BaseText from "@/components/base-ui/text";
import { useMemo, useState } from "react";
import Icon, { TKind } from "@/components/base-ui/icon";
import { useTranslations } from "next-intl";

interface IOpenProjectModalProps {
  open: boolean;
  onClose: () => void;
}

interface ICategory {
  label: string;
  items: IProject[];
}

interface IProject {
  label: string;
  link: string;
}

const OpenProjectModal = (props: IOpenProjectModalProps) => {
  const t = useTranslations("menu");
  const categories = useMemo<ICategory[]>(
    () => [
      {
        label: "Portfolio",
        items: [{ label: "VSCOKE", link: "https://vscoke.vercel.app" }],
      },
      { label: "Users", items: [{ label: "Test", link: "" }] },
    ],
    [t],
  );
  const sidebarSections = useMemo<
    { title: string; items: { icon: TKind; id: string; label: string }[] }[]
  >(
    () => [
      {
        title: t("favorites"),
        items: [
          { icon: "schedule", id: "recent", label: t("recentItems") },
          { icon: "terminal", id: "applications", label: t("applications") },
          { icon: "computer", id: "desktop", label: t("desktop") },
          { icon: "description", id: "documents", label: t("documents") },
          { icon: "arrow_circle_down", id: "downloads", label: t("downloads") },
        ],
      },
      {
        title: t("locations"),
        items: [{ icon: "hard_drive", id: "macintosh-hd", label: "Macintosh HD" }],
      },
    ],
    [t],
  );
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentProjectIndex, setCurrentProjectIndex] = useState<number | undefined>();
  const [selectedSidebarItem, setSelectedSidebarItem] = useState<string>("documents");
  const currentCategory = categories[currentCategoryIndex] ?? categories[0];
  const currentProject =
    currentProjectIndex == null ? undefined : currentCategory.items[currentProjectIndex];

  const handleClickCategory = (index: number) => {
    setCurrentCategoryIndex(index);
    setCurrentProjectIndex(undefined);
  };

  const handleClickProject = (index: number, categoryIndex = currentCategoryIndex) => {
    setCurrentCategoryIndex(categoryIndex);
    setCurrentProjectIndex(index);
  };

  const { open } = useSnackBar({ message: t("preparingToast") });
  const { onClose } = props;

  const handleClickOpenProject = () => {
    onClose();
    if (currentProject?.link) {
      window.open(currentProject?.link);
    } else {
      open();
    }
  };

  // 현재 경로 계산
  const currentPath = currentProject
    ? `${currentCategory.label} / ${currentProject.label}`
    : currentCategory.label;

  return (
    <Dialog open={props.open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent
        className="bg-gray-750 border-gray-500 max-w-3xl p-0 rounded-xl"
        showCloseButton={false}
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>{t("openProject")}</DialogTitle>
        </VisuallyHidden>

        {/* 데스크톱 뷰 - Finder 스타일 */}
        <div className="hidden md:flex flex-col h-[380px]">
          {/* 상단 툴바 */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-500 bg-gray-500">
            {/* 네비게이션 버튼 */}
            <div className="flex gap-1">
              <button className="cursor-pointer rounded p-1 text-gray-300 hover:bg-gray-500">
                <Icon kind="chevron_left" size={18} />
              </button>
              <button className="cursor-pointer rounded p-1 text-gray-300 hover:bg-gray-500">
                <Icon kind="chevron_right" size={18} />
              </button>
            </div>

            {/* 뷰 모드 버튼 */}
            <div className="flex gap-1 ml-2">
              <button className="cursor-pointer rounded bg-gray-500 p-1 text-white">
                <Icon kind="view_column" size={18} />
              </button>
              <button className="cursor-pointer rounded p-1 text-gray-300 hover:bg-gray-500">
                <Icon kind="view_list" size={18} />
              </button>
            </div>

            {/* 경로 표시 */}
            <div className="flex-1 flex justify-center">
              <button className="flex cursor-pointer items-center gap-1 rounded bg-gray-500 px-3 py-1 text-sm text-white">
                <Icon kind="folder" size={16} className="text-blue-400" />
                <span>{currentPath}</span>
                <Icon kind="expand_more" size={16} />
              </button>
            </div>

            {/* 검색창 */}
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-500 text-gray-300 text-sm w-40">
              <Icon kind="search" size={16} />
              <span>{t("search")}</span>
            </div>
          </div>

          {/* 메인 컨텐츠 */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* 사이드바 */}
            <div className="w-36 border-r border-gray-500 overflow-y-auto py-2 bg-gray-750">
              {sidebarSections.map((section, sectionIdx) => (
                <div key={sectionIdx} className="mb-4">
                  <div className="px-3 py-1 text-xs text-gray-400 font-semibold uppercase">
                    {section.title}
                  </div>
                  {section.items.map((item, itemIdx) => (
                    <button
                      key={itemIdx}
                      onClick={() => setSelectedSidebarItem(item.id)}
                      className={`flex w-full cursor-pointer items-center gap-2 px-3 py-1 text-sm ${
                        selectedSidebarItem === item.id
                          ? "bg-blue-500/20 text-blue-400"
                          : "text-gray-200 hover:bg-gray-600"
                      }`}
                    >
                      <Icon kind={item.icon} size={16} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* 컬럼 뷰 */}
            <div className="flex flex-1 overflow-x-auto">
              {/* 컬럼 1: 카테고리 */}
              <div className="w-40 min-w-40 border-r border-gray-500 overflow-y-auto bg-gray-750">
                {categories.map((category, index) => (
                  <button
                    key={`category_${index}`}
                    onClick={() => handleClickCategory(index)}
                    className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-sm ${
                      currentCategoryIndex === index
                        ? "bg-blue-500 text-white"
                        : "text-neutral-300 hover:bg-neutral-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        kind="folder"
                        size={18}
                        className={currentCategoryIndex === index ? "text-white" : "text-blue-400"}
                      />
                      <span>{category.label}</span>
                    </div>
                    <Icon kind="chevron_right" size={16} />
                  </button>
                ))}
              </div>

              {/* 컬럼 2: 프로젝트 */}
              <div className="w-40 min-w-40 border-r border-gray-500 overflow-y-auto bg-gray-750">
                {currentCategory.items.map((project, index) => (
                  <button
                    key={`project_${index}`}
                    onClick={() => handleClickProject(index)}
                    className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-sm ${
                      currentProjectIndex === index
                        ? "bg-blue-500 text-white"
                        : "text-neutral-300 hover:bg-neutral-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        kind="folder"
                        size={18}
                        className={currentProjectIndex === index ? "text-white" : "text-blue-400"}
                      />
                      <span>{project.label}</span>
                    </div>
                    {project.link && <Icon kind="chevron_right" size={16} />}
                  </button>
                ))}
              </div>

              {/* 컬럼 3: 프로젝트 상세 정보 */}
              {currentProject && (
                <div className="flex-1 min-w-52 overflow-y-auto p-4 bg-gray-750">
                  <div className="flex flex-col items-center gap-3">
                    <Icon kind="folder" size={64} className="text-blue-400" />
                    <span className="text-white font-medium">{currentProject.label}</span>
                    {currentProject.link && (
                      <span className="text-xs text-gray-300 break-all text-center">
                        {currentProject.link}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 하단 버튼 영역 */}
          <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-gray-500 shrink-0 bg-gray-500">
            <Button
              variant="ghost"
              onClick={onClose}
              size="sm"
              className="text-gray-200 hover:text-white hover:bg-gray-500"
            >
              {t("cancel")}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleClickOpenProject}
              disabled={!currentProject}
              className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-5 disabled:bg-gray-600 disabled:text-gray-300"
            >
              {t("open")}
            </Button>
          </div>
        </div>

        {/* 모바일 뷰 - 아코디언 스타일 유지 */}
        <div className="md:hidden p-4 text-white">
          <BaseText type="h6" className="font-bold mb-4">
            {t("selectProject")}
          </BaseText>
          <Accordion type="single" collapsible className="w-full">
            {categories.map((category, index) => (
              <AccordionItem
                key={`category_${index}`}
                value={`category-${index}`}
                className="bg-gray-600 rounded-xs mb-2 border-none"
              >
                <AccordionTrigger className="px-3 py-2 text-white hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Icon kind="folder" size={18} className="text-blue-400" />
                    {category.label}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-6">
                  {category.items.map((project, idx) => (
                    <button
                      key={`project_${idx}`}
                      onClick={() => handleClickProject(idx, index)}
                      className={`flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm ${
                        currentProjectIndex === idx
                          ? "bg-blue-500 text-white"
                          : "text-gray-200 hover:bg-gray-600"
                      }`}
                    >
                      <Icon kind="folder" size={16} className="text-blue-400" />
                      {project.label}
                    </button>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <BaseText type="caption" className="text-gray-300 mt-4 block">
            {t("openProjectHint")}
          </BaseText>

          <div className="flex gap-2 mt-4">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              onClick={handleClickOpenProject}
              disabled={!currentProject}
            >
              {t("open")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OpenProjectModal;
