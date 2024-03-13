import * as core from '@actions/core';
import { getChangedFiles } from './gitUtils.js';
import { Octokit } from '@octokit/rest';
import { getPullRequestLabels } from './githubUtils.js';
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
  const monorepo = core.getInput('monorepo') === 'true';
  const paths = await resolvePaths('', core.getInput('path'));

  if (!monorepo && paths.length !== 1) {
    core.setFailed(
      'Cannot include multiple paths if the strategy is not a monorepo.\n\nEither set `monorepo: true` or set a single path (without glob-like patterns).',
    );
    return;
  }
  const previewLabel = booleanOrLabels(core.getInput('preview-label'));
  const submitLabel = booleanOrLabels(core.getInput('submit-label'));
  const idPatternRegex = core.getInput('id-pattern-regex');

  const changedFiles = await getChangedFiles();
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
  );

  const idsAreValid = ensureUniqueAndValidIds(pathIds, idPatternRegex);

  console.log({
    monorepo,
    enforceSingleFolder,
    paths,
    pathIds,
    idPatternRegex,
    idsAreValid,
    changedFiles,
    filteredPaths,
    unknownChangedFiles,
    prLabels,
    previewLabel,
    doPreview,
    submitLabel,
    doSubmit,
  });

  if (!idsAreValid) {
    core.setFailed(
      'The project IDs are not valid or are not unique, check the error logs for more information.',
    );
    return;
  }

  if (enforceSingleFolder && filteredPaths.length > 1) {
    core.setFailed(
      `The strategy is set to fail when changes are made outside of the single folder (\`enforce-single-folder: ${rawEnforceSingleFolder}\`).
There are changes in multiple folders:
  - ${filteredPaths.join('\n  - ')}`,
    );
    return;
  }
  if (enforceSingleFolder && unknownChangedFiles.length > 0) {
    core.setFailed(
      `The strategy is set to fail when changes are made outside of the single folder (\`enforce-single-folder: ${rawEnforceSingleFolder}\`).
There are changes in:
  - ${unknownChangedFiles.join('\n  - ')}`,
    );
    return;
  }

  // Set the build matrix
  core.setOutput(
    'matrix',
    JSON.stringify({
      include: filteredPaths.map((p) => ({ id: pathIds[p], 'working-directory': p })),
    }),
  );
})().catch((err) => {
  core.error(err);
  core.setFailed(err.message);
});
