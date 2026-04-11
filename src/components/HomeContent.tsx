import { motion } from 'framer-motion';
import {
  ExternalLink,
  ImageIcon,
  MonitorSmartphone,
  Quote,
  Share2,
  Smartphone,
  SwatchBook,
  TriangleAlert,
  Users,
} from 'lucide-react';
import styles from './HomeContent.module.css';

const pains = [
  {
    title: 'Clients cannot visualize the final result',
    description: 'Verbal explanations and sample books make it hard for customers to picture the finished space.',
  },
  {
    title: 'Closing deals takes too long',
    description: 'Too many back-and-forth discussions slow approvals and reduce confidence during sales conversations.',
  },
  {
    title: 'Manual samples are hard to manage',
    description: 'Physical catalogs, screenshots, and repeated mockups create extra work for already busy teams.',
  },
];

const features = [
  {
    title: 'Visual design preview',
    description: 'Show decorators and clients a realistic interior view instead of asking them to imagine it.',
    icon: <ImageIcon size={22} />,
  },
  {
    title: 'Product catalog',
    description: 'Keep wallpapers, curtains, and materials ready in one place for faster presentations.',
    icon: <SwatchBook size={22} />,
  },
  {
    title: 'Shareable links',
    description: 'Send clean design previews your clients can open anywhere without technical friction.',
    icon: <Share2 size={22} />,
  },
  {
    title: 'Works on mobile',
    description: 'Made for decorators and clients who review designs mostly on phones across India.',
    icon: <MonitorSmartphone size={22} />,
  },
];

const socialProof = [
  {
    metric: '100+',
    label: 'decorators and studios using visual previews to pitch better',
  },
  {
    metric: '3x',
    label: 'faster concept approvals during early client discussions',
  },
  {
    metric: '24/7',
    label: 'client access through mobile-friendly shared links',
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
            <h2 className={styles.title}>Interior decorators lose momentum when clients cannot see the vision.</h2>
            <p className={styles.lead}>
              Cultains is built to remove hesitation from the design sales process and help decorators present
              ideas with more clarity and confidence.
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
              <h2 className={styles.title}>A simple visual workflow that feels premium for you and easy for clients.</h2>
              <p className={styles.lead}>
                Instead of carrying samples everywhere or explaining designs over and over, you can show realistic
                previews on actual room images and share them instantly.
              </p>
            </motion.div>

            <motion.div className={styles.solutionVisual} {...fadeUp}>
              <div className={styles.phoneFrame}>
                <div className={styles.phoneScreen}>
                  <div className={styles.mobileTopBar}>
                    <span>Client preview</span>
                    <Smartphone size={16} />
                  </div>
                  <div className={styles.mobileRoom}>
                    <div className={styles.mobileWallpaper} />
                    <div className={styles.mobileWindow} />
                    <div className={styles.mobileCurtainLeft} />
                    <div className={styles.mobileCurtainRight} />
                    <div className={styles.mobileSofa} />
                    <div className={styles.mobileRug} />
                    <span className={styles.placeholderText}>Mobile preview placeholder</span>
                  </div>
                  <div className={styles.mobileActions}>
                    <span className={styles.mobileTag}>Wallpaper: Oak Linen</span>
                    <span className={styles.mobileTag}>Curtain: Sand Drape</span>
                    <span className={styles.mobileTag}>Share Link Ready</span>
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
            <h2 className={styles.title}>Everything your team needs to present, explain, and close faster.</h2>
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
              <span className={styles.eyebrow}>Social proof</span>
              <h2 className={styles.title}>Designed to feel trustworthy from the first scroll.</h2>
              <p className={styles.lead}>
                If you are still early, these blocks can be used as placeholders until real customer quotes and
                adoption numbers are ready.
              </p>

              <div className={styles.metricsGrid}>
                {socialProof.map((item, index) => (
                  <motion.div
                    key={item.metric}
                    className={styles.metricCard}
                    {...fadeUp}
                    transition={{ duration: 0.6, delay: index * 0.08 }}
                  >
                    <span className={styles.metricValue}>{item.metric}</span>
                    <p>{item.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div className={styles.testimonialCard} {...fadeUp}>
              <Quote size={26} className={styles.quoteMark} />
              <p className={styles.testimonialText}>
                “Cultains helps us show clients exactly how the room can look. It makes presentations smoother
                and decisions much faster.”
              </p>
              <div className={styles.testimonialMeta}>
                <span className={styles.avatar}>
                  <Users size={18} />
                </span>
                <div>
                  <strong>Priya Sharma</strong>
                  <span>Founder, Studio Placeholder</span>
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
            <h2 className={styles.title}>Show one room better and your next client conversation changes immediately.</h2>
            <p className={styles.lead}>
              Start free to explore the workflow, or book a quick demo if you want help setting up your first project.
            </p>

            <div className={styles.ctaLinks}>
              <a href="mailto:hello@cultains.com?subject=Try%20Cultains" className={styles.primaryLink}>
                Try Free
                <span className={styles.buttonHint}>Start with your first room</span>
              </a>
              <a href="mailto:hello@cultains.com" className={styles.secondaryLink}>
                Book Demo
                <span className={styles.buttonHint}>Talk to our team</span>
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
                <p>Interior visualization for decorators and design firms in India.</p>
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
              <span>Made for mobile-first design sales</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
