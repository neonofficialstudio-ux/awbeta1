
import { useEffect } from 'react';

const BASE_TITLE = "Artist World";

export function usePageTitle(title?: string) {
  useEffect(() => {
    const prevTitle = document.title;
    
    if (title) {
      document.title = `${title} | ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }

    return () => {
      document.title = prevTitle;
    };
  }, [title]);
}
