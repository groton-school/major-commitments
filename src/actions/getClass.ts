'use server';

import { Veracross } from '@/lib/Veracross';

export type Class = Veracross.Data.Academics.Classes.Class & { block: string };

export async function getClass(id: number) {
  const section = await Veracross.Data.Academics.Classes.read({ id });
  const [, block] = (section.description.match(/\(([A-Z]{2})/) || [
    ,
    'NoColor'
  ]) as ('RD' | 'OR' | 'YL' | 'GR' | 'LB' | 'DB' | 'PR' | 'NoColor')[];
  return { ...section, block };
}
