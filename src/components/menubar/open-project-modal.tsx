"use client";

import Accordion from "@/components/base-ui/accordion";
import AccordionSummary from "@/components/base-ui/accordion-summary";
import AccordionDetails from "@/components/base-ui/accordion-details";
import Button from "@/components/base-ui/button";
import Modal, { IModalProps } from "@/components/base-ui/modal";
import useSnackBar from "@/components/base-ui/snack-bar/hooks/use-snack-bar";
import BaseText from "@/components/base-ui/text";
import { useEffect, useState } from "react";
import OpenProjectModalItem from "./open-project-modal-item";

type IOpenProjectModalProps = Omit<IModalProps, "children">;

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
    <Modal {...props}>
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
            <Button variant="contained" onClick={onClose} color="secondary">
              <BaseText type="body2">취소</BaseText>
            </Button>
            <Button
              variant="contained"
              className="py-0!"
              onClick={handleClickOpenProject}
              disabled={!currentProject}
            >
              <BaseText type="body2">열기</BaseText>
            </Button>
          </div>
        </div>

        <div className="md:hidden w-full flex flex-col gap-y-2 p-3">
          <BaseText type="h6" className="text-black font-bold mb-2">
            프로젝트를 선택해주세요.
          </BaseText>
          {DUMMY.map((category, index) => {
            return (
              <div key={`category_${index}`}>
                <Accordion className="w-full py-1 pl-2 bg-gray-600 rounded-xs">
                  <AccordionSummary>{category.label}</AccordionSummary>
                  <div className="pl-4">
                    <AccordionDetails>
                      {category.items.map((project, index) => {
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
                    </AccordionDetails>
                  </div>
                </Accordion>
              </div>
            );
          })}
          <BaseText type="caption" className="text-gray-500 font-bold underline mt-4">
            열기 버튼을 누르면 프로젝트 또는 GIT이 열립니다.
          </BaseText>
          <div className="border rounded-xs flex gap-x-2">
            <Button variant="contained" className="flex-1" onClick={onClose} color="secondary">
              <BaseText type="body1">취소</BaseText>
            </Button>
            <Button
              variant="contained"
              className="flex-1"
              onClick={handleClickOpenProject}
              disabled={!currentProject}
            >
              <BaseText type="body1">열기</BaseText>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OpenProjectModal;
