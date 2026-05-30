import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeIndianRupee,
  Bot,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  FileText,
  Globe,
  Handshake,
  Mail,
  MapPin,
  ReceiptText,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { AuthCard } from './AuthCard';
import { AppInstallSection } from './AppInstallSection';
import { ProductWordmark } from './BrandWordmark';
import { PublicNarrativeDemo } from './PublicNarrativeDemo';
import styles from './PublicHome.module.css';

type PublicHomeProps = {
  authMode?: 'login' | 'signup';
  showAuth?: boolean;
};

const modules = [
  {
    title: 'Manage customers and sales',
    description: 'Save customer details, track leads, schedule follow-ups, prepare quotations, and monitor deals until payment.',
    icon: <Users size={22} />,
  },
  {
    title: 'Create GST bills and quotations',
    description: 'Generate Indian GST invoices, share quotations before a sale, track pending payments, and keep billing history organized.',
    icon: <BadgeIndianRupee size={22} />,
  },
  {
    title: 'Control products and stock',
    description: 'Track item variants, barcodes, available stock, low-stock alerts, damaged items, suppliers, and purchase references.',
    icon: <Boxes size={22} />,
  },
  {
    title: 'Run the billing counter',
    description: 'Use a simple cash register for daily sales, discounts, GST billing, invoice reprints, and voided bill records.',
    icon: <ShoppingBag size={22} />,
  },
  {
    title: 'Track staff and permissions',
    description: 'Give team members their own login, choose which areas they can access, and control the actions they are allowed to perform.',
    icon: <Users size={22} />,
  },
  {
    title: 'See finance and business activity',
    description: 'Review sales, dues, ledger entries, Tally-ready exports, tasks, operations, and owner-level business visibility.',
    icon: <ReceiptText size={22} />,
  },
];

const operatingAdvantages = [
  'Know which customers need a follow-up today',
  'See bills, dues, and stock without checking multiple registers',
  'Give staff access without giving away full control',
  'Review the business from your phone, tablet, or computer',
];

const dashboardServices = [
  'Customer records and follow-ups',
  'Leads, deals, and sales pipeline',
  'Pre-sale quotations',
  'GST invoices with CGST, SGST, and IGST',
  'Retail billing and cash register',
  'Inventory, variants, and barcodes',
  'Staff logins and permissions',
  'Ledger visibility and Tally export',
  'Daily tasks and operations',
  'Business-focused AI tools',
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6 },
};

