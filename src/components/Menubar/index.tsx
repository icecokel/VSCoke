"use client";

import { IHaveChildren } from "@/models/common";
import Stack from "@mui/material/Stack";

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
      <Stack direction={"row"}>
        {MENULIST.map(item => {
          return <div>{item.label}</div>;
        })}
      </Stack>
      {children}
    </>
  );
};

export default Menubar;
