import { motion } from 'framer-motion';
import {
  BadgeIndianRupee,
  Bot,
  Boxes,
  Building2,
  ClipboardCheck,
  LayoutDashboard,
  Palette,
  Quote,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  TriangleAlert,
  Trophy,
  Users,
} from 'lucide-react';
import styles from './HomeContent.module.css';

const pains = [
  {
    title: 'Businesses lose time across too many apps',
    description: 'Leads, invoices, stock records, taxes, and follow-ups often sit in different tools, sheets, chats, and notebooks.',
  },
  {
    title: 'Growth creates operational blind spots',
    description: 'As teams grow, it becomes harder to see pending payments, low stock, team ownership, tax work, and customer status in one place.',
  },
  {
    title: 'AI tools feel impressive but disconnected',
    description: 'Many businesses try AI in isolation, but the results rarely connect back to CRM, billing, inventory, or daily execution.',
  },
];

const features = [
  {
    title: 'CRM and customer pipeline',
    description: 'Capture leads, manage follow-ups, assign owners, and move every customer through a clear sales journey.',
    icon: <LayoutDashboard size={22} />,
  },
  {
    title: 'Inventory and stock control',
    description: 'Track products, stock levels, reorder needs, and issued items without relying on messy manual spreadsheets.',
    icon: <Boxes size={22} />,
  },
  {
    title: 'Billing, taxes, and money flow',
    description: 'Stay on top of quotations, invoices, receivables, expenses, and tax-ready financial records in one system.',
    icon: <BadgeIndianRupee size={22} />,
  },
  {
    title: 'Business AI tools',
    description: 'Use AI for sales support, catalog help, forecasting, industry workflows, and future automations directly from the dashboard.',
    icon: <Bot size={22} />,
  },
];

const platformHighlights = [
  {
    title: 'Shared visibility',
    description: 'Owners, admins, sales, and operations teams work from the same real-time view instead of duplicate files.',
    icon: <ClipboardCheck size={20} />,
  },
  {
    title: 'Financial clarity',
    description: 'Understand receivables, expenses, billing health, and working capital without hunting across separate tools.',
    icon: <ReceiptText size={20} />,
  },
  {
    title: 'Reliable execution',
    description: 'Standardize work so store teams, field staff, finance, and back-office operators stay aligned every day.',
    icon: <ShieldCheck size={20} />,
  },
];

