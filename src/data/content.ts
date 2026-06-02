export const contact = {
  email: 'openwallscork@gmail.com',
  instagramUrl: 'https://instagram.com/openwallscork',
  instagramHandle: '@openwallscork',
};

export const upcomingShow = {
  volume: 'Vol. 12',
  eyebrow: "Monthly exhibition + maker's market · Cork",
  dateLineOne: 'Sat 28',
  dateLineTwo: 'June',
  time: '12-6pm',
  venue: 'The Guesthouse · MacCurtain St, Cork',
  description:
    "One room, one day, wall to wall. Twenty-odd Cork artists hang original work, prints and zines beside a maker's market - with coffee, records and the odd pint. Roll in, look around, take something home.",
  artists: [
    'Thady Tra',
    'Evan Stout',
    'Andrew Carroll',
    'Victoria Cialkosz',
    'Isabel Quinn',
    'Sachiko Kobayashi',
    '+ many more',
  ],
};

export const pastShows = [
  { volume: 'Vol. 11', date: 'May 2026', location: 'Nash 19 · Princes St', accent: '#d94f2b', seed: 12 },
  { volume: 'Vol. 10', date: 'Apr 2026', location: 'The Guesthouse · MacCurtain', accent: '#2aa8a0', seed: 7 },
  { volume: 'Vol. 9', date: 'Mar 2026', location: 'Plugd Records · Triskel', accent: '#f4821f', seed: 23 },
  { volume: 'Vol. 8', date: 'Feb 2026', location: 'The Kino · Washington St', accent: '#5b4fa0', seed: 41 },
  { volume: 'Vol. 7', date: 'Jan 2026', location: 'Sample Studios · Churchfield', accent: '#2b9fd4', seed: 5 },
  { volume: 'Vol. 6', date: 'Dec 2025', location: 'The Roundy · Castle St', accent: '#3fad5c', seed: 33 },
  { volume: 'Vol. 5', date: 'Nov 2025', location: 'Cork Coffee Roasters', accent: '#8c4f8b', seed: 18 },
  { volume: 'Vol. 4', date: 'Oct 2025', location: 'Crane Lane · Phoenix St', accent: '#f5c800', seed: 9 },
];

export const aboutCopy = [
  "Open Walls is a Cork-based visual art collective. Once a month we borrow a room somewhere in the city and fill it, wall to wall, with work from local artists - paintings, prints, photography, zines - next to a maker's market and a bit of music.",
  "No white-cube hush, no entry fee, no gatekeeping. If you make things in Cork, there's a wall here with your name on it.",
];

export function mailto(subject?: string) {
  const base = `mailto:${contact.email}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}
