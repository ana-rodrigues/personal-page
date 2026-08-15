import styles from './Hero.module.css';
import Typewriter from '../Typewriter/Typewriter';
import Text from '../Text/Text';

export default function Hero() {
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
  </section>
}
