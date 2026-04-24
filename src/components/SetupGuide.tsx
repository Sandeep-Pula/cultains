import styles from './SetupGuide.module.css';

type SetupGuideProps = {
  missingFields: string[];
};

const steps = [
  {
    title: 'Add Firebase env values',
    description: 'Set the missing `VITE_FIREBASE_*` variables in your local `.env` file before starting the app.',
  },
  {
    title: 'Mirror them in deployment',
    description: 'Add the same variables to your hosting and CI environment so auth and dashboard sync work after release.',
  },
  {
    title: 'Reload and verify sign-in',
    description: 'Once the values are present, reload the site and confirm signup, login, and dashboard data syncing all work.',
  },
];

export const SetupGuide = ({ missingFields }: SetupGuideProps) => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.panel}>
          <div className={styles.card}>
            <span className={styles.eyebrow}>Setup required</span>
            <h1 className={styles.title}>The marketing site is live, but backend setup still needs one final pass.</h1>
            <p className={styles.subtitle}>
              Firebase is not fully configured yet, so account creation, login, and dashboard sync are intentionally paused instead of failing with a blank crash screen.
            </p>

            <div className={styles.callout}>
              <div className={styles.calloutTitle}>What is blocked right now</div>
              <p className={styles.calloutText}>
                Authentication, dashboard data, and any cloud-backed workspace actions will stay unavailable until the missing environment values are added.
              </p>
            </div>

            <div className={styles.missingList}>
              {missingFields.map((field) => (
                <span key={field} className={styles.missingPill}>
                  {field}
                </span>
              ))}
            </div>

            <div className={styles.buttonRow}>
              <a href="#top" className={styles.primaryButton}>Back to homepage</a>
              <a href="#contact" className={styles.secondaryButton}>Review launch copy</a>
            </div>
          </div>

          <aside className={styles.stepsCard}>
            <h2 className={styles.stepsTitle}>Release checklist</h2>
            <div className={styles.stepList}>
              {steps.map((step, index) => (
                <div key={step.title} className={styles.stepItem}>
                  <span className={styles.stepNumber}>0{index + 1}</span>
                  <div className={styles.stepBody}>
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};