const industries = [
  {
    title: 'Shoe shops',
    description: 'Track fast-moving inventory, repeat customers, seasonal offers, and smarter restocking.',
    icon: <ShoppingBag size={22} />,
  },
  {
    title: 'Interior decorators',
    description: 'Manage leads, projects, materials, billing, and AI-supported previews in one operating flow.',
    icon: <Palette size={22} />,
  },
  {
    title: 'Sports shops',
    description: 'Monitor product movement, supplier orders, team performance, and local demand with better visibility.',
    icon: <Trophy size={22} />,
  },
  {
    title: 'Growing business teams',
    description: 'Use a modular system that fits retail, wholesale, distribution, and service businesses without rebuilding everything.',
    icon: <Building2 size={22} />,
  },
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
          <motion.div className={styles.sectionIntro} {...fadeUp}>
            <span className={styles.eyebrow}>The problem</span>
            <h2 className={styles.title}>Most businesses do not need more software. They need one place where the business actually runs.</h2>
            <p className={styles.lead}>
              mydandha is designed as a one-stop platform for businesses that want CRM, billing, taxes, stock
              management, ERP-style workflows, and AI solutions under one roof.
            </p>
          </motion.div>

          <div className={styles.problemGrid}>
            {pains.map((pain, index) => (
              <motion.div
                key={pain.title}
                className={styles.problemCard}
                {...fadeUp}
                transition={{ duration: 0.6, delay: index * 0.08 }}
              >
                <div className={styles.problemIcon}>
                  <TriangleAlert size={20} />
                </div>
                <h3>{pain.title}</h3>
                <p>{pain.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <div className={styles.solutionPanel}>
            <motion.div className={styles.solutionCopy} {...fadeUp}>
              <span className={styles.eyebrow}>Why it works</span>
              <h2 className={styles.title}>Operations and AI live together, so businesses move faster without losing control.</h2>
              <p className={styles.lead}>
                Your team can manage inquiries, assign work, track stock, monitor invoices, review taxes, and launch
                AI workflows without breaking context or switching products.
              </p>

              <div className={styles.solutionList}>
                <div className={styles.solutionItem}>
                  <div className={styles.solutionItemIcon}>
                    <Users size={18} />
                  </div>
                  <div>
                    <strong>Manage customers and teams</strong>
                    <p>Keep lead ownership, follow-ups, tasks, and accountability visible across the company.</p>
                  </div>
                </div>
                <div className={styles.solutionItem}>
                  <div className={styles.solutionItemIcon}>
                    <Boxes size={18} />
                  </div>
                  <div>
                    <strong>Track stock, billing, and operations</strong>
                    <p>Bring inventory, invoices, receivables, purchasing, and routine workflows into one operating layer.</p>
                  </div>
                </div>
                <div className={styles.solutionItem}>
                  <div className={styles.solutionItemIcon}>
                    <Bot size={18} />
                  </div>
                  <div>
                    <strong>Activate AI tools from the dashboard</strong>
                    <p>Use industry AI as part of the workflow instead of treating it like a separate experiment.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div className={styles.solutionVisual} {...fadeUp}>
              <div className={styles.commandCenter}>
                <div className={styles.commandHeader}>
                  <span>Control center</span>
                  <LayoutDashboard size={16} />
                </div>
                <div className={styles.commandBody}>
                  <div className={styles.commandBlock}>
                    <strong>Morning priorities</strong>
                    <span>8 follow-ups due</span>
                    <span>3 invoices pending</span>
                    <span>2 stock alerts active</span>
                  </div>
                  <div className={styles.commandBlock}>
                    <strong>AI copilots</strong>
                    <span>Draft quote for showroom order</span>
                    <span>Suggest fast-selling SKUs</span>
                    <span>Summarize customer conversation</span>
                  </div>
                  <div className={styles.commandBlockWide}>
                    <strong>Business snapshot</strong>
                    <p>Sales, finance, operations, and AI recommendations are visible in one place for faster decisions.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="product" className={styles.section}>
        <div className={styles.container}>
          <motion.div className={styles.sectionIntro} {...fadeUp}>
            <span className={styles.eyebrow}>Feature highlights</span>
            <h2 className={styles.title}>Core modules for running the business, not just tracking tasks.</h2>
          </motion.div>

          <div className={styles.featureGrid}>
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className={styles.featureCard}
                {...fadeUp}
                transition={{ duration: 0.6, delay: index * 0.08 }}
              >
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="industries" className={styles.sectionAlt}>
        <div className={styles.container}>
          <motion.div className={styles.sectionIntro} {...fadeUp}>
            <span className={styles.eyebrow}>Industry fit</span>
            <h2 className={styles.title}>Built to adapt across different business types instead of forcing one template on everyone.</h2>
            <p className={styles.lead}>
              mydandha starts as a strong business core and grows into industry-specific workflows for retail,
              interiors, sports, trading, and service businesses.
            </p>
          </motion.div>

          <div className={styles.featureGrid}>
            {industries.map((industry, index) => (
              <motion.div
                key={industry.title}
                className={styles.featureCard}
                {...fadeUp}
                transition={{ duration: 0.6, delay: index * 0.08 }}
              >
                <div className={styles.featureIcon}>{industry.icon}</div>
                <h3>{industry.title}</h3>
                <p>{industry.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="ai" className={styles.sectionAlt}>
        <div className={styles.container}>
          <div className={styles.trustGrid}>
            <motion.div className={styles.trustCopy} {...fadeUp}>
              <span className={styles.eyebrow}>AI + operations</span>
              <h2 className={styles.title}>AI becomes useful when it is connected to your business data and daily workflow.</h2>
              <p className={styles.lead}>
                mydandha is built so AI can assist real business jobs: drafting quotes, summarizing leads, forecasting
                stock, organizing catalogs, and powering industry-specific tools when the team needs them.
              </p>

              <div className={styles.metricsGrid}>
                {platformHighlights.map((item, index) => (
                  <motion.div
                    key={item.title}
                    className={styles.metricCard}
                    {...fadeUp}
                    transition={{ duration: 0.6, delay: index * 0.08 }}
                  >
                    <div className={styles.metricIcon}>{item.icon}</div>
                    <span className={styles.metricTitle}>{item.title}</span>
                    <p>{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div className={styles.testimonialCard} {...fadeUp}>
              <Quote size={26} className={styles.quoteMark} />
              <p className={styles.testimonialText}>
                “mydandha feels like the operating layer we were missing. Our team can handle customers, inventory,
                billing, and AI workflows without juggling separate apps all day.”
              </p>
              <div className={styles.testimonialMeta}>
                <span className={styles.avatar}>
                  <Users size={18} />
                </span>
                <div>
                  <strong>Rohan Mehta</strong>
                  <span>Founder, multi-store retail business</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="contact" className={styles.ctaSection}>
        <div className={styles.container}>
          <motion.div className={styles.ctaPanel} {...fadeUp}>
            <span className={styles.eyebrow}>Ready to build on it</span>
            <h2 className={styles.title}>Launch mydandha as the digital control room for your business.</h2>
            <p className={styles.lead}>
              Start with CRM, stock, billing, tax workflows, and team operations now. Add AI solutions business by
              business as the platform grows.
            </p>

            <div className={styles.buttonRow}>
              <a href="#signup" className={styles.primaryButton}>
                <span className={styles.buttonHint}>Set up your business workspace</span>
                <span className={styles.buttonText}>Create account</span>
              </a>
              <a href="#login" className={styles.secondaryButton}>
                <span className={styles.buttonHint}>Already have access?</span>
                <span className={styles.buttonText}>Log in</span>
              </a>
            </div>

            <div className={styles.footerBrand}>
              <img src={`${import.meta.env.BASE_URL}mydandha-logo.png`} alt="mydandha logo" className={styles.footerLogo} />
              <div>
                <strong>mydandha</strong>
                <p>One-stop business operating system with AI-ready workflows for modern Indian companies.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};
