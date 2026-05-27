import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BadgeIndianRupee,
  Boxes,
  Check,
  Crown,
  Handshake,
  X,
} from 'lucide-react';
import styles from './PricingPage.module.css';

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.45 },
};

type PlanFeature = {
  label: string;
  isNew?: boolean;
};

type BillingCycle = 'monthly' | 'yearly';

const plans = [
  {
    name: 'Freemium',
    badge: 'Free forever',
    monthlyPrice: '₹0',
    yearlyPrice: '₹0',
    monthlyCadence: '/ month',
    yearlyCadence: '/ year',
    billingHint: 'Free forever',
    tools: '1 tool',
    credits: '50 AI credits',
    accent: 'starter',
    intro: 'For small businesses starting with digital billing.',
    highlights: [
      { label: 'Cash Register' },
    ] satisfies PlanFeature[],
    why: 'Extra staff accounts: ₹299/user/month.',
    icon: BadgeIndianRupee,
  },
  {
    name: 'Focused',
    badge: 'A good start',
    monthlyPrice: '₹1,999',
    yearlyPrice: '₹21,989',
    monthlyCadence: '/ month',
    yearlyCadence: '/ year',
    billingHint: '12th month free',
    tools: '4 tools',
    credits: '100 AI credits',
    accent: 'growth',
    intro: 'For complete billing, stock, and barcode control.',
    highlights: [
      { label: 'Overview', isNew: true },
      { label: 'Cash Register' },
      { label: 'Inventory Management', isNew: true },
      { label: 'Barcode Desk', isNew: true },
    ] satisfies PlanFeature[],
    why: 'Extra staff accounts: ₹299/user/month.',
    icon: Boxes,
  },
  {
    name: 'Growth',
    badge: 'Most popular',
    monthlyPrice: '₹2,999',
    yearlyPrice: '₹32,989',
    monthlyCadence: '/ month',
    yearlyCadence: '/ year',
    billingHint: '12th month free',
    tools: '9 tools',
    credits: '250 AI credits',
    accent: 'premium',
    intro: 'For businesses that want the complete PULA Biz workspace.',
    highlights: [
      { label: 'Overview' },
      { label: 'Cash Register' },
      { label: 'Inventory Management' },
      { label: 'Barcode Desk' },
      { label: 'Accounting Books', isNew: true },
      { label: 'Business Co-pilot', isNew: true },
      { label: 'Timesheet', isNew: true },
      { label: 'Business Calendar', isNew: true },
      { label: 'CRM', isNew: true },
    ] satisfies PlanFeature[],
    why: 'Extra staff accounts: ₹299/user/month.',
    icon: Crown,
  },
  {
    name: 'Business Pro',
    badge: 'Full workspace',
    monthlyPrice: 'Custom',
    yearlyPrice: 'Custom',
    monthlyCadence: '',
    yearlyCadence: '',
    billingHint: 'Custom commercials',
    tools: 'Configured rollout',
    credits: '500+ AI credits',
    accent: 'enterprise',
    intro: 'For franchises, multi-location teams, and custom rollout.',
    highlights: [
      { label: 'Custom dashboard/tool configuration', isNew: true },
      { label: 'Franchise or branch-wise operating setup', isNew: true },
      { label: 'Migration and training plan', isNew: true },
      { label: 'Custom AI tools and support terms', isNew: true },
      { label: 'Commercials based on scope', isNew: true },
    ] satisfies PlanFeature[],
    why: 'Built around your operating model.',
    icon: Handshake,
  },
];

export const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [showTrialNotice, setShowTrialNotice] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={styles.page}>
      {showTrialNotice ? (
        <div className={styles.noticeOverlay} role="dialog" aria-modal="true" aria-labelledby="trial-notice-title">
          <motion.div
            className={styles.noticeDialog}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.28 }}
          >
            <button
              type="button"
              className={styles.noticeClose}
              onClick={() => setShowTrialNotice(false)}
              aria-label="Close pricing notice"
            >
              <X size={18} />
            </button>
            <div className={styles.noticeIcon}>
              <AlertTriangle size={22} />
            </div>
            <h1 id="trial-notice-title">3 months free trial is active right now.</h1>
            <p>
              We are currently offering PULA Biz free for the first 3 months. Actual billing starts after the trial.
              Prices shown here are working estimates and may change while we finalize the subscription model.
            </p>
            <button type="button" className={styles.noticeButton} onClick={() => setShowTrialNotice(false)}>
              View plans
            </button>
          </motion.div>
        </div>
      ) : null}

      <section className={styles.planSection} aria-label="PULA Biz pricing plans">
        <div className={styles.billingSwitch} aria-label="Choose billing cycle">
          <button
            type="button"
            className={billingCycle === 'monthly' ? styles.activeBilling : ''}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={billingCycle === 'yearly' ? styles.activeBilling : ''}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly
          </button>
        </div>
        <div className={styles.planGrid}>
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
            const cadence = billingCycle === 'monthly' ? plan.monthlyCadence : plan.yearlyCadence;

            return (
              <motion.article
                key={plan.name}
                className={`${styles.planCard} ${styles[plan.accent]}`}
                {...fadeUp}
                transition={{ duration: 0.45, delay: index * 0.06 }}
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
                    <span className={styles.price}>{price}</span>
                    <span className={styles.cadence}>{cadence}</span>
                  </div>
                  <div className={styles.billingHint}>{billingCycle === 'yearly' ? plan.billingHint : ''}</div>
                  <div className={styles.planMetaGrid}>
                    <span>{plan.tools}</span>
                    <span>{plan.credits}</span>
                  </div>
                </div>

                <p className={styles.planIntro}>{plan.intro}</p>

                <div className={styles.featureList}>
                  {plan.highlights.map((item) => (
                    <div key={item.label} className={`${styles.featureItem} ${item.isNew ? styles.upgradeFeature : ''}`}>
                      <Check size={16} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>

                <button type="button" className={styles.paymentButton}>
                  Choose this plan
                </button>

                <div className={styles.planFooter}>{plan.why}</div>
              </motion.article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
