---
description: 실제 Knip 검사 범위를 확인한 뒤 승인받은 미사용 항목만 정리한다
---

# Unused Code Cleanup

저장소 루트의 `pnpm knip`은 웹 패키지만 검사한다. 현재 포함 범위는
`files,dependencies,unlisted,unresolved`이고 미사용 export와 API 패키지는 검사하지 않는다.
검사 통과를 전체 monorepo의 미사용 코드가 없다는 뜻으로 해석하지 않는다.

출력된 파일·의존성·미등록/해결 불가 import를 구분하고 실제 참조·동적 사용을 확인한다.
export 또는 API 정리가 필요하면 별도 범위와 검증 방법을 먼저 정한다. 결과를 제시한 뒤
삭제 범위를 사용자에게 확인받고, 승인된 대상만 정리한다. 파일을 주석으로 숨겨 검사만
통과시키지 않는다. 삭제 후 영향 범위 lint·타입·테스트·빌드를 실행한다.
