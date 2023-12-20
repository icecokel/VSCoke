"use client";

import { mdxContext } from "./MdxContext";
import { PREFIX } from "./MdxLinkHead";
import { useContext } from "react";

const MdxNav = () => {
  const { nav } = useContext(mdxContext);

  return (
    <div className="text-white w-[300px] hidden lg:block">
      <div className="fixed flex flex-col gap-2">
        {nav.map(item => {
          return (
            <a href={`#${PREFIX}-${item}`} key={item}>
              {item}
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default MdxNav;
