import Button from "../baseUi/Button";
import Icon from "../baseUi/Icon";
import { TKind } from "../baseUi/Icon/types";
import Modal, { IModalProps } from "../baseUi/Modal";
import BaseText from "../baseUi/Text";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

interface IOpenProjectModalProps extends Omit<IModalProps, "children"> {}

interface ICategory {
  label: string;
  items: IProject[];
}

interface IProject {
  label: string;
  link: string;
}

const DUMMY: ICategory[] = [
  { label: "Portfolio", items: [{ label: "VSCOKE", link: "" }] },
  { label: "Users", items: [{ label: "IceCoke", link: "" }] },
];

const OpenProjectModal = (props: IOpenProjectModalProps) => {
  const [currentCategory, setCurrentCategory] = useState<ICategory>(DUMMY[0]);

  useEffect(() => {
    setCurrentCategory(DUMMY[0]);
  }, []);

  const handleClickCategory = (value: ICategory) => {
    setCurrentCategory(value);
  };
  return (
    <Modal {...props}>
      <div className="-m-2 text-white flex gap-1">
        <div className="border rounded-sm border-gray-600 bg-gray-800">
          <OpenProjectModal.item iconKind={"schedule"} label={"최근항목"} />
          <OpenProjectModal.item iconKind={"terminal"} label={"응용 프로그램"} />
          <OpenProjectModal.item iconKind={"computer"} label={"데스크탑"} />
          <OpenProjectModal.item iconKind={"description"} label={"문서"} />
          <OpenProjectModal.item iconKind={"arrow_circle_down"} label={"다운로드"} />
        </div>
        <div>
          <div className="flex min-h-[350px] gap-x-1">
            <section className="border rounded-sm border-gray-600 bg-gray-800 min-w-[250px]">
              {DUMMY.map((category, index) => {
                return (
                  <OpenProjectModal.item
                    key={`category_${index}`}
                    iconKind={"folder"}
                    label={category.label}
                    isActive={currentCategory === category}
                    enabledArrow
                    onClick={() => {
                      handleClickCategory(category);
                    }}
                  />
                );
              })}
            </section>
            <section className="border rounded-sm border-gray-600 bg-gray-800 min-w-[250px]">
              {currentCategory.items.map((project, index) => {
                return (
                  <OpenProjectModal.item
                    key={`project_${index}`}
                    iconKind={"folder"}
                    label={project.label}
                    enabledArrow
                  />
                );
              })}
            </section>
          </div>
          <div className="border rounded-sm border-gray-600 mt-1 p-2 flex justify-end gap-x-2 bg-gray-800">
            <Button
              type="contained"
              className="!bg-gray-300 !py-0"
              onClick={() => {
                props.onClose();
              }}
            >
              <BaseText type="body2" className="font-bold">
                취소
              </BaseText>
            </Button>
            <Button type="contained" className="!bg-blue-300 !py-0">
              <BaseText type="body2" className="text-white font-bold">
                열기
              </BaseText>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OpenProjectModal;

interface IItemProps {
  label: string;
  iconKind: TKind;
  enabledArrow?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

OpenProjectModal.item = ({ iconKind, label, enabledArrow, isActive, onClick }: IItemProps) => {
  return (
    <div
      className={twMerge(
        "flex items-center gap-x-2  hover:bg-blue-300/50 hover:text-white px-2 py-1 rounded-sm",
        isActive && "bg-blue-300",
      )}
      onClick={onClick}
    >
      <Icon kind={iconKind} className={twMerge(!isActive && "text-blue-300")} />
      <BaseText type="body2" className="font-bold flex-1">
        {label}
      </BaseText>
      <div>{enabledArrow && <Icon kind="chevron_right" />}</div>
    </div>
  );
};