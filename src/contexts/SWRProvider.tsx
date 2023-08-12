"use client";

import { IHaveChildren } from "@/models/common";
import { SWRConfig } from "swr";

export const SWRProvider = ({ children }: IHaveChildren) => {
  const fetcher = (resource: any, init: any) => fetch(resource, init).then(res => res.json());
  return <SWRConfig value={{ fetcher }}>{children}</SWRConfig>;
};
