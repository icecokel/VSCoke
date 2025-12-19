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
import { useEffect, useState } from "react";
import Icon, { TKind } from "@/components/base-ui/icon";

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

const DUMMY: ICategory[] = [
  { label: "Portfolio", items: [{ label: "VSCOKE", link: "https://vscoke.vercel.app" }] },
  { label: "Users", items: [{ label: "Test", link: "" }] },
];

// 사이드바 섹션 데이터
const SIDEBAR_SECTIONS: { title: string; items: { icon: TKind; label: string }[] }[] = [
  {
    title: "즐겨찾기",
    items: [
      { icon: "schedule", label: "최근 항목" },
      { icon: "terminal", label: "응용 프로그램" },
      { icon: "computer", label: "데스크탑" },
      { icon: "description", label: "문서" },
      { icon: "arrow_circle_down", label: "다운로드" },
    ],
  },
  {
    title: "위치",
    items: [{ icon: "hard_drive", label: "Macintosh HD" }],
  },
];

const OpenProjectModal = (props: IOpenProjectModalProps) => {
  const [currentCategory, setCurrentCategory] = useState<ICategory>(DUMMY[0]);
  const [currentProject, setCurrentProject] = useState<IProject | undefined>();
  const [selectedSidebarItem, setSelectedSidebarItem] = useState<string>("문서");

  useEffect(() => {
    setCurrentCategory(DUMMY[0]);
  }, []);

  const handleClickCategory = (value: ICategory) => {
    setCurrentCategory(value);
    setCurrentProject(undefined);
  };

  const handleClickProject = (value: IProject) => {
    setCurrentProject(value);
  };

  const { open } = useSnackBar({ message: "준비중입니다" });
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
        className="bg-neutral-800 border-neutral-600 max-w-3xl p-0 rounded-xl"
        style={{ backgroundColor: "#262626", borderRadius: "12px" }}
        showCloseButton={false}
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>프로젝트 열기</DialogTitle>
        </VisuallyHidden>

        {/* 데스크톱 뷰 - Finder 스타일 */}
        <div className="hidden md:flex flex-col h-[380px]">
          {/* 상단 툴바 */}
          <div
            className="flex items-center gap-2 px-3 py-2 border-b border-neutral-600"
            style={{ backgroundColor: "#404040" }}
          >
            {/* 네비게이션 버튼 */}
            <div className="flex gap-1">
              <button className="p-1 rounded hover:bg-neutral-600 text-neutral-400">
                <Icon kind="chevron_left" size={18} />
              </button>
              <button className="p-1 rounded hover:bg-neutral-600 text-neutral-400">
                <Icon kind="chevron_right" size={18} />
              </button>
            </div>

            {/* 뷰 모드 버튼 */}
            <div className="flex gap-1 ml-2">
              <button className="p-1 rounded bg-neutral-600 text-white">
                <Icon kind="view_column" size={18} />
              </button>
              <button className="p-1 rounded hover:bg-neutral-600 text-neutral-400">
                <Icon kind="view_list" size={18} />
              </button>
            </div>

            {/* 경로 표시 */}
            <div className="flex-1 flex justify-center">
              <button className="flex items-center gap-1 px-3 py-1 rounded bg-neutral-600 text-white text-sm">
                <Icon kind="folder" size={16} className="text-blue-400" />
                <span>{currentPath}</span>
                <Icon kind="expand_more" size={16} />
              </button>
            </div>

            {/* 검색창 */}
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-600 text-neutral-400 text-sm w-40">
              <Icon kind="search" size={16} />
              <span>검색</span>
            </div>
          </div>

          {/* 메인 컨텐츠 */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* 사이드바 */}
            <div
              className="w-36 border-r border-neutral-600 overflow-y-auto py-2"
              style={{ backgroundColor: "#262626" }}
            >
              {SIDEBAR_SECTIONS.map((section, sectionIdx) => (
                <div key={sectionIdx} className="mb-4">
                  <div className="px-3 py-1 text-xs text-neutral-500 font-semibold uppercase">
                    {section.title}
                  </div>
                  {section.items.map((item, itemIdx) => (
                    <button
                      key={itemIdx}
                      onClick={() => setSelectedSidebarItem(item.label)}
                      className={`w-full flex items-center gap-2 px-3 py-1 text-sm ${
                        selectedSidebarItem === item.label
                          ? "bg-blue-500/20 text-blue-400"
                          : "text-neutral-300 hover:bg-neutral-700"
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
              <div
                className="w-40 min-w-40 border-r border-neutral-600 overflow-y-auto"
                style={{ backgroundColor: "#262626" }}
              >
                {DUMMY.map((category, index) => (
                  <button
                    key={`category_${index}`}
                    onClick={() => handleClickCategory(category)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm ${
                      currentCategory === category
                        ? "bg-blue-500 text-white"
                        : "text-neutral-300 hover:bg-neutral-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        kind="folder"
                        size={18}
                        className={currentCategory === category ? "text-white" : "text-blue-400"}
                      />
                      <span>{category.label}</span>
                    </div>
                    <Icon kind="chevron_right" size={16} />
                  </button>
                ))}
              </div>

              {/* 컬럼 2: 프로젝트 */}
              <div
                className="w-40 min-w-40 border-r border-neutral-600 overflow-y-auto"
                style={{ backgroundColor: "#262626" }}
              >
                {currentCategory.items.map((project, index) => (
                  <button
                    key={`project_${index}`}
                    onClick={() => handleClickProject(project)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm ${
                      currentProject === project
                        ? "bg-blue-500 text-white"
                        : "text-neutral-300 hover:bg-neutral-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        kind="folder"
                        size={18}
                        className={currentProject === project ? "text-white" : "text-blue-400"}
                      />
                      <span>{project.label}</span>
                    </div>
                    {project.link && <Icon kind="chevron_right" size={16} />}
                  </button>
                ))}
              </div>

              {/* 컬럼 3: 프로젝트 상세 정보 */}
              {currentProject && (
                <div
                  className="flex-1 min-w-52 overflow-y-auto p-4"
                  style={{ backgroundColor: "#262626" }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <Icon kind="folder" size={64} className="text-blue-400" />
                    <span className="text-white font-medium">{currentProject.label}</span>
                    {currentProject.link && (
                      <span className="text-xs text-neutral-400 break-all text-center">
                        {currentProject.link}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 하단 버튼 영역 */}
          <div
            className="flex items-center justify-end gap-2 px-3 py-2 border-t border-neutral-600 shrink-0"
            style={{ backgroundColor: "#404040" }}
          >
            <Button
              variant="ghost"
              onClick={onClose}
              size="sm"
              className="text-neutral-300 hover:text-white hover:bg-neutral-600"
            >
              취소
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleClickOpenProject}
              disabled={!currentProject}
              className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-5 disabled:bg-neutral-600 disabled:text-neutral-400"
            >
              열기
            </Button>
          </div>
        </div>

        {/* 모바일 뷰 - 아코디언 스타일 유지 */}
        <div className="md:hidden p-4 text-white">
          <BaseText type="h6" className="font-bold mb-4">
            프로젝트를 선택해주세요.
          </BaseText>
          <Accordion type="single" collapsible className="w-full">
            {DUMMY.map((category, index) => (
              <AccordionItem
                key={`category_${index}`}
                value={`category-${index}`}
                className="bg-neutral-700 rounded-xs mb-2 border-none"
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
                      onClick={() => handleClickProject(project)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded ${
                        currentProject === project
                          ? "bg-blue-500 text-white"
                          : "text-neutral-300 hover:bg-neutral-600"
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

          <BaseText type="caption" className="text-neutral-400 mt-4 block">
            열기 버튼을 누르면 프로젝트 또는 GIT이 열립니다.
          </BaseText>

          <div className="flex gap-2 mt-4">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              취소
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              onClick={handleClickOpenProject}
              disabled={!currentProject}
            >
              열기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OpenProjectModal;
