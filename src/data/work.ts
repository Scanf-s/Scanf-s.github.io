export interface WorkItem {
  period: string;
  role: string;
  org: string;
  summary: string;
}

export const work: WorkItem[] = [
  {
    period: '2024 — now',
    role: 'Backend Engineer',
    org: 'Company',
    summary: 'One line on what you did and the impact.',
  },
  {
    period: '2023',
    role: 'Intern',
    org: 'Company',
    summary: 'Short summary line.',
  },
];
