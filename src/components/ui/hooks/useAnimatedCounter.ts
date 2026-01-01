
import { useState, useEffect, useRef } from 'react';

export function useAnimatedCounter(
  targetValue: number,
  baseDuration: number = 1000,
  initialValue: number = 0
) {
  const [displayValue, setDisplayValue] = useState(initialValue);
  
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(initialValue);
  const targetValueRef = useRef(targetValue);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Prevent unnecessary animation if value hasn't changed
    if (targetValue === targetValueRef.current && displayValue === targetValue) return;

    // Update references for the new animation segment
    startValueRef.current = displayValue;
    targetValueRef.current = targetValue;
    startTimeRef.current = null;

    // Calculate dynamic duration based on delta to prevent slow motion for small changes
    // Formula: 12ms per unit of change, capped at baseDuration (usually 1000-1500ms)
    // Minimum 300ms for visibility of any change
    const delta = Math.abs(targetValue - displayValue);
    if (delta === 0) return;

    const dynamicDuration = Math.max(
        300, 
        Math.min(baseDuration, delta * 20) // 20ms per unit allows seeing +50 clearly
    );

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      
      const progress = timestamp - startTimeRef.current;
      const percentage = Math.min(progress / dynamicDuration, 1);

      // Ease Out Quint for smooth landing
      // 1 - pow(1 - x, 5)
      const ease = 1 - Math.pow(1 - percentage, 5);

      const nextValue = Math.floor(
        startValueRef.current + (targetValueRef.current - startValueRef.current) * ease
      );

      setDisplayValue(nextValue);

      if (percentage < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure exact end value is set
        setDisplayValue(targetValueRef.current);
      }
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetValue, baseDuration]); // Removed displayValue from deps to avoid loop

  return displayValue;
}
