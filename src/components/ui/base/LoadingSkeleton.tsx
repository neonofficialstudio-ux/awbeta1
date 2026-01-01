
import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  width,
  height,
  circle = false,
}) => {
  const style = {
    width: width,
    height: height,
  };

  return (
    <div
      className={`
        bg-[#23262B] animate-pulse
        ${circle ? 'rounded-full' : 'rounded-md'}
        ${className}
      `}
      style={style}
    />
  );
};

export default LoadingSkeleton;
