'use server';

import { Veracross } from '@/lib/Veracross';

export async function getClassMeetings(internal_class_id: number) {
  return await Veracross.Data.Academics.Classes.MeetingTimes.list({
    internal_class_id
  });
}
