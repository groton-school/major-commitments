'use client';

import 'bootstrap/dist/css/bootstrap.min.css';

import { useEffect } from 'react';

export function Bootstrap() {
  useEffect(() => {
    import('bootstrap');
  }, []);
  return null;
}
