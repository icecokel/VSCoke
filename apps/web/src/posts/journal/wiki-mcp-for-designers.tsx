import {
  PostBlockquote,
  PostCodeBlock,
  PostHeading1,
  PostHeading2,
  PostHeading3,
  PostHorizontalRule,
  PostListItem,
  PostParagraph,
  PostUnorderedList,
} from "@/components/blog/blog-post-elements";

const JournalWikiMcpForDesignersPost = () => {
  return (
    <>
      <PostHeading1>코드 저장소 밖의 동료를 위해 Wiki MCP를 만든 기록</PostHeading1>
      <PostParagraph>
        개발팀에서 AI를 활용하면서 가장 효과가 좋았던 방법 중 하나는 저장소 안에 프로젝트의 지침과
        맥락을 함께 남기는 것이었다.
      </PostParagraph>
      <PostParagraph>
        AI 지침 문서에는 작업할 때 지켜야 할 규칙을, 콘셉트 문서에는 프로젝트의 배경과 도메인 용어,
        업무 흐름, 과거의 의사결정을 정리했다. AI는 코드를 수정하기 전에 이 문서들을 읽었고, 덕분에
        매번 프로젝트를 처음부터 설명하지 않아도 되었다.
      </PostParagraph>
      <PostParagraph>
        그런데 새로 합류한 디자이너와 일하면서 이 방식의 빈틈이 보였다. 저장소 안의 문서는 개발자와
        개발자의 AI에게는 유용했지만, 코드 레벨의 정보를 직접 볼 수 없는 사람에게는 사실상 존재하지
        않는 지식과 같았다.
      </PostParagraph>
      <PostParagraph>
        이 글은 그 간극을 줄이기 위해 기획서와 히스토리 문서를 Markdown으로 정리하고, AI가 검색하고
        읽을 수 있는 Wiki MCP를 만들어 서버에 올린 과정을 기록한 글이다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostHeading2>1. 고민과 문제점: 저장소 안에서만 통하던 지식</PostHeading2>
      <PostHeading3>개발자의 AI는 프로젝트를 이해하고 있었다</PostHeading3>
      <PostParagraph>
        코드만으로는 프로젝트를 온전히 이해하기 어렵다. 함수가 무엇을 하는지는 알 수 있어도, 그
        기능이 왜 필요해졌는지와 현업에서 어떤 의미로 사용하는지는 코드에 모두 드러나지 않는다.
      </PostParagraph>
      <PostParagraph>
        그래서 개발팀은 저장소 안에 다음과 같은 지식을 문서로 남기고 있었다.
      </PostParagraph>
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>프로젝트가 시작된 배경</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>도메인에서 사용하는 용어의 정확한 의미</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>기능별 업무 흐름과 정책</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>과거에 어떤 선택을 했고 왜 그렇게 결정했는지</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>AI가 코드를 다룰 때 지켜야 하는 기준</PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostParagraph>
        이 문서들은 AI가 프로젝트를 전혀 모르는 상태에서 코드를 보고 임의로 해석하는 문제를
        줄여줬다. 개발자가 AI에게 작업을 요청하면 AI는 관련 지침과 콘셉트를 먼저 읽고, 그 내용을
        근거로 코드를 이해할 수 있었다.
      </PostParagraph>
      <PostHeading3>하지만 디자이너는 같은 도움을 받을 수 없었다</PostHeading3>
      <PostParagraph>
        새로 합류한 디자이너에게도 프로젝트의 배경과 히스토리는 필요했다. 화면을 설계하려면 현재
        기능뿐 아니라 왜 이런 흐름이 만들어졌는지, 이전에는 어떤 문제가 있었는지 알아야 했다.
      </PostParagraph>
      <PostParagraph>
        하지만 코드 저장소를 직접 탐색하지 않는 사람에게 저장소 내부 문서를 찾아보라고 하는 방식은
        현실적이지 않았다. 문서가 존재하더라도 접근 방식이 업무 흐름과 맞지 않으면 활용할 수 없는
        정보가 된다.
      </PostParagraph>
      <PostParagraph>
        결국 궁금한 것이 생길 때마다 기존 구성원에게 물어보거나, 여러 기획서와 과거 기록을 직접
        찾아야 했다. 프로젝트 지식은 쌓이고 있었지만 그것을 활용하는 경로는 개발팀 안에 머물러
        있었다.
      </PostParagraph>
      <PostHeading3>디자이너가 Claude를 사용하는 모습을 보고 떠오른 생각</PostHeading3>
      <PostParagraph>
        그러던 중 디자이너가 업무에 Claude를 활용하는 모습을 봤다. 그때 개발자의 AI가 저장소 문서를
        읽는 것처럼, 디자이너의 AI도 같은 지식을 읽게 만들면 되지 않을까 하는 생각이 들었다.
      </PostParagraph>
      <PostBlockquote>
        <PostParagraph>
          코드 저장소에 들어오지 않아도, 평소 사용하는 AI에게 질문하는 것만으로 프로젝트의 맥락을
          확인할 수 없을까?
        </PostParagraph>
      </PostBlockquote>
      <PostParagraph>
        마침 로컬 LLM과 Markdown 문서를 연결해 개인 Wiki처럼 사용하는 사례에서 아이디어를 얻었다.
        흩어진 기획서와 히스토리성 문서를 Markdown으로 모으고, 그 문서를 AI가 검색하고 읽을 수
        있도록 MCP를 제공하는 방식이었다.
      </PostParagraph>
      <PostParagraph>
        목표는 새로운 AI 서비스를 만드는 것이 아니었다. 이미 작성된 지식을 정리하고, 디자이너가
        사용하는 AI가 그 지식에 접근할 수 있는 작은 통로를 만드는 것이었다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostHeading2>2. 선택지 분석: RAG부터 만들 필요가 있을까</PostHeading2>
      <PostHeading3>처음에는 벡터 검색 중심의 RAG를 생각했다</PostHeading3>
      <PostParagraph>
        AI가 여러 문서를 검색해 답변한다고 하면 가장 먼저 RAG를 떠올리게 된다. 문서를 일정한 크기로
        나누고, 임베딩을 생성하고, 벡터 데이터베이스에서 질문과 의미가 비슷한 내용을 찾는 구조다.
      </PostParagraph>
      <PostParagraph>
        표현이나 띄어쓰기가 달라도 의미적으로 가까운 문서를 찾을 수 있다는 점은 매력적이었다. 하지만
        첫 버전부터 이 구조를 선택하려면 함께 결정해야 할 것이 많았다.
      </PostParagraph>
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>문서를 어떤 단위로 나눌 것인지</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>어떤 임베딩 모델을 사용할 것인지</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>문서가 수정됐을 때 인덱스를 어떻게 동기화할 것인지</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>검색 결과의 품질을 어떻게 평가할 것인지</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>모델과 데이터베이스의 운영 비용을 어떻게 관리할 것인지</PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostParagraph>
        무엇보다 아직 사용성이 검증되지 않았다. 디자이너가 실제로 자주 사용할지, 어떤 질문을 할지,
        지금 모은 문서가 업무에 얼마나 도움이 될지 알 수 없는 상태였다.
      </PostParagraph>
      <PostParagraph>
        사용되지 않을 수도 있는 기능에 처음부터 많은 자원을 투자하고 싶지는 않았다. 검색 기술을
        고도화하기 전에 이 Wiki가 정말 필요한지부터 확인하는 편이 맞다고 판단했다.
      </PostParagraph>
      <PostHeading3>Markdown과 단순 검색으로 시작했다</PostHeading3>
      <PostParagraph>
        그래서 첫 버전에서는 벡터 데이터베이스와 임베딩 파이프라인을 제외했다. 대신 Markdown을
        지식의 원본으로 두고, 제목과 태그, 소제목, 본문을 기준으로 검색하는 작은 구조를 선택했다.
      </PostParagraph>
      <PostCodeBlock
        code={
          "Markdown = 지식의 원본\n검색 카탈로그 = 다시 만들 수 있는 파생 데이터\nMCP = 원본을 안전하게 노출하는 인터페이스"
        }
        language={"text"}
      />
      <PostParagraph>
        Markdown은 특정 서비스나 데이터베이스에 종속되지 않고, 사람이 직접 읽고 수정할 수 있다.
        Git으로 변경 이력을 관리할 수 있고 MCP 서버가 없어져도 지식 자체는 그대로 남는다.
      </PostParagraph>
      <PostParagraph>검색 우선순위도 복잡하게 만들지 않았다.</PostParagraph>
      <PostCodeBlock
        code={"제목 일치: 400점\n태그 일치: 300점\n소제목 일치: 200점\n본문 일치: 100점"}
        language={"text"}
      />
      <PostParagraph>
        이 방식은 동의어를 이해하지 못하고 오타를 보정하지 못한다. 의미가 비슷한 문서를 찾는 데도
        한계가 있다. 그래도 문서 규모가 작고 프로젝트에서 사용하는 용어가 비교적 명확한 초기
        단계에는 충분하다고 판단했다.
      </PostParagraph>
      <PostParagraph>
        벡터 검색이 필요 없다는 결론은 아니다. 단순 검색으로 해결되지 않는 사례가 실제 사용 과정에서
        확인된 뒤에 도입해도 늦지 않다고 봤다.
      </PostParagraph>
      <PostHeading3>MCP는 답변하는 AI가 아니라 연결 규격이었다</PostHeading3>
      <PostParagraph>
        MCP 서버가 질문에 직접 답하는 AI 서버라고 생각하면 구현 범위가 커진다. 하지만 MCP 자체는
        LLM이나 챗봇이 아니다. AI 애플리케이션이 외부 데이터와 기능을 발견하고 사용할 수 있게 해주는
        연결 규격이다.
      </PostParagraph>
      <PostCodeBlock
        code={
          "디자이너\n  ↓ 질문\nClaude와 같은 MCP Host\n  ↓ 관련 지식 검색\nWiki MCP 서버\n  ↓\nMarkdown 문서\n  ↑\n검색 결과와 원문\n  ↑\nAI가 문서를 바탕으로 답변"
        }
        language={"text"}
      />
      <PostParagraph>
        실제 답변은 Claude나 Codex 같은 AI가 만들고, Wiki MCP는 답변에 필요한 문서를 찾고 읽을 수
        있도록 돕는다. 이 경계를 분명히 하니 서버가 해야 할 일도 검색과 열람으로 좁혀졌다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostHeading2>3. 해결 과정: 기능보다 경계를 먼저 정했다</PostHeading2>
      <PostParagraph>먼저 첫 버전이 해야 할 일과 하지 않을 일을 구분했다.</PostParagraph>
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>기획서와 히스토리 문서를 Markdown으로 정리한다.</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>Markdown을 지식의 유일한 원본으로 사용한다.</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            MCP 서버는 문서 목록, 검색, 관련 문서 조회와 원문 열람만 제공한다.
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            문서를 생성하거나 수정하거나 삭제하는 기능은 제공하지 않는다.
          </PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostHeading3>문서를 찾을 수 있도록 메타데이터를 붙였다</PostHeading3>
      <PostParagraph>
        Markdown 본문만으로도 문서를 읽을 수 있지만, 프로젝트와 문서 유형을 구분하고 검색하려면
        구조화된 메타데이터가 필요했다. 그래서 YAML Frontmatter를 사용했다.
      </PostParagraph>
      <PostCodeBlock
        code={
          "---\nid: nexus-patient-analysis-flow\ntitle: 환자 분석 업무 흐름\nproject: nexus\ncategory: concept\ntags:\n  - 환자분석\n  - 업무흐름\nupdated_at: 2026-07-31\n---"
        }
        language={"yaml"}
      />
      <PostParagraph>
        파일 경로가 아니라 id로 문서를 식별하도록 했다. 폴더나 파일명은 바뀔 수 있지만 문서 식별자는
        유지할 수 있기 때문이다. AI가 검색 결과에서 찾은 문서를 다시 정확하게 열 수 있도록 Resource
        URI도 이 ID를 기준으로 만들었다.
      </PostParagraph>
      <PostCodeBlock code={"knowledge://documents/nexus-patient-analysis-flow"} language={"text"} />
      <PostHeading3>검색과 원문 읽기를 분리했다</PostHeading3>
      <PostParagraph>
        검색 결과마다 Markdown 전체를 반환하면 AI의 컨텍스트를 불필요하게 사용한다. 검색은 후보를
        좁히는 단계로 두고, 실제 원문은 선택된 문서만 별도로 읽게 했다.
      </PostParagraph>
      <PostCodeBlock
        code={
          "list_projects()\nlist_knowledge(project?, category?, tag?, limit?)\nsearch_knowledge(query, project?, category?, limit?)\nget_related_knowledge(document_id, limit?)"
        }
        language={"text"}
      />
      <PostParagraph>
        Tool은 어떤 문서를 볼지 찾는 역할을 맡는다. 검색 결과에는 문서 ID, 제목, 짧은 발췌문,
        수정일, Resource URI처럼 다음 탐색에 필요한 정보만 담는다.
      </PostParagraph>
      <PostCodeBlock
        code={
          "search_knowledge\n  → 관련 문서 발견\n  → knowledge://documents/{id}\n  → Markdown 원문 열람\n  → 문서를 근거로 답변"
        }
        language={"text"}
      />
      <PostParagraph>
        Resource는 선택한 문서의 실제 내용을 읽는 역할을 맡는다. Tool과 Resource를 나누면서 검색
        결과는 작게 유지하고, 필요한 원문만 AI에 전달할 수 있었다.
      </PostParagraph>
      <PostHeading3>읽기 전용으로 범위를 제한했다</PostHeading3>
      <PostParagraph>
        이 Wiki의 목적은 지식을 새로 작성하는 것이 아니라 이미 정리된 지식을 안전하게 참고하게
        만드는 것이었다. 그래서 생성, 수정, 삭제 기능은 제공하지 않았다.
      </PostParagraph>
      <PostCodeBlock
        code={
          "create_knowledge  → 제공하지 않음\nupdate_knowledge  → 제공하지 않음\ndelete_knowledge  → 제공하지 않음\nrun_shell         → 제공하지 않음\nread_any_file     → 제공하지 않음"
        }
        language={"text"}
      />
      <PostParagraph>
        쓰기 Tool을 없애는 것만으로 읽기 전용이 완성되는 것은 아니다. 허용된 지식 폴더 안의
        Markdown만 읽고, 경로 이탈과 외부 파일을 가리키는 심볼릭 링크를 차단하도록 경계를 두었다.
      </PostParagraph>
      <PostParagraph>
        여러 사람이 같은 지식을 사용할 수 있어야 했기 때문에 로컬 프로세스로만 실행하는 STDIO 대신
        중앙 서버에 연결하는 Streamable HTTP 방식을 선택했다. 정제된 Markdown과 MCP 서버를 한곳에
        두고, 사용자는 MCP 주소를 연결해 같은 지식에 접근하도록 했다.
      </PostParagraph>
      <PostCodeBlock
        code={"개발자 ─┐\n디자이너 ─┼─ HTTPS ─ Wiki MCP 서버 ─ Markdown\n기획자 ─┘"}
        language={"text"}
      />
      <PostParagraph>
        서버는 Markdown을 읽어 Frontmatter를 검증하고 문서 ID와 경로를 카탈로그로 만든다. 문서 갱신
        과정에서 오류가 생기더라도 마지막으로 검증된 정상 카탈로그를 유지해 문서 하나의 문제로 전체
        Wiki가 멈추지 않도록 했다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostHeading2>4. 최종 결과: 작게 만든 읽기 계층</PostHeading2>
      <PostParagraph>
        MCP 구현을 마친 뒤에는 기존 기획서와 히스토리성 자료를 Markdown으로 옮기고, AI가 찾기 쉬운
        형태로 데이터를 정제했다.
      </PostParagraph>
      <PostParagraph>
        단순히 확장자만 바꾼 것이 아니라 검색에 필요한 기준을 문서마다 맞췄다.
      </PostParagraph>
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>문서의 고유 ID와 제목을 정리했다.</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>어느 프로젝트에 속한 문서인지 구분했다.</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>개념, 정책, 업무 흐름처럼 문서 유형을 나눴다.</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>검색에 사용할 태그를 붙였다.</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>정보의 최신성을 판단할 수 있도록 수정일을 기록했다.</PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostParagraph>
        정제한 Markdown과 Wiki MCP를 서버에 올리면서 첫 번째 버전을 완성했다. 최종적으로 만든 것은
        거대한 AI Wiki가 아니라, Markdown으로 관리하는 지식을 AI가 검색하고 읽을 수 있게 해주는 작은
        읽기 계층이었다.
      </PostParagraph>
      <PostCodeBlock
        code={
          "기획서와 히스토리 문서\n  ↓ Markdown 정제\n지식 카탈로그\n  ↓ Tool로 검색\nResource로 원문 열람\n  ↓\nClaude와 Codex 같은 AI\n  ↓\n프로젝트 맥락을 포함한 답변"
        }
        language={"text"}
      />
      <PostHorizontalRule />
      <PostHeading2>5. 후기: 아직은 성공보다 실험에 가깝다</PostHeading2>
      <PostParagraph>
        서버에 올렸다고 해서 이 Wiki가 유용하다는 사실까지 증명된 것은 아니다. 현재는 사용성이
        좋다고 말할 수 있는 단계가 아니라, 아이디어를 실제 업무 환경에 연결해본 실험에 가깝다.
      </PostParagraph>
      <PostParagraph>
        문서를 검색하고 읽는 기능은 동작하지만, 구성원들이 어떤 질문을 할지와 그 답변이 실제 업무에
        얼마나 도움이 될지는 사용 과정에서 확인해야 한다.
      </PostParagraph>
      <PostParagraph>앞으로는 다음 내용을 지속적으로 살펴볼 필요가 있다.</PostParagraph>
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>디자이너가 실제로 Wiki MCP를 사용하는가</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>어떤 프로젝트와 문서가 자주 검색되는가</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>검색 결과에서 원하는 문서를 찾지 못하는 경우는 무엇인가</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>문서가 수정된 뒤에도 최신 상태가 잘 유지되는가</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>AI의 답변에서 근거 문서를 확인할 수 있는가</PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostParagraph>
        검색 결과에서 원하는 문서를 찾지 못한 사례를 모아 원인을 분류할 계획이다. 사용자와 문서가
        늘어나면 인증과 권한을 더 세분화하고, 사용 빈도가 낮다면 문서의 품질과 접근 방식을 먼저
        점검한다.
      </PostParagraph>
      <PostBlockquote>
        <PostParagraph>
          지식을 가지고 있는 것과, 그 지식을 사용할 수 있는 것은 다르다.
        </PostParagraph>
      </PostBlockquote>
      <PostParagraph>
        개발팀은 이미 프로젝트 지식을 문서로 남기고 있었다. 문제는 그 문서가 코드 저장소 안에
        있었고, 저장소 밖에서 일하는 동료에게는 자연스러운 접근 경로가 없었다는 점이었다.
      </PostParagraph>
      <PostParagraph>
        이제부터는 실제 질문과 검색 실패 사례를 기록해 어디에서 도움이 되고 어디에서 막히는지 확인할
        생각이다.
      </PostParagraph>
    </>
  );
};

export default JournalWikiMcpForDesignersPost;
