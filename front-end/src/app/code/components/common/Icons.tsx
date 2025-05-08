import React from 'react';

interface IconProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const MicIcon: React.FC<IconProps> = ({ className, width = 24, height = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width={width} height={height} className={className}>
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.25 14.41 16 12 16s-4.52-1.75-4.93-4.15a1 1 0 0 0-.98-.85c-.61 0-1.09.54-1 1.14.61 3.09 3.06 5.51 6.01 5.8V21h-2a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-3.06c2.94-.29 5.4-2.71 6.01-5.8.09-.6-.39-1.14-1-1.14z"/>
  </svg>
);

export const StopIcon: React.FC<IconProps> = ({ className, width = 24, height = 24 }) => (
   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width={width} height={height} className={className}>
    <path d="M6 6h12v12H6z"/>
  </svg>
);

export const HourglassIcon: React.FC<IconProps> = ({ className, width = 24, height = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width={width} height={height} className={className}>
    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 16H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V8h8v2zM12 6c-1.28 0-2.45.38-3.44 1.04l7.48 7.48C16.62 13.45 17 12.28 17 11c0-2.76-2.24-5-5-5zm0 10c1.28 0 2.45-.38 3.44-1.04l-7.48-7.48C7.38 10.55 7 11.72 7 13c0 2.76 2.24 5 5 5zM6 20v-6l6-6.01L18 14v6H6zM8 16h8v-3.1l-4-4-4 3.98V16z"/>
  </svg>
);