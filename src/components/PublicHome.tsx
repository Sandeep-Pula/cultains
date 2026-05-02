import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeIndianRupee,
  Bot,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  Globe,
  Handshake,
  Mail,
  MapPin,
  Users,
} from 'lucide-react';
import { AuthCard } from './AuthCard';
import { ProductWordmark } from './BrandWordmark';
import styles from './PublicHome.module.css';

type PublicHomeProps = {
  authMode?: 'login' | 'signup';
  showAuth?: boolean;
};

const modules = [
  {
    title: 'CRM and customers',
    description: 'Track leads, customers, follow-ups, notes, and ownership in one workspace.',
    icon: <Users size={22} />,
  },
  {
    title: 'Billing and finance',
    description: 'Create invoices, watch dues, and keep ledger visibility close to sales activity.',
    icon: <BadgeIndianRupee size={22} />,
  },
  {
    title: 'Inventory and operations',
    description: 'Manage products, stock, reorder signals, barcode workflows, and daily execution.',
    icon: <Boxes size={22} />,
  },
  {
    title: 'AI tools hub',
    description: 'Use business-focused AI tools without separating them from real operational work.',
    icon: <Bot size={22} />,
  },
];

const operatingAdvantages = [
  'One operating command center',
  'Business data connected to daily work',
  'AI tools inside the same workspace',
  'Owner visibility across every module',
];

const dashboardServices = [
  'Customers and CRM',
  'Sales overview',
  'Billing',
  'Inventory',
  'Team management',
  'Account ledger',
  'Operations',
  'AI tools',
];

const openHomepageAuth = (mode: 'login' | 'signup') => {
  const nextHash = `#${mode}`;

  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
    return;
  }

  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
};

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6 },
};

