import React from 'react';
import styles from './MagneticButton.module.css';

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const MagneticButton = ({ children, ...props }: MagneticButtonProps) => {
  return (
    <div className={styles.wrapper}>
      <button className={styles.button} {...props}>
        <span className={styles.content}>{children}</span>
      </button>
    </div>
  );
};
