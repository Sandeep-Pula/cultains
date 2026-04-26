import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { BrandWordmark } from './BrandWordmark';
import styles from './WelcomeSplash.module.css';

const baseParticles = [
  { size: 10, left: '8%', top: '18%', duration: 9, delay: 0.2 },
  { size: 6, left: '13%', top: '42%', duration: 12, delay: 0.6 },
  { size: 8, left: '17%', top: '71%', duration: 10, delay: 0.1 },
  { size: 14, left: '24%', top: '26%', duration: 10, delay: 0.15 },
  { size: 7, left: '28%', top: '58%', duration: 11, delay: 0.45 },
  { size: 12, left: '34%', top: '16%', duration: 13, delay: 0.25 },
  { size: 9, left: '38%', top: '78%', duration: 12, delay: 0.8 },
  { size: 8, left: '44%', top: '28%', duration: 11, delay: 0.4 },
  { size: 6, left: '48%', top: '54%', duration: 9, delay: 0.6 },
  { size: 11, left: '52%', top: '11%', duration: 13, delay: 0.35 },
  { size: 12, left: '56%', top: '76%', duration: 13, delay: 0.9 },
  { size: 7, left: '61%', top: '34%', duration: 10, delay: 0.3 },
  { size: 5, left: '64%', top: '64%', duration: 11, delay: 0.55 },
  { size: 16, left: '71%', top: '19%', duration: 14, delay: 0.2 },
  { size: 10, left: '76%', top: '48%', duration: 12, delay: 0.8 },
  { size: 13, left: '81%', top: '68%', duration: 14, delay: 0.7 },
  { size: 9, left: '87%', top: '24%', duration: 12, delay: 0.5 },
  { size: 6, left: '91%', top: '52%', duration: 10, delay: 0.9 },
  { size: 7, left: '94%', top: '79%', duration: 12, delay: 0.4 },
];

const particleVariants = [
  { sizeShift: 0, leftShift: 0, topShift: 0, durationShift: 0, delayShift: 0 },
  { sizeShift: -2, leftShift: 3, topShift: 6, durationShift: 2, delayShift: 0.18 },
  { sizeShift: 1, leftShift: -6, topShift: -7, durationShift: 4, delayShift: 0.32 },
  { sizeShift: -1, leftShift: 7, topShift: -4, durationShift: 1, delayShift: 0.12 },
  { sizeShift: 2, leftShift: -8, topShift: 8, durationShift: 5, delayShift: 0.4 },
  { sizeShift: -3, leftShift: 11, topShift: -9, durationShift: 3, delayShift: 0.22 },
  { sizeShift: 0, leftShift: -12, topShift: 10, durationShift: 6, delayShift: 0.48 },
  { sizeShift: 2, leftShift: 5, topShift: 12, durationShift: 7, delayShift: 0.56 },
  { sizeShift: -2, leftShift: -10, topShift: -12, durationShift: 4, delayShift: 0.28 },
];

const clampPercent = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const particles = particleVariants.flatMap((variant, variantIndex) =>
  baseParticles.map((particle, index) => ({
    ...particle,
    size: Math.max(3, particle.size + variant.sizeShift + ((variantIndex + index) % 3 === 0 ? 1 : 0)),
    left: `${clampPercent(parseInt(particle.left, 10) + variant.leftShift + ((index % 2 === 0 ? 1 : -1) * (variantIndex % 3)), 4, 96)}%`,
    top: `${clampPercent(parseInt(particle.top, 10) + variant.topShift + ((index % 3 === 0 ? 1 : -1) * (variantIndex % 4)), 6, 94)}%`,
    duration: particle.duration + variant.durationShift,
    delay: particle.delay + variant.delayShift,
  })),
);

export const WelcomeSplash = () => {
  return (
    <section id="top" className={styles.section}>
      <div className={styles.backdrop} />
      <div className={styles.particleField} aria-hidden="true">
        {particles.map((particle, index) => (
          <motion.span
            key={`${particle.left}-${particle.top}-${index}`}
            className={styles.particle}
            style={{
              width: particle.size,
              height: particle.size,
              left: particle.left,
              top: particle.top,
            }}
            animate={{
              x: [0, 18, -10, 0],
              y: [0, -26, 10, 0],
              opacity: [0.35, 0.8, 0.45, 0.35],
              scale: [1, 1.18, 0.92, 1],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              ease: 'easeInOut',
              repeat: Infinity,
            }}
          />
        ))}
      </div>
      <motion.div
        className={styles.content}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.p
          className={styles.eyebrow}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
        >
          Welcome to the business operating system
        </motion.p>

        <motion.div
          className={styles.logoWrap}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.12 }}
        >
          <img src={`${import.meta.env.BASE_URL}aivyapari-logo.png`} alt="AIvyapari logo" className={styles.logo} />
        </motion.div>

        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18 }}
        >
          <BrandWordmark showDotCom />
        </motion.h1>

        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.26 }}
        >
          One place to run business operations, teams, finance, inventory, and AI-powered workflows.
        </motion.p>

        <motion.a
          href="#welcome-home"
          className={styles.scrollCue}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.34 }}
        >
          <span>Scroll to enter</span>
          <ArrowDown size={18} />
        </motion.a>
      </motion.div>
    </section>
  );
};
