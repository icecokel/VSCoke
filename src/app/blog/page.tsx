import Link from 'next/link'
import { getAllPosts } from '../../lib/posts'

export default async function BlogPage() {
  const posts = await getAllPosts()

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      <ul>
        {posts.map(post => (
          <li key={post.slug} className="mb-6">
            <Link href={`/blog/${post.slug}`}>
              <h2 className="text-2xl font-semibold mb-1 hover:text-blue-600">{post.frontmatter.title}</h2>
            </Link>
            <p className="text-gray-500">{post.frontmatter.date}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}