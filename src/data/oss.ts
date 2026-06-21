export interface OssProject {
  name: string;
  url: string;
  description?: string;
  prs: { label: string; url: string }[];
}

export const oss: OssProject[] = [
  {
    name: 'Cadence',
    url: 'https://github.com/cadence-workflow/cadence',
    description:
      'Distributed workflow orchestration engine. Refactored the custom rate limiter, added dynamic configuration and context timeouts, and removed synchronous retry logic.',
    prs: [
      { label: '#7585', url: 'https://github.com/cadence-workflow/cadence/pull/7585' },
      { label: '#7650', url: 'https://github.com/cadence-workflow/cadence/pull/7650' },
      { label: '#7709', url: 'https://github.com/cadence-workflow/cadence/pull/7709' },
      { label: '#7827', url: 'https://github.com/cadence-workflow/cadence/pull/7827' },
      { label: '#8035', url: 'https://github.com/cadence-workflow/cadence/pull/8035' },
    ],
  },
  {
    name: 'Youki',
    url: 'https://github.com/youki-dev/youki',
    description:
      'A container runtime written in Rust. Fixed tiny bugs, added unit tests',
    prs: [
      { label: '#3602', url: 'https://github.com/youki-dev/youki/pull/3602' },
      { label: '#3608', url: 'https://github.com/youki-dev/youki/pull/3608' },
    ],
  },
  {
    name: 'vLLM Semantic Router',
    url: 'https://github.com/vllm-project/semantic-router',
    description:
      'System-level AI model router. Deprecated legacy cache options and added file-based cache configuration.',
    prs: [
      { label: '#1100', url: 'https://github.com/vllm-project/semantic-router/pull/1100' },
    ],
  },
  {
    name: 'EZ',
    url: 'https://github.com/SchoolyB/EZ',
    description:
      'A programming language. Added HTTP status code constants and fixed a bug in the "using" keyword.',
    prs: [
      { label: '#907', url: 'https://github.com/SchoolyB/EZ/pull/907' },
      { label: '#979', url: 'https://github.com/SchoolyB/EZ/pull/979' },
    ],
  },
  {
    name: 'Spine',
    url: 'https://github.com/NARUBROWN/spine',
    prs: [
      { label: '#5', url: 'https://github.com/NARUBROWN/spine/pull/5' },
    ],
  },
];
