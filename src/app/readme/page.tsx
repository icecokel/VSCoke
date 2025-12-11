import SlideGroup from "@/components/base-ui/slide-group";
import BaseText from "@/components/base-ui/text";
import { NextPage } from "next";

const ReadmePage: NextPage = () => {
  return (
    <article className="p-10">
      <SlideGroup delay={250} active>
        <BaseText type="h2" fontWeight={500}>
          반가워요.
        </BaseText>
        <BaseText>
          (곧) 새로운 프로젝트와 연결될 프로젝트 입니다. <br />제 프로젝트가 궁금하다면, 좌측 상단의
          File을 눌러 다른 프로젝트를 확인 해 보세요.
        </BaseText>
      </SlideGroup>
    </article>
  );
};

export default ReadmePage;
