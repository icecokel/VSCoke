import {
  PostCodeBlock,
  PostHeading1,
  PostHeading2,
  PostHeading3,
  PostHorizontalRule,
  PostInlineCode,
  PostListItem,
  PostOrderedList,
  PostParagraph,
  PostStrong,
  PostUnorderedList,
} from "@/components/blog/blog-post-elements";

const JournalSidebarUxImprovementsPost = () => {
  return (
    <>
      <PostHeading1>사이드바 UX 개선기: 가독성, 페이지네이션, 그리고 검색까지</PostHeading1>
      <PostHeading2>1. 고민과 문제점</PostHeading2>
      <PostParagraph>
        프로젝트가 커지고 블로그 포스트가 하나둘 쌓이다 보니 사이드바(Explorer) 영역에서 몇 가지
        문제점이 눈에 띄기 시작했습니다.
      </PostParagraph>
      <PostOrderedList start={1}>
        <PostListItem>
          <PostParagraph>
            <PostStrong>가독성 저하</PostStrong>: 파일명이 길어질 경우 사이드바 영역을 넘어가거나
            잘려서 무슨 파일인지 한눈에 알기 어려웠습니다.
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>확장성 부족</PostStrong>: 포스트가 수백 개로 늘어난다면 스크롤이 끝도 없이
            길어질 것이 뻔했습니다. VSCode처럼 트리 구조를 가지고 있지만, 수많은 파일이 한 번에
            나열되는 것은 사용자 경험(UX)에 좋지 않아 보였습니다.
          </PostParagraph>
        </PostListItem>
      </PostOrderedList>
      <PostHeading2>2. 선택지 분석</PostHeading2>
      <PostHeading3>가독성 문제</PostHeading3>
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>
            <PostStrong>옵션 A</PostStrong>: 사이드바 너비를 늘린다. -&gt; 공간 효율성이 떨어짐.
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>옵션 B</PostStrong>: 줄바꿈 처리한다. -&gt; 파일 목록의 통일성이 깨짐.
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>옵션 C</PostStrong>
            {": "}
            <PostStrong>말줄임(...) 처리하고 툴팁(Tooltip)을 제공한다.</PostStrong>
            {" -> 가장 깔끔하고 VSCode스러운 방식."}
          </PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostHeading3>확장성 문제 (많은 파일)</PostHeading3>
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>
            <PostStrong>옵션 A</PostStrong>: 가상 스크롤(Virtual Scrolling) 도입. -&gt; 구현 복잡도
            증가.
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>옵션 B</PostStrong>
            {": "}
            <PostStrong>페이지네이션(Pagination) 도입.</PostStrong>
            {
              " -> '더 보기' 링크를 통해 대시보드로 이동시키는 방식이 깔끔하다고 판단. 탐색기에서는 "
            }
            <PostStrong>최신 글 10개</PostStrong>만 보여주고 나머지는 대시보드에서 관리하도록 유도.
          </PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostHeading2>3. 해결 과정</PostHeading2>
      <PostHeading3>Step 1: 가독성 및 디자인 개선</PostHeading3>
      <PostParagraph>
        {"우선 "}
        <PostInlineCode>ExplorerItem</PostInlineCode>
        {" 컴포넌트를 손봤습니다. 긴 파일명은 CSS "}
        <PostInlineCode>truncate</PostInlineCode>
        {" 속성으로 말줄임 처리하고, "}
        <PostInlineCode>shadcn/ui</PostInlineCode>
        {"의 "}
        <PostInlineCode>Tooltip</PostInlineCode>
        {
          " 컴포넌트를 활용해 마우스를 올렸을 때 전체 이름이 보이도록 했습니다. 또한 아이콘 사이즈가 제각각이던 문제를 해결하기 위해 "
        }
        <PostInlineCode>shrink-0</PostInlineCode>와 고정 사이즈(
        <PostInlineCode>size-4</PostInlineCode>)를 적용하여 정렬을 맞췄습니다.
      </PostParagraph>
      <PostHeading3>Step 2: 재귀적 페이지네이션 (Recursive Pagination)</PostHeading3>
      <PostParagraph>
        {"가장 고민했던 부분입니다. 단순히 최상위 폴더만 제한하는 것이 아니라, "}
        <PostInlineCode>blog/dev</PostInlineCode>
        {"나 "}
        <PostInlineCode>blog/journal</PostInlineCode>
        {" 같은 "}
        <PostStrong>하위 폴더</PostStrong>에도 동일한 규칙(10개 제한)이 적용되어야 했습니다.
      </PostParagraph>
      <PostParagraph>
        <PostInlineCode>use-explorer</PostInlineCode>
        {" 훅 내부에 재귀 함수("}
        <PostInlineCode>limitItemsRecursively</PostInlineCode>
        {")를 구현하여 트리의 모든 깊이에서 10개 이상의 항목이 있으면 잘라내고, 마지막에 "}
        <PostInlineCode>... (더 보기)</PostInlineCode>
        {" 링크를 추가하는 로직을 완성했습니다."}
      </PostParagraph>
      <PostCodeBlock
        code={
          '// use-explorer.tsx (Simplified)\nconst limitItemsRecursively = (items: ITree[]): ITree[] => {\n  // ... 정렬 로직 ...\n  if (sorted.length > 10) {\n    const sliced = sorted.slice(0, 10);\n    sliced.push({\n      id: "(more)",\n      label: t("more"), // 다국어 지원\n      path: "/blog/dashboard",\n      icon: "none", // 아이콘 제거\n    });\n    result = sliced;\n  }\n  // ... 재귀 호출 ...\n};'
        }
        language={"typescript"}
      />
      <PostParagraph>
        이 과정에서 &apos;더 보기&apos; 링크에 불필요한 아이콘이 들어가는 것이 어색하여 아이콘을
        제거(
        <PostInlineCode>icon: &quot;none&quot;</PostInlineCode>)하고, 다국어(
        <PostInlineCode>messages</PostInlineCode>)를 적용해 완성도를 높였습니다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostHeading2>4. 블로그 대시보드 검색 기능 추가</PostHeading2>
      <PostParagraph>
        {"페이지네이션으로 '더 보기' 눌렀을 때 이동하는 대시보드 페이지에서 "}
        <PostStrong>포스트가 많아지면 원하는 글을 찾기 어렵겠다</PostStrong>는 생각이 들어 검색
        기능을 추가하기로 했습니다.
      </PostParagraph>
      <PostHeading3>요구사항</PostHeading3>
      <PostOrderedList start={1}>
        <PostListItem>
          <PostParagraph>
            <PostStrong>제목 기반 검색</PostStrong>: 포스트 제목으로 필터링
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>Debounce 적용</PostStrong>: 타이핑할 때마다 검색하지 않고 입력이 멈춘 후
            검색
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>자동완성(Autocomplete)</PostStrong>: 검색어에 맞는 포스트 제목을
            드롭다운으로 제안
          </PostParagraph>
        </PostListItem>
      </PostOrderedList>
      <PostHeading3>삽질 기록: Debounce 라이브러리 선택</PostHeading3>
      <PostParagraph>
        {"처음엔 "}
        <PostInlineCode>@toss/react</PostInlineCode>
        {" 라이브러리의 "}
        <PostInlineCode>useDebounce</PostInlineCode>
        {" 훅을 사용하려 했습니다. 토스에서 만든 라이브러리라 믿음직스러웠거든요."}
      </PostParagraph>
      <PostCodeBlock code={"npm install @toss/react"} language={"bash"} />
      <PostParagraph>그런데 설치부터 문제가 발생했습니다:</PostParagraph>
      <PostCodeBlock
        code={
          'npm error ERESOLVE could not resolve\nnpm error peer react@"^17.0.1 || ^18.0.0" from @toss/react@1.5.2'
        }
      />
      <PostParagraph>
        <PostStrong>React 19를 사용 중</PostStrong>
        {"이라 peer dependency 충돌이 났습니다. "}
        <PostInlineCode>--legacy-peer-deps</PostInlineCode>로 강제 설치는 가능했지만, 더 큰 문제가
        있었습니다.
      </PostParagraph>
      <PostCodeBlock
        code={
          "// 예상했던 사용법\nconst debouncedQuery = useDebounce(query, 300);\n\n// 실제 @toss/react의 useDebounce 시그니처\nuseDebounce(callback: (...args: any[]) => any, wait: number);"
        }
        language={"typescript"}
      />
      <PostParagraph>
        <PostInlineCode>@toss/react</PostInlineCode>
        {"의 "}
        <PostInlineCode>useDebounce</PostInlineCode>
        {"는 "}
        <PostStrong>값이 아니라 함수를 debounce</PostStrong>하는 용도였습니다. 타입 에러가
        발생했습니다:
      </PostParagraph>
      <PostCodeBlock
        code={
          "Argument of type 'string' is not assignable to parameter of type '(...args: any[]) => any'"
        }
      />
      <PostHeading3>해결: lodash.debounce로 전환</PostHeading3>
      <PostParagraph>
        {"결국 가장 안정적이고 널리 사용되는 "}
        <PostInlineCode>lodash</PostInlineCode>
        {"의 "}
        <PostInlineCode>debounce</PostInlineCode>를 선택했습니다.
      </PostParagraph>
      <PostCodeBlock code={"npm install lodash @types/lodash"} language={"bash"} />
      <PostCodeBlock
        code={
          '// dashboard-search.tsx\nimport { debounce } from "lodash";\n\nconst updateDebouncedQuery = useCallback(\n  debounce((value: string) => {\n    setDebouncedQuery(value);\n  }, 300),\n  [],\n);'
        }
        language={"typescript"}
      />
      <PostHeading3>또 다른 버그: 자동완성 드롭다운이 안 닫힘</PostHeading3>
      <PostParagraph>
        {"구현 후 테스트해보니 자동완성 드롭다운에서 항목을 선택해도 "}
        <PostStrong>드롭다운이 닫히지 않는 버그</PostStrong>가 있었습니다.
      </PostParagraph>
      <PostParagraph>원인을 분석해보니:</PostParagraph>
      <PostOrderedList start={1}>
        <PostListItem>
          <PostParagraph>
            <PostInlineCode>handleSelect</PostInlineCode>
            {"에서 "}
            <PostInlineCode>setSuggestions([])</PostInlineCode>를 호출
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            {"하지만 "}
            <PostInlineCode>setDebouncedQuery(title)</PostInlineCode>
            {" 호출"}
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostInlineCode>useEffect</PostInlineCode>
            {"가 "}
            <PostInlineCode>debouncedQuery</PostInlineCode>
            {" 변경 감지"}
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>
              {"다시 "}
              <PostInlineCode>setSuggestions</PostInlineCode>를 채워버림
            </PostStrong>
          </PostParagraph>
        </PostListItem>
      </PostOrderedList>
      <PostParagraph>
        {"해결책으로 프로젝트에서 사용 중인 "}
        <PostInlineCode>useBoolean</PostInlineCode>
        {" 훅을 활용하여 드롭다운 표시를 "}
        <PostStrong>명시적으로 제어</PostStrong>했습니다:
      </PostParagraph>
      <PostCodeBlock
        code={
          'import { useBoolean } from "@/hooks/use-boolean";\n\n// useBoolean 훅으로 드롭다운 상태 관리\nconst dropdown = useBoolean(false);\n\nconst handleSelect = (title: string) => {\n  setQuery(title);\n  setDebouncedQuery(title);\n  dropdown.onFalse(); // 명시적으로 닫기\n};\n\n// JSX\n{dropdown.value && suggestions.length > 0 && query && (\n  <ul>...</ul>\n)}'
        }
        language={"typescript"}
      />
      <PostParagraph>
        <PostInlineCode>useBoolean</PostInlineCode>
        {"은 "}
        <PostInlineCode>onTrue()</PostInlineCode>
        {", "}
        <PostInlineCode>onFalse()</PostInlineCode>
        {", "}
        <PostInlineCode>onToggle()</PostInlineCode>
        {" 같은 명시적인 메서드를 제공해서 "}
        <PostInlineCode>setIsOpen(true)</PostInlineCode>
        {" 같은 코드보다 의도가 더 명확하게 드러납니다."}
      </PostParagraph>
      <PostHorizontalRule />
      <PostHeading2>5. 최종 결과</PostHeading2>
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>
            <PostStrong>깔끔해진 사이드바</PostStrong>: 파일명이 길어도 레이아웃이 깨지지 않으며,
            툴팁으로 내용을 확인할 수 있습니다.
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>부담 없는 탐색기</PostStrong>: 파일이 아무리 많아져도 폴더 당 10개로
            유지되어 시각적 피로도가 줄었습니다.
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>편리한 검색</PostStrong>: 대시보드에서 제목으로 빠르게 원하는 포스트를 찾을
            수 있고, 자동완성으로 더 빠른 탐색이 가능합니다.
          </PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostHeading2>6. 후기</PostHeading2>
      <PostParagraph>
        단순한 기능 구현을 넘어 &quot;사용자가(그리고 개발자인 내가) 어떻게 하면 더 편하게 쓸 수
        있을까?&quot;를 고민했던 작업이었습니다.
      </PostParagraph>
      <PostParagraph>특히 이번 작업에서 느낀 점:</PostParagraph>
      <PostOrderedList start={1}>
        <PostListItem>
          <PostParagraph>
            <PostStrong>라이브러리 선택 시 React 버전 호환성 확인</PostStrong>은 필수입니다. 최신
            React 19를 쓰고 있다면 더욱 그렇습니다.
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>API 시그니처를 꼭 확인</PostStrong>해야 합니다. 같은 이름의 훅이라도
            &quot;값을 debounce&quot;하는지 &quot;함수를 debounce&quot;하는지가 다를 수 있습니다.
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>커스텀 훅을 적극 활용</PostStrong>
            {"하자. "}
            <PostInlineCode>useBoolean</PostInlineCode>처럼 단순하지만 코드 가독성을 높여주는 훅은
            작은 기능에서도 빛을 발합니다.
          </PostParagraph>
        </PostListItem>
      </PostOrderedList>
      <PostParagraph>
        앞으로도 이런 &apos;마이크로 인터랙션&apos;을 놓치지 않는 개발을 하고 싶습니다.
      </PostParagraph>
    </>
  );
};

export default JournalSidebarUxImprovementsPost;
