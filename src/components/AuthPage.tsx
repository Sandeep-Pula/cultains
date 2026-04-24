import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { authService } from '../lib/authService';
import styles from './AuthPage.module.css';

type AuthPageProps = {
  mode: 'login' | 'signup';
};

const benefitPoints = [
  'Manage customers, stock, billing, and workflows',
  'Give your team one shared business dashboard',
  'Unlock AI tools inside the same workspace',
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

  useEffect(() => {
    if (isForgotPassword) return;
    setIsSignup(mode === 'signup');
  }, [mode, isForgotPassword]);

  const isSubmitDisabled = useMemo(() => {
    if (loading) return true;
    if (!email.trim()) return true;
    if (isForgotPassword) return false;
    if (isSignup && !name.trim()) return true;
    return password.length < 8;
  }, [email, isForgotPassword, isSignup, loading, name, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim();
      const normalizedName = name.trim();

      if (isForgotPassword) {
        await authService.requestPasswordReset(normalizedEmail);
        setSuccessMsg('A password reset link has been sent to your email.');
      } else if (isSignup) {
        if (password.length < 8) {
          throw new Error('Use at least 8 characters for the password.');
        }

        await authService.signUp(normalizedEmail, password, normalizedName);
        window.location.hash = '#dashboard';
      } else {
        if (password.length < 8) {
          throw new Error('Use at least 8 characters for the password.');
        }

        await authService.signIn(normalizedEmail, password);
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
    return isSignup ? 'Start running your business online.' : 'Log in to continue your business workflow.';
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
              {isForgotPassword ? 'Recovery' : isSignup ? 'Create account' : 'Welcome back'}
            </span>
            <h1 className={styles.title}>{getTitle()}</h1>
            <p className={styles.subtitle}>
              {isForgotPassword
                ? 'Enter the email associated with your account and we will send you a reset link.'
                : isSignup
                  ? 'Built for businesses that want CRM, billing, stock management, team workflows, and AI in one place.'
                  : 'Pick up where you left off and continue running customers, operations, and finances from one dashboard.'}
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
                  : isSignup ? 'Use your email to create an account.' : 'Enter your email and password to continue.'}
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
                    autoComplete="email"
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
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      minLength={8}
                      required
                    />
                  </label>
                )}

                {!isForgotPassword ? (
                  <p className={styles.helperText}>Use at least 8 characters for your password.</p>
                ) : null}

                <button type="submit" className={styles.submitButton} disabled={isSubmitDisabled}>
                  {loading ? 'Processing...' : isForgotPassword ? 'Send Reset Link' : isSignup ? 'Create account' : 'Login'}
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
                {isForgotPassword ? 'Remembered your password?' : isSignup ? 'Already have an account?' : 'New to AIvyapari?'}
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
                  {isForgotPassword ? 'Login here' : isSignup ? 'Login' : 'Create account'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
