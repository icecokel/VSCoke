import { notFound } from 'next/navigation'
import { getAllPostSlugs } from '../../../lib/posts'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

// MDX 컴포넌트 타입 정의
type PostContent = {
  default: React.ComponentType
}

// 빌드 시점에 정적 페이지를 생성하기 위해 모든 post의 slug를 반환
export function generateStaticParams() {
  const slugs = getAllPostSlugs()
  return slugs.map(slug => ({ slug }))
}

// MDX 파일과 frontmatter를 가져오는 함수
async function getPost(slug: string[]) {
  const slugPath = slug.join('/')
  const filePath = path.join(process.cwd(), 'posts', `${slugPath}.mdx`)

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const { data: frontmatter } = matter(fileContent)

    const postModule: PostContent = await import(`@/posts/${slugPath}.mdx`)
    const Content = postModule.default

    return { frontmatter, Content }
  } catch (e) {
    console.error(e)
    return null
  }
}

export default async function PostPage({ params: { slug } }: { params: { slug: string[] } }) {
  const post = await getPost(slug)

  if (!post) {
    notFound()
  }

  const { frontmatter, Content } = post

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
      <div className="prose lg:prose-xl">
        <Content />
      </div>
    </article>
  )
}