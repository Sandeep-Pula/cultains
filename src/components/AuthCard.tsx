import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '../lib/authService';
import { BrandWordmark } from './BrandWordmark';
import styles from './AuthPage.module.css';

type AuthCardProps = {
  mode: 'login' | 'signup';
};

const SUPER_ADMIN_EMAIL = 'superadmin@aivyapari.com';

export const AuthCard = ({ mode }: AuthCardProps) => {
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
  }, [isForgotPassword, mode]);

  const isSubmitDisabled = useMemo(() => {
    if (loading) return true;
    if (!email.trim()) return true;
    if (isForgotPassword) return false;
    if (isSignup && !name.trim()) return true;
    return password.length < 8;
  }, [email, isForgotPassword, isSignup, loading, name, password]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
        window.location.hash = normalizedEmail.toLowerCase() === SUPER_ADMIN_EMAIL ? '#dashboard/super-admin' : '#dashboard';
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formCard}>
      <h2 className={styles.formTitle}>{isForgotPassword ? 'Reset Password' : isSignup ? 'Create account' : 'Login'}</h2>
      <p className={styles.formText}>
        {isForgotPassword
          ? 'Enter your email and we will send password reset instructions.'
          : isSignup
            ? 'Create the main business owner account here. Team member logins can be added later from the dashboard.'
            : 'Business owners and team members both log in here using the credentials assigned to them.'}
      </p>

      {error ? (
        <div className={styles.messageError}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      {successMsg ? (
        <div className={styles.messageSuccess}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        {isSignup && !isForgotPassword ? (
          <label className={styles.field}>
            <span>Full name</span>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
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
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        {!isForgotPassword ? (
          <label className={styles.field}>
            <span>Password</span>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              minLength={8}
              required
            />
          </label>
        ) : null}

        {!isForgotPassword ? <p className={styles.helperText}>Use at least 8 characters for your password.</p> : null}

        <button type="submit" className={styles.submitButton} disabled={isSubmitDisabled}>
          {loading ? 'Processing...' : isForgotPassword ? 'Send Reset Link' : isSignup ? 'Create account' : 'Login'}
        </button>
      </form>

      {!isForgotPassword && !isSignup ? (
        <p className={styles.switchText}>
          <button
            type="button"
            onClick={() => setIsForgotPassword(true)}
            className={styles.inlineButton}
          >
            Forgot your password?
          </button>
        </p>
      ) : null}

      <p className={styles.switchText}>
        {isForgotPassword ? 'Remembered your password?' : isSignup ? 'Already have an account?' : <>New to <BrandWordmark />?</>}
        {' '}
        <button
          type="button"
          className={styles.inlineButtonStrong}
          onClick={() => {
            setError(null);
            setSuccessMsg(null);
            setIsForgotPassword(false);
            if (isForgotPassword) {
              setIsSignup(false);
              window.location.hash = '#login';
              return;
            }
            setIsSignup((current) => !current);
            window.location.hash = isSignup ? '#login' : '#signup';
          }}
        >
          {isForgotPassword ? 'Login here' : isSignup ? 'Login' : 'Create account'}
        </button>
      </p>
    </div>
  );
};
