import { motion } from 'framer-motion';
import { ArrowRight, Bot, Building2, LayoutDashboard, Sparkles } from 'lucide-react';
import { ProductWordmark } from './BrandWordmark';
import { MagneticButton } from './MagneticButton';
import styles from './HeroSection.module.css';

const productIdeas = [
  'Business operating system',
  'Industry AI assistants',
  'Document and workflow automation',
  'Analytics for owners',
];

const operatingSystemModules = [
  'Customer CRM',
  'Sales and billing',
  'Inventory control',
  'Team workspace',
  'Finance ledger',
  'AI tools hub',
];

const openHomepageAuth = (mode: 'login' | 'signup') => {
  const nextHash = `#${mode}`;

  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
    return;
  }

  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
};

export const HeroSection = () => {
  return (
    <section id="welcome-home" className={styles.section}>
      <div className={styles.content}>
        <motion.div
          className={styles.copyColumn}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65 }}
        >
          <span className={styles.eyebrow}>What Pula Labs is building</span>
          <h2 className={styles.title}>
            A product lab for useful AI tools, starting with one serious operating system.
          </h2>
          <p className={styles.subtitle}>
            Pula Labs is not a single dashboard company. It is a parent brand for practical AI products that help
            businesses sell, operate, track, and decide better. <ProductWordmark /> is the first product in that lineup.
          </p>

          <div className={styles.ctaRow}>
            <MagneticButton onClick={() => openHomepageAuth('signup')}>
              Try PULA business OS
            </MagneticButton>
            <a href="#tools" className={styles.secondaryCta}>
              Explore the product direction
              <ArrowRight size={18} />
            </a>
          </div>
        </motion.div>

        <motion.div
          className={styles.visualColumn}
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.08 }}
        >
          <div className={styles.systemPanel}>
            <div className={styles.panelHeader}>
              <div>
                <span>Product portfolio</span>
                <h3>Pula Labs</h3>
              </div>
              <Building2 size={24} />
            </div>

            <div className={styles.productList}>
              {productIdeas.map((item, index) => (
                <div key={item} className={index === 0 ? styles.activeProduct : styles.productItem}>
                  {index === 0 ? <LayoutDashboard size={18} /> : <Sparkles size={18} />}
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className={styles.osPanel}>
              <div className={styles.osHeader}>
                <Bot size={18} />
                <span>PULA business OS starts with</span>
              </div>
              <div className={styles.moduleGrid}>
                {operatingSystemModules.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
