import Slide from "@/components/baseUi/Slide";
import BaseText from "@ui/Text";
import { NextPage } from "next";

const ReadmePage: NextPage = () => {
  return (
    <article className="p-10">
      <Slide active fillMode="backwards" duration={700}>
        <BaseText type="h2" style={{ fontWeight: 500 }}>
          반가워요.
        </BaseText>
      </Slide>
      <Slide active delay={250} fillMode="backwards" duration={700}>
        <BaseText>
          (곧) 새로운 프로젝트와 연결될 프로젝트 입니다. <br />제 프로젝트가 궁금하다면, 좌측 상단의
          File을 눌러 다른 프로젝트를 확인 해 보세요.
        </BaseText>
      </Slide>
    </article>
  );
};

export default ReadmePage;
