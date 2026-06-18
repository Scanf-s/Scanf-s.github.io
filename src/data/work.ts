export interface WorkItem {
  period: string;
  role: string;
  org: string;
  summary?: string;
}

export const work: WorkItem[] = [
  {
    period: 'Oct.2025 — Mar.2026',
    role: 'Cloud System SW Engineer Intern',
    org: 'Boeing Korea',
    summary:
      'Cut core table-view API latency 42% on an ASP.NET/EF backend and sped up graph rendering 20%. C# · Python · SQL Server',
  },
  {
    period: 'Jun.2025 — Sep.2025',
    role: 'Python Backend Developer Intern',
    org: 'PTKOREA',
    summary:
      'Built a 750+ test pipeline from scratch, lifting coverage to 76% on a FastAPI backend. Python · FastAPI · PostgreSQL',
  },
  {
    period: 'Mar.2025 — now',
    role: 'Backend Developer / DevOps',
    org: 'Soongsil Univ. ITSupport (student club)',
    summary:
      'Backend and cloud infrastructure for the university IT committee. Go · Python · Rust · SpringBoot · AWS · Terraform',
  },
  {
    period: 'Sep.2024 — Jun.2025',
    role: 'Undergraduate Researcher',
    org: 'System Software Lab, Soongsil Univ.',
    summary:
      'FastAPI backend with async AI workflows (Celery) for a font-generation platform. Python · Celery · Redis',
  },
];
