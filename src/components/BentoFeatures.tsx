import { motion } from 'framer-motion';
import { ImagePlus, Paintbrush2, Send } from 'lucide-react';
import styles from './BentoFeatures.module.css';

const steps = [
  {
    title: 'Upload room',
    description: 'Use site photos, customer room images, or under-construction spaces as your starting point.',
    icon: <ImagePlus size={24} />,
  },
  {
    title: 'Apply designs',
    description: 'Layer wallpapers, curtains, and materials visually so clients understand the final look instantly.',
    icon: <Paintbrush2 size={24} />,
  },
  {
    title: 'Share with client',
    description: 'Send a clean preview link your client can open on mobile and review without any app install.',
    icon: <Send size={24} />,
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
          <span className={styles.eyebrow}>Simple workflow</span>
          <h2 className={styles.heading}>From empty room photo to client-ready preview in 3 easy steps.</h2>
          <p className={styles.subheading}>
            Built for decorators who want results quickly, not complex tools or long onboarding.
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
