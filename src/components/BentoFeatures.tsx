import { motion } from 'framer-motion';
import { Bot, BriefcaseBusiness, LayoutDashboard, Store } from 'lucide-react';
import styles from './BentoFeatures.module.css';

const steps = [
  {
    title: 'Set up your business system',
    description: 'Create your workspace, add teams, customers, inventory, and finance flows without stitching together five separate tools.',
    icon: <Store size={24} />,
  },
  {
    title: 'Run daily operations online',
    description: 'Manage CRM, billing, GST and tax records, stock alerts, tasks, and reporting from one shared dashboard.',
    icon: <BriefcaseBusiness size={24} />,
  },
  {
    title: 'Turn on AI for your industry',
    description: 'Add business-specific AI for retail, interiors, sports, wholesale, and service workflows right where your team already works.',
    icon: <Bot size={24} />,
  },
  {
    title: 'Scale without rebuilding everything',
    description: 'As your business grows, keep adding modules and automations instead of migrating to a new stack each year.',
    icon: <LayoutDashboard size={24} />,
  },
];

export const BentoFeatures = () => {
  return (
    <section id="workflow" className={styles.section}>
      <div className={styles.container}>
        <motion.div
          className={styles.headingBlock}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <span className={styles.eyebrow}>How aivyapari works</span>
          <h2 className={styles.heading}>Start with core business operations, then layer in AI and advanced workflows as you grow.</h2>
          <p className={styles.subheading}>
            Instead of juggling CRM sheets, billing apps, stock notes, tax records, and disconnected AI tools, your
            team works from one connected system.
          </p>
        </motion.div>

        <div className={styles.stepsGrid}>
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              className={styles.stepCard}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: index * 0.08 }}
            >
              <div className={styles.stepNumber}>0{index + 1}</div>
              <div className={styles.iconWrap}>{step.icon}</div>
              <h3 className={styles.cardTitle}>{step.title}</h3>
              <p className={styles.cardDescription}>{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
