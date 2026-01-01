
import { breakpoints } from '../../../styles/tokens/breakpoints';

export const mq = {
  mobile: `@media (min-width: ${breakpoints.mobile})`,
  tablet: `@media (min-width: ${breakpoints.tablet})`,
  laptop: `@media (min-width: ${breakpoints.laptop})`,
  desktop: `@media (min-width: ${breakpoints.desktop})`,
  wide: `@media (min-width: ${breakpoints.wide})`,
};

export const hideOnMobile = 'hidden md:block';
export const showOnMobile = 'block md:hidden';
