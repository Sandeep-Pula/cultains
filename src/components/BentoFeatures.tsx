import { motion } from 'framer-motion';
import { BadgeIndianRupee, Boxes, Bot, Users } from 'lucide-react';
import { ProductWordmark } from './BrandWordmark';
import styles from './BentoFeatures.module.css';

const pillars = [
  {
    title: 'Know every customer movement',
    description: 'Track leads, follow-ups, customer history, ownership, and the next action without scattered notes.',
    icon: <Users size={24} />,
  },
  {
    title: 'Connect money and operations',
    description: 'Create invoices, follow dues, read ledger activity, and keep sales context beside finance context.',
    icon: <BadgeIndianRupee size={24} />,
  },
  {
    title: 'Watch stock before it hurts sales',
    description: 'Maintain products, inventory status, reorder signals, and barcode workflows for everyday teams.',
    icon: <Boxes size={24} />,
  },
  {
    title: 'Bring AI into actual work',
    description: 'Use the AI tools hub for practical assistance instead of keeping AI separate from business data.',
    icon: <Bot size={24} />,
  },
];

export const BentoFeatures = () => {
  return (
    <section id="product" className={styles.section}>
      <div className={styles.container}>
        <motion.div
          className={styles.headingBlock}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <span className={styles.eyebrow}>The first Pula Labs product</span>
          <h2 className={styles.heading}>
            <ProductWordmark /> turns the services already inside your dashboard into one operating layer.
          </h2>
        </motion.div>

        <div className={styles.stepsGrid}>
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              className={styles.stepCard}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: index * 0.08 }}
            >
              <div className={styles.iconWrap}>{pillar.icon}</div>
              <div className={styles.cardMeta}>0{index + 1}</div>
              <h3 className={styles.cardTitle}>{pillar.title}</h3>
              <p className={styles.cardDescription}>{pillar.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
