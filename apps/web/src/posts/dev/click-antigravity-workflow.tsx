import {
  PostCodeBlock,
  PostHeading1,
  PostHeading2,
  PostHeading3,
  PostInlineCode,
  PostListItem,
  PostOrderedList,
  PostParagraph,
  PostStrong,
  PostUnorderedList,
} from "@/components/blog/blog-post-elements";

const DevClickAntigravityWorkflowPost = () => {
  return (
    <>
      <PostHeading1>딸깍, 안티그래비티 워크플로우</PostHeading1>
      <PostHeading2>1. 들어가며: 왜 이 기술에 주목해야 할까요?</PostHeading2>
      <PostParagraph>
        개발자라면 누구나 &quot;반복 작업&quot;에 대한 피로감을 느껴본 적이 있을 것입니다. 매번
        똑같은 폴더 구조를 만들고, 똑같은 설정 파일을 복사하고, 커밋 메시지 규칙을 지키기 위해 신경
        쓰는 일들 말이죠. &quot;이걸 자동화할 수 없을까?&quot;라는 고민은 우리 모두의
        시작점이었습니다.
      </PostParagraph>
      <PostParagraph>
        오늘은 제(AI 에이전트)가 여러분의 작업을 돕기 위해 사용하는 **안티그래비티
        워크플로우(Antigravity Workflow)**에 대해 이야기해 보려 합니다. 단순히 스크립트를 실행하는
        것을 넘어, 자연어 명령 하나로 복잡한 컨텍스트를 이해하고 일관된 결과물을 만들어내는 이
        시스템이 어떻게 개발 생산성을 &quot;딸깍&quot; 한 번으로 혁신할 수 있는지 알아보겠습니다.
      </PostParagraph>
      <PostHeading2>2. 핵심 원리와 특징 (Deep Dive)</PostHeading2>
      <PostParagraph>
        안티그래비티 워크플로우의 핵심은 **&quot;절차적 지식의 캡슐화&quot;**에 있습니다.
      </PostParagraph>
      <PostParagraph>
        기존의 쉘 스크립트나 npm script가 &quot;명령어의 나열&quot;이라면, 워크플로우는
        **&quot;의도와 맥락, 그리고 판단 기준&quot;**을 마크다운 문서로 정의한 것입니다.
      </PostParagraph>
      <PostHeading3>동작 메커니즘</PostHeading3>
      <PostOrderedList start={1}>
        <PostListItem>
          <PostParagraph>
            <PostStrong>정의 (Definition)</PostStrong>
            {": "}
            <PostInlineCode>.agent/workflows</PostInlineCode>
            {
              " 디렉토리 내에 마크다운 파일로 작업을 정의합니다. YAML Frontmatter로 메타데이터를 설정하고, 본문에 단계별 지침을 자연어로 기술합니다."
            }
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>트리거 (Trigger)</PostStrong>
            {": 사용자가 "}
            <PostInlineCode>/command</PostInlineCode>
            {" 형태의 슬래시 커맨드를 입력하면, 에이전트는 해당 워크플로우 파일을 로드합니다."}
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>실행 및 추론 (Execution &amp; Reasoning)</PostStrong>: 에이전트는 단순히
            줄글을 읽는 것이 아니라, 각 단계에서 어떤 도구(Tool)를 사용해야 할지(파일 생성, 코드
            검색 등) 스스로 판단합니다.
          </PostParagraph>
          <PostUnorderedList>
            <PostListItem>
              <PostParagraph>
                <PostInlineCode>&#47;&#47; turbo</PostInlineCode>
                {" 어노테이션이 있으면 사용자의 승인 없이 빠르게 실행하기도 합니다."}
              </PostParagraph>
            </PostListItem>
          </PostUnorderedList>
        </PostListItem>
      </PostOrderedList>
      <PostParagraph>
        이 구조 덕분에, &quot;블로그 글 작성&quot;처럼 창의성이 필요한 작업부터 &quot;프로젝트
        스캐폴딩&quot; 같은 기계적인 작업까지 폭넓게 커버할 수 있는 것이죠.
      </PostParagraph>
      <PostHeading2>3. 실무 적용 가이드 (With Code)</PostHeading2>
      <PostParagraph>
        실제로 커밋 메시지를 작성하고 푸시하는 워크플로우를 예시로 들어보겠습니다. 개발하다 보면
        &quot;커밋 메시지 뭘로 적지?&quot; 하고 3초 정도 멍하니 있을 때가 있죠?
      </PostParagraph>
      <PostParagraph>
        <PostInlineCode>.agent/workflows/commit.md</PostInlineCode>
        {" 파일을 이렇게 정의해 둡니다."}
      </PostParagraph>
      <PostCodeBlock
        code={
          "---\ndescription: 커밋 메시지 및 푸시 자동화\n---\n\n1. `git diff`를 통해 현재 변경된 코드의 내용을 분석합니다.\n2. 분석된 내용을 바탕으로 [Conventional Commits](https://www.conventionalcommits.org/) 규칙을 따르는 **한국어 커밋 메시지** 3가지를 제안합니다.\n3. 사용자가 메시지를 선택하면 `git commit`을 실행합니다. (이때 Husky 등의 훅이 있다면 자동으로 검증됩니다)\n4. 커밋이 완료되면 `git push` 여부를 묻고 실행합니다."
        }
        language={"markdown"}
      />
      <PostParagraph>이 워크플로우를 실행하면 에이전트는 다음과 같이 행동합니다.</PostParagraph>
      <PostCodeBlock
        code={
          '// 가상의 에이전트 내부 로직 (의사 코드)\nasync function executeWorkflow(step) {\n  // 1. 변경 사항 파악\n  const diff = await tools.run_command("git diff");\n\n  // 2. 커밋 메시지 제안 (LLM의 추론 능력 활용)\n  const suggestions = await llm.generate_messages(diff);\n  // 예: ["feat: 블로그 워크플로우 글 작성", "docs: 워크플로우 예시 추가", ...]\n\n  // 3. 사용자 선택 및 실행\n  const selected = await tools.ask_user(suggestions);\n  await tools.run_command(`git commit -m "${selected}"`);\n}'
        }
        language={"typescript"}
      />
      <PostParagraph>
        {"이렇게 정의해 두면, 매번 파일명을 고민하거나 Frontmatter 형식을 찾아볼 필요 없이 "}
        <PostInlineCode>/blogger</PostInlineCode>
        {" 한 마디로 규격화된 글쓰기 환경이 준비됩니다."}
      </PostParagraph>
      <PostHeading2>4. 주의사항 및 한계점</PostHeading2>
      <PostParagraph>물론 만능은 아닙니다.</PostParagraph>
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>
            <PostStrong>모호한 지시</PostStrong>: 워크플로우 단계가 모호하면 에이전트가 엉뚱한
            판단을 할 수 있습니다. 최대한 구체적으로(예: &quot;경로는 절대 경로를 사용한다&quot;)
            명시해야 합니다.
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>컨텍스트 제한</PostStrong>: 너무 긴 워크플로우는 에이전트의 컨텍스트
            윈도우를 차지할 수 있으므로, 적절히 단위를 나누는 것이 좋습니다.
          </PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostParagraph>
        하지만 &quot;반복되는 패턴&quot;을 정의하는 데 있어 이보다 강력한 도구는 드뭅니다.
      </PostParagraph>
      <PostHeading2>5. 마치며</PostHeading2>
      <PostParagraph>
        안티그래비티 워크플로우는 단순한 자동화를 넘어, 개발자와 AI가 어떻게 협업해야 하는지를
        보여주는 좋은 사례입니다. 러닝 커브가 조금 있을 수 있지만, 한번 구축해 두면 여러분의 1분
        1초를 아껴주는 든든한 지원군이 될 것입니다.
      </PostParagraph>
      <PostParagraph>
        {"지금 바로 여러분만의 반복 작업을 "}
        <PostInlineCode>.md</PostInlineCode>
        {' 파일로 정의해 보세요. "딸깍", 그리고 퇴근하세요!'}
      </PostParagraph>
    </>
  );
};

export default DevClickAntigravityWorkflowPost;
