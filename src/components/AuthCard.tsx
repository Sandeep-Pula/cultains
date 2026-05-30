import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { authService } from '../lib/authService';
import { isSuperAdminEmail, redirectToAdminDashboard } from '../lib/adminRouting';
import { ProductWordmark } from './BrandWordmark';
import styles from './AuthPage.module.css';

type AuthCardProps = {
  mode: 'login' | 'signup';
  adminOnly?: boolean;
};

export const AuthCard = ({ mode, adminOnly = false }: AuthCardProps) => {
  const [isSignup, setIsSignup] = useState(!adminOnly && mode === 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isForgotPassword) return;
    setIsSignup(!adminOnly && mode === 'signup');
  }, [adminOnly, isForgotPassword, mode]);

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
        if (adminOnly && !isSuperAdminEmail(normalizedEmail)) {
          throw new Error('Use the PULA super admin email for admin password reset.');
        }

        await authService.requestPasswordReset(normalizedEmail);
        setSuccessMsg('A password reset link has been sent to your email.');
      } else if (isSignup) {
        if (adminOnly) {
          throw new Error('Admin accounts are created manually inside the admin dashboard.');
        }

        if (password.length < 8) {
          throw new Error('Use at least 8 characters for the password.');
        }

        await authService.signUp(normalizedEmail, password, normalizedName);
        window.location.hash = '#dashboard';
      } else {
        if (password.length < 8) {
          throw new Error('Use at least 8 characters for the password.');
        }

        if (adminOnly && !isSuperAdminEmail(normalizedEmail)) {
          throw new Error('Admin access is available only for PULA super admin credentials.');
        }

        if (!adminOnly && isSuperAdminEmail(normalizedEmail)) {
          throw new Error('Super admin credentials can only be used at admin.pulalabs.com.');
        }

        await authService.signIn(normalizedEmail, password);
        if (isSuperAdminEmail(normalizedEmail)) {
          redirectToAdminDashboard();
          return;
        }

        window.location.hash = '#dashboard';
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
      <div className={styles.formHeader}>
        <h2 className={styles.formTitle}>
          {isForgotPassword ? 'Reset Password' : isSignup ? 'Create account' : adminOnly ? 'Admin login' : 'Login'}
        </h2>
        <img
          src={`${import.meta.env.BASE_URL}pula-biz-logo-transparent.png`}
          alt="PULA Biz"
          className={styles.authProductLogo}
        />
      </div>
      <p className={styles.formText}>
        {isForgotPassword
          ? adminOnly
            ? 'Enter the PULA super admin email and we will send password reset instructions.'
            : 'Enter your email and we will send password reset instructions.'
          : isSignup
            ? 'Create the main business owner account here. Team member logins can be added later from the dashboard.'
            : adminOnly
              ? 'Use manually created PULA Biz super admin credentials for this admin portal.'
              : 'Business owners and team members both log in here using the credentials assigned to them.'}
      </p>

      {error ? (
        <div className={styles.messageError} id="auth-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      {successMsg ? (
        <div className={styles.messageSuccess} id="auth-success" role="status" aria-live="polite">
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
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'auth-error' : successMsg ? 'auth-success' : undefined}
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
            <span className={styles.passwordControl}>
              <input
                type={showPassword ? 'text' : 'password'}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'auth-error password-help' : 'password-help'}
                placeholder="Enter password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                minLength={8}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
        ) : null}

        {!isForgotPassword ? <p className={styles.helperText} id="password-help">Use at least 8 characters for your password.</p> : null}

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

      {!adminOnly ? (
      <p className={styles.switchText}>
        {isForgotPassword ? 'Remembered your password?' : isSignup ? 'Already have an account?' : <>New to <ProductWordmark />?</>}
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
      ) : isForgotPassword ? (
        <p className={styles.switchText}>
          Remembered your password?{' '}
          <button
            type="button"
            className={styles.inlineButtonStrong}
            onClick={() => {
              setError(null);
              setSuccessMsg(null);
              setIsForgotPassword(false);
              setIsSignup(false);
              window.location.hash = '#login';
            }}
          >
            Login here
          </button>
        </p>
      ) : null}
    </div>
  );
};
