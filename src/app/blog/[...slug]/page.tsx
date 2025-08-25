import { notFound } from 'next/navigation'
import { getAllPostSlugs } from '../../../lib/posts'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import type { Metadata } from 'next'

// MDX 컴포넌트 타입 정의
type PostContent = {
  default: React.ComponentType
}

// Props 타입 정의
type PostPageProps = {
  params: {
    slug: string[]
  }
}

// 빌드 시점에 정적 페이지를 생성하기 위해 모든 post의 slug를 반환
export function generateStaticParams() {
  const slugs = getAllPostSlugs()
  return slugs.map(slug => ({ slug }))
}

// 메타데이터(frontmatter)만 가져오는 간단한 함수
async function getPostMetadata(slug: string[]) {
  const slugPath = slug.join('/')
  const filePath = path.join(process.cwd(), 'posts', `${slugPath}.mdx`)
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const { data: frontmatter } = matter(fileContent)
    return frontmatter
  } catch (e) {
    return null
  }
}

// 페이지의 메타데이터(eg. <title>)를 생성
export async function generateMetadata({ params: { slug } }: PostPageProps): Promise<Metadata> {
  const frontmatter = await getPostMetadata(slug)

  if (!frontmatter) {
    return {}
  }

  return {
    title: frontmatter.title,
  }
}

// 페이지 컴포넌트
export default async function PostPage({ params: { slug } }: PostPageProps) {
  const frontmatter = await getPostMetadata(slug)
  
  if (!frontmatter) {
    notFound()
  }

  // Content는 별도로 import
  const slugPath = slug.join('/')
  const postModule: PostContent = await import(`@/posts/${slugPath}.mdx`)
  const Content = postModule.default

  // 상세 페이지 노출 조건 확인
  const now = new Date()
  const publishedDate = new Date(frontmatter.date)
  if (frontmatter.published !== true || publishedDate > now) {
    notFound()
  }

  return (
    <article className="max-w-3xl mx-auto p-8">
      <header className="mb-8 pb-4 border-b">
        <h1 className="text-4xl font-bold">{frontmatter.title}</h1>
        <p className="text-gray-500 mt-2">{frontmatter.date}</p>
      </header>
      <div className="prose lg:prose-xl dark:prose-invert">
        <Content />
      </div>
    </article>
  )
}