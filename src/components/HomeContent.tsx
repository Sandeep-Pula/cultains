import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Bot,
  BrainCircuit,
  Building2,
  FileText,
  LayoutDashboard,
  MessagesSquare,
  Sparkles,
} from 'lucide-react';
import { BrandWordmark, ProductWordmark } from './BrandWordmark';
import styles from './HomeContent.module.css';

const futureTools = [
  {
    title: 'AI communication tools',
    description: 'Assist owners and teams with follow-ups, customer replies, summaries, and everyday business writing.',
    icon: <MessagesSquare size={20} />,
  },
  {
    title: 'AI document tools',
    description: 'Help convert business documents, invoices, notes, and records into useful structured work.',
    icon: <FileText size={20} />,
  },
  {
    title: 'AI decision tools',
    description: 'Turn operational signals into clearer priorities for sales, inventory, collections, and teams.',
    icon: <BrainCircuit size={20} />,
  },
];

const osFit = [
  'Retail, trading, service, and operations-heavy teams',
  'Owners who need one place for CRM, billing, stock, team work, and ledger visibility',
  'Businesses that want AI features without losing practical control of daily work',
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6 },
};

const openHomepageAuth = (mode: 'login' | 'signup') => {
  window.location.hash = `#${mode}`;
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
};

export const HomeContent = () => {
  return (
    <>
      <section id="tools" className={styles.section}>
        <div className={styles.container}>
          <motion.div className={styles.sectionIntro} {...fadeUp}>
            <span className={styles.eyebrow}>More than one product</span>
            <h2 className={styles.title}>
              <BrandWordmark /> is being shaped as a company for multiple AI tools, not just one app.
            </h2>
            <p className={styles.lead}>
              PULA Biz is the starting point because companies need reliable operational data before AI can be
              genuinely useful. From there, Pula Labs can keep adding focused tools around the same business reality.
            </p>
          </motion.div>

          <div className={styles.toolGrid}>
            {futureTools.map((tool, index) => (
              <motion.div
                key={tool.title}
                className={styles.toolCard}
                {...fadeUp}
                transition={{ duration: 0.55, delay: index * 0.08 }}
              >
                <div className={styles.iconWrap}>{tool.icon}</div>
                <h3>{tool.title}</h3>
                <p>{tool.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="business-os" className={styles.featureSection}>
        <div className={styles.container}>
          <div className={styles.osGrid}>
            <motion.div className={styles.osCopy} {...fadeUp}>
              <span className={styles.eyebrow}>Why Biz comes first</span>
              <h2 className={styles.title}>AI gets stronger when the business has a clean operating base.</h2>
              <p className={styles.lead}>
                <ProductWordmark /> organizes the daily services already built into the dashboard: customers,
                projects, invoices, inventory, team activity, sales views, account ledger, and AI tool discovery.
              </p>
            </motion.div>

            <motion.div className={styles.fitPanel} {...fadeUp}>
              <div className={styles.fitHeader}>
                <LayoutDashboard size={20} />
                <span>Designed for</span>
              </div>
              {osFit.map((item) => (
                <div key={item} className={styles.fitItem}>
                  <BadgeCheck size={18} />
                  <span>{item}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <section id="contact" className={styles.ctaSection}>
        <div className={styles.container}>
          <motion.div className={styles.ctaPanel} {...fadeUp}>
            <div className={styles.ctaIcon}>
              <Building2 size={22} />
              <Bot size={22} />
              <Sparkles size={22} />
            </div>
            <span className={styles.eyebrow}>Start with the first Pula Labs product</span>
            <h2 className={styles.title}>Try PULA Biz.</h2>
            <p className={styles.lead}>
              Create a workspace, set up your business profile, and start using the operating layer that future Pula
              Labs AI tools can build on.
            </p>

            <div className={styles.buttonRow}>
              <button type="button" className={styles.primaryButton} onClick={() => openHomepageAuth('signup')}>
                Create account
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => openHomepageAuth('login')}>
                Login
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};
