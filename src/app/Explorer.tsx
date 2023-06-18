"use client";
import { useState } from "react";

const Explorer = () => {
  const [isShowing, setIsShowing] = useState(true);

  if (!isShowing) return <></>;

  return <div></div>;
};

export default Explorer;
