'use client';

import { useEffect } from 'react';

export function Bootstrap() {
  useEffect(() => {
    import('bootstrap');
  }, []);
  return null;
}
