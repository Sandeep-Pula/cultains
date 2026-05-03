import { motion, MotionConfig } from 'framer-motion';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, firebaseStatus } from './lib/firebase';
import { isAdminHost, isSuperAdminEmail, redirectToAdminDashboard } from './lib/adminRouting';
import { AdminHome } from './components/AdminHome';
import { PublicHome } from './components/PublicHome';
import { PricingPage } from './components/PricingPage';
import { DashboardErrorBoundary } from './components/DashboardErrorBoundary';
import { DashboardSkeleton } from './dashboard/components/DashboardSkeleton';
import styles from './App.module.css';
import './styles/global.css';

import { Navbar } from './components/Navbar';
import { SetupGuide } from './components/SetupGuide';

const Dashboard = lazy(() => import('./components/Dashboard').then((module) => ({ default: module.Dashboard })));
const AIInteriorDesigner = lazy(() =>
  import('./components/AIInteriorDesigner').then((module) => ({ default: module.AIInteriorDesigner })),
);

const surfaceLoader = (
  <section style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '8rem 1rem 3rem' }}>
    <div style={{ textAlign: 'center', color: 'var(--color-brand-dark)', opacity: 0.72 }}>
      Loading workspace...
    </div>
  </section>
);

const pageLevelHashes = new Set(['', '#top', '#login', '#signup', '#pricing', '#try-once']);

function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseStatus.isConfigured);
  const didInitialScrollSync = useRef(false);

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }

    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const scrollForHash = (nextHash: string) => {
      const resetScroll = () => {
        document.body.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      };

      if (nextHash.startsWith('#dashboard')) {
        resetScroll();
        setTimeout(resetScroll, 50);
        return;
      }

      const normalizedHash = nextHash || '';
      if (pageLevelHashes.has(normalizedHash)) {
        resetScroll();
        setTimeout(resetScroll, 50);
        return;
      }

      const targetId = normalizedHash.replace(/^#/, '');
      const target = document.getElementById(targetId);

      if (!target) {
        resetScroll();
        return;
      }

      const navbarOffset = 96;
      const currentScroll = Math.max(document.body.scrollTop, document.documentElement.scrollTop, window.scrollY);
      const targetTop = target.getBoundingClientRect().top + currentScroll - navbarOffset;
      
      const scrollOpts: ScrollToOptions = { top: Math.max(0, targetTop), left: 0, behavior: 'smooth' };
      document.body.scrollTo(scrollOpts);
      window.scrollTo(scrollOpts);
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollForHash(hash);
        didInitialScrollSync.current = true;
      });
    });
  }, [hash]);

  useEffect(() => {
    const handleHashLinkClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
      if (!(target instanceof HTMLAnchorElement)) return;

      const targetHash = target.getAttribute('href') || '';
      if (!targetHash || targetHash === '#') return;

      const topHashes = new Set(['#top', '#login', '#signup', '#pricing', '#try-once']);
      if (!topHashes.has(targetHash) && !targetHash.startsWith('#dashboard')) return;

      const resetScroll = () => {
        document.body.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      };

      window.setTimeout(resetScroll, 0);
      window.setTimeout(resetScroll, 90);
    };

    document.addEventListener('click', handleHashLinkClick, true);
    return () => document.removeEventListener('click', handleHashLinkClick, true);
  }, []);

  const isLoginPage = hash === '#login';
  const isSignupPage = hash === '#signup';
  const isTryOncePage = hash === '#try-once';
  const isPricingPage = hash === '#pricing';
  const isDashboardPage = hash.startsWith('#dashboard');
  const isAuthPage = isLoginPage || isSignupPage;
  const adminHost = isAdminHost();
  const showSetupGuide = !firebaseStatus.isConfigured && (isAuthPage || isDashboardPage);

  // Protect Dashboard route
  useEffect(() => {
    if (authReady && isDashboardPage && user === null) {
      window.location.hash = '#login';
    }
  }, [authReady, user, isDashboardPage]);

  useEffect(() => {
    if (!authReady || !user || !adminHost || isSuperAdminEmail(user.email)) return;

    if (auth) {
      void signOut(auth);
    }

    if (window.location.hash !== '#login') {
      window.location.hash = '#login';
    }
  }, [adminHost, authReady, user]);

  // Autoredirect to dashboard if logged in and visiting login/signup
  useEffect(() => {
    if (authReady && user && isAuthPage) {
      if (adminHost && !isSuperAdminEmail(user.email)) {
        return;
      }

      if (isSuperAdminEmail(user.email)) {
        redirectToAdminDashboard();
        return;
      }

      window.location.hash = '#dashboard';
    }
  }, [adminHost, authReady, user, isAuthPage]);

  useEffect(() => {
    if (!authReady || !user) return;
    if (!isSuperAdminEmail(user.email)) return;

    if (hash.startsWith('#dashboard/super-admin')) {
      if (!isAdminHost()) {
        redirectToAdminDashboard();
      }
      return;
    }

    if (isAdminHost() && hash.startsWith('#dashboard')) {
      window.location.hash = '#dashboard/super-admin';
    }
  }, [authReady, hash, user]);

  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.appContainer}>
      <a className={styles.skipLink} href="#main-content">
        Skip to main content
      </a>

      {!isDashboardPage && !adminHost ? <Navbar /> : null}

      {!isDashboardPage && !adminHost ? (
        <motion.div
          className={styles.liquidTransition}
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.2 }}
        />
      ) : null}

      <main id="main-content" tabIndex={-1}>
        {isDashboardPage && !authReady ? (
          <DashboardSkeleton />
        ) : showSetupGuide ? (
          <SetupGuide missingFields={firebaseStatus.missingFields} />
        ) : isDashboardPage && user ? (
          <DashboardErrorBoundary>
            <Suspense fallback={<DashboardSkeleton />}>
              <Dashboard />
            </Suspense>
          </DashboardErrorBoundary>
        ) : adminHost ? (
          <AdminHome />
        ) : isTryOncePage ? (
          <Suspense fallback={surfaceLoader}>
            <AIInteriorDesigner />
          </Suspense>
        ) : isPricingPage ? (
          <PricingPage />
        ) : (
          <PublicHome authMode={isSignupPage ? 'signup' : 'login'} showAuth={isAuthPage} />
        )}
      </main>
      </div>
    </MotionConfig>
  );
}

export default App;
