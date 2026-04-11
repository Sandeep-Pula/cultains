import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import styles from './Navbar.module.css';

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const isHomePage = window.location.pathname === '/';

  const homeHref = (hash: string) => (isHomePage ? hash : `/${hash}`);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <a href={homeHref('#top')} className={styles.logo} aria-label="Cultains home">
        <span className={styles.logoBadge}>
          <img src="/cultains-logo-black.png" alt="Cultains logo" className={styles.logoMark} />
        </span>
        <span className={styles.logoText}>Cultains</span>
      </a>

      <div className={styles.links}>
        <a href={homeHref('#about')} className={styles.link}>Problem</a>
        <a href={homeHref('#workflow')} className={styles.link}>How it works</a>
        <a href={homeHref('#product')} className={styles.link}>Features</a>
        <a href="/login" className={styles.link}>Login</a>
        <a href="/signup" className={styles.link}>Sign up</a>
        <a href={homeHref('#contact')} className={styles.ctaLink}>Book Demo</a>
      </div>
    </motion.nav>
  );
};
