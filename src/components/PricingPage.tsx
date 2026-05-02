import { motion } from 'framer-motion';
import {
  BadgeIndianRupee,
  Boxes,
  Check,
  Crown,
  LayoutDashboard,
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
  '1 month free trial for every workspace',
  'Free onboarding and training support if needed',
  'Monthly per-account billing starts after the trial',
];

const plans = [
  {
    name: 'Biz Starter',
    badge: 'Trial launch',
    monthly: '%%%%',
    annual: '%%%%',
    cadence: 'per account / month',
    accent: 'starter',
    intro: 'For businesses starting with a focused operating setup.',
    highlights: [
      'Choose a focused starting setup',
      'Good for owner-led teams and first branches',
      'Clean foundation for first-time digital adoption',
    ],
    why: 'A practical first step for bringing business operations into one OS.',
    icon: BadgeIndianRupee,
  },
  {
    name: 'Biz Growth',
    badge: 'Most popular',
    monthly: '%%%%',
    annual: '%%%%',
    cadence: 'per account / month',
    accent: 'growth',
    intro: 'For growing teams that need a wider operating rollout.',
    highlights: [
      'Choose more core tools beyond your Starter setup',
      'Up to 3 team members included',
      'Best fit for retail shops, service teams, and growing local brands',
      'Easy upgrade path as the business grows',
    ],
    why: 'The best fit for teams ready to connect more of the business.',
    icon: Boxes,
  },
  {
    name: 'Biz Premium',
    badge: 'Scale confidently',
    monthly: '%%%%',
    annual: '%%%%',
    cadence: 'per account / month',
    accent: 'premium',
    intro: 'For established businesses rolling out the full operating workspace.',
    highlights: [
      'Everything across the dashboard included',
      'Advanced team workflows and access control',
      'Priority support through Raise an Issue',
      'Ideal for multi-staff stores and process-heavy operations',
      'Move up anytime with your existing business data intact',
    ],
    why: 'Built for businesses that want scale, control, and smoother coordination.',
    icon: Crown,
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
            Simple plans for running the business from one operating system.
          </motion.h1>
          <motion.p className={styles.lead} {...fadeUp}>
            Start with a 1 month free trial and free training support. After that, keep CRM, billing, inventory,
            finance, teams, operations, and AI tools connected through <ProductWordmark />.
          </motion.p>
        </div>
      </section>

      <section className={styles.offerSection}>
        <motion.div className={styles.offerCard} {...fadeUp}>
          <div className={styles.offerBadge}>Start with zero risk</div>
          <h2 className={styles.offerTitle}>Get 1 month free trial plus Biz onboarding support.</h2>
          <p className={styles.offerLead}>
            Start using the operating system first. If your team needs onboarding help, training support is included
            during the trial.
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
            Monthly pricing is charged per account. The values below are masked for now.
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
                    <span className={styles.price}>{plan.monthly}</span>
                    <span className={styles.cadence}>{plan.cadence}</span>
                  </div>
                  <div className={styles.annualRow}>
                    Monthly account pricing: {plan.monthly}
                    {' '}• annual reference: {plan.annual}
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
              <LayoutDashboard size={20} />
            </div>
            <div>
              <div className={styles.aiEyebrow}>AI tools and credits</div>
              <h2 className={styles.aiTitle}>AI usage can stay flexible inside Biz</h2>
            </div>
          </div>
          <p className={styles.aiLead}>
            Use AI credits only when you need them. This keeps the main Biz subscription simple, while giving
            your team freedom to use AI workflows, assistants, and generation tools on a pay-as-you-go basis.
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
