"use client";

import { mdxContext } from "./MdxContext";
import { PREFIX, TVariant } from "./MdxLinkHead";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useContext } from "react";

const STYLE_MAP: { [key in TVariant]: object } = {
  h1: {},
  h2: { marginLeft: "15px", fontSize: "0.8em" },
  h3: { marginLeft: "30px", fontSize: "0.6em" },
};

const MdxNav = () => {
  const { nav } = useContext(mdxContext);
  const pathname = usePathname();

  const items = nav.find(({ title }) => title === pathname)?.items;
  if (!items) {
    return <></>;
  }

  return (
    <div className="text-white w-[300px] hidden lg:block">
      <div className="fixed flex flex-col gap-2">
        {items.map(item => {
          return (
            <a href={`#${PREFIX}-${item.label}`} key={item.label}>
              <span style={STYLE_MAP[item.type]}>{item.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default MdxNav;
