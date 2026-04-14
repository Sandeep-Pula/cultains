import { motion } from 'framer-motion';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import styles from './Dashboard.module.css';

export const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // Temporary mock data for aesthetics
  const recentDesigns = [
    { id: 1, name: 'Living Room Idea', imageId: '10' },
    { id: 2, name: 'Master Bedroom', imageId: '15' },
    { id: 3, name: 'Studio Setup', imageId: '20' },
  ];

  if (!user) return null;

  return (
    <motion.div 
      className={styles.container}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className={styles.header}>
        <div className={styles.welcome}>
          <h1 className={styles.title}>Welcome back.</h1>
          <p className={styles.subtitle}>{user.email}</p>
        </div>
        <a href="#try-once" className={styles.actionButton}>
          <Plus size={20} />
          Create new room preview
        </a>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Previews</h2>
        
        {recentDesigns.length > 0 ? (
          <div className={styles.grid}>
            {recentDesigns.map((design, index) => (
              <motion.div 
                key={design.id}
                className={styles.card}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Random aesthetic mock images */}
                <img 
                  src={`https://picsum.photos/seed/${design.imageId}/800/600`} 
                  alt={design.name} 
                  className={styles.placeholderImage}
                />
                <div className={styles.cardLabel}>{design.name}</div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <ImageIcon size={48} color="rgba(0,0,0,0.2)" />
            <div className={styles.emptyTitle}>No saved previews yet</div>
            <div className={styles.emptySubtitle}>Once you generate a room preview, it will show up here.</div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
