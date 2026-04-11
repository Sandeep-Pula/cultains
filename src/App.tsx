import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { HeroSection } from './components/HeroSection';
import { BentoFeatures } from './components/BentoFeatures';
import { HomeContent } from './components/HomeContent';
import { AuthPage } from './components/AuthPage';
import styles from './App.module.css';
import './styles/global.css';

import { Navbar } from './components/Navbar';

function App() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isLoginPage = pathname === '/login';
  const isSignupPage = pathname === '/signup';
  const isAuthPage = isLoginPage || isSignupPage;

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
        {isAuthPage ? (
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
