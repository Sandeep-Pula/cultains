import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { HeroSection } from './components/HeroSection';
import { BentoFeatures } from './components/BentoFeatures';
import { HomeContent } from './components/HomeContent';
import { AuthPage } from './components/AuthPage';
import { AIInteriorDesigner } from './components/AIInteriorDesigner';
import { Dashboard } from './components/Dashboard';
import { DashboardSkeleton } from './dashboard/components/DashboardSkeleton';
import styles from './App.module.css';
import './styles/global.css';

import { Navbar } from './components/Navbar';

function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };
    window.addEventListener('hashchange', handleHashChange);
    
    // Also trigger scroll on mount if navigating to a specific hash out of the gate
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isLoginPage = hash === '#login';
  const isSignupPage = hash === '#signup';
  const isTryOncePage = hash === '#try-once';
  const isDashboardPage = hash.startsWith('#dashboard');
  const isAuthPage = isLoginPage || isSignupPage;

  // Protect Dashboard route
  useEffect(() => {
    if (authReady && isDashboardPage && user === null) {
      window.location.hash = '#login';
    }
  }, [authReady, user, isDashboardPage]);

  // Autoredirect to dashboard if logged in and visiting login/signup
  useEffect(() => {
    if (authReady && user && isAuthPage) {
      window.location.hash = '#dashboard';
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
        ) : isDashboardPage && user ? (
          <Dashboard />
        ) : isTryOncePage ? (
          <AIInteriorDesigner />
        ) : isAuthPage && !user ? (
          <AuthPage mode={isSignupPage ? 'signup' : 'login'} />
        ) : (
          <>
          <HeroSection />
          <BentoFeatures />
          <HomeContent />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
