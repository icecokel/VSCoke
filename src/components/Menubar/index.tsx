"use client";

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

const MENULIST: IMenu[] = [{ label: "File", items: [{ label: "Open Project" }] }];

const Menubar = () => {
  return <Stack direction={"row"}></Stack>;
};
export default Menubar;
