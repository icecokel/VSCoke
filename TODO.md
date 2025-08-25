# TODO: Next.js `params` 정적 분석 오류 해결

## 문제점 (Issue)

블로그 상세 페이지(`src/app/blog/[...slug]/page.tsx`)에서 아래와 같은 서버 측 오류가 지속적으로 발생함.

```
Error: Route "/blog/[...slug]" used `params.slug`. `params` should be awaited before using its properties. Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis
```

이 오류는 `PostPage`와 `generateMetadata` 함수 양쪽에서, `params` 객체로부터 `slug`를 구조 분해하는 부분에서 발생함.
실제 페이지 렌더링은 정상적으로 동작하지만, 개발 서버에서 계속해서 오류 메시지가 출력되어 개발 경험을 저해함.

## 현재 상태 (Current Status)

- **원인 추정:** 현재 사용 중인 Next.js 버전의 정적 분석기가 App Router의 동적 세그먼트(`[...slug]`)와 데이터 로딩 패턴의 특정 조합을 처리하는 과정에서 발생하는 버그 또는 과도하게 엄격한 경고로 추정됨.

- **시도해본 해결 방법 (Attempts to Fix):**
  1. `params` 객체를 직접 구조 분해 (`{ params: { slug } }`).
  2. `.next` 폴더 삭제를 통한 캐시 클리어 및 서버 재시작.
  3. `generateStaticParams` 함수의 불필요한 `async` 키워드 제거.
  4. `generateMetadata`를 도입하고 React `cache`로 데이터 요청을 최적화하는 리팩토링 (Plan C).
  5. 데이터 요청 로직을 `generateMetadata`와 `PostPage`에서 완전히 분리 (Plan D).

위의 모든 방법으로도 오류가 해결되지 않음.

## 향후 계획 (Next Steps)

1.  **Next.js 버전 업데이트:** 다음 Next.js 마이너 또는 패치 버전이 릴리스되면 업데이트 후 문제가 해결되는지 확인. (가장 가능성 높은 해결책)
2.  **GitHub 이슈 모니터링:** Next.js 공식 GitHub 저장소에서 관련 이슈가 새로 등록되거나 기존 이슈에 해결책이 제시되는지 지속적으로 확인.
3.  **패턴 우회:** 현재 구조를 유지하되, 오류가 해결되기 전까지는 개발 중 발생하는 해당 오류를 일시적으로 무시하고 다른 기능 개발을 진행.
