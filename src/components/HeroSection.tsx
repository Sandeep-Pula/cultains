import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, CheckCircle2, Smartphone, Sparkles } from 'lucide-react';
import { MagneticButton } from './MagneticButton';
import styles from './HeroSection.module.css';

const badges = ['Mobile-first', 'Built for decorators in India', 'No technical setup'];

export const HeroSection = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.2]);

  return (
    <section id="top" ref={ref} className={styles.section}>
      <motion.div className={styles.content} style={{ y, opacity }}>
        <div className={styles.copyColumn}>
          <motion.span
            className={styles.eyebrow}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            Interior design visualization SaaS
          </motion.span>

          <motion.h1
            className={styles.title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
          >
            Help clients see the design before the work begins.
          </motion.h1>

          <motion.p
            className={styles.subtitle}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.16 }}
          >
            Upload a room image, apply wallpapers, curtains, and materials visually, then share a realistic
            preview link that helps you close faster.
          </motion.p>

          <motion.div
            className={styles.ctaRow}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.24 }}
          >
            <MagneticButton onClick={() => window.location.assign('#contact')}>
              Try Free
            </MagneticButton>
            <a href="#contact" className={styles.secondaryCta}>
              Book Demo
              <ArrowRight size={18} />
            </a>
          </motion.div>

          <motion.p
            className={styles.microcopy}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            No training-heavy workflow. Start with one room and share your first design in minutes.
          </motion.p>

          <motion.div
            className={styles.badgeRow}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.36 }}
          >
            {badges.map((badge) => (
              <span key={badge} className={styles.badge}>
                {badge}
              </span>
            ))}
          </motion.div>
        </div>

        <motion.div
          className={styles.visualColumn}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.16 }}
        >
          <div className={styles.mockupCard}>
            <div className={styles.mockupHeader}>
              <span className={styles.mockupPill}>Before / After Preview</span>
              <span className={styles.mockupPillMuted}>Share by link</span>
            </div>

            <div className={styles.beforeAfter}>
              <div className={styles.roomPanel}>
                <span className={styles.panelLabel}>Before</span>
                <div className={`${styles.roomScene} ${styles.beforeScene}`}>
                  <img src="/homepage_scene_before.png" alt="Before design" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>

              <div className={styles.roomPanel}>
                <span className={styles.panelLabel}>After</span>
                <div className={`${styles.roomScene} ${styles.afterScene}`}>
                  <img src="/homepage_scene_after.png" alt="After design" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            </div>

            <div className={styles.insightStrip}>
              <div className={styles.insightItem}>
                <Sparkles size={18} />
                <span>Realistic visual preview</span>
              </div>
              <div className={styles.insightItem}>
                <Smartphone size={18} />
                <span>Works beautifully on mobile</span>
              </div>
              <div className={styles.insightItem}>
                <CheckCircle2 size={18} />
                <span>Client-friendly sharing</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};
