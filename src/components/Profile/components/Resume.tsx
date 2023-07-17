"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useState } from "react";

const Resume = () => {
  const [page, setPage] = useState(1);
  const data: any = {};

  return <Box></Box>;
};

export default Resume;

interface IPageProps {
  corporate: string;
  team: string;
  items: IPageItem[];
}

interface IPageItem {
  title: string;
  periodStart: string;
  PeriodEnd: string;
  jobs: string;
  skiils: string[];
}

Resume.page = ({ corporate, team, items }: IPageProps) => {
  return (
    <Box>
      <Typography>{corporate}</Typography>
      <Typography>{team}</Typography>
      <ul>
        {items.map(({ title, periodStart, PeriodEnd, jobs, skiils }) => {
          return (
            <li key={title}>
              <Typography>{team}</Typography>
            </li>
          );
        })}
      </ul>
    </Box>
  );
};
