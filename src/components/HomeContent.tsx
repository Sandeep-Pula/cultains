import { motion } from 'framer-motion';
import {
  BadgeIndianRupee,
  Bot,
  Boxes,
  BriefcaseBusiness,
  LayoutDashboard,
  Palette,
  ShoppingBag,
  Sparkles,
  Store,
  Trophy,
  Users,
} from 'lucide-react';
import styles from './HomeContent.module.css';

const modules = [
  {
    title: 'Customer and CRM flow',
    description: 'Leads, follow-ups, notes, ownership, and movement through your sales pipeline.',
    icon: <Users size={20} />,
  },
  {
    title: 'Billing and collections',
    description: 'Quotations, invoices, due payments, and finance visibility in one place.',
    icon: <BadgeIndianRupee size={20} />,
  },
  {
    title: 'Inventory and operations',
    description: 'Products, stock movement, reorder watch, and daily execution without spreadsheet mess.',
    icon: <Boxes size={20} />,
  },
  {
    title: 'AI tool layer',
    description: 'Search, favorite, and use AI tools that match your business without changing your main workflow.',
    icon: <Bot size={20} />,
  },
];

const industries = [
  {
    title: 'Retail stores',
    description: 'For shoe shops, sports stores, fashion stores, and growing local retail brands.',
    icon: <ShoppingBag size={20} />,
  },
  {
    title: 'Interior businesses',
    description: 'For decorators, design studios, and execution teams managing leads, materials, and billing.',
    icon: <Palette size={20} />,
  },
  {
    title: 'Trading and wholesale',
    description: 'For businesses that need tighter stock visibility, payment tracking, and repeat order control.',
    icon: <Store size={20} />,
  },
  {
    title: 'Service companies',
    description: 'For teams that manage customers, staff, jobs, and recurring follow-ups every day.',
    icon: <BriefcaseBusiness size={20} />,
  },
];

const promisePoints = [
  'Your business logo and title stay primary inside the workspace',
  'Pages adapt to your business type instead of showing generic labels',
  'AI stays optional while core operations remain clean and practical',
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6 },
};

export const HomeContent = () => {
  return (
    <>
      <section id="about" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.valueGrid}>
            <motion.div className={styles.valueIntro} {...fadeUp}>
              <span className={styles.eyebrow}>Why owners care</span>
              <h2 className={styles.title}>The product should reduce decision fatigue, not add another dashboard to ignore.</h2>
              <p className={styles.lead}>
                AIvyapari is designed for owners who want one dependable business system that feels organized,
                credible, and adaptable to the way their company actually works.
              </p>

              <div className={styles.promisePanel}>
                <div className={styles.promiseLabel}>
                  <LayoutDashboard size={16} />
                  <span>Owner-first promise</span>
                </div>
                <div className={styles.promiseList}>
                  {promisePoints.map((item) => (
                    <div key={item} className={styles.promiseItem}>
                      <Sparkles size={14} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <div id="product" className={styles.moduleGrid}>
              {modules.map((module, index) => (
                <motion.div
                  key={module.title}
                  className={styles.moduleCard}
                  {...fadeUp}
                  transition={{ duration: 0.55, delay: index * 0.08 }}
                >
                  <div className={styles.moduleIcon}>{module.icon}</div>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="industries" className={styles.section}>
        <div className={styles.container}>
          <motion.div className={styles.sectionIntro} {...fadeUp}>
            <span className={styles.eyebrow}>Different businesses, same clarity</span>
            <h2 className={styles.title}>A strong core for many businesses, with room to adapt for each one.</h2>
          </motion.div>

          <div className={styles.industryGrid}>
            {industries.map((industry, index) => (
              <motion.div
                key={industry.title}
                className={styles.industryCard}
                {...fadeUp}
                transition={{ duration: 0.55, delay: index * 0.08 }}
              >
                <div className={styles.moduleIcon}>{industry.icon}</div>
                <h3>{industry.title}</h3>
                <p>{industry.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="ai" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.aiGrid}>
            <motion.div className={styles.aiCardPrimary} {...fadeUp}>
              <span className={styles.eyebrow}>AI that stays useful</span>
              <h2 className={styles.title}>AI should support the business, not distract from it.</h2>
              <p className={styles.lead}>
                Use AI for summaries, follow-ups, forecasts, catalogs, and industry-specific help right from the same
                workspace your team already uses.
              </p>
            </motion.div>

            <motion.div className={styles.aiCardSecondary} {...fadeUp}>
              <div className={styles.aiMetric}>
                <Bot size={18} />
                <span>Search suitable AI tools</span>
              </div>
              <div className={styles.aiMetric}>
                <Trophy size={18} />
                <span>Favorite the ones that matter</span>
              </div>
              <div className={styles.aiMetric}>
                <ShoppingBag size={18} />
                <span>Keep the rest of the dashboard business-specific</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="contact" className={styles.ctaSection}>
        <div className={styles.container}>
          <motion.div className={styles.ctaPanel} {...fadeUp}>
            <span className={styles.eyebrow}>Start your workspace</span>
            <h2 className={styles.title}>Bring your business online with a dashboard that feels like it belongs to you.</h2>
            <p className={styles.lead}>
              Set up your brand, invite your team, and start using a clean operational system that can grow with your business.
            </p>

            <div className={styles.buttonRow}>
              <a href="#signup" className={styles.primaryButton}>Create account</a>
              <a href="#login" className={styles.secondaryButton}>Log in</a>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};
