"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import useSnackBar from "@/components/base-ui/snack-bar/hooks/use-snack-bar";
import BaseText from "@/components/base-ui/text";
import { useEffect, useState } from "react";
import OpenProjectModalItem from "./open-project-modal-item";

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

const OpenProjectModal = (props: IOpenProjectModalProps) => {
  const [currentCategory, setCurrentCategory] = useState<ICategory>(DUMMY[0]);
  const [currentProject, setCurrentProject] = useState<IProject | undefined>();

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
  return (
    <Dialog open={props.open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="bg-gray-700 border-gray-600 max-w-3xl p-0" showCloseButton={false}>
        <div className="m-2 text-white flex gap-1">
          <div className="border rounded-xs border-gray-600 bg-gray-800 hidden md:block">
            <OpenProjectModalItem iconKind={"schedule"} label={"최근항목"} />
            <OpenProjectModalItem iconKind={"terminal"} label={"응용 프로그램"} />
            <OpenProjectModalItem iconKind={"computer"} label={"데스크탑"} />
            <OpenProjectModalItem iconKind={"description"} label={"문서"} />
            <OpenProjectModalItem iconKind={"arrow_circle_down"} label={"다운로드"} />
          </div>
          <div className="w-full hidden md:block md:w-auto">
            <div className="flex min-h-[350px] gap-x-1">
              <section className="border rounded-xs border-gray-600 w-1/2 bg-gray-800 md:min-w-[250px]">
                {DUMMY.map((category, index) => {
                  return (
                    <OpenProjectModalItem
                      key={`category_${index}`}
                      iconKind={"folder"}
                      label={category.label}
                      enabledArrow
                      isActive={currentCategory === category}
                      onClick={() => {
                        handleClickCategory(category);
                      }}
                    />
                  );
                })}
              </section>
              <section className="border rounded-xs border-gray-600 w-1/2 bg-gray-800 md:min-w-[250px]">
                {currentCategory.items.map((project, index) => {
                  return (
                    <OpenProjectModalItem
                      key={`project_${index}`}
                      iconKind={"folder"}
                      label={project.label}
                      enabledArrow
                      isActive={currentProject === project}
                      onClick={() => {
                        handleClickProject(project);
                      }}
                    />
                  );
                })}
              </section>
            </div>
            <div className="border rounded-xs border-gray-600 mt-1 p-2 flex justify-end gap-x-2 bg-gray-800">
              <Button variant="secondary" onClick={onClose} size="sm">
                취소
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleClickOpenProject}
                disabled={!currentProject}
              >
                열기
              </Button>
            </div>
          </div>

          <div className="md:hidden w-full flex flex-col gap-y-2 p-3">
            <BaseText type="h6" className="text-black font-bold mb-2">
              프로젝트를 선택해주세요.
            </BaseText>
            <Accordion type="single" collapsible className="w-full">
              {DUMMY.map((category, index) => (
                <AccordionItem
                  key={`category_${index}`}
                  value={`category-${index}`}
                  className="bg-gray-600 rounded-xs mb-2 border-none"
                >
                  <AccordionTrigger className="px-2 py-1 text-white hover:no-underline">
                    {category.label}
                  </AccordionTrigger>
                  <AccordionContent className="pl-4">
                    {category.items.map((project, idx) => (
                      <OpenProjectModalItem
                        key={`project_${idx}`}
                        iconKind={"folder"}
                        label={project.label}
                        enabledArrow
                        isActive={currentProject === project}
                        onClick={() => {
                          handleClickProject(project);
                        }}
                      />
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <BaseText type="caption" className="text-gray-500 font-bold underline mt-4">
              열기 버튼을 누르면 프로젝트 또는 GIT이 열립니다.
            </BaseText>
            <div className="border rounded-xs flex gap-x-2">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                취소
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={handleClickOpenProject}
                disabled={!currentProject}
              >
                열기
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OpenProjectModal;
