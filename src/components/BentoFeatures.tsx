import { motion } from 'framer-motion';
import { Bot, BriefcaseBusiness, LayoutDashboard } from 'lucide-react';
import styles from './BentoFeatures.module.css';

const steps = [
  {
    title: 'Set up your workspace once',
    description: 'Add your business identity, team, customers, and the modules you actually need.',
    icon: <LayoutDashboard size={24} />,
  },
  {
    title: 'Run daily operations from one place',
    description: 'Track leads, billing, stock, payments, and accountability without jumping across apps.',
    icon: <BriefcaseBusiness size={24} />,
  },
  {
    title: 'Turn on AI only where it helps',
    description: 'Use AI tools for follow-ups, summaries, forecasting, and industry-specific tasks when you want them.',
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
          <span className={styles.eyebrow}>Simple flow</span>
          <h2 className={styles.heading}>AI vyapari should feel easy on day one, then grow deeper with your business.</h2>
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
              <div className={styles.iconWrap}>{step.icon}</div>
              <div className={styles.cardMeta}>0{index + 1}</div>
              <h3 className={styles.cardTitle}>{step.title}</h3>
              <p className={styles.cardDescription}>{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
