"use client";

import Image from "next/image";
import { twMerge } from "tailwind-merge";

interface IAvatarProps {
  className?: string;
  src?: string;
  alt?: string;
  size?: number;
}

const Avatar = ({ className, src, alt = "avatar", size = 50 }: IAvatarProps) => {
  if (!src) {
    return (
      <div
        className={twMerge("bg-gray-600 rounded-full", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <Image
      src={`/images/${src}`}
      alt={alt}
      className={twMerge("rounded-full object-cover", className)}
      width={size}
      height={size}
    />
  );
};

export default Avatar;
