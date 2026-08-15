import type { ReactNode } from 'react';
import styles from './Work.module.css';
import Text from '../Text/Text';
import workData from './work.json';
import Typewriter from '../Typewriter/Typewriter';


type WorkProps = {
  children?: ReactNode;
};

export default function Work({ children }: WorkProps) {
  return <div id="work" className={styles.root}>

    <Text as="h2" typography="label" color="highlight" className={styles.heading}>
      <Typewriter words={[workData.title]} loop={false}/>
    </Text>

    <ul className={styles.workList}>
      {workData.roles.map((project, index) => (

        <li className={styles.workItem} key={index}>
          <div className={styles.workItemRow}>
            <div className={styles.workItemLeft}>
              <Text as="p" typography="body" color="primary">{project.company}</Text>
              <Text as="p" typography="body" color="secondary">{project.role}</Text>
            </div>
            <div className={styles.workItemRight}>
              <Text as="p" typography="body" color="primary">{project.period}</Text>
            </div>
          </div>

          {'projects' in project && project.projects && (
            <ul className={styles.projects}>
              {project.projects.map((item, i) => (
                <li key={i} className={styles.project}>
                  <Text as="p" typography="body" color="secondary">{item.client}</Text>
                </li>
              ))}
            </ul>
          )}
        </li>

      ))}
    </ul>

    {children}
  </div>;
}
