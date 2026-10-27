'use client';

import { useEffect } from 'react';

import './styles.css';

export function Bootstrap() {
  useEffect(() => {
    import('bootstrap');
  }, []);
  return null;
}
