"use client";

import { IHaveChildren } from "@/models/common";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface IMenuItem {
  label: string;
  shortcut?: string;
  items?: IMenuItem[];
}

interface IMenu {
  label: string;
  items: IMenuItem[];
}

const MENULIST: IMenu[] = [
  { label: "File", items: [{ label: "Open Project" }] },
  { label: "Help", items: [] },
];

const Menubar = ({ children }: IHaveChildren) => {
  return (
    <>
      <Stack direction={"row"} className="bg-gray-900 p-1">
        {MENULIST.map(item => {
          return (
            <Typography
              variant="body1"
              color="initial"
              key={item.label}
              className="text-gray-300 px-3 select-none"
            >
              {item.label}
            </Typography>
          );
        })}
      </Stack>

      {children}
    </>
  );
};

export default Menubar;
