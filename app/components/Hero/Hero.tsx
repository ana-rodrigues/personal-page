'use client';

import styles from './Hero.module.css';
import Text from '../Text/Text';
import ScrambleText from '../ScrambleText/ScrambleText';
import Work from '../Work/Work';

export default function Hero() {
  return <section id="hero" className={styles.root}>

    <div className={styles.preHero}>
      <Text typography='label' color="highlight"><ScrambleText trigger='mount'>A. Rodrigues</ScrambleText></Text>
      <Text typography='label' color="secondary"><ScrambleText trigger='mount'>Digital Product Designer and beyond'</ScrambleText></Text>
    </div>

    <Text typography='body' color="primary">
      {`My first contact with digital experiences was an old Olivetti computer, where I quickly learned to run my favourite games as a kid, through obsessive trial and error (mostly error, to be fair). It was the entry point to becoming passionately interested about technology, culture and design.`}
    </Text>
    <Text typography='body' color="primary">
      {`I am a builder at heart, combining usability expertise, visual culture, strategic and technical skills. With hands-on familiarity with the complexities of B2B and API-first products, I thrive in collaborative, high-impact roles where end-to-end, well-crafted product experiences drive real business value.`}
    </Text>

    <Work/>
  </section>;
}