export const PublicHome = ({ authMode = 'login', showAuth = false }: PublicHomeProps) => {
  return (
    <>
      <section id="top" className={styles.hero}>
        <div className={styles.heroAnimation} aria-hidden="true">
          <span className={styles.redBlock} />
          <span className={styles.blueBlock} />
          <span className={styles.redBar} />
          <span className={styles.blueBar} />
          <span className={styles.redRing} />
          <span className={styles.blueRing} />
          <span className={styles.redTriangle} />
          <span className={styles.blueTriangle} />
        </div>
        <div className={styles.heroInner}>
          <motion.div
            className={styles.heroCopy}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1>Run the business from one operating system.</h1>
            <p>
              <ProductWordmark /> brings customers, billing, inventory, team work, finance, operations, and AI tools
              into one clean workspace for business owners and teams.
            </p>
            <div className={styles.heroActions}>
              <button type="button" className={styles.primaryButton} onClick={() => openHomepageAuth('signup')}>
                Try PULA Biz
                <ArrowRight size={18} />
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => openHomepageAuth('login')}>
                Login
              </button>
            </div>
          </motion.div>

          <motion.div
            className={styles.heroProduct}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            {showAuth ? (
              <AuthCard mode={authMode} />
            ) : (
              <div className={styles.productCard}>
                <span className={styles.productLabel}>PULA Biz</span>
                <img
                  src={`${import.meta.env.BASE_URL}pula-biz-logo-transparent.png`}
                  alt="PULA Biz"
                  className={styles.businessLogo}
                />
                <p>
                  A command center for daily business work: customers, invoices, stock, teams, operations, and AI tools.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <section id="product" className={styles.productSection}>
        <div className={styles.container}>
          <motion.div className={styles.sectionHeader} {...fadeUp}>
            <span className={styles.eyebrow}>
              <ProductWordmark className={styles.inlineProductWordmark} />
            </span>
            <h2>One operating layer for the services your dashboard already supports.</h2>
            <p>
              Biz starts with the work companies do every day. It gives owners a cleaner way to see what is
              happening across customers, sales, billing, stock, team activity, and AI assistance.
            </p>
          </motion.div>

          <div className={styles.moduleGrid}>
            {modules.map((module, index) => (
              <motion.article
                key={module.title}
                className={styles.moduleCard}
                {...fadeUp}
                transition={{ duration: 0.55, delay: index * 0.08 }}
              >
                <div className={styles.iconBox}>{module.icon}</div>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="tools" className={styles.labSection}>
        <div className={styles.container}>
          <div className={styles.labGrid}>
            <motion.div className={styles.labCopy} {...fadeUp}>
              <span className={styles.eyebrow}>Why Biz</span>
              <h2>Business software should connect the work, not scatter it into separate tools.</h2>
              <p>
                PULA Biz keeps the daily operating layer together so owners can see customers, stock, invoices,
                finance, teams, and AI assistance in the same environment.
              </p>
            </motion.div>

            <motion.div className={styles.labPanel} {...fadeUp}>
              {operatingAdvantages.map((item) => (
                <div key={item} className={styles.labItem}>
                  <BrainCircuit size={18} />
                  <span>{item}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <section id="business-os" className={styles.servicesSection}>
        <div className={styles.container}>
          <motion.div className={styles.sectionHeader} {...fadeUp}>
            <span className={styles.eyebrow}>What it covers</span>
            <h2>Built around the real dashboard services businesses need.</h2>
          </motion.div>

          <div className={styles.serviceGrid}>
            {dashboardServices.map((service) => (
              <div key={service} className={styles.serviceItem}>
                <CheckCircle2 size={18} />
                <span>{service}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <img
                src={`${import.meta.env.BASE_URL}pula-labs-logo.png`}
                alt="PULA labs"
                className={styles.footerLabsLogo}
              />
              <p>
                Pula Labs Private Limited is building practical AI products for growing businesses in India. Our
                products focus on daily operations, owner decisions, team visibility, and useful business intelligence.
              </p>
            </div>

            <div className={styles.footerProducts}>
              <div className={styles.footerSectionTitle}>
                <Bot size={18} />
                <span>Product roadmap</span>
              </div>
              <div className={styles.footerProductItem}>
                <img
                  src={`${import.meta.env.BASE_URL}pula-biz-logo-transparent.png`}
                  alt="PULA Biz"
                  className={styles.footerBusinessLogo}
                />
                <p>Live product for CRM, billing, inventory, finance, teams, operations, and AI-assisted workflows.</p>
              </div>
              <div className={styles.footerToolPreview}>
                <strong>PULA Coach</strong>
                <span>Upcoming business coach to help owners manage their business better.</span>
              </div>
            </div>

            <div className={styles.footerCollab}>
              <div className={styles.footerSectionTitle}>
                <Handshake size={18} />
                <span>In collaboration with</span>
              </div>
              <strong>Pula Shoe &amp; Co - Since 1991</strong>
              <p>Built with practical business workflows, retail operations, and owner-led execution in mind.</p>
            </div>

            <div className={styles.footerContact}>
              <div className={styles.footerSectionTitle}>
                <Mail size={18} />
                <span>Contact</span>
              </div>
              <a href="mailto:contact@pulalabs.com">contact@pulalabs.com</a>
              <a href="https://pulalabs.com" target="_blank" rel="noreferrer">
                <Globe size={16} />
                pulalabs.com
              </a>
              <span>
                <MapPin size={16} />
                India
              </span>
            </div>

            <div className={styles.footerLinks}>
              <span className={styles.footerHeading}>Pula Labs Private Limited</span>
              <a href="https://pulalabs.com/careers" target="_blank" rel="noreferrer">Careers</a>
              <a href="https://pulalabs.com/collaborate" target="_blank" rel="noreferrer">Collaborate with Pula Labs Private Limited</a>
              <a href="mailto:contact@pulalabs.com?subject=Partnership%20with%20Pula%20Labs">Partner with Pula Labs</a>
              <a href="#contact">Try PULA Biz</a>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} Pula Labs Private Limited. All rights reserved.</span>
            <span>PULA Biz is live. PULA Coach is an upcoming product from Pula Labs Private Limited.</span>
            <div className={styles.legalLinks}>
              <a href="https://pulalabs.com/privacy" target="_blank" rel="noreferrer">Privacy</a>
              <a href="https://pulalabs.com/terms" target="_blank" rel="noreferrer">Terms</a>
              <a href="https://pulalabs.com/security" target="_blank" rel="noreferrer">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
