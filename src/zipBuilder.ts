/**
 * Pure client-sovereign PKZIP (Store / Method 0 + IEEE 802.3 CRC-32) binary generator.
 * Zero external dependencies — creates valid cross-platform .zip archives directly in browser memory.
 */

export interface ZipEntryInput {
  path: string
  content: string
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

export function createZipArchive(entries: ZipEntryInput[]): Uint8Array {
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const cleanPath = entry.path.replace(/^\/+/, '')
    const nameBytes = encoder.encode(cleanPath)
    const dataBytes = encoder.encode(entry.content)
    const checksum = crc32(dataBytes)

    // Local File Header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(localHeader.buffer)
    lv.setUint32(0, 0x04034b50, true) // signature
    lv.setUint16(4, 20, true) // version needed (2.0)
    lv.setUint16(6, 0x0800, true) // UTF-8 flag
    lv.setUint16(8, 0, true) // compression method 0 (Store)
    lv.setUint16(10, 0x4800, true) // mod time
    lv.setUint16(12, 0x5971, true) // mod date
    lv.setUint32(14, checksum, true)
    lv.setUint32(18, dataBytes.length, true)
    lv.setUint32(22, dataBytes.length, true)
    lv.setUint16(26, nameBytes.length, true)
    lv.setUint16(28, 0, true)
    localHeader.set(nameBytes, 30)

    // Central Directory File Header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(centralHeader.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, 0x4800, true)
    cv.setUint16(14, 0x5971, true)
    cv.setUint32(16, checksum, true)
    cv.setUint32(20, dataBytes.length, true)
    cv.setUint32(24, dataBytes.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint16(30, 0, true)
    cv.setUint16(32, 0, true)
    cv.setUint16(34, 0, true)
    cv.setUint16(36, 0, true)
    cv.setUint32(38, 0, true)
    cv.setUint32(42, offset, true)
    centralHeader.set(nameBytes, 46)

    localParts.push(localHeader, dataBytes)
    centralParts.push(centralHeader)
    offset += localHeader.length + dataBytes.length
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const endRecord = new Uint8Array(22)
  const ev = new DataView(endRecord.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  const totalLength = offset + centralSize + endRecord.length
  const archive = new Uint8Array(totalLength)
  let cursor = 0
  for (const part of [...localParts, ...centralParts, endRecord]) {
    archive.set(part, cursor)
    cursor += part.length
  }
  return archive
}

export function buildProductionStarterZip(params: {
  blueprintId: string
  title: string
  intent: string
  uslCeilingNodes: number
  p95Ms: number
  codeArtifact: string
  playwrightArtifact: string
}): Uint8Array {
  const slug = params.blueprintId.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  const files: ZipEntryInput[] = [
    {
      path: 'README.md',
      content: [
        `# ${params.title} — DreamEx AI OS v6.0 Starter`,
        '',
        `> Synthesized client-sovereign by **DreamEx Tech** (https://dreamex.tech/prototype?bp=${slug})`,
        '',
        `- **System Intent:** ${params.intent}`,
        `- **USL Scalability Ceiling:** ${params.uslCeilingNodes} Nodes`,
        `- **Target Edge P95 Latency:** ${params.p95Ms} ms`,
        '',
        '## Included Artifacts',
        '- `docs/ADR-001-architecture.md` — Architectural Decision Record & Zero-Trust posture',
        '- `specs/requirements.feature` — Executable Gherkin BDD scenarios',
        '- `contracts/openapi.yaml` — OpenAPI 3.1.0 interface specification',
        '- `src/contracts/schema.zod.ts` — Runtime Zod contract & idempotency guard',
        '- `tests/e2e/smoke.spec.ts` — Self-healing Playwright verification suite',
        '- `.github/workflows/quality-gate.yml` — CI/CD verification pipeline',
        '',
      ].join('\n'),
    },
    {
      path: 'docs/ADR-001-architecture.md',
      content: [
        `# ADR-001: ${params.title}`,
        '',
        '- **Status:** Accepted',
        '- **Synthesized By:** DreamEx 5-Agent Autonomous DAG (v6.0)',
        '',
        '## Context',
        params.intent,
        '',
        '## Decision',
        `1. Enforce SHA-256 idempotency keys and strict Zod runtime validation before mutating state.`,
        `2. Bound horizontal cluster topology to Gunther USL ceiling N_max = ${params.uslCeilingNodes} nodes to prevent coherency retrograde.`,
        `3. Protect edge routes with enforcing Content-Security-Policy, HSTS, and RBAC least-privilege checks.`,
        '',
      ].join('\n'),
    },
    {
      path: 'specs/requirements.feature',
      content: [
        `Feature: ${params.title}`,
        `  # RTM-001 · Bi-directional traceability linked to smoke.spec.ts`,
        '',
        '  Scenario: Authorized idempotent mutation commits cleanly',
        '    Given an authenticated principal with "admin" or "operator" RBAC role',
        '    When the client dispatches a request with a valid SHA-256 X-Idempotency-Key',
        `    Then the service responds within ${params.p95Ms}ms P95 and prevents duplicate execution`,
        '',
        '  Scenario: Read-only Auditor role is blocked by Zero-Trust gate',
        '    Given an authenticated principal with "auditor" RBAC role',
        '    When the client attempts a state mutation',
        '    Then the request is rejected with HTTP 403 and logged to the audit trail',
        '',
      ].join('\n'),
    },
    {
      path: 'contracts/openapi.yaml',
      content: [
        'openapi: 3.1.0',
        'info:',
        `  title: ${params.title} API`,
        '  version: 1.0.0',
        'paths:',
        `  /api/v1/${slug}/dispatch:`,
        '    post:',
        '      summary: Execute idempotent domain operation',
        '      parameters:',
        '        - in: header',
        '          name: X-Idempotency-Key',
        '          required: true',
        '          schema:',
        '            type: string',
        '            minLength: 16',
        '      responses:',
        "        '200':",
        '          description: Committed deterministically',
        "        '403':",
        '          description: RBAC policy denied mutation',
        '',
      ].join('\n'),
    },
    {
      path: 'src/contracts/schema.zod.ts',
      content: params.codeArtifact,
    },
    {
      path: 'tests/e2e/smoke.spec.ts',
      content: params.playwrightArtifact,
    },
    {
      path: '.github/workflows/quality-gate.yml',
      content: [
        'name: DreamEx Quality & Security Gate',
        'on: [push, pull_request]',
        'jobs:',
        '  verify:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - uses: actions/checkout@v4',
        '      - uses: actions/setup-node@v4',
        '        with:',
        '          node-version: 22',
        '      - run: npm ci',
        '      - run: npm run typecheck && npm test',
        '',
      ].join('\n'),
    },
  ]

  return createZipArchive(files)
}
