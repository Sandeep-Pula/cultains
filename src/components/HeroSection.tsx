import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeIndianRupee,
  Bot,
  Boxes,
  ChartNoAxesCombined,
  CircleCheckBig,
  LayoutDashboard,
  MessageSquareText,
  Sparkles,
} from 'lucide-react';
import { MagneticButton } from './MagneticButton';
import styles from './HeroSection.module.css';

const trustPills = [
  'CRM, billing, stock, tax workflows',
  'Adaptive for different business types',
  'AI tools inside the same workspace',
];

const ownerSignals = [
  {
    label: 'Pending follow-ups',
    value: '18',
    note: 'Sales and repeat customers',
    icon: <MessageSquareText size={18} />,
  },
  {
    label: 'Payments due',
    value: '₹2.4L',
    note: 'Invoices waiting this week',
    icon: <BadgeIndianRupee size={18} />,
  },
  {
    label: 'Stock watch',
    value: '06',
    note: 'Items below reorder level',
    icon: <Boxes size={18} />,
  },
];

const aiUseCases = [
  'Draft follow-up messages',
  'Suggest reorder priorities',
  'Summarize customer calls',
  'Launch industry AI tools',
];

export const HeroSection = () => {
  return (
    <section id="welcome-home" className={styles.section}>
      <div className={styles.bgGlow} />
      <div className={styles.content}>
        <motion.div
          className={styles.copyColumn}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65 }}
        >
          <span className={styles.eyebrow}>Built for business owners who want clarity, not chaos</span>

          <h1 className={styles.title}>
            One workspace for running the business.
            <span> One brand that still feels like your own.</span>
          </h1>

          <p className={styles.subtitle}>
            AIvyapari gives growing businesses a clean operating layer for customers, billing, stock, teams,
            reporting, and AI tools, without forcing every business into the same template.
          </p>

          <div className={styles.ctaRow}>
            <MagneticButton onClick={() => window.location.assign('#signup')}>
              Start Free
            </MagneticButton>
            <a href="#product" className={styles.secondaryCta}>
              See what owners get
              <ArrowRight size={18} />
            </a>
          </div>

          <div className={styles.trustRow}>
            {trustPills.map((pill) => (
              <span key={pill} className={styles.trustPill}>
                {pill}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          className={styles.visualColumn}
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.08 }}
        >
          <div className={styles.commandCard}>
            <div className={styles.cardHeader}>
              <div>
                <span className={styles.cardEyebrow}>Owner dashboard</span>
                <h2>See what matters first.</h2>
              </div>
              <div className={styles.headerBadge}>
                <LayoutDashboard size={16} />
                <span>Live workspace</span>
              </div>
            </div>

            <div className={styles.signalGrid}>
              {ownerSignals.map((item) => (
                <div key={item.label} className={styles.signalCard}>
                  <div className={styles.signalIcon}>{item.icon}</div>
                  <span className={styles.signalValue}>{item.value}</span>
                  <strong>{item.label}</strong>
                  <p>{item.note}</p>
                </div>
              ))}
            </div>

            <div className={styles.storyGrid}>
              <div className={styles.storyCardPrimary}>
                <div className={styles.storyLabel}>
                  <ChartNoAxesCombined size={16} />
                  <span>Business snapshot</span>
                </div>
                <p>
                  Sales, receivables, customer movement, team activity, and stock alerts stay on one screen so the
                  owner can act faster.
                </p>
              </div>

              <div className={styles.storyCardSecondary}>
                <div className={styles.storyLabel}>
                  <Bot size={16} />
                  <span>AI inside workflow</span>
                </div>
                <div className={styles.aiList}>
                  {aiUseCases.map((item) => (
                    <div key={item} className={styles.aiItem}>
                      <Sparkles size={14} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.ownerNote}>
              <CircleCheckBig size={18} />
              <span>Owners get one clean control room. Teams get the exact workspace they need.</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
