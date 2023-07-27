"use client";

import { ReactNode } from "react";
import { SWRConfig } from "swr";

export const SWRProvider = ({ children }: { children: ReactNode }) => {
  const fetcher = (resource: any, init: any) =>
    fetch(resource, init).then((res) => res.json());
  return <SWRConfig value={{ fetcher }}>{children}</SWRConfig>;
};
