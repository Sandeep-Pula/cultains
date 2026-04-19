import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
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
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
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
      <a href="#top" className={styles.logo} aria-label="Cultains home">
        <span className={styles.logoBadge}>
          <img src={`${import.meta.env.BASE_URL}cultains-logo-black.png`} alt="Cultains logo" className={styles.logoMark} />
        </span>
        <span className={styles.logoText}>Cultains</span>
      </a>

      <div className={styles.links}>
        <a href="#about" className={styles.link}>Problem</a>
        <a href="#workflow" className={styles.link}>How it works</a>
        <a href="#product" className={styles.link}>Features</a>
        
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
        
        <a href="#contact" className={styles.ctaLink}>Book Demo</a>
      </div>
    </motion.nav>
  );
};
