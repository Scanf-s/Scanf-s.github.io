export interface Project {
  name: string;
  description: string;
  tech: string[];
  href?: string;
}

export const projects: Project[] = [
  {
    name: 'project-name',
    description: 'What it does, in one sentence.',
    tech: ['Rust', 'Tokio'],
    href: 'https://github.com/Scanf-s',
  },
  {
    name: 'another-one',
    description: 'What it does, in one sentence.',
    tech: ['Go', 'gRPC'],
  },
];
