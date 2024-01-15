import Image from "next/image";
import { useEffect, useState } from "react";

type sizeType =
  | number
  | {
      xs?: number;
      sm?: number;
      md?: number;
      lg?: number;
      xl?: number;
    };

interface IAvatar {
  className: string;
  src: string;
  size: sizeType;
}

const Avatar = ({ className, src, size }: IAvatar) => {
  const [imageSize, setImageSize] = useState(50);

  useEffect(() => {
    if (typeof size === "number") {
      setImageSize(size);
    }
  }, []);
  return (
    <Image
      src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${src}`}
      alt="avatar"
      className={className}
      style={{
        borderRadius: "50%",
        objectFit: "cover",
      }}
      width={imageSize}
      height={imageSize}
    />
  );
};

export default Avatar;
