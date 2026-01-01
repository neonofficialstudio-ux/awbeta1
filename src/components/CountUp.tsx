
import React from 'react';
import { useAnimatedCounter } from './ui/hooks/useAnimatedCounter';

interface CountUpProps {
  start?: number; // Used only for initial mount if provided
  end: number;
  duration?: number;
  className?: string;
  onAnimationEnd?: () => void;
}

const CountUp: React.FC<CountUpProps> = ({ 
  start = 0, 
  end, 
  duration = 1000, 
  className,
  onAnimationEnd 
}) => {
  // Hook handles the memory of "previous" value, ignoring 'start' after first render
  const value = useAnimatedCounter(end, duration, start);

  // Optional: Trigger callback when animation conceptually finishes (value equals target)
  React.useEffect(() => {
    if (value === end && onAnimationEnd) {
      onAnimationEnd();
    }
  }, [value, end, onAnimationEnd]);

  return <span className={className}>{value.toLocaleString('pt-BR')}</span>;
};

export default CountUp;
