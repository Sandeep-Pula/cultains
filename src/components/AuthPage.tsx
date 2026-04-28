import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthCard } from './AuthCard';
import styles from './AuthPage.module.css';

type AuthPageProps = {
  mode: 'login' | 'signup';
};

const benefitPoints = [
  'Manage customers, stock, billing, and workflows',
  'Give your team one shared business dashboard',
  'Business owners and staff can log in from the same page',
];

export const AuthPage = ({ mode }: AuthPageProps) => {
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
              {mode === 'signup' ? 'Create account' : 'Welcome back'}
            </span>
            <h1 className={styles.title}>
              {mode === 'signup' ? 'Start running your business online.' : 'Log in to continue your business workflow.'}
            </h1>
            <p className={styles.subtitle}>
              {mode === 'signup'
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
            <AuthCard mode={mode} />
          </div>
        </div>
      </div>
    </section>
  );
};
