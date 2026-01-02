
import { motion as motionTokens } from '../../../styles/tokens/motion';

export const transitions = {
  fast: `all ${motionTokens.fast}`,
  normal: `all ${motionTokens.normal}`,
  slow: `all ${motionTokens.slow}`,
};

export const animations = {
  fadeIn: 'animate-fade-in-up',
  popIn: 'animate-pop-in',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
};

export const getTransition = (speed: 'fast' | 'normal' | 'slow' = 'normal') => {
  return transitions[speed];
};
