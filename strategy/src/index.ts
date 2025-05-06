import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';
import { getPullRequestLabels, getPullRequestReviewers } from './githubUtils.js';
import {
  booleanOrLabels,
  ensureUniqueAndValidIds,
  filterPathsAndIdentifyUnknownChanges,
  getIdsFromPaths,
  hasIntersection,
  resolvePaths,
} from './utils.js';

(async () => {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    core.setFailed('Please add the GITHUB_TOKEN to the strategy action');
    return;
  }
  const octokit = new Octokit({ auth: githubToken });
  const paths = await resolvePaths('', core.getInput('path'));
  const includeUnchanged = core.getInput('include-unchanged') === 'true';
  const { assignees, reviewers } = (await getPullRequestReviewers(octokit)) ?? {};

  const previewLabel = booleanOrLabels(core.getInput('preview-label'));
  const submitLabel = booleanOrLabels(core.getInput('submit-label'));
  const idPatternRegex = core.getInput('id-pattern-regex');

  const changedFiles = core.getInput('changed-files').split(',');
  const prLabels = await getPullRequestLabels(octokit);
  const rawEnforceSingleFolder = booleanOrLabels(core.getInput('enforce-single-folder'));
  const enforceSingleFolder =
    typeof rawEnforceSingleFolder === 'boolean'
      ? rawEnforceSingleFolder
      : hasIntersection(rawEnforceSingleFolder, prLabels);
  const doPreview =
    typeof previewLabel === 'boolean' ? previewLabel : hasIntersection(previewLabel, prLabels);
  const doSubmit =
    typeof submitLabel === 'boolean' ? submitLabel : hasIntersection(submitLabel, prLabels);

  const pathIds = getIdsFromPaths(paths);

  const { filteredPaths, unknownChangedFiles } = filterPathsAndIdentifyUnknownChanges(
    paths,
    changedFiles,
    includeUnchanged,
  );

  console.log(
    'Strategy Inputs:\n\n',
    {
      enforceSingleFolder,
      paths,
      pathIds,
      idPatternRegex,
      changedFiles,
      filteredPaths,
      unknownChangedFiles,
      prLabels,
      previewLabel,
      doPreview,
      submitLabel,
      doSubmit,
      assignees,
      reviewers,
    },
    '\n\n',
  );

  const filteredPathIds: Record<string, string | null> = {};
  filteredPaths.forEach((path) => {
    filteredPathIds[path] = pathIds[path];
  });

  const { messages, valid: idsAreValid } = ensureUniqueAndValidIds(filteredPathIds, idPatternRegex);

  if (!idsAreValid) {
    core.setFailed(
      `The project IDs are not valid or are not unique, check the error logs for more information.\n\n${messages.join('\n')}`,
    );
    return;
  }

  if (enforceSingleFolder) {
    if (filteredPaths.length > 1) {
      core.setFailed(
        `The strategy is set to fail when changes are made outside of a single folder (\`enforce-single-folder: ${rawEnforceSingleFolder}\`).
  There are changes in multiple folders:
    - ${filteredPaths.join('\n  - ')}`,
      );
      return;
    }
    if (
      unknownChangedFiles.length > 0 &&
      (filteredPaths.length > 0 ||
        (doPreview && typeof previewLabel !== 'boolean') ||
        (doSubmit && typeof submitLabel !== 'boolean'))
    ) {
      core.setFailed(
        `The strategy is set to fail when changes are made outside of a single folder (\`enforce-single-folder: ${rawEnforceSingleFolder}\`).
These files are outside of an allowed folder path:
  - ${unknownChangedFiles.join('\n  - ')}`,
      );
      return;
    }
  }

  // Indicate whether to run the next jobs
  core.setOutput('preview', doPreview);
  core.setOutput('submit', doSubmit);
  core.setOutput('check', doPreview || doSubmit);
  // Set the build matrix
  core.setOutput(
    'matrix',
    JSON.stringify({
      include: filteredPaths.map((p) => ({
        id: pathIds[p],
        'working-directory': p,
        draft: !doSubmit,
      })),
    }),
  );
})().catch((err) => {
  core.error(err);
  core.setFailed(err.message);
});
