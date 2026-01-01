
import { useMediaQuery } from './useMediaQuery';
import { breakpoints } from '../../../styles/tokens/breakpoints';

export function useResponsive() {
  const isMobile = !useMediaQuery(`(min-width: ${breakpoints.tablet})`);
  const isTablet = useMediaQuery(`(min-width: ${breakpoints.tablet})`) && !useMediaQuery(`(min-width: ${breakpoints.laptop})`);
  const isDesktop = useMediaQuery(`(min-width: ${breakpoints.laptop})`);
  const isWide = useMediaQuery(`(min-width: ${breakpoints.wide})`);

  return {
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    device: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
  };
}
