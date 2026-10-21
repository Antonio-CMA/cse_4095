import axe, { type AxeResults, type RunOptions } from 'axe-core'

/**
 * Runs the axe accessibility checker over some part of the page and fails with
 * a readable list if it finds anything.
 *
 * Everything that needs real layout is switched off, because jsdom has none:
 * colour contrast (checked by `designContrast.test.ts`, and run in a real
 * browser) and target size. All the other WCAG 2.0/2.1/2.2 A and AA rules, and
 * axe's best-practice rules, are on.
 */
const OPTIONS: RunOptions = {
  runOnly: {
    type: 'tag',
    values: [
      'wcag2a',
      'wcag2aa',
      'wcag21a',
      'wcag21aa',
      'wcag22aa',
      'best-practice',
    ],
  },
  rules: {
    'color-contrast': { enabled: false },
    'target-size': { enabled: false },
  },
}

function describeViolations(results: AxeResults): string {
  return results.violations
    .map((violation) => {
      const nodes = violation.nodes
        .slice(0, 3)
        .map((node) => `    ${node.target.join(' ')}\n      ${node.html}`)
        .join('\n')
      return `${violation.id} (${violation.impact}): ${violation.help}\n${nodes}`
    })
    .join('\n\n')
}

export async function expectNoAccessibilityProblems(
  context: Element | Document = document,
): Promise<void> {
  const results = await axe.run(context, OPTIONS)
  if (results.violations.length > 0) {
    throw new Error(
      `${results.violations.length} accessibility problem(s):\n\n${describeViolations(results)}`,
    )
  }
}
