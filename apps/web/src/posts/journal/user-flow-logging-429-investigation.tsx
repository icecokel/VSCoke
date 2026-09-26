import {
  PostBlockquote,
  PostHeading1,
  PostInlineCode,
  PostParagraph,
  PostStrong,
} from "@/components/blog/blog-post-elements";
import { MermaidDiagram } from "@/components/blog/mermaid-diagram";

const WorkerDeliveryFlow = () => (
  <figure className="my-8 rounded-xl border border-border bg-card p-5 sm:p-6">
    <figcaption className="mb-4 font-semibold text-foreground">
      429 뒤 Worker의 전송 제어
    </figcaption>
    <div className="flex items-center gap-3 text-center">
      <div className="min-w-0 flex-1 rounded-lg border border-border bg-muted/40 p-3">
        <div className="font-medium text-foreground">Worker 큐</div>
        <div className="mt-1 text-xs text-muted-foreground">50건 또는 1분에 전송 시작</div>
      </div>
      <div className="relative h-0.5 w-8 shrink-0 bg-border sm:w-16" aria-hidden="true">
        <span className="user-flow-request-dot absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary" />
      </div>
      <div className="min-w-0 flex-1 rounded-lg border border-border bg-muted/40 p-3">
        <div className="font-medium text-foreground">수집 API</div>
        <div className="mt-1 text-xs text-muted-foreground">Worker당 요청 1건</div>
      </div>
    </div>
    <ul className="mt-4 divide-y divide-border rounded-lg border border-border text-sm text-foreground/85">
      <li className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
        <span className="font-medium text-foreground">201 성공</span>
        <span>남은 이벤트가 있으면 10초 뒤 다음 요청</span>
      </li>
      <li className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
        <span className="font-medium text-foreground">네트워크 · 429 · 5xx</span>
        <span>1분 대기 후 같은 ID로 재시도</span>
      </li>
      <li className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
        <span className="font-medium text-foreground">400 · 413</span>
        <span>같은 배치 재시도 중단</span>
      </li>
    </ul>
    <p className="mt-3 text-xs text-muted-foreground">움직임은 전송 순서를 나타내는 개념도다.</p>
    <style>{`
      @keyframes user-flow-request {
        0%, 10% { left: 0; opacity: 0; }
        20% { opacity: 1; }
        70% { left: calc(100% - 0.5rem); opacity: 1; }
        80%, 100% { left: calc(100% - 0.5rem); opacity: 0; }
      }
      .user-flow-request-dot { animation: user-flow-request 3s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .user-flow-request-dot { animation: none; left: 50%; opacity: 1; }
      }
    `}</style>
  </figure>
);

