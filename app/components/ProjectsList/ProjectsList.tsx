'use client';

import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import styles from './ProjectsList.module.css';
import Text from '../Text/Text';
import Typewriter from '../Typewriter/Typewriter';
import Modal from '../Modal/Modal';

export type ProjectListCard = {
  slug: string;
  title: string;
  company?: string;
  summary: string;
  image?: string;
  content: ReactNode;
};

type ProjectsListProps = {
  posts: ProjectListCard[];
};

const imageTransition = { type: 'spring' as const, duration: 0.35, bounce: 0.25 };

export default function ProjectsList({ posts }: ProjectsListProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const layoutIdPrefix = useId();
  const selectedPost = posts.find((post) => post.slug === selectedSlug) ?? null;
  const shouldReduceMotion = useReducedMotion();

  return <LayoutGroup>
    <div id="projects" className={styles.root}>

    <Text as="h2" typography="label" color="highlight" className={styles.heading}>
      Selected projects
    </Text>

    <ul className={styles.list}>
      {posts.map((post) => (
        <li key={post.slug} className={styles.item}>
          <button
            type="button"
            className={styles.itemButton}
            onClick={() => setSelectedSlug(post.slug)}
          >
            <span className={styles.itemImageWrap}>
              {post.image && (
                <motion.div
                  layoutId={shouldReduceMotion ? undefined : `${layoutIdPrefix}-${post.slug}-image`}
                  transition={imageTransition}
                  className={styles.itemImageFrame}
                >
                  <img src={post.image} alt="" decoding="async" className={styles.itemImage} />
                </motion.div>
              )}
            </span>
            <span className={styles.itemContent}>
              <span className={styles.itemLabel}>
                <Text as="span" typography="label" color="highlight">
                  []
                </Text>
                <Text as="span" typography="body" color="highlight">
                  {post.company}
                </Text>
              </span>
              <Text as="span" typography="body" color="primary" className={styles.itemSummary}>
                {post.summary}
              </Text>
            </span>
          </button>
        </li>
      ))}
    </ul>

    <Modal open={!!selectedPost} onClose={() => setSelectedSlug(null)}>
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            key={selectedPost.slug}
            className={styles.caseStudy}
            exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.3 } }}
          >
            <div className={styles.caseStudyCoverWrap}>
              {selectedPost.image && (
                <motion.div
                  layoutId={shouldReduceMotion ? undefined : `${layoutIdPrefix}-${selectedPost.slug}-image`}
                  transition={imageTransition}
                  className={styles.caseStudyCoverFrame}
                >
                  <img
                    src={selectedPost.image}
                    alt=""
                    decoding="sync"
                    fetchPriority="high"
                    className={styles.caseStudyCoverImg}
                  />
                </motion.div>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.2, ease: 'easeOut' } }}
              exit={{ opacity: 0 }}
              className={styles.caseStudyBody}
            >
              <Text as="h1" typography="label" color="highlight" className={styles.caseStudyTitle}>
                {selectedPost.title}
              </Text>

              <div className={styles.caseStudySummary}>
                <Text as="p" typography="body" color="primary">
                  {selectedPost.summary}
                </Text>
              </div>

              <article className={styles.mdxContent}>
                {selectedPost.content}
              </article>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
    </div>
  </LayoutGroup>;
}
