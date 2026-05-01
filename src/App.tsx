import { motion } from 'framer-motion';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, firebaseStatus } from './lib/firebase';
import { PublicHome } from './components/PublicHome';
import { PricingPage } from './components/PricingPage';
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

const SUPER_ADMIN_EMAIL = 'superadmin@pulalabs.com';
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
    const scrollForHash = (nextHash: string, behavior: ScrollBehavior) => {
      if (nextHash.startsWith('#dashboard')) {
        window.scrollTo({ top: 0, left: 0, behavior });
        return;
      }

      const normalizedHash = nextHash || '';
      if (pageLevelHashes.has(normalizedHash)) {
        window.scrollTo({ top: 0, left: 0, behavior });
        return;
      }

      const targetId = normalizedHash.replace(/^#/, '');
      const target = document.getElementById(targetId);

      if (!target) {
        window.scrollTo({ top: 0, left: 0, behavior });
        return;
      }

      const navbarOffset = 96;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - navbarOffset;
      window.scrollTo({ top: Math.max(0, targetTop), left: 0, behavior });
    };

    const behavior: ScrollBehavior = didInitialScrollSync.current ? 'smooth' : 'auto';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollForHash(hash, behavior);
        didInitialScrollSync.current = true;
      });
    });
  }, [hash]);

  const isLoginPage = hash === '#login';
  const isSignupPage = hash === '#signup';
  const isTryOncePage = hash === '#try-once';
  const isPricingPage = hash === '#pricing';
  const isDashboardPage = hash.startsWith('#dashboard');
  const isAuthPage = isLoginPage || isSignupPage;
  const showSetupGuide = !firebaseStatus.isConfigured && (isAuthPage || isDashboardPage);

  // Protect Dashboard route
  useEffect(() => {
    if (authReady && isDashboardPage && user === null) {
      window.location.hash = '#login';
    }
  }, [authReady, user, isDashboardPage]);

  // Autoredirect to dashboard if logged in and visiting login/signup
  useEffect(() => {
    if (authReady && user && isAuthPage) {
      window.location.hash =
        user.email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL ? '#dashboard/super-admin' : '#dashboard';
    }
  }, [authReady, user, isAuthPage]);

  return (
    <div className={styles.appContainer}>
      {!isDashboardPage ? <Navbar /> : null}

      {!isDashboardPage ? (
        <motion.div
          className={styles.liquidTransition}
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.2 }}
        />
      ) : null}

      <main>
        {isDashboardPage && !authReady ? (
          <DashboardSkeleton />
        ) : showSetupGuide ? (
          <SetupGuide missingFields={firebaseStatus.missingFields} />
        ) : isDashboardPage && user ? (
          <Suspense fallback={<DashboardSkeleton />}>
            <Dashboard />
          </Suspense>
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
  );
}

export default App;
