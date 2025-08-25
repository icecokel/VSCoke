import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const POSTS_PATH = path.join(process.cwd(), 'posts')

// posts 디렉토리 내의 모든 mdx 파일 경로를 재귀적으로 찾는 함수
const getAllMdxFilePaths = (dirPath: string, arrayOfFiles: string[] = []) => {
  const files = fs.readdirSync(dirPath)

  files.forEach(file => {
    const fullPath = path.join(dirPath, file)
    if (fs.statSync(fullPath).isDirectory()) {
      getAllMdxFilePaths(fullPath, arrayOfFiles)
    } else {
      if (path.extname(fullPath) === '.mdx') {
        // posts 디렉토리 기준의 상대 경로를 저장.
        arrayOfFiles.push(path.relative(POSTS_PATH, fullPath))
      }
    }
  })
  return arrayOfFiles
}

// 모든 포스트의 slug를 배열 형태로 반환 (generateStaticParams용)
export function getAllPostSlugs() {
  const mdxFiles = getAllMdxFilePaths(POSTS_PATH)
  // ['category/sub/file.mdx'] -> [['category', 'sub', 'file']]
  return mdxFiles.map(file => file.replace(/\.mdx?$/, '').split('/'))
}

// 모든 포스트의 frontmatter와 slug를 반환 (블로그 목록 페이지용)
export function getAllPosts() {
  const mdxFiles = getAllMdxFilePaths(POSTS_PATH)

  const posts = mdxFiles.map(file => {
    const filePath = path.join(POSTS_PATH, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    const { data } = matter(content)
    const slug = file.replace(/\.mdx?$/, '')
    return { frontmatter: data, slug }
  })

  // 필터링 로직 추가
  const now = new Date()
  const visiblePosts = posts.filter(post => {
    // `published`가 명시적으로 false인 경우 비공개 처리
    if (post.frontmatter.published === false) {
      return false
    }
    // `publishedDate`가 있고, 미래 시점인 경우 비공개 처리
    if (post.frontmatter.date) {
        const publishedDate = new Date(post.frontmatter.date)
        if (publishedDate > now) {
            return false
        }
    }
    // 그 외 모든 경우 공개 처리
    return true
  })

  // 최신 날짜순으로 정렬
  return visiblePosts.sort((a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime())
}
