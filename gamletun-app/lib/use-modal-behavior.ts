'use client';

import { useEffect } from 'react';

// Modul-global tilstand så nestede modaler (f.eks. "Fullfør" oppå
// detaljvisningen) deler én scroll-lås og Escape bare lukker den øverste.
let lockCount = 0;
const closeStack: Array<() => void> = [];

/**
 * Felles oppførsel for alle modaler:
 *  - Låser body-scroll så bakgrunnssiden ikke ruller når man scroller i
 *    modalen. Låsen telles, så den slippes først når siste modal lukkes.
 *  - Lukker modalen på Escape — kun den øverste når flere er åpne.
 *
 * Brukes i toppen av hver modal-komponent: `useModalBehavior(onClose)`.
 */
export function useModalBehavior(onClose: () => void) {
  useEffect(() => {
    lockCount += 1;
    document.body.style.overflow = 'hidden';
    closeStack.push(onClose);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeStack[closeStack.length - 1] === onClose) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      lockCount -= 1;
      if (lockCount === 0) document.body.style.overflow = '';
      const index = closeStack.lastIndexOf(onClose);
      if (index !== -1) closeStack.splice(index, 1);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);
}
