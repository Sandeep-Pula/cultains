import type React from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, firebaseStatus } from '../lib/firebase';
import styles from './Navbar.module.css';

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const openHomepageAuth = (mode: 'login' | 'signup') => {
    const nextHash = `#${mode}`;

    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

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
      <a href="#top" className={styles.logo} aria-label="PULA labs home">
        <span className={styles.logoBadge}>
          <img src={`${import.meta.env.BASE_URL}pula-labs-logo.png`} alt="PULA labs logo" className={styles.logoMark} />
        </span>
      </a>

      <div className={styles.links}>

        <a href="#product" className={styles.link}>Business OS</a>
        <a href="#tools" className={styles.link}>AI tools</a>
        <a href="#business-os" className={styles.link}>Why OS</a>
        <a href="#pricing" className={styles.link}>Pricing</a>

        {user ? (
          <>
            <a href="#dashboard" className={styles.link}>Dashboard</a>
            <button onClick={handleLogout} className={styles.link} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Log out</button>
          </>
        ) : null}

        <a
          href={firebaseStatus.isConfigured ? '#signup' : '#contact'}
          className={styles.ctaLink}
          onClick={(event) => {
            if (!firebaseStatus.isConfigured) return;
            event.preventDefault();
            openHomepageAuth('signup');
          }}
        >
          {firebaseStatus.isConfigured ? 'Try business OS' : 'View Launch Info'}
        </a>
      </div>
    </motion.nav>
  );
};
