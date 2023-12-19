"use client";

import { mdxContext } from "./MdxContext";
import { PREFIX } from "./MdxLinkHead";
import { useContext } from "react";

const MdxNav = () => {
  const { nav } = useContext(mdxContext);

  return (
    <div className="text-white w-[300px] hidden lg:flex items-center">
      <div className="float-left">
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
