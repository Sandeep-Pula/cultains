import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, firebaseStatus } from '../lib/firebase';
import { BrandWordmark } from './BrandWordmark';
import styles from './Navbar.module.css';

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!auth) return;
    await signOut(auth);
    window.location.hash = '#login';
  };

  return (
    <motion.nav
      className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <a href="#top" className={styles.logo} aria-label="AIvyapari home">
        <span className={styles.logoBadge}>
          <img src={`${import.meta.env.BASE_URL}aivyapari-logo.png`} alt="AIvyapari logo" className={styles.logoMark} />
        </span>
        <BrandWordmark className={styles.logoText} />
      </a>

      <div className={styles.links}>

        <a href="#workflow" className={styles.link}>Workflow</a>
        <a href="#product" className={styles.link}>Modules</a>
        <a href="#industries" className={styles.link}>Industries</a>
        <a href="#ai" className={styles.link}>AI</a>
        <a href="#pricing" className={styles.link}>Pricing</a>

        {user ? (
          <>
            <a href="#dashboard" className={styles.link}>Dashboard</a>
            <button onClick={handleLogout} className={styles.link} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Log out</button>
          </>
        ) : (
          <>
            <a href="#login" className={styles.link}>Login</a>
            <a href="#signup" className={styles.link}>Sign up</a>
          </>
        )}

        <a href={firebaseStatus.isConfigured ? '#signup' : '#contact'} className={styles.ctaLink}>
          {firebaseStatus.isConfigured ? 'Start Free' : 'View Launch Info'}
        </a>
      </div>
    </motion.nav>
  );
};
