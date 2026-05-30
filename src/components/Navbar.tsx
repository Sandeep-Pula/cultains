import type React from 'react';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, firebaseStatus } from '../lib/firebase';
import styles from './Navbar.module.css';

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#top');
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const openHomepageAuth = (mode: 'login' | 'signup') => {
    const nextHash = `#${mode}`;
    const nextUrl = `/${nextHash}`;

    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', nextUrl);
      window.dispatchEvent(new Event('pula:navigation'));
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), 80);
      return;
    }

    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), 80);
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const goToHash = (event: React.MouseEvent<HTMLAnchorElement>, targetHash: string) => {
    event.preventDefault();
    const shouldForceTop = new Set(['#top', '#login', '#signup', '#pricing', '#try-once']).has(targetHash);
    const nextUrl = `/${targetHash}`;

    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', nextUrl);
      window.dispatchEvent(new Event('pula:navigation'));
      if (shouldForceTop) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), 80);
      }
      return;
    }

    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
      if (shouldForceTop) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), 80);
      }
      return;
    }

    if (shouldForceTop) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      return;
    }

    const target = document.getElementById(targetHash.replace('#', ''));
    if (target) {
      const navbarOffset = 96;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - navbarOffset;
      window.scrollTo({ top: Math.max(0, targetTop), left: 0, behavior: 'smooth' });
    }
  };

  const goToSurvey = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    if (window.location.pathname.replace(/\/+$/, '') !== '/survey') {
      window.history.pushState(null, '', '/survey');
      window.dispatchEvent(new Event('pula:navigation'));
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
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
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#top');
      setCurrentPath(window.location.pathname);
    };

    const handlePathChange = () => {
      setCurrentHash(window.location.hash || '#top');
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handlePathChange);
    window.addEventListener('pula:navigation', handlePathChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handlePathChange);
      window.removeEventListener('pula:navigation', handlePathChange);
    };
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
      <a href="/#top" className={styles.logo} aria-label="PULA biz home" onClick={(event) => goToHash(event, '#top')}>
        <span className={styles.logoBadge}>
          <img src={`${import.meta.env.BASE_URL}pula-biz-logo-transparent.png`} alt="PULA biz logo" className={styles.logoMark} />
        </span>
      </a>

      <div className={styles.links}>

        <a href="/#product" className={styles.link} aria-current={currentPath === '/' && currentHash === '#product' ? 'page' : undefined} onClick={(event) => goToHash(event, '#product')}>Services</a>
        <a href="/#tools" className={styles.link} aria-current={currentPath === '/' && currentHash === '#tools' ? 'page' : undefined} onClick={(event) => goToHash(event, '#tools')}>Benefits</a>
        <a href="/#business-os" className={styles.link} aria-current={currentPath === '/' && currentHash === '#business-os' ? 'page' : undefined} onClick={(event) => goToHash(event, '#business-os')}>Features</a>
        <a href="/#apps" className={styles.link} aria-current={currentPath === '/' && currentHash === '#apps' ? 'page' : undefined} onClick={(event) => goToHash(event, '#apps')}>Apps</a>
        <a href="/#pricing" className={styles.link} aria-current={currentPath === '/' && currentHash === '#pricing' ? 'page' : undefined} onClick={(event) => goToHash(event, '#pricing')}>Pricing</a>
        <a href="/survey" className={styles.link} aria-current={currentPath.replace(/\/+$/, '') === '/survey' ? 'page' : undefined} onClick={goToSurvey}>Survey</a>

        {user ? (
          <>
            <a href="#dashboard" className={styles.link} aria-current={currentHash.startsWith('#dashboard') ? 'page' : undefined}>Dashboard</a>
            <button onClick={handleLogout} className={styles.link} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Log out</button>
          </>
        ) : null}

        {!user ? (
          <div className={styles.navActions}>
            <button type="button" className={styles.navLoginButton} onClick={() => openHomepageAuth('login')}>
              <span>Login</span>
            </button>
            <button
              type="button"
              className={styles.ctaLink}
              onClick={() => {
                if (!firebaseStatus.isConfigured) {
                  window.location.hash = '#contact';
                  return;
                }
                openHomepageAuth('signup');
              }}
            >
              <span>{firebaseStatus.isConfigured ? 'Try PULA Biz' : 'View Launch Info'}</span>
              {firebaseStatus.isConfigured ? <ArrowRight size={16} /> : null}
            </button>
          </div>
        ) : null}
      </div>
    </motion.nav>
  );
};
