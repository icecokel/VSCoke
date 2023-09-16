import Hobby from "@/components/Hobby";

interface IHobbyPageProps {
  params: {
    type: string;
  };
}

/**
 * 취미 페이지
 * @returns 취미 컴포넌트
 */

// TODO 정해지지 않는 페이지 접근 시 NotFonud
const HobbyPage = ({ params }: IHobbyPageProps) => {
  return <Hobby type={params.type} />;
};

export default HobbyPage;
