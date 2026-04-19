import { motion } from 'framer-motion';
import {
  BadgeIndianRupee,
  Bot,
  Boxes,
  ClipboardCheck,
  ExternalLink,
  ImageIcon,
  LayoutDashboard,
  ReceiptText,
  Quote,
  ShieldCheck,
  TriangleAlert,
  Users,
} from 'lucide-react';
import styles from './HomeContent.module.css';

const pains = [
  {
    title: 'Decorator teams jump between too many tools',
    description: 'Leads, projects, materials, finance, and follow-ups often live in different apps, sheets, and chat threads.',
  },
  {
    title: 'Operations become messy as projects grow',
    description: 'Inventory gaps, pending bills, salary tracking, and customer updates get harder to manage when the business scales.',
  },
  {
    title: 'AI tools feel disconnected from execution',
    description: 'Even when a studio uses rendering tools, the output is often separated from CRM, billing, and the rest of the workflow.',
  },
];

const features = [
  {
    title: 'Decorator CRM',
    description: 'Track leads, active customers, project stages, follow-ups, and collaboration history in one workspace.',
    icon: <LayoutDashboard size={22} />,
  },
  {
    title: 'Inventory control',
    description: 'Manage stock, reorder needs, suppliers, issued materials, and project allocations without manual spreadsheets.',
    icon: <Boxes size={22} />,
  },
  {
    title: 'Billing and salary workflows',
    description: 'Stay on top of quotes, payments, expenses, salaries, and project finances with clearer business visibility.',
    icon: <BadgeIndianRupee size={22} />,
  },
  {
    title: 'Integrated AI tools',
    description: 'Use AI room rendering and future AI utilities from inside the dashboard instead of juggling separate tools.',
    icon: <Bot size={22} />,
  },
];

const platformHighlights = [
  {
    title: 'Customer pipeline',
    description: 'Move every inquiry from first call to approved execution with visible progress and ownership.',
    icon: <ClipboardCheck size={20} />,
  },
  {
    title: 'Financial clarity',
    description: 'Understand receivables, expenses, and team payouts without hunting through separate records.',
    icon: <ReceiptText size={20} />,
  },
  {
    title: 'Reliable workflows',
    description: 'Standardize operations so decorators, site teams, and back office staff stay aligned.',
    icon: <ShieldCheck size={20} />,
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
            <h2 className={styles.title}>Interior decorators need more than a rendering tool. They need one system to run the business.</h2>
            <p className={styles.lead}>
              Cultains is designed as a one-stop platform for interior decorators managing customers, projects,
              inventory, billing, salaries, and AI-assisted design workflows.
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
              <h2 className={styles.title}>Operations and AI live in the same place, so decorators can move faster without losing control.</h2>
              <p className={styles.lead}>
                Your team can manage inquiries, assign work, track stock, monitor billing, and then jump into AI room
                rendering exactly when a project needs a persuasive visual.
              </p>

              <div className={styles.solutionList}>
                <div className={styles.solutionItem}>
                  <div className={styles.solutionItemIcon}>
                    <Users size={18} />
                  </div>
                  <div>
                    <strong>Manage customers and teams</strong>
                    <p>Keep project ownership, follow-ups, and collaboration visible across the studio.</p>
                  </div>
                </div>
                <div className={styles.solutionItem}>
                  <div className={styles.solutionItemIcon}>
                    <Boxes size={18} />
                  </div>
                  <div>
                    <strong>Track stock and billing</strong>
                    <p>Bring materials, expenses, salary-related workflows, and receivables into one operating layer.</p>
                  </div>
                </div>
                <div className={styles.solutionItem}>
                  <div className={styles.solutionItemIcon}>
                    <ImageIcon size={18} />
                  </div>
                  <div>
                    <strong>Activate AI tools from the dashboard</strong>
                    <p>Use room rendering as part of the workflow instead of treating it like a separate product.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div className={styles.solutionVisual} {...fadeUp}>
              <div className={styles.phoneFrame}>
                <div className={styles.phoneScreen}>
                  <div className={styles.mobileTopBar}>
                    <span>Decorator workspace</span>
                    <LayoutDashboard size={16} />
                  </div>
                  <div className={styles.mobileRoom}>
                    <div className={styles.mobileWallpaper} />
                    <div className={styles.mobileWindow} />
                    <div className={styles.mobileCurtainLeft} />
                    <div className={styles.mobileCurtainRight} />
                    <div className={styles.mobileSofa} />
                    <div className={styles.mobileRug} />
                    <span className={styles.placeholderText}>CRM + inventory + AI tools</span>
                  </div>
                  <div className={styles.mobileActions}>
                    <span className={styles.mobileTag}>Lead status: consultation done</span>
                    <span className={styles.mobileTag}>Billing: 60% payment received</span>
                    <span className={styles.mobileTag}>AI room rendering available</span>
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
            <h2 className={styles.title}>Everything your team needs to manage decorators’ operations and deliver a premium client experience.</h2>
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

      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <div className={styles.trustGrid}>
            <motion.div className={styles.trustCopy} {...fadeUp}>
              <span className={styles.eyebrow}>Platform value</span>
              <h2 className={styles.title}>Built for decorator businesses that want tighter operations and smarter selling.</h2>
              <p className={styles.lead}>
                Cultains is not just about showing a room. It helps decorators organize the full lifecycle from lead
                capture to billing, while keeping AI capabilities ready for client-facing moments.
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
                “Cultains gives our studio one place to manage customers, teams, stock, billing, and AI previews.
                It feels much closer to how an interior business actually runs.”
              </p>
              <div className={styles.testimonialMeta}>
                <span className={styles.avatar}>
                  <Users size={18} />
                </span>
                <div>
                  <strong>Priya Sharma</strong>
                  <span>Founder, Studio Flow</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="contact" className={styles.ctaSection}>
        <div className={styles.container}>
          <motion.div className={styles.ctaPanel} {...fadeUp}>
            <span className={styles.eyebrow}>Ready to try it</span>
            <h2 className={styles.title}>Run your decorator business from one dashboard and keep AI tools ready inside it.</h2>
            <p className={styles.lead}>
              Start exploring the platform, or book a demo if you want help setting up your CRM, inventory, billing,
              and AI-assisted design workflow together.
            </p>

            <div className={styles.ctaLinks}>
              <a href="#signup" className={styles.primaryLink}>
                Start Free
                <span className={styles.buttonHint}>Set up your decorator workspace</span>
              </a>
              <a href="mailto:hello@cultains.com" className={styles.secondaryLink}>
                Book Demo
                <span className={styles.buttonHint}>See the full platform in action</span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              <img src={`${import.meta.env.BASE_URL}cultains-logo-black.png`} alt="Cultains logo" className={styles.footerLogo} />
              <div>
                <strong>Cultains</strong>
                <p>One-stop operating system for interior decorators and design firms in India.</p>
              </div>
            </div>

            <div className={styles.footerLinks}>
              <a href="#about">About</a>
              <a href="#product">Features</a>
              <a href="#workflow">How it works</a>
              <a href="mailto:hello@cultains.com">Contact</a>
            </div>

            <div className={styles.footerMeta}>
              <a href="mailto:hello@cultains.com">
                hello@cultains.com
                <ExternalLink size={15} />
              </a>
              <span>CRM, inventory, billing, team workflow, and AI tools in one place</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
