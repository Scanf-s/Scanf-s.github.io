export interface WorkItem {
  period: string;
  role: string;
  org: string;
  summary: string;
}

export const work: WorkItem[] = [
  {
    period: 'Oct.2025 — Mar.2026',
    role: 'Cloud System Software Engineer Intern',
    org: 'Boeing Korea',
    summary: 'ASP.NET · Blazor application maintenance, optimization',
  },
  {
    period: 'Jun.2025 — Sep.2025',
    role: 'Python Developer Intern',
    org: 'PTKOREA',
    summary: 'Implemented over 750 unit and integration tests using Pytest in a FastAPI application.',
  },
  {
    period: 'Sep.2024 — Jun.2025',
    role: 'Associate Undergrad Researcher',
    org: 'System software lab, Soongsil University',
    summary: 'AI workflow integration/development with FastAPI backend application'
  }
];
