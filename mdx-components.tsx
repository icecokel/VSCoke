import type { MDXComponents } from 'mdx/types'
 
// 이 파일을 통해 MDX에서 사용되는 기본 HTML 태그를 커스텀 컴포넌트로 대체할 수 있음.
// 예를 들어, 모든 <h1> 태그를 특정 스타일이 적용된 컴포넌트로 바꿀 수 있습니다.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
  }
}
