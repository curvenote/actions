import { DefaultArtifactClient } from '@actions/artifact';
import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';

type Report = { status: 'pass' | 'fail'; optional?: boolean }[];

// Must match the artifact name uploaded by the `submit` action.
const ARTIFACT_PREFIX = 'submit-';

function formatDateUTC(date: string): string {
  // for example: Mar 12, 2024, 11:36 AM
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date));
}

function reportSummary(report: Report) {
  return report.reduce(
    (summary, item) => {
      if (item.status === 'pass') {
        summary.pass += 1;
      } else if (item.optional) {
        summary.pass += 1;
        summary.optional += 1;
      } else {
        summary.fail += 1;
      }
      return summary;
    },
    { pass: 0, fail: 0, optional: 0 },
  );
}

function reportSummaryMessage(report: Report | undefined, buildUrl: string) {
  if (!report) return 'No checks ran';
  const summary = reportSummary(report);
  const total = summary.pass + summary.fail;
  if (total === 0) return 'No checks ran';
  if (summary.fail === 0) {
    return `✅ [${summary.pass} checks passed${summary.optional ? ` (${summary.optional} optional)` : ''}](${buildUrl}#checks)`;
  }
  return `❌ [${summary.pass}/${total} checks passed${summary.optional ? ` (${summary.optional} optional)` : ''}](${buildUrl}#checks)`;
}

type Matrix = { include: { id: string; 'working-directory': string }[] };

/**
 * Parse the matrix input, which may be missing or empty.
 *
 * The summary job runs with `always()`, so it also runs when the strategy job failed
 * (e.g. an invalid folder) and never set its `matrix` output. In that case the input
 * is an empty string and there is nothing to summarize.
 */
function readMatrix(): Matrix | undefined {
  const input = core.getInput('matrix')?.trim();
  if (!input) return undefined;
  let matrix: Matrix;
  try {
    matrix = JSON.parse(input);
  } catch {
    core.warning(`Unable to parse the matrix input as JSON: ${input}`);
    return undefined;
  }
  if (!Array.isArray(matrix?.include)) {
    core.warning(`The matrix input does not contain an "include" list: ${input}`);
    return undefined;
  }
  return matrix;
}

// upsert-comment is dependent on the text of this comment; if you change it here, also change it there.
const NO_SUBMISSIONS = '📭 No submissions available to inspect.';

(async () => {
  const matrix = readMatrix();
  if (!matrix) {
    core.setOutput('comment', NO_SUBMISSIONS);
    return;
  }
  const artifact = new DefaultArtifactClient();
  const list = await artifact.listArtifacts();

  // Only keep the artifacts that belong to this job's matrix.
  const infoByArtifact = new Map(
    matrix.include.map((info) => [`${ARTIFACT_PREFIX}${info.id}`, info]),
  );
  const artifacts = list.artifacts.filter(({ name }) => infoByArtifact.has(name));

  await Promise.all(
    artifacts.map((a) =>
      artifact.downloadArtifact(a.id, {
        path: `logs/${a.name}`,
      }),
    ),
  );
  if (!fs.existsSync('logs')) {
    core.setOutput('comment', NO_SUBMISSIONS);
    return;
  }
  const submitLogs = fs
    .readdirSync('logs')
    .map((dir) => {
      const name = path.join('logs', dir, 'curvenote.submit.json');
      if (!fs.existsSync(name)) return null;
      const info = infoByArtifact.get(dir);
      if (!info) return null;
      const data = JSON.parse(fs.readFileSync(name).toString());
      return { dir, data, info };
    })
    .filter(
      (
        log,
      ): log is {
        dir: string;
        data: { buildUrl: string; report: Report; submissionVersion: { date_created: string } };
        info: { id: string; 'working-directory': string };
      } => !!log,
    );
  if (submitLogs.length === 0) {
    core.setOutput('comment', NO_SUBMISSIONS);
    return;
  }

  const table = `
| Directory | Preview | Checks | Updated (UTC) |
| :--- | :--- | :--- | :--- |
${submitLogs.map(({ data, info }) => `| **${info['working-directory']}** | 🔍 [Inspect](${data.buildUrl}) | ${reportSummaryMessage(data.report, data.buildUrl)} | ${formatDateUTC(data.submissionVersion.date_created)} |`).join('\n')}
`;
  console.log('Summary:');
  submitLogs.forEach(({ data, info }) => {
    console.log(`${info['working-directory']} => ${data.buildUrl}`);
  });
  core.setOutput('comment', table);
})().catch((err) => {
  core.error(err);
  core.setFailed(err.message);
});
