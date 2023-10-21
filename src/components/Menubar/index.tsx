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

const MENULIST: IMenu[] = [];

const Menubar = () => {
  return <Stack direction={"row"}></Stack>;
};
export default Menubar;
