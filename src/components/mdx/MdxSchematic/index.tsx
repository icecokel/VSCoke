"use client";

import Icon from "@/components/baseUi/Icon";
import BaseText from "@/components/baseUi/Text";
import { CSSProperties, useEffect, useState } from "react";

export interface MdxSchematicProps {
  items: IItemProps[];
}

const MdxSchematic = ({ items }: MdxSchematicProps) => {
  return (
    <div className="p-10 bg-blue-100/30 rounded my-4 flex justify-between items-center w-fit gap-44 mx-auto border border-gray-300">
      {items.map(item => {
        return <MdxSchematic.item {...item} key={item.index} />;
      })}
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
      {to && to !== title && (
        <MdxSchematic.arrow from={title} to={to} way={way}></MdxSchematic.arrow>
      )}
    </>
  );
};

interface IArrowProps {
  from: string;
  to: string;
  way: "one" | "two";
}
interface ICoordinates {
  x: number;
  y: number;
}

const getCenterPoint = ({
  offsetLeft,
  offsetWidth,
  offsetTop,
  offsetHeight,
}: HTMLElement): ICoordinates => {
  return { x: offsetLeft + offsetWidth / 2, y: offsetTop + offsetHeight / 2 };
};

const getDegByCoords = ({ x: fromX, y: fromY }: ICoordinates, { x: toX, y: toY }: ICoordinates) => {
  const angleRad = Math.atan2(toY - fromY, toX - fromX);
  return angleRad * (180 / Math.PI);
};

const getMedian = (from: number, to: number) => {
  if (to - from === 0) {
    return "auto";
  }

  return (to - from) / 2 + from - 35;
};

const getArrowCoords = (
  { x: fromX, y: fromY }: ICoordinates,
  { x: toX, y: toY }: ICoordinates,
): CSSProperties => {
  return { left: getMedian(fromX, toX), top: getMedian(fromY, toY) };
};

MdxSchematic.arrow = ({ from, to, way }: IArrowProps) => {
  const [fromCoords, setFromCoords] = useState<ICoordinates>();
  const [toCoords, setToCoords] = useState<ICoordinates>();

  useEffect(() => {
    const fromEl = document.getElementById(from);
    const toEl = document.getElementById(to);
    if (fromEl && toEl) {
      setFromCoords(getCenterPoint(fromEl));
      setToCoords(getCenterPoint(toEl));
    }
  }, []);

  if (!fromCoords || !toCoords) {
    return <></>;
  }
  return (
    <Icon
      kind="arrow_right_alt"
      className="absolute"
      size={70}
      style={{
        transform: `rotate(${getDegByCoords(fromCoords, toCoords)}deg)`,
        ...getArrowCoords(fromCoords, toCoords),
      }}
    />
  );
};
