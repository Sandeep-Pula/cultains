import { motion } from 'framer-motion';
import { ArrowRight, LogIn } from 'lucide-react';
import { AuthCard } from './AuthCard';
import { BrandWordmark, ProductWordmark } from './BrandWordmark';
import styles from './WelcomeSplash.module.css';

type WelcomeSplashProps = {
  mode?: 'login' | 'signup';
  showAuth?: boolean;
};

const openHomepageAuth = (mode: 'login' | 'signup') => {
  const nextHash = `#${mode}`;

  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
    return;
  }

  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
};

export const WelcomeSplash = ({ mode = 'login', showAuth = false }: WelcomeSplashProps) => {
  return (
    <section id="top" className={styles.section}>
      <div className={styles.content}>
        <motion.div
          className={styles.copyColumn}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <img src={`${import.meta.env.BASE_URL}pula-labs-logo.png`} alt="Pula Labs" className={styles.logo} />
          <p className={styles.eyebrow}>AI tools from Pula Labs</p>
          <h1 className={styles.title}>
            Building practical AI products for businesses that need systems, not noise.
          </h1>
          <p className={styles.subtitle}>
            <BrandWordmark /> creates focused AI tools for daily company work. The first product is{' '}
            <ProductWordmark />, a business operating system for CRM, billing, inventory, teams, and workflow visibility.
          </p>

          <div className={styles.buttonRow}>
            <button type="button" className={styles.primaryButton} onClick={() => openHomepageAuth('signup')}>
              Try our business operating system
              <ArrowRight size={18} />
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => openHomepageAuth('login')}>
              <LogIn size={18} />
              Login
            </button>
          </div>
        </motion.div>

        <motion.div
          className={showAuth ? styles.authColumn : styles.productColumn}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          {showAuth ? (
            <AuthCard mode={mode} />
          ) : (
            <div className={styles.productPanel}>
              <span className={styles.panelLabel}>First product</span>
              <img
                src={`${import.meta.env.BASE_URL}pula-business-os-logo-transparent.png`}
                alt="PULA business OS"
                className={styles.productLogo}
              />
              <p>
                One workspace for owners and teams to manage customers, follow-ups, invoices, stock, operations,
                finance, and AI-powered assistance.
              </p>
              <div className={styles.panelStats} aria-label="PULA business OS modules">
                <span>CRM</span>
                <span>Billing</span>
                <span>Inventory</span>
                <span>AI tools</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};
