import BaseText from "@/components/base-ui/text";
import { TParentNode } from "@/models/common";

interface ProfileItemProps extends TParentNode {
  title: string;
}

const ProfileItem = ({ title, children }: ProfileItemProps) => {
  return (
    <div className="mt-10">
      <BaseText type="h5">{title}</BaseText>
      <hr className="my-5 border-white" />
      <div>{children}</div>
    </div>
  );
};

export default ProfileItem;
