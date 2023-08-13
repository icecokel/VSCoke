"use client";

import { IHaveChildren } from "@/models/common";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

interface IHistoryItem {
  title: string;
  path: string;
  isAactive: boolean;
}

const sample: IHistoryItem[] = [
  { title: "ddfdf", path: "dfdf", isAactive: true },
  { title: "ddfdf", path: "dfdf", isAactive: false },
];

const HistoryTabs = ({ children }: IHaveChildren) => {
  const [history, setHistory] = useState<IHistoryItem[]>(sample);

  useEffect(() => {}, []);

  return (
    <div>
      <Stack direction={"row"} className="bg-gray-900">
        {history.map(({ isAactive, path, title }) => (
          <div
            key={`tab_${path}`}
            className={twMerge(
              "border border-gray-300/60 border-l-[0px]",
              isAactive && "bg-gray-800 border-b-[0px]",
            )}
          >
            <Typography
              className={twMerge(
                "text-gray-300/80 py-[6px] px-[20px]",
                isAactive && "text-yellow-200/95 font-medium border-t border-t-blue-100 pt-[5px]",
              )}
              fontSize={14}
            >
              {title}
            </Typography>
          </div>
        ))}
      </Stack>
      <Container className="min-h-screen flex-1  text-white sm:p-1 md:p-5 bg-gray-800">
        {children}
      </Container>
    </div>
  );
};

export default HistoryTabs;
