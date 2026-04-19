import { motion } from 'framer-motion';
import { BriefcaseBusiness, Bot, ClipboardList } from 'lucide-react';
import styles from './BentoFeatures.module.css';

const steps = [
  {
    title: 'Run daily operations',
    description: 'Track leads, projects, customer communication, inventory, billing, and team responsibilities from one dashboard.',
    icon: <BriefcaseBusiness size={24} />,
  },
  {
    title: 'Stay execution ready',
    description: 'Keep material stock, project follow-ups, and financial visibility aligned so teams can deliver without scattered tools.',
    icon: <ClipboardList size={24} />,
  },
  {
    title: 'Use AI when it matters',
    description: 'Open AI room rendering from inside the dashboard to create polished visual previews for faster approvals.',
    icon: <Bot size={24} />,
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
          <span className={styles.eyebrow}>How Cultains works</span>
          <h2 className={styles.heading}>One platform for managing decorator operations and activating AI tools only when you need them.</h2>
          <p className={styles.subheading}>
            Instead of juggling CRM sheets, stock notes, billing files, and design tools, your team works from one connected system.
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
