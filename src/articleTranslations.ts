export type ArticleTranslation = { title: string; excerpt: string; body: string[] }

export const articleTranslations: Record<string, ArticleTranslation> = {
  'qa-automation-foundations': {
    title: 'Building a Reliable QA Automation Foundation',
    excerpt: 'Principles for selecting test cases, keeping suites stable, and making test results trustworthy.',
    body: [
      'Good test automation is not simply about converting every manual test into a script. Its purpose is to provide fast, consistent, and actionable feedback.',
      'Start with business-critical, repeatable flows that produce deterministic outcomes. Each test should verify one clear behavior and use controlled test data.',
      'In CI, separate fast checks from heavier suites. Capture artifacts on failure, avoid retries that hide flaky tests, and regularly measure stability and execution time.',
    ],
  },
  'typescript-for-maintainable-projects': {
    title: 'TypeScript for Maintainable Projects',
    excerpt: 'Use types, contracts, and module boundaries to make changes safer.',
    body: [
      'TypeScript is most useful when types represent domain contracts, not when every value is merely wrapped in an annotation.',
      'Use explicit types at module boundaries, validate external data at runtime, and avoid any when it removes important information from the compiler.',
      'Good types complement unit tests, code review, and runtime validation. They do not automatically prove that business logic is correct.',
    ],
  },
  'practical-ai-engineering': {
    title: 'Applying AI with an Engineering Mindset',
    excerpt: 'Evaluate quality, constraints, observability, and testing for AI-powered features.',
    body: [
      'AI features need representative examples, clear acceptance criteria, and repeated evaluation whenever prompts, models, or data sources change.',
      'Do not test only the happy path. Include ambiguous inputs, empty data, unsafe instructions, and cases where the model should express uncertainty.',
      'Record model versions, configuration, latency, cost, and evaluation results. Avoid logging sensitive data that is not needed.',
    ],
  },
  'playwright-test-architecture': {
    title: 'Designing a Stable Playwright Test Suite',
    excerpt: 'Practical page-object patterns, resilient locators, data isolation, and strategies to reduce flaky tests.',
    body: [
      'End-to-end tests are most valuable when they validate critical user journeys through the real application. Start with high-impact business flows, not a target number of tests.',
      'Prefer locators that reflect the interface contract, such as roles, labels, and visible text. Avoid positional selectors or styling classes that change easily. Add test IDs only when semantic locators are not stable enough.',
      'Each test should manage its own data and state. Use fixtures for reusable setup, create unique data for parallel execution, and clean up resources afterward. Never depend on test execution order.',
      'Page objects are useful for consolidating repeated UI interactions, but should not become an abstraction layer that hides every assertion. Keep important expectations close to the scenario so failures are easy to understand.',
      'In CI, retain traces, screenshots, and videos for failed tests as appropriate. Treat retries as a diagnostic signal, not a way to disguise flakiness. Monitor pass rate, duration, and frequently failing tests.',
      'Before increasing parallelism, ensure tests are independent and data does not collide. A faster but nondeterministic suite erodes the team’s trust in the pipeline.',
    ],
  },
  'secure-ci-cd-basics': {
    title: 'A Practical Security Checklist for CI/CD Pipelines',
    excerpt: 'Least privilege, secret management, dependency hygiene, and software supply-chain protection.',
    body: [
      'CI/CD pipelines can access source code, package registries, artifacts, and sometimes production environments. Treat the pipeline as part of the attack surface, not merely as build automation.',
      'Apply least privilege to tokens and service accounts. Grant only the permissions required, limit credential lifetimes where possible, and avoid broad tokens for jobs that only need to read source code.',
      'Store secrets in the platform secret manager, never in the repository, logs, artifacts, or committed configuration files. Log masking helps, but does not replace access controls and prevention.',
      'Pin actions and important dependencies to controlled versions, review dependency changes, and enable vulnerability scanning. Mature systems can add an SBOM and artifact provenance to make build origins verifiable.',
      'Separate pull-request validation jobs from deployment jobs that have privileged access. Be careful when running external contributions with secrets available, and require approval for high-risk deployments.',
      'Start with an inventory of permissions, a secret audit, dependency updates, and branch protection rules. Measured improvements are more effective than adding scanners without ownership or follow-up.',
    ],
  },
  'evaluating-ai-features': {
    title: 'Building Repeatable AI Evaluations',
    excerpt: 'Design datasets, scoring rubrics, regression checks, and monitoring to assess AI changes objectively.',
    body: [
      'AI quality cannot be judged from a handful of impressive examples. Model outputs can vary, so teams need representative evaluation datasets, clear rubrics, and repeatable measurement.',
      'Build examples from anonymized real usage or synthetic data. Include common cases, boundary cases, ambiguous and invalid inputs, and situations where the correct response is to refuse or acknowledge uncertainty.',
      'Define criteria based on product risk: factual accuracy, relevance, completeness, format compliance, safety, and latency. For subjective scoring, document the rubric and calibrate evaluators on the same examples.',
      'Run a baseline before changing prompts, models, retrieval, or parameters. Compare new results against the baseline and set regression thresholds. Do not rely on average scores alone; inspect critical failures and performance across segments.',
      'Model-as-judge can help scale evaluation, but must be validated against human judgments and may have biases. Use deterministic checks wherever possible for schemas, links, length limits, and required data.',
      'After release, monitor quality with privacy-appropriate data, user feedback, latency, cost, and escalation rates. Separate offline evaluation from production monitoring, then use production findings to refresh test datasets regularly.',
    ],
  },
}