export const PublicHome = ({ authMode = 'login', showAuth = false }: PublicHomeProps) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <section id="top" className={`${styles.hero} ${showAuth ? styles.authHero : ''}`} aria-labelledby="home-title">
        <div className={styles.heroAnimation} aria-hidden="true">
          <span className={styles.redBlock} />
          <span className={styles.blueBlock} />
          <span className={styles.redBar} />
          <span className={styles.blueBar} />
          <span className={styles.redRing} />
          <span className={styles.blueRing} />
          <span className={styles.redTriangle} />
          <span className={styles.blueTriangle} />
        </div>
        <div className={`${styles.heroInner} ${showAuth ? styles.authHeroInner : ''}`}>
          <motion.div
            className={`${styles.heroCopy} ${showAuth ? styles.authHeroCopy : ''}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className={styles.heroEyebrow}>Business software for Indian shops and growing teams</span>
            <h1 id="home-title">Manage customers, bills, stock, and staff from one place.</h1>
            <p>
              <ProductWordmark /> helps business owners handle daily sales, GST invoices, quotations, customer
              follow-ups, inventory, team access, and finance visibility without switching between notebooks,
              spreadsheets, and separate apps.
            </p>
            <div className={styles.heroActions}>
              <a href="#demo" className={styles.primaryAction}>Watch PULA Biz in action</a>
              <a href="#contact" className={styles.secondaryAction}>Talk to us</a>
            </div>
          </motion.div>

          <motion.div
            className={styles.heroProduct}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            {showAuth ? (
              <AuthCard mode={authMode} />
            ) : (
              <div className={styles.productCard}>
                <span className={styles.productLabel}>PULA Biz</span>
                <img
                  src={`${import.meta.env.BASE_URL}pula-biz-logo-transparent.png`}
                  alt="PULA Biz"
                  className={styles.businessLogo}
                />
                <p>
                  One practical workspace for the work your business handles every day.
                </p>
                <div className={styles.dailyWorkList}>
                  {[
                    'Prepare quotations and GST invoices',
                    'Track customers, leads, and follow-ups',
                    'Monitor stock, variants, and barcodes',
                    'Run counter sales and review dues',
                  ].map((item) => (
                    <span key={item}><CheckCircle2 size={16} />{item}</span>
                  ))}
                </div>
                <div className={styles.productMetrics} aria-label="PULA Biz operating coverage">
                  <span>Built for Indian GST billing</span>
                  <span>Useful for retail and service businesses</span>
                  <span>Works across web and devices</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <PublicNarrativeDemo />

      <section id="product" className={styles.productSection} aria-labelledby="product-title">
        <div className={styles.container}>
          <motion.div className={styles.sectionHeader} {...fadeUp}>
            <span className={styles.eyebrow}>
              <ProductWordmark className={styles.inlineProductWordmark} />
            </span>
            <h2 id="product-title">What can your business do with PULA Biz?</h2>
            <p>
              PULA Biz combines the daily work that usually gets split across paper registers, WhatsApp messages,
              spreadsheets, billing tools, and memory. Start with the services your business needs today and keep
              the information connected as you grow.
            </p>
          </motion.div>

          <div className={styles.moduleGrid}>
            {modules.map((module, index) => (
              <motion.article
                key={module.title}
                className={styles.moduleCard}
                {...fadeUp}
                transition={{ duration: 0.55, delay: index * 0.08 }}
              >
                <div className={styles.iconBox}>{module.icon}</div>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="tools" className={styles.labSection} aria-labelledby="tools-title">
        <div className={styles.container}>
          <div className={styles.labGrid}>
            <motion.div className={styles.labCopy} {...fadeUp}>
              <span className={styles.eyebrow}>Why business owners use it</span>
              <h2 id="tools-title">Spend less time searching for information. See what needs attention.</h2>
              <p>
                When customer details, bills, stock, staff activity, and pending payments live in different places,
                owners have to ask around before making a decision. PULA Biz brings that day-to-day picture together.
              </p>
            </motion.div>

            <motion.div className={styles.labPanel} {...fadeUp}>
              {operatingAdvantages.map((item) => (
                <div key={item} className={styles.labItem}>
                  <BrainCircuit size={18} />
                  <span>{item}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <section id="business-os" className={styles.servicesSection} aria-labelledby="coverage-title">
        <div className={styles.container}>
          <motion.div className={styles.sectionHeader} {...fadeUp}>
            <span className={styles.eyebrow}>Services included</span>
            <h2 id="coverage-title">Choose the tools that match the way your business works.</h2>
            <p>
              Whether you run a retail shop, a service business, or a growing team, PULA Biz gives you a shared place
              to manage sales and operations clearly.
            </p>
          </motion.div>

          <div className={styles.serviceGrid}>
            {dashboardServices.map((service) => (
              <div key={service} className={styles.serviceItem}>
                <CheckCircle2 size={18} />
                <span>{service}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AppInstallSection />

      <section className={styles.contactStrip} aria-labelledby="contact-strip-title">
        <div className={styles.container}>
          <div className={styles.contactStripInner}>
            <div>
              <span className={styles.eyebrow}>Need a simple walkthrough?</span>
              <h2 id="contact-strip-title">Tell us how your business works. We will show where PULA Biz fits.</h2>
            </div>
            <a href="mailto:contact@pulabiz.com?subject=PULA%20Biz%20product%20walkthrough" className={styles.primaryAction}>
              <FileText size={18} />
              Request a walkthrough
            </a>
          </div>
        </div>
      </section>

      <footer id="contact" className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerTop}>


            <div className={styles.footerProducts}>

              <div className={styles.footerProductItem}>
                <ProductWordmark className={styles.footerProductLogo} productClassName={styles.footerBizText} />
                <p>Live product for CRM, billing, inventory, finance, teams, operations, and AI-assisted workflows.</p>
              </div>
            </div>

            <div className={styles.footerCollab}>
              <div className={styles.footerSectionTitle}>
                <Handshake size={18} />
                <span>In collaboration with</span>
              </div>
              <strong>Pula Shoe &amp; Co - Since 1991</strong>
              <p>Built with practical business workflows, retail operations, and owner-led execution in mind.</p>
            </div>

            <div className={styles.footerMeta}>
              <div className={styles.footerContact}>
                <div className={styles.footerSectionTitle}>
                  <Mail size={18} />
                  <span>Contact</span>
                </div>
                <a href="mailto:contact@pulabiz.com">contact@pulabiz.com</a>
                <a href="https://pulabiz.com" target="_blank" rel="noreferrer">
                  <Globe size={16} />
                  pulabiz.com
                </a>
                <span>
                  <MapPin size={16} />
                  India
                </span>
              </div>

              <div className={styles.footerLinks}>
                <span className={styles.footerHeading}>Pula Labs Private Limited</span>
                <a href="https://pulabiz.com/careers" target="_blank" rel="noreferrer">Careers</a>
                <a href="https://pulabiz.com/collaborate" target="_blank" rel="noreferrer">Collaborate with Pula Labs Private Limited</a>
                <a href="mailto:contact@pulabiz.com?subject=Partnership%20with%20Pula%20Biz">Partner with Pula Biz</a>
                <a href="#contact">Try PULA Biz</a>
              </div>
            </div>
            <div className={styles.footerProducts}>
              <div className={styles.footerSectionTitle}>
                <Bot size={18} />
                <span>Product roadmap</span>
              </div>
              <div className={styles.footerToolPreview}>
                <span className={styles.footerCoachLogo}>
                  <span>PULA</span>
                  <strong>UtsavKalp</strong>
                </span>
                <span>A handy tool for wedding and event planners of India.<br></br>Visit <a href="https://utsavkalp.com" target="_blank" rel="noreferrer"><strong>utsavkalp.com</strong></a></span>
              </div>
              <div className={styles.footerToolPreview}>
                <span className={styles.footerCoachLogo}>
                  <span>PULA</span>
                  <strong>Coach</strong>
                </span>
                <span>Upcoming business coach to help owners manage their business better.</span>
              </div>

            </div>
          </div>

          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} Pula Labs Private Limited. All rights reserved.</span>
            <div className={styles.legalLinks}>
              <a href="https://pulalabs.com/privacy" target="_blank" rel="noreferrer">Privacy</a>
              <a href="https://pulalabs.com/terms" target="_blank" rel="noreferrer">Terms</a>
              <a href="https://pulalabs.com/security" target="_blank" rel="noreferrer">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
