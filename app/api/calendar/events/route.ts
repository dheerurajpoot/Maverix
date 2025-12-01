import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Calendar API key not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = searchParams.get('timeMax');
    
    // Use Google Calendar API to fetch events
    // For festivals, we'll use Indian holidays calendar
    const calendarId = 'en.indian#holiday@group.v.calendar.google.com'; // Indian Holidays calendar (public)
    
    let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${timeMin}&singleEvents=true&orderBy=startTime`;
    
    if (timeMax) {
      url += `&timeMax=${timeMax}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      // If the API call fails, return empty events instead of error
      console.error('Google Calendar API error:', response.statusText);
      return NextResponse.json({ events: [] });
    }

    const data = await response.json();
    
    // Format events to include date and summary
    const events = (data.items || []).map((item: any) => {
      const startDate = item.start?.date || item.start?.dateTime;
      return {
        date: startDate ? startDate.split('T')[0] : null,
        summary: item.summary || 'Event',
        description: item.description || '',
      };
    }).filter((event: any) => event.date);

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error('Calendar events error:', error);
    // Return empty events on error instead of failing
    return NextResponse.json({ events: [] });
  }
}

