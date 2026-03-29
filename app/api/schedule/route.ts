import { NextResponse } from 'next/server';

export const revalidate = 3600;

export async function GET() {
  const token = process.env.ADDEVENT_API_TOKEN;
  if (!token) {
    return NextResponse.json({ events: [] });
  }

  try {
    const res = await fetch('https://api.addevent.com/calevent/v2/events?calendar_id=vfycmmn2sx2t&page_size=20&sort=start&sort_direction=asc', {
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
    return NextResponse.json({ events: data.events || data.data || [] });
  } catch (error) {
    console.error('AddEvent fetch error:', error);
    return NextResponse.json({ events: [] });
  }
}
