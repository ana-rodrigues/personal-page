'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import Image from 'next/image';
import { Autoplay, EffectCards, Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/effect-cards';
import styles from './CardStack.module.css';

type CarouselImage = { src: string; alt: string };

type CarouselProps = {
  images: CarouselImage[];
  className?: string;
  showPagination?: boolean;
  showNavigation?: boolean;
  loop?: boolean;
  autoplay?: boolean;
  spaceBetween?: number;
};

const IMAGES: CarouselImage[] = [
  { src: '/media/card1.jpg', alt: '' },
  { src: '/media/card2.jpg', alt: '' },
  { src: '/media/card3.jpg', alt: '' },
  { src: '/media/card4.jpg', alt: '' },
  { src: '/media/card5.jpg', alt: '' },
  { src: '/media/card6.jpg', alt: '' },
  { src: '/media/card7.jpg', alt: '' },
  { src: '/media/card8.jpg', alt: '' },
];

function CardsCarousel({
  images,
  className = '',
  showPagination = false,
  showNavigation = false,
  loop = true,
  autoplay = false,
  spaceBetween = 40,
}: CarouselProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className={`${styles.stage} ${className}`.trim()}
    >
      <Swiper
        spaceBetween={spaceBetween}
        autoplay={
          autoplay
            ? {
                delay: 1000,
                disableOnInteraction: false,
              }
            : false
        }
        effect="cards"
        grabCursor={true}
        loop={loop}
        pagination={
          showPagination
            ? {
                clickable: true,
              }
            : false
        }
        navigation={
          showNavigation
            ? {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
              }
            : false
        }
        className={styles.stack}
        modules={[EffectCards, Autoplay, Pagination, Navigation]}
      >
        {images.map((image, index) => (
          <SwiperSlide key={index} className={styles.slide}>
            <Image
              className={styles.image}
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 480px) 70vw, 21rem"
              loading="lazy"
              decoding="async"
            />
          </SwiperSlide>
        ))}
        {showNavigation && (
          <div className={styles.nav}>
            <div className="swiper-button-next">
              <ChevronRightIcon className={styles.navIcon} />
            </div>
            <div className="swiper-button-prev">
              <ChevronLeftIcon className={styles.navIcon} />
            </div>
          </div>
        )}
      </Swiper>
    </motion.div>
  );
}

export default function CardStack() {
  const duplicateCount = Math.max(0, 9 - IMAGES.length);
  const carouselImages = [...IMAGES, ...IMAGES.slice(0, duplicateCount)];

  return (
    <div className={styles.root}>
      <CardsCarousel images={carouselImages} loop={true} />
      <p className={styles.instruction}>Some of my favourite things</p>
    </div>
  );
}