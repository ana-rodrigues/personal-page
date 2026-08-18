'use client';

import { useState } from 'react';
import styles from './Hero.module.css';
import Typewriter from '../Typewriter/Typewriter';
import Text from '../Text/Text';
import workData from './work.json';

export default function Hero() {
  const [active, setActive] = useState<number | null>(null);

  return <section id="hero" className={styles.root}>
    
    <div className={styles.preHero}>
      <Text typography='label' color="highlight">{`A. Rodrigues`}</Text>
      <Text typography='label' color="secondary">
        <Typewriter words={['Digital Product Designer and beyond', 'Based in Lisbon, Portugal']}/>
      </Text>
    </div>

    <Text typography='body' color="primary">
      {`My first contact with digital experiences was an old Olivetti computer, where I quickly learned to run my favourite games as a kid, through obsessive trial and error (mostly error, to be fair). It was the entry point to becoming passionately interested about technology, culture and design.`}
    </Text>
    <Text typography='body' color="primary">
      {`I am a builder at heart, combining usability expertise, visual culture, strategic and technical skills. With hands-on familiarity with the complexities of B2B and API-first products, I thrive in collaborative, high-impact roles where end-to-end, well-crafted product experiences drive real business value.`}
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
  </section>;
}