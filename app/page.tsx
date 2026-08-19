import Hero from './components/Hero/Hero';
import ProjectsList from './components/ProjectsList/ProjectsList';
import Reveal from './components/Reveal/Reveal';
import { CustomMDX } from './components/mdx';
import { getBlogPosts } from './blog/utils';

export default function Page() {
  const sortedPosts = getBlogPosts()
    .sort((a, b) => new Date(b.metadata.publishedAt).getTime() - new Date(a.metadata.publishedAt).getTime());

  const listPosts = sortedPosts
    .filter((post) => post.metadata.category === 'case studies')
    .filter((post) => post.metadata.private !== true)
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
      <Reveal as="div"><Hero/></Reveal>
      <Reveal as="div" delay={0.1}><ProjectsList posts={listPosts}/></Reveal>
    </>
  )
}

