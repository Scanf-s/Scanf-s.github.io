export interface Project {
  name: string;
  description: string;
  tech: string[];
  href?: string;
}

export const projects: Project[] = [
  {
    name: 'Container runtime',
    description:
      'A from-scratch container runtime in Rust that isolates the filesystem, processes, and resources using Linux namespaces, cgroups v2, and pivot_root.',
    tech: ['Rust', 'Linux', 'cgroups v2'],
    href: 'https://github.com/Scanf-s/container-runtime',
  },
  {
    name: 'Single Sign-On service (private)',
    description:
      'Serverless SSO for the club’s services using AWS Cognito; migrated Python → Go to cut Lambda cold-starts, holding ~124ms average auth latency.',
    tech: ['Go', 'AWS Cognito', 'Lambda'],
    href: 'https://github.com/ssu-student-union/itsupport-auth',
  },
  {
    name: 'AWS infrastructure management (private)',
    description:
      'Cut monthly infra cost 45% via ARM64/Graviton + Spot migration; hardened access with SSM Session Manager and IMDSv2; IaC with Terraform and CloudFormation.',
    tech: ['AWS', 'Terraform', 'CloudFormation'],
    href: 'https://github.com/ssu-student-union/itsupport-aws',
  },
  {
    name: 'SSUnnounce',
    description:
      'Serverless notifier that scrapes Soongsil University notices and emails category subscribers; a rewrite from headless-Chrome scraping to a direct API cut run time from 44s to 3s.',
    tech: ['Go', 'AWS Lambda', 'DynamoDB'],
    href: 'https://github.com/ssu-student-union/ssunnounce',
  },
  {
    name: 'RAG agent system',
    description:
      'Production RAG pipeline for Korean legal multiple-choice questions (KMMLU); prompt and context optimization lifted dev-set accuracy from 51.6% to 53.7%.',
    tech: ['Python', 'FastAPI', 'ChromaDB'],
    href: 'https://github.com/Scanf-s/rag-agent-system',
  },
  {
    name: 'Student council homepage backend (private)',
    description:
      'Backend for the Soongsil student-council homepage — members, boards, notices, and auth — on Spring Boot with JPA, QueryDSL, MariaDB, and Redis.',
    tech: ['Java', 'Spring Boot', 'MariaDB'],
    href: 'https://github.com/ssu-student-union/homepage-backend',
  },
];
