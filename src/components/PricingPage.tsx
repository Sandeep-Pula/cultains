import { motion } from 'framer-motion';
import {
  BadgeIndianRupee,
  Boxes,
  Check,
  Crown,
  Handshake,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';
import { ProductWordmark } from './BrandWordmark';
import styles from './PricingPage.module.css';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6 },
};

const trialHighlights = [
  'First month free trial',
  'Free onboarding and migration',
  'Complaints and grievance portal',
];

const plans = [
  {
    name: 'Starter',
    badge: 'Focused setup',
    price: '₹999',
    cadence: '/ month',
    tools: '3 tools',
    credits: '50 AI credits / month',
    accent: 'starter',
    intro: 'For owner-led businesses that want to begin with the most important dashboard tools.',
    highlights: [
      'Choose 3 tools from the dashboard',
      'Limited usability for controlled MVP adoption',
      '50 AI credits included every month',
      'Best for testing PULA Biz with a small operating workflow',
    ],
    why: 'A practical entry point for businesses that want structure before scaling usage.',
    icon: BadgeIndianRupee,
  },
  {
    name: 'Growth',
    badge: 'Most popular',
    price: '₹2,999',
    cadence: '/ month',
    tools: '6 tools total',
    credits: '100 AI credits / month',
    accent: 'growth',
    intro: 'For growing teams ready to connect more workflows with no usage restriction.',
    highlights: [
      'Add the next 3 selected dashboard tools',
      'Unlimited usability inside selected tools',
      '100 AI credits included every month',
      'Good fit for growing shops, service teams, and local brands',
    ],
    why: 'A balanced plan for teams that need daily usage without jumping into every module.',
    icon: Boxes,
  },
  {
    name: 'Business Pro',
    badge: 'Full workspace',
    price: '₹7,999',
    cadence: '/ month',
    tools: 'All tools',
    credits: '500 AI credits / month',
    accent: 'premium',
    intro: 'For businesses that want the complete PULA Biz dashboard with full operating visibility.',
    highlights: [
      'All available dashboard tools included',
      'Unlimited usability across the workspace',
      '500 AI credits included every month',
      'Best for multi-staff teams and process-heavy operations',
      'Priority support through the grievance portal',
    ],
    why: 'Built for businesses that want the full operating layer and higher AI capacity.',
    icon: Crown,
  },
  {
    name: 'Enterprise / Franchise',
    badge: 'Custom plan',
    price: 'Custom',
    cadence: '',
    tools: 'Configured rollout',
    credits: 'Custom AI credits',
    accent: 'enterprise',
    intro: 'For franchises, multi-location businesses, and teams that need custom rollout support.',
    highlights: [
      'Custom dashboard/tool configuration',
      'Franchise or branch-wise operating setup',
      'Migration and training plan for larger teams',
      'Custom AI credit limits and support terms',
      'Commercials based on scope, users, and rollout depth',
    ],
    why: 'Designed for businesses that need Pula Labs to shape the product around their operating model.',
    icon: Handshake,
  },
];

export const PricingPage = () => {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.pricingAnimation} aria-hidden="true">
          <span className={styles.redShape} />
          <span className={styles.blueShape} />
          <span className={styles.redRing} />
        </div>
        <div className={styles.heroCopy}>
          <motion.img
            src={`${import.meta.env.BASE_URL}pula-biz-logo-transparent.png`}
            alt="PULA Biz"
            className={styles.pricingLogo}
            {...fadeUp}
          />
          <motion.div className={styles.eyebrow} {...fadeUp}>
            Pricing for PULA Biz
          </motion.div>
          <motion.h1 className={styles.title} {...fadeUp}>
            Pricing that starts simple and scales with your business.
          </motion.h1>
          <motion.p className={styles.lead} {...fadeUp}>
            Start with a free first month, choose the dashboard tools your business needs, and keep AI usage flexible
            with monthly credits inside <ProductWordmark />.
          </motion.p>
        </div>
      </section>

      <section className={styles.offerSection}>
        <motion.div className={styles.offerCard} {...fadeUp}>
          <div className={styles.offerBadge}>Included with every plan</div>
          <h2 className={styles.offerTitle}>Start with support, not confusion.</h2>
          <p className={styles.offerLead}>
            Every business gets a first month trial, onboarding help, migration support, and access to the complaints
            and grievance portal from day one.
          </p>
          <div className={styles.offerPoints}>
            {trialHighlights.map((item) => (
              <div key={item} className={styles.offerPoint}>
                <Check size={18} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className={styles.planSection}>
        <motion.div className={styles.planIntroBlock} {...fadeUp}>
          <div className={styles.planIntroEyebrow}>After the trial</div>
          <h2 className={styles.planIntroTitle}>Choose the Biz plan that fits your team.</h2>
          <p className={styles.planIntroText}>
            Plans are monthly. AI credits are included up to the plan limit and billed separately on a pay-as-you-go
            basis if exceeded.
          </p>
        </motion.div>
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
                    <span className={styles.price}>{plan.price}</span>
                    <span className={styles.cadence}>{plan.cadence}</span>
                  </div>
                  <div className={styles.planMetaGrid}>
                    <span>{plan.tools}</span>
                    <span>{plan.credits}</span>
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
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className={styles.aiEyebrow}>AI credits and overage</div>
              <h2 className={styles.aiTitle}>Use included credits first. Pay separately only if you exceed them.</h2>
            </div>
          </div>
          <p className={styles.aiLead}>
            Starter includes 50 credits, Growth includes 100 credits, and Business Pro includes 500 credits every month.
            If a team crosses its monthly limit, additional AI credits are billed separately as pay-as-you-go usage.
          </p>
          <div className={styles.aiPoints}>
            <div className={styles.aiPoint}><LayoutDashboard size={16} /> Credits reset monthly</div>
            <div className={styles.aiPoint}><Check size={16} /> Overage billed separately</div>
            <div className={styles.aiPoint}><Check size={16} /> Better cost control for owners</div>
          </div>
        </motion.div>
      </section>
    </div>
  );
};
