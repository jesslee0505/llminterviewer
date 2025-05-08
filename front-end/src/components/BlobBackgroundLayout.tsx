import React from 'react';
import styles from '../styles/layouts.module.css';

interface BlobBackgroundLayoutProps {
  children: React.ReactNode;
}

const BlobBackgroundLayout: React.FC<BlobBackgroundLayoutProps> = ({ children }) => {
  return (
    <div className={styles.blobLayoutContainer}>
      <div className="gradient-blob gradient-blob-1-specific"></div>
      <div className="gradient-blob gradient-blob-2-specific"></div>
      <div className="gradient-blob gradient-blob-3-specific"></div>
      <div className="gradient-blob gradient-blob-4-specific"></div>
      <div className="gradient-blob gradient-blob-5-purple-topleft"></div>
      <div className="gradient-blob gradient-blob-6-blue-centerright"></div>
      {children}
    </div>
  );
};

export default BlobBackgroundLayout;