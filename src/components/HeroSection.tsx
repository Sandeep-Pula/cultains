import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  BadgeIndianRupee,
  Bot,
  Boxes,
  Building2,
  CheckCircle2,
  LayoutDashboard,
  Users,
} from 'lucide-react';
import { MagneticButton } from './MagneticButton';
import styles from './HeroSection.module.css';

const badges = [
  'CRM + billing + inventory + ERP',
  'Built for Indian businesses',
  'Industry AI inside your workflow',
];

const metrics = [
  { label: 'Active leads', value: '128', icon: <Users size={16} /> },
  { label: 'Invoices due', value: '24', icon: <BadgeIndianRupee size={16} /> },
  { label: 'Low stock alerts', value: '09', icon: <Boxes size={16} /> },
];

const modules = ['CRM', 'Billing', 'Taxes', 'Stock', 'ERP', 'Team Ops'];
const industries = ['Shoe shop', 'Interior studio', 'Sports store', 'Wholesale', 'Services', 'Retail'];

export const HeroSection = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.2]);

  return (
    <section id="welcome-home" ref={ref} className={styles.section}>
      <motion.div className={styles.content} style={{ y, opacity }}>
        <div className={styles.copyColumn}>
          <motion.span
            className={styles.eyebrow}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            Business operating system for growing Indian companies
          </motion.span>

          <motion.h1
            className={styles.title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
          >
            Run sales, billing, stock, teams, and AI from one workspace.
          </motion.h1>

          <motion.p
            className={styles.subtitle}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.16 }}
          >
            mydandha helps any business manage customers, invoices, taxes, inventory, operations, and team workflows
            online, then adds industry-specific AI tools for faster decisions and better service.
          </motion.p>

          <motion.div
            className={styles.ctaRow}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.24 }}
          >
            <MagneticButton onClick={() => window.location.assign('#signup')}>
              Start Free
            </MagneticButton>
            <a href="#product" className={styles.secondaryCta}>
              Explore Modules
              <ArrowRight size={18} />
            </a>
          </motion.div>

          <motion.p
            className={styles.microcopy}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Whether you run a shoe shop, decorator studio, sports shop, distributor, or service business, your data
            and AI tools stay in one operating layer.
          </motion.p>

          <motion.div
            className={styles.badgeRow}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.36 }}
          >
            {badges.map((badge) => (
              <span key={badge} className={styles.badge}>
                {badge}
              </span>
            ))}
          </motion.div>
        </div>

        <motion.div
          className={styles.visualColumn}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.16 }}
        >
          <div className={styles.mockupCard}>
            <div className={styles.mockupHeader}>
              <span className={styles.mockupPill}>mydandha workspace</span>
              <span className={styles.mockupPillMuted}>Live business control</span>
            </div>

            <div className={styles.workspaceShell}>
              <div className={styles.sidebarRail}>
                <div className={styles.sidebarHeading}>
                  <Building2 size={18} />
                  <span>Ops stack</span>
                </div>
                <div className={styles.moduleList}>
                  {modules.map((module) => (
                    <span key={module} className={styles.moduleChip}>
                      {module}
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.workspaceMain}>
                <div className={styles.metricGrid}>
                  {metrics.map((metric) => (
                    <div key={metric.label} className={styles.metricCard}>
                      <div className={styles.metricIcon}>{metric.icon}</div>
                      <span className={styles.metricValue}>{metric.value}</span>
                      <span className={styles.metricLabel}>{metric.label}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.activityPanel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <span className={styles.panelLabel}>Today</span>
                      <strong>Business activity</strong>
                    </div>
                    <LayoutDashboard size={16} />
                  </div>
                  <div className={styles.activityList}>
                    <div className={styles.activityRow}>
                      <span className={styles.activityDot} />
                      <p>3 new CRM leads added from WhatsApp and website forms.</p>
                    </div>
                    <div className={styles.activityRow}>
                      <span className={styles.activityDot} />
                      <p>2 GST invoices are ready to send and 1 payment is overdue.</p>
                    </div>
                    <div className={styles.activityRow}>
                      <span className={styles.activityDot} />
                      <p>Stock alert raised for running shoes, curtain fabric, and cricket bats.</p>
                    </div>
                  </div>
                </div>

                <div className={styles.aiPanel}>
                  <div className={styles.aiHeader}>
                    <div className={styles.aiBadge}>
                      <Bot size={16} />
                      <span>AI solutions</span>
                    </div>
                    <span className={styles.aiHint}>Context-aware by industry</span>
                  </div>
                  <p className={styles.aiCopy}>
                    Launch AI helpers for stock forecasting, follow-up drafts, quotation building, showroom previews,
                    or catalog assistance without leaving the workspace.
                  </p>
                  <div className={styles.industryRow}>
                    {industries.map((industry) => (
                      <span key={industry} className={styles.industryChip}>
                        {industry}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.insightStrip}>
              <div className={styles.insightItem}>
                <CheckCircle2 size={18} />
                <span>Single login for operations, finance, and AI</span>
              </div>
              <div className={styles.insightItem}>
                <LayoutDashboard size={18} />
                <span>Role-based dashboards for owners and staff</span>
              </div>
              <div className={styles.insightItem}>
                <Bot size={18} />
                <span>Industry-specific AI workflows ready to extend</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};
