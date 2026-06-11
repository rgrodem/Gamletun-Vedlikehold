'use client';

import { useEffect } from 'react';

/**
 * Felles oppførsel for alle modaler:
 *  - Låser body-scroll så bakgrunnssiden ikke ruller når man scroller i modalen.
 *  - Lukker modalen på Escape.
 *
 * Brukes i toppen av hver modal-komponent: `useModalBehavior(onClose)`.
 */
export function useModalBehavior(onClose: () => void) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);
}
