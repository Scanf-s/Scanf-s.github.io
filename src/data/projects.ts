export interface Project {
  name: string;
  description: string;
  tech: string[];
  href?: string;
}

export const projects: Project[] = [
  {
    name: 'Single Sign-On service',
    description:
      'Serverless SSO for four internal services; migrated Python → Go to cut Lambda cold-starts, holding ~124ms average auth latency.',
    tech: ['Go', 'AWS Lambda', 'Serverless'],
  },
  {
    name: 'AWS infrastructure management',
    description:
      'Cut monthly infra cost 45% via ARM64/Graviton + Spot migration; hardened access with SSM Session Manager and IMDSv2; IaC with Terraform and CloudFormation.',
    tech: ['AWS', 'Terraform', 'CloudFormation'],
  },
];
