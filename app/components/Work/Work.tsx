'use client';

import { useState } from 'react';
import styles from './Work.module.css';
import Text from '../Text/Text';
import workData from './work.json';

type GalleryItem = { image: string; caption: string };
type Role = { company: string; role: string; period: string; description: string; gallery?: GalleryItem[] };

const roles = workData.roles as Role[];

export default function Work() {
  const [active, setActive] = useState<number | null>(null);

  return <div id="work" className={styles.root}>
    <ul className={styles.workList}>
      {roles.map((project, index) => {
        const isOpen = active === index;
        const gallery = project.gallery ?? [];

        return (
          <li
            className={`${styles.workItem}${isOpen ? ` ${styles.workItemOpen}` : ''}`}
            key={index}
            onClick={() => {
              if (active === index) setActive(null);
            }}
          >

            <button
              type="button"
              className={styles.workButton}
              onClick={() => setActive(active === index ? null : index)}
              aria-expanded={isOpen}
            >
              <div className={styles.workItemRow}>
                <div className={styles.workItemLeft}>
                  <Text as="p" typography="body" color="secondary">{project.company}</Text>
                  <Text as="p" typography="body" color="primary">{project.role}</Text>
                </div>
                <div className={styles.workItemRight}>
                  <Text as="p" typography="body" color="secondary">{project.period}</Text>
                </div>
              </div>
            </button>

            <div className={`${styles.description}${isOpen ? ` ${styles.descriptionOpen}` : ''}`}>
              <div className={styles.descriptionBody}>
                <Text as="p" typography="body" color="secondary" className={styles.descriptionText}>
                  {project.description.split('\n').map((line, i) => (
                    <span key={i}>{line}</span>
                  ))}
                </Text>

                {gallery.length > 0 && (
                  <div className={styles.gallery}>
                    {gallery.map((item, itemIndex) => (
                      <figure key={itemIndex} className={styles.galleryFigure}>
                        <img src={item.image} alt="" className={styles.galleryImage} />
                        {item.caption && (
                          <figcaption className="mdx-caption">{item.caption}</figcaption>
                        )}
                      </figure>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  </div>;
}
