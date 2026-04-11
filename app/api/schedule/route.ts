import { NextResponse } from 'next/server';

export const revalidate = 3600;

export async function GET() {
  const token = process.env.ADDEVENT_API_TOKEN;
  if (!token) {
    return NextResponse.json({ events: [] });
  }

  try {
    const res = await fetch('https://api.addevent.com/calevent/v2/events?calendar_id=cal_81f819ac9f68449aab0497578be903fa&page_size=20&sort=start&sort_direction=asc', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error('AddEvent API error:', res.status, await res.text());
      return NextResponse.json({ events: [], error: res.status });
    }

    const data = await res.json();
    const now = new Date();
    const cleaned = (data.events || data.data || [])
      .filter((e: { calendar_id?: string }) => e.calendar_id === 'cal_81f819ac9f68449aab0497578be903fa')
      .filter((e: { datetime_start?: string }) => {
        if (!e.datetime_start) return false;
        const start = new Date(e.datetime_start.replace(' ', 'T') + '+03:00');
        return start > now;
      })
      .sort((a: { datetime_start: string }, b: { datetime_start: string }) => {
        const dateA = new Date(a.datetime_start.replace(' ', 'T') + '+03:00');
        const dateB = new Date(b.datetime_start.replace(' ', 'T') + '+03:00');
        return dateA.getTime() - dateB.getTime();
      });
    return NextResponse.json({ events: cleaned });
  } catch (error) {
    console.error('AddEvent fetch error:', error);
    return NextResponse.json({ events: [] });
  }
}
