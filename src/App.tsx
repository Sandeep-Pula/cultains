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
import styles from './App.module.css';
import './styles/global.css';

import { Navbar } from './components/Navbar';

function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isLoginPage = hash === '#login';
  const isSignupPage = hash === '#signup';
  const isTryOncePage = hash === '#try-once';
  const isDashboardPage = hash === '#dashboard';
  const isAuthPage = isLoginPage || isSignupPage;

  // Protect Dashboard route
  useEffect(() => {
    if (isDashboardPage && user === null) {
      window.location.hash = '#login';
    }
  }, [user, isDashboardPage]);

  // Autoredirect to dashboard if logged in and visiting login/signup
  useEffect(() => {
    if (user && isAuthPage) {
      window.location.hash = '#dashboard';
    }
  }, [user, isAuthPage]);

  return (
    <div className={styles.appContainer}>
      <Navbar />

      <motion.div
        className={styles.liquidTransition}
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.2 }}
      />

      <main>
        {isDashboardPage && user ? (
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
