
export const generateAriaLabel = (label: string, context?: string) => {
  return context ? `${label} ${context}` : label;
};

export const srOnly = 'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0';

export const focusRing = 'focus:outline-none focus:ring-2 focus:ring-[#FFD447] focus:ring-offset-2 focus:ring-offset-[#0D0F12]';

export const getInteractiveRole = (onClick?: () => void) => {
  return onClick ? 'button' : undefined;
};

export const getTabAttributes = (isSelected: boolean, id: string, panelId: string) => ({
  role: 'tab',
  'aria-selected': isSelected,
  'aria-controls': panelId,
  id: id,
  tabIndex: isSelected ? 0 : -1,
});