const JournalUserFlowLogging429InvestigationPost = () => (
  <>
    <PostParagraph>
      회사에서는 여러 서비스에서 발생한 사용자 행동 이벤트를 내부에서 관리하고 싶어 했다. 처음에는
      각 서비스가 CDN에서 공통 SDK를 불러오고, 화면에서 만든 이벤트를 그 SDK를 거쳐 Worker로 넘기면
      된다고 생각했다. 나는 그 Worker를 만들며 서비스별 이벤트가 DB에 잘 저장되는지 테스트했다. 전송
      경로를 연결하는 데 집중했고, 요청 횟수는 따로 생각하지 못했다. 그러다 Network 탭에서 수집
      요청이 예상보다 많이 나가는 것을 봤고, 응답은 429였다.
    </PostParagraph>
    <PostBlockquote>
      <PostParagraph>보내기만 하면 된다고 생각했는데, 왜 요청이 거절될까?</PostParagraph>
    </PostBlockquote>
    <PostParagraph>
      429를 본 뒤에는 적당한 숫자를 찾으면 될 줄 알았다. 직접 사용자가 되어 수치를 바꿔 가며
      테스트했지만, 내 사용 방식이 모든 사용자를 대신할 수는 없었다. 결국 전송 횟수뿐 아니라 요청이
      겹치는 방식과 서버의 저장 방식까지 고쳤다. 그 과정에서 내가 무엇을 놓쳤고, 어디까지 해결했는지
      적어 본다.
    </PostParagraph>

    <PostHeading1>이벤트는 적은데 요청은 많았다</PostHeading1>
    <PostParagraph>
      처음 429를 보고 뜻부터 찾아봤다. HTTP 429(Too Many Requests)는 서버가 요청이 너무 많다고
      판단해 돌려주는 응답이다. Network 탭을 다시 보니 사용자 동작을 확인하는 사이 이벤트 수집
      POST가 계속 나가고 있었다.
    </PostParagraph>
    <PostParagraph>
      서비스 B의 한 실행에서 이벤트 수집 POST 15회가 전부 429로 끝났다. 요청 본문에 들어 있던
      이벤트는 합계 67개였지만 고유 ID는 11개였다. 그 11개를 DB에서 찾았을 때 저장된 행은 하나도
      없었다.
    </PostParagraph>
    <PostParagraph>
      이벤트가 만들어지지 않은 것은 아니었다. 같은 ID의 이벤트가 여러 요청에 반복해서 들어 있었고,
      수집 API는 그 요청을 거절했다. 화면에 <PostInlineCode>track()</PostInlineCode> 호출문이 있는지
      세는 것만으로는 설명할 수 없는 결과였다.
    </PostParagraph>
    <PostParagraph>
      당시 이벤트가 지나가는 경로는 다음과 같았다. 각 서비스의 화면이 이벤트를 만들고, 공통 SDK와
      브라우저 Worker가 이를 모아 이벤트 수집 API로 보낸다. API가 받아들인 이벤트가 DB에 저장된다.
    </PostParagraph>
    <MermaidDiagram
      chart={
        'flowchart LR\n  action["사용자 동작"] --> tracking["화면 계측"] --> sdk["공통 SDK"] --> worker["브라우저 Worker"] --> api["이벤트 수집 API"] --> db["DB"]'
      }
      description="사용자 동작이 화면 계측, 공통 SDK, 브라우저 Worker, 이벤트 수집 API를 거쳐 DB에 저장되는 흐름"
    />
    <PostParagraph>
      처음에는 DB에 이벤트가 거의 없는데 어떻게 요청 제한에 걸릴 수 있는지 납득하기 어려웠다. 하지만
      이벤트 개수와 HTTP 요청 횟수는 달랐다. 이벤트 50개를 한 번에 보내면 요청은 한 번이다. 반대로
      같은 이벤트 5개를 열 번 다시 보내면 새 이벤트가 없어도 요청은 열 번이다. 거절된 요청은 DB에
      행을 남기지 않았다.
    </PostParagraph>
    <PostParagraph>
      그래서 요청 본문의 이벤트 수, 고유 ID 수, POST 횟수, DB 행 수를 따로 확인했다. 처음부터 이
      숫자를 구분했더라면 “이벤트가 적다”는 인상에 덜 매달렸을 것이다.
    </PostParagraph>

    <PostHeading1>숫자를 바꿔 봐도 답은 아니었다</PostHeading1>
    <PostParagraph>
      처음 전송 기준은 10건 또는 2분이었다. 이를 5건 또는 1분으로 바꾼 뒤 반복 429를 확인했고, 다시
      30건, 50건으로 늘려 봤다. 얼마가 적당한지 알려 주는 정답은 없었다. 직접 서비스를 사용하면서
      이벤트가 얼마나 생기고 요청이 얼마나 나가는지 보며 수치를 찾아갔다. 돌이켜 보면 5건 또는
      1분으로 낮춘 선택은 요청을 더 자주 만들 수도 있었다.
    </PostParagraph>
    <PostParagraph>
      이 접근의 한계도 금방 보였다. 내가 버튼을 누르는 속도와 머무는 시간은 다른 사용자의 행동을
      대표하지 않는다. 숫자 하나를 골라 내 테스트에서 429가 안 보이게 만들어도, 다른 사용자의 요청이
      몰리면 같은 문제가 생길 수 있었다. 게다가 몇 개가 모이면 보낼지만 바꿔서는 실패한 요청이 언제
      다시 나가는지 제어할 수 없었다.
    </PostParagraph>
    <PostParagraph>
      다른 실행에서는 요청 19회가 모두 429였고 응답 헤더에{" "}
      <PostInlineCode>Retry-After: 57702</PostInlineCode>가 있었다. 약 16시간이다. 서버의 어떤 제한
      항목에 걸렸는지는 특정하지 못했지만, 내가 정한 1분 간격만 기다리면 언제나 다시 받아들여질
      거라고 생각해서는 안 됐다.
    </PostParagraph>
    <PostParagraph>
      기존 Worker 코드를 보니 큐에 이벤트가 있어도 전송이 순서대로 진행되는 것은 아니었다. 120개가
      쌓인 상태에서 flush가 실행되면 50개, 50개, 20개를 담은 요청이 겹쳐 나갈 수 있었다. 실패한
      배치를 큐 앞으로 돌려놔도 페이지 숨김이나 수동 flush가 대기시간을 앞지를 수 있었다.
    </PostParagraph>
    <PostParagraph>
      그래서 임계값 조정에서 멈추지 않고, 이벤트를 묶는 것뿐 아니라 요청이 겹치지 않게
      제어해야겠다고 생각했다. 직렬 전송을 적용한 뒤 새 SDK에서 이벤트 36개가 약 1분 뒤 한 요청으로
      나가는 것도 확인했다. 요청 횟수는 줄었지만 응답은 여전히 429였다. 전송 방식을 바꾼 것과 서버가
      요청을 받아들이는 것은 별개의 문제였다.
    </PostParagraph>

    <PostHeading1>Worker와 DB를 함께 고쳤다</PostHeading1>
    <PostParagraph>
      한 번에 보내는 이벤트 수를 늘린 테스트에서는 또 다른 장면을 봤다. 앞 요청의 응답이 오기 전에
      Worker가 응답을 받지 못했다고 판단해 같은 이벤트를 다시 보내고 있었다. 처음에는 Worker에서
      요청을 묶는 것만 생각했지만, 서버가 답을 돌려주는 시간도 전송 흐름의 일부였다.
    </PostParagraph>
    <PostParagraph>
      서버 코드를 따라가 보니 이벤트를 DB에 하나씩 INSERT하고 있었다. 배치가 커질수록 응답을 늦출 수
      있는 구조라고 판단했다. API가 한 번에 받을 수 있는 이벤트 상한을 100개에서 400개로 늘리면서
      저장도 bulk INSERT와 결과 일괄 조회로 바꿨다. 기존 구조에서는 이벤트 400개에 SQL 호출이 400회,
      중복 조회까지 포함하면 최대 800회 필요할 수 있었지만, 바꾼 뒤에는 구현상 2회로 처리했다. 실제
      응답시간을 전후로 측정한 것은 아니다.
    </PostParagraph>
    <PostParagraph>
      전송 쪽에서도 Worker 하나에서 진행 중인 요청을 최대 하나로 제한했다. 429·네트워크 오류·5xx
      뒤에는 1분을 기다리게 하고, 페이지 숨김이나 수동 flush도 대기를 건너뛰지 못하게 했다. 재시도할
      때는 이벤트 ID를 유지했다.
    </PostParagraph>
    <PostParagraph>
      50건은 <PostStrong>전송을 시작하는 기준</PostStrong>, 400건은{" "}
      <PostStrong>한 요청에 담는 최대치</PostStrong>로 나눴다. 큐에 450건이 쌓였다면 최대 400건을
      먼저 보내고, 성공 응답을 받은 뒤 10초를 기다려 나머지를 보낸다. 내가 찾던 것은 모든 사용자에게
      맞는 숫자 하나가 아니라 요청이 몰리더라도 지킬 전송 순서였다.
    </PostParagraph>
    <WorkerDeliveryFlow />

    <PostParagraph>
      이 과정에서 429와 다른 실패도 만났다. 이벤트 22개를 담은 요청이 400으로 거절됐는데, 그중
      12개의 <PostInlineCode>element_type</PostInlineCode>이 API에서 허용하지 않는{" "}
      <PostInlineCode>element</PostInlineCode>였다. 비허용 값이 섞여 배치 전체가 거절된 것이다.
    </PostParagraph>
    <PostParagraph>
      처음에는 허용되지 않는 DOM 타입을 제외하려 했다. 그런데 <PostInlineCode>div</PostInlineCode>로
      만든 카드 클릭이나 표의 행 선택까지 사라질 수 있었다. 필요한 사용자 동작은 허용된 타입으로
      매핑하고, 전송 단계에 남은 비허용 값만 막았다. 전송 횟수를 고친 뒤에도 실제 저장까지 확인해야
      한다는 생각이 더 분명해졌다.
    </PostParagraph>

    <PostHeading1>429가 멈춘 자리에서 다시 확인한 것</PostHeading1>
    <PostParagraph>
      서비스 A의 후속 실행에서는 이벤트 198개가 50개, 57개, 51개, 40개로 나뉘어 전송됐다. 네 요청
      모두 HTTP 201을 받았고 그 실행에서 429는 관찰되지 않았다. 마지막 40개는 첫 이벤트 발생 약 60초
      뒤에 나가 시간 기준 전송도 확인했다.
    </PostParagraph>
    <PostParagraph>
      전송 성공만 보고 끝내지는 않았다. 별도 실행에서 서비스 A 15개, B 29개, C 28개, 합계 72개의
      고유 ID를 DB와 직접 대조했고 모두 존재했다. 이 72개와 위의 198개는 서로 다른 실행이다. 서비스
      C의 앞선 실행에서는 28개가 결국 저장되기까지 429가 11회 발생하기도 했다. 그래서 성공 응답과
      실제 적재, 중간 실패를 각각 확인했다.
    </PostParagraph>
    <MermaidDiagram
      chart={
        'flowchart TB\n  evidence["서로 다른 확인 범위"] --> sent["후속 실행: 198개 전송"]\n  evidence --> matched["별도 실행: 72개 ID 대조"]\n  evidence --> daily["같은 날 이벤트: 650개 집계"]\n  sent --> response["HTTP 201 네 번 · 429 미관찰"]\n  matched --> stored["DB 72/72 존재 · 한 서비스에서 429도 관찰"]\n  daily --> aggregate["개별 ID 대조 결과는 아님"]'
      }
      description="후속 실행의 198개 전송과 별도 실행의 72개 DB 대조, 같은 날 이벤트 650개 집계는 서로 다른 확인 범위임"
    />
    <PostParagraph>
      같은 날 운영 DB에서 조회한 이벤트 650개는 일자 집계이며, 위의 두 실행과 합산할 숫자는 아니다.
      198개 모두를 DB의 ID와 대조한 것도 아니다. 다만 후속 실행에서 429 없이 요청이 처리됐고, 별도
      ID 대조에서도 이벤트가 저장된 것을 확인했다. 처음 막혔던 전송·저장 경로는 이 범위에서 정상
      동작했다.
    </PostParagraph>
    <PostParagraph>
      처음 429를 만든 운영 제한 항목은 끝내 특정하지 못했다. 여러 탭의 Worker를 하나의 큐로 묶거나,
      서버의 긴 <PostInlineCode>Retry-After</PostInlineCode>를 최종 SDK가 실제로 따르는지도 확인하지
      않았다.
    </PostParagraph>
  </>
);

export default JournalUserFlowLogging429InvestigationPost;
