"use client";

import Image from "next/image";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

interface IAvatarProps {
  className?: string;
  src?: string;
  alt?: string;
  size?: number;
}

const Avatar = ({ className, src, alt = "avatar", size = 50 }: IAvatarProps) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={twMerge("bg-gray-600 rounded-full", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const resolvedSrc = src.startsWith("/") ? src : `/images/${src}`;

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      className={twMerge("rounded-full object-cover", className)}
      width={size}
      height={size}
      onError={() => setHasError(true)}
    />
  );
};

export default Avatar;
