import { motion } from 'framer-motion';
import {
  BadgeIndianRupee,
  Bot,
  Boxes,
  Check,
  Crown,
} from 'lucide-react';
import { BrandWordmark } from './BrandWordmark';
import styles from './PricingPage.module.css';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6 },
};

const plans = [
  {
    name: 'Vyapar Starter',
    badge: 'Start free',
    monthly: '₹0',
    annual: '₹0',
    cadence: 'forever',
    accent: 'starter',
    intro: 'For small shops that want to begin digitizing billing, customers, and daily operations without upfront cost.',
    highlights: [
      'Choose any 3 core tools to begin',
      'Up to 50 invoices per month',
      'Up to 100 inventory items',
      'Single-owner workflow',
      'Clean foundation for first-time digital adoption',
    ],
    why: 'Perfect for trying the system in a real business before moving into a paid operating setup.',
    icon: BadgeIndianRupee,
  },
  {
    name: 'Vyapar Growth',
    badge: 'Most popular',
    monthly: '₹349',
    annual: '₹3,839',
    cadence: 'per month',
    accent: 'growth',
    intro: 'For growing businesses that want billing, stock, and customer operations to feel faster, clearer, and more organized every day.',
    highlights: [
      'Billing + Inventory + Barcode Desk included',
      'Customers + CRM + Business Calendar included',
      'Up to 3 team members included',
      'Higher invoice and stock capacity for active stores',
      'Best fit for retail shops, service teams, and growing local brands',
      'Upgrade anytime as your business grows without losing your workspace data',
    ],
    why: 'This plan gives the biggest operational jump without making the owner feel like they are overpaying.',
    icon: Boxes,
  },
  {
    name: 'Vyapar Premium',
    badge: 'Scale confidently',
    monthly: '₹1,199',
    annual: '₹13,189',
    cadence: 'per month',
    accent: 'premium',
    intro: 'For established businesses that want the full workspace, smoother team coordination, and faster support as they scale.',
    highlights: [
      'Everything across the dashboard included',
      'Higher usage limits across billing and operations',
      'Advanced team workflows and access control',
      'Priority support through Raise an Issue',
      'Ideal for multi-staff stores and process-heavy operations',
      'Move up from any lower plan anytime with your existing business data kept intact',
    ],
    why: 'Designed for businesses that now care less about tool cost and more about speed, control, and reliability.',
    icon: Crown,
  },
];

export const PricingPage = () => {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <motion.div className={styles.eyebrow} {...fadeUp}>
            Pricing
          </motion.div>
          <motion.h1 className={styles.title} {...fadeUp}>
            Clear plans for businesses growing with <BrandWordmark />
          </motion.h1>
          <motion.p className={styles.lead} {...fadeUp}>
            Start free, move into the plan that matches your daily operations, and scale into a full business workspace
            when your team, invoices, and workflows grow.
          </motion.p>
        </div>
      </section>

      <section className={styles.planSection}>
        <div className={styles.planGrid}>
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <motion.article
                key={plan.name}
                className={`${styles.planCard} ${styles[plan.accent]}`}
                {...fadeUp}
                transition={{ duration: 0.55, delay: index * 0.08 }}
              >
                <div className={styles.planHeader}>
                  <div className={styles.planBadge}>{plan.badge}</div>
                  <div className={styles.planIcon}>
                    <Icon size={20} />
                  </div>
                </div>

                <h2 className={styles.planName}>{plan.name}</h2>
                <div className={styles.priceBlock}>
                  <div className={styles.priceRow}>
                    <span className={styles.price}>{plan.monthly}</span>
                    <span className={styles.cadence}>{plan.cadence}</span>
                  </div>
                  <div className={styles.annualRow}>
                    Annual plan: {plan.annual}/year
                    {plan.monthly === '₹0' ? '' : ' • billed for 11 months, 12th month free'}
                  </div>
                </div>

                <p className={styles.planIntro}>{plan.intro}</p>

                <div className={styles.featureList}>
                  {plan.highlights.map((item) => (
                    <div key={item} className={styles.featureItem}>
                      <Check size={16} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.planNote}>{plan.why}</div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className={styles.aiSection}>
        <motion.div className={styles.aiCard} {...fadeUp}>
          <div className={styles.aiTop}>
            <div className={styles.aiIcon}>
              <Bot size={20} />
            </div>
            <div>
              <div className={styles.aiEyebrow}>AI credits</div>
              <h2 className={styles.aiTitle}>AI tools are billed separately from your plan</h2>
            </div>
          </div>
          <p className={styles.aiLead}>
            Use AI credits only when you need them. This keeps your main subscription simple, while giving you the
            freedom to use AI workflows, assistants, and generation tools on a pay-as-you-go basis.
          </p>
          <div className={styles.aiPoints}>
            <div className={styles.aiPoint}><Check size={16} /> Separate from monthly subscription</div>
            <div className={styles.aiPoint}><Check size={16} /> Buy credits as your team needs them</div>
            <div className={styles.aiPoint}><Check size={16} /> Better cost control for business owners</div>
          </div>
        </motion.div>
      </section>
    </div>
  );
};
