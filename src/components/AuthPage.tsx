import { useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import styles from './AuthPage.module.css';

type AuthPageProps = {
  mode: 'login' | 'signup';
};

const benefitPoints = [
  'Create visual room previews faster',
  'Share client-ready links from your phone',
  'Keep materials and room photos organized',
];

export const AuthPage = ({ mode }: AuthPageProps) => {
  const [isSignup, setIsSignup] = useState(mode === 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync mode changes from parent if user navigates via hash
  if (mode === 'signup' && !isSignup && !isForgotPassword) setIsSignup(true);
  if (mode === 'login' && isSignup && !isForgotPassword) setIsSignup(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isForgotPassword) {
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg('A password reset link has been sent to your email.');
        // Don't redirect immediately so they see the message
      } else if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
        window.location.hash = '#dashboard';
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.hash = '#dashboard';
      }
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (isForgotPassword) return 'Reset your password.';
    return isSignup ? 'Start your first room preview in minutes.' : 'Log in to continue your design workflow.';
  };

  const getFormTitle = () => {
    if (isForgotPassword) return 'Reset Password';
    return isSignup ? 'Sign up' : 'Login';
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.backRow}>
          <a href="#top" className={styles.backLink}>
            <ArrowLeft size={16} />
            Back to homepage
          </a>
        </div>

        <div className={styles.panel}>
          <div className={styles.copyColumn}>
            <span className={styles.eyebrow}>
              {isForgotPassword ? 'Recovery' : (isSignup ? 'Create account' : 'Welcome back')}
            </span>
            <h1 className={styles.title}>{getTitle()}</h1>
            <p className={styles.subtitle}>
              {isForgotPassword 
                ? 'Enter the email associated with your account and we will send you a reset link.'
                : (isSignup
                  ? 'Built for decorators and design firms that want a simpler way to present ideas and close faster.'
                  : 'Pick up where you left off and continue sharing polished interior previews with your clients.')}
            </p>

            <div className={styles.benefits}>
              {benefitPoints.map((point) => (
                <div key={point} className={styles.benefitItem}>
                  <CheckCircle2 size={18} />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.formColumn}>
            <div className={styles.formCard}>
              <h2 className={styles.formTitle}>{getFormTitle()}</h2>
              <p className={styles.formText}>
                {isForgotPassword 
                  ? 'We will email you further instructions.' 
                  : (isSignup ? 'Use your email to create an account.' : 'Enter your email and password to continue.')}
              </p>

              {error && (
                <div style={{ color: 'red', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div style={{ color: 'green', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  <CheckCircle2 size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              <form className={styles.form} onSubmit={handleSubmit}>
                {isSignup && !isForgotPassword ? (
                  <label className={styles.field}>
                    <span>Full name</span>
                    <input 
                      type="text" 
                      placeholder="Your name" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={isSignup}
                    />
                  </label>
                ) : null}

                <label className={styles.field}>
                  <span>Email address</span>
                  <input 
                    type="email" 
                    placeholder="you@company.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>

                {!isForgotPassword && (
                  <label className={styles.field}>
                    <span>Password</span>
                    <input 
                      type="password" 
                      placeholder="Enter password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </label>
                )}

                <button type="submit" className={styles.submitButton} disabled={loading}>
                  {loading ? 'Processing...' : (isForgotPassword ? 'Send Reset Link' : (isSignup ? 'Create account' : 'Login'))}
                </button>
              </form>

              {!isForgotPassword && !isSignup && (
                <p className={styles.switchText} style={{ marginTop: '1rem' }}>
                  <button 
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot your password?
                  </button>
                </p>
              )}

              <p className={styles.switchText}>
                {isForgotPassword ? 'Remembered your password?' : (isSignup ? 'Already have an account?' : 'New to Cultains?')}
                {' '}
                <button 
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    if (isForgotPassword) {
                      setIsSignup(false);
                      window.location.hash = '#login';
                    } else {
                      setIsSignup(!isSignup);
                      window.location.hash = isSignup ? '#login' : '#signup';
                    }
                  }}
                  style={{ background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  {isForgotPassword ? 'Login here' : (isSignup ? 'Login' : 'Create account')}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
