import { IHaveChildren } from "@/models/common";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "VSBLOG",
};

export default function Layout({ children }: IHaveChildren) {
  return (
    <div className="bg-white text-black/80 rounded-md flex justify-center">
      <div className="max-w-[800px]">{children}</div>
    </div>
  );
}
