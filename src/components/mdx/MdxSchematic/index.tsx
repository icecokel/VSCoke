"use client";

import Icon from "@/components/baseUi/Icon";
import BaseText from "@/components/baseUi/Text";
import { IHaveChildren } from "@/models/common";
import { useEffect, useState } from "react";

export interface MdxSchematicProps extends IHaveChildren {}

const MdxSchematic = ({}: MdxSchematicProps) => {
  return (
    <div className="p-10 bg-blue-100/30 rounded my-4 flex justify-between items-center w-fit gap-4 mx-auto border border-gray-300">
      <MdxSchematic.item index={1} title="텍스트" to="음성" />
      <MdxSchematic.item index={2} title="음성" />
    </div>
  );
};

export default MdxSchematic;

interface IItemProps {
  index: number;
  title: string;
  to?: string;
  way?: "one" | "two";
}

const COLORS = ["#219ebc", "#8ecae6", "#ffb703", "#fb8500", "#023047"];

MdxSchematic.item = ({ index, title, to, way = "one" }: IItemProps) => {
  const color = COLORS[COLORS.length % index];
  return (
    <>
      <div className="p-8 rounded" style={{ backgroundColor: color }} id={title}>
        <BaseText className="font-bold">{title}</BaseText>
      </div>
      {to && <MdxSchematic.arrow from={title} to={to} way={way} />}
    </>
  );
};

interface IArrowProps {
  from: string;
  to: string;
  way: "one" | "two";
}

const getCenterPoint = ({
  offsetLeft,
  offsetWidth,
  offsetTop,
  offsetHeight,
}: HTMLElement): { x: number; y: number } => {
  return { x: offsetLeft + offsetWidth / 2, y: offsetTop + offsetHeight / 2 };
};

MdxSchematic.arrow = ({ from, to, way }: IArrowProps) => {
  const [deg, setDeg] = useState(0);

  useEffect(() => {
    const fromEl = document.getElementById(from);
    const toEl = document.getElementById(to);
    if (fromEl && toEl) {
      const { x: fromX, y: fromY } = getCenterPoint(fromEl);
      const { x: toX, y: toY } = getCenterPoint(toEl);
      const angleRad = Math.atan2(toY - fromY, toX - fromX);
      const angleDeg = angleRad * (180 / Math.PI);
      setDeg(angleDeg);
    }
  }, []);
  return <Icon kind="arrow_right_alt" size={70} style={{ transform: `rotate(${deg}deg)` }} />;
};
