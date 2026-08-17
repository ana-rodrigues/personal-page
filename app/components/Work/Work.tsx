'use client';

import { useState } from 'react';
import styles from './Work.module.css';
import Text from '../Text/Text';
import workData from './work.json';
import Typewriter from '../Typewriter/Typewriter';

export default function Work() {
  const [active, setActive] = useState<number | null>(null);

  return <div id="work" className={styles.root}>

    <Text as="h2" typography="label" color="highlight" className={styles.heading}>
      {workData.title}
    </Text>

    <ul className={styles.workList}>
      {workData.roles.map((project, index) => (

        <li className={`${styles.workItem}${active === index ? ` ${styles.workItemOpen}` : ''}`} key={index}>
          
          <button type="button" className={styles.workButton} onClick={() => setActive(active === index ? null : index)} aria-expanded={active === index}>
            <div className={styles.workItemRow}>
              <div className={styles.workItemLeft}>
                <Text as="p" typography="body" color="primary">{project.company}</Text>
                <Text as="p" typography="body" color="secondary">{project.role}</Text>
              </div>
              <div className={styles.workItemRight}>
                <Text as="p" typography="body" color="primary">{project.period}</Text>
              </div>
            </div>
          </button>

          {'description' in project && (
            <div className={`${styles.description}${active === index ? ` ${styles.descriptionOpen}` : ''}`}>
              <div className={styles.descriptionBody}>
              <Text as="p" typography="body" color="secondary" className={styles.descriptionText}>
                    {project.description.split('\n').map((line, i) => (
                      <span key={i}>{line}</span>
                    ))}
              </Text>
              </div>
            </div>
          )}
        </li>

      ))}
    </ul>
  </div>;
}
