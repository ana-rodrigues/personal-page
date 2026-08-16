import Hero from './components/Hero/Hero';
import Work from './components/Work/Work';
import ProjectsList from './components/ProjectsList/ProjectsList';
import { CustomMDX } from './components/mdx';
import { getBlogPosts } from './blog/utils';

export default function Page() {
  const sortedPosts = getBlogPosts()
    .sort((a, b) => new Date(b.metadata.publishedAt).getTime() - new Date(a.metadata.publishedAt).getTime());

  const listPosts = sortedPosts
    .filter((post) => post.metadata.category === 'case studies')
    .map((post) => ({
      slug: post.slug,
      title: post.metadata.title,
      company: post.metadata.company,
      summary: post.metadata.summary,
      image: post.metadata.image,
      content: <CustomMDX source={post.content}/>,
    }));

  return (
    <>
      <h1 className="assistive">
        A. Rodrigues, Digital Product Designer based in Lisbon
      </h1>
      <Hero/>
      <Work/>
      <ProjectsList posts={listPosts}/>
    </>
  )
}

