import { ArrowLeft, CheckCircle2 } from 'lucide-react';
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
  const isSignup = mode === 'signup';

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
            <span className={styles.eyebrow}>{isSignup ? 'Create account' : 'Welcome back'}</span>
            <h1 className={styles.title}>
              {isSignup ? 'Start your first room preview in minutes.' : 'Log in to continue your design workflow.'}
            </h1>
            <p className={styles.subtitle}>
              {isSignup
                ? 'Built for decorators and design firms that want a simpler way to present ideas and close faster.'
                : 'Pick up where you left off and continue sharing polished interior previews with your clients.'}
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
              <h2 className={styles.formTitle}>{isSignup ? 'Sign up' : 'Login'}</h2>
              <p className={styles.formText}>
                {isSignup ? 'Use your email to create an account.' : 'Enter your email and password to continue.'}
              </p>

              <form className={styles.form}>
                {isSignup ? (
                  <label className={styles.field}>
                    <span>Full name</span>
                    <input type="text" placeholder="Your name" />
                  </label>
                ) : null}

                <label className={styles.field}>
                  <span>Email address</span>
                  <input type="email" placeholder="you@company.com" />
                </label>

                <label className={styles.field}>
                  <span>Password</span>
                  <input type="password" placeholder="Enter password" />
                </label>

                <button type="submit" className={styles.submitButton}>
                  {isSignup ? 'Create account' : 'Login'}
                </button>
              </form>

              <p className={styles.switchText}>
                {isSignup ? 'Already have an account?' : 'New to Cultains?'}{' '}
                <a href={isSignup ? '#login' : '#signup'}>
                  {isSignup ? 'Login' : 'Create account'}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
