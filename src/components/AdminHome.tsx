import { Building2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { AuthCard } from './AuthCard';
import styles from './AdminHome.module.css';

export const AdminHome = () => (
  <section className={styles.page}>
    <div className={styles.backgroundShapes} aria-hidden="true">
      <span className={styles.redSquare} />
      <span className={styles.blueSquare} />
      <span className={styles.redRing} />
      <span className={styles.blueTriangle} />
    </div>

    <header className={styles.header}>
      <a href="#top" className={styles.labsBrand} aria-label="PULA labs admin home">
        <img src={`${import.meta.env.BASE_URL}pula-labs-logo.png`} alt="PULA labs" />
      </a>
      <div className={styles.headerMeta}>
        <ShieldCheck size={18} />
        <span>Super admin portal</span>
      </div>
    </header>

    <main className={styles.shell}>
      <div className={styles.copyColumn}>
        <div className={styles.productTab}>
          <img
            src={`${import.meta.env.BASE_URL}pula-business-os-logo-transparent.png`}
            alt="PULA Business OS"
          />
          <span>Admin access</span>
        </div>

        <div className={styles.kicker}>
          <Building2 size={18} />
          <span>Pula Labs Private Limited</span>
        </div>

        <h1>PULA Business OS administration.</h1>
        <p>
          Sign in with manually created super admin credentials to manage the PULA Business OS dashboard,
          users, support flow, and operational controls.
        </p>

        <div className={styles.securityNote}>
          <LockKeyhole size={18} />
          <span>Admin credentials are accepted only on admin.pulalabs.com.</span>
        </div>
      </div>

      <div className={styles.loginPanel}>
        <AuthCard mode="login" adminOnly />
      </div>
    </main>
  </section>
);
