import { DefaultArtifactClient } from '@actions/artifact';
import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';

type Report = { status: 'pass' | 'fail'; optional?: boolean }[];

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

function reportSummaryMessage(report: Report, buildUrl: string) {
  const summary = reportSummary(report);
  const total = summary.pass + summary.fail;
  if (total === 0) return 'No checks ran';
  if (summary.fail === 0) {
    return `✅ [${summary.pass} checks passed${summary.optional ? ` (${summary.optional} optional)` : ''}](${buildUrl}#checks)`;
  }
  return `❌ [${summary.pass}/${total} checks passed${summary.optional ? ` (${summary.optional} optional)` : ''}](${buildUrl}#checks)`;
}

(async () => {
  const artifact = new DefaultArtifactClient();
  const list = await artifact.listArtifacts();
  const matrix = JSON.parse(core.getInput('matrix')) as {
    include: { id: string; 'working-directory': string }[];
  };

  await Promise.all(
    list.artifacts.map((a) =>
      artifact.downloadArtifact(a.id, {
        path: `logs/${a.name}`,
      }),
    ),
  );
  const submitLogs = fs
    .readdirSync('logs')
    .map((dir) => {
      const name = path.join('logs', dir, 'curvenote.submit.json');
      if (!fs.existsSync(name)) return null;
      const data = JSON.parse(fs.readFileSync(name).toString());
      const info = matrix.include.find(({ id }) => id === dir.split('-')[1]);
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

  const table = `
| Directory | Preview | Checks | Updated (UTC) |
| :--- | :--- | :--- | :--- |
${submitLogs.map(({ data, info }) => `| **${info['working-directory']}** | 🔍 [Inspect](${data.buildUrl}) | ${reportSummaryMessage(data.report, data.buildUrl)} | ${formatDateUTC(data.submissionVersion.date_created)} |`).join('\n')}
`;
  core.setOutput('comment', table);
})().catch((err) => {
  core.error(err);
  core.setFailed(err.message);
});
