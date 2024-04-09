import * as core from '@actions/core';
import { getExecOutput } from '@actions/exec';

async function fetchBranches(baseBranch: string, headBranch: string) {
  core.debug(`Fetching branches for base (${baseBranch}) and head (${headBranch})`);
  await getExecOutput(
    'git',
    ['fetch', '--no-tags', '--depth=1', 'origin', `${process.env.GITHUB_BASE_REF}:${baseBranch}`],
    { silent: !core.isDebug() },
  );
  await getExecOutput(
    'git',
    ['fetch', '--no-tags', '--depth=1', 'origin', `${process.env.GITHUB_HEAD_REF}:${headBranch}`],
    { silent: !core.isDebug() },
  );
  core.debug(`Head and target branches have been fetched.`);
}

async function getMergeBase(baseBranch: string, headBranch: string): Promise<string> {
  core.debug(
    `Create a merge-base commit hash between for head (${headBranch}) and base (${baseBranch})`,
  );
  const { stdout, stderr } = await getExecOutput('git', ['merge-base', headBranch, baseBranch], {
    silent: !core.isDebug(),
  });

  if (stderr) {
    console.error('Error getting merge-base:', stderr);
    throw new Error(`Failed to get merge-base: ${stderr}`);
  }

  core.debug(`The merge base is ${stdout}`);

  return stdout;
}

export async function getChangedFiles(): Promise<string[]> {
  // Use environment variables to dynamically refer to branches in the PR
  const baseBranch = `refs/remotes/origin/${process.env.GITHUB_BASE_REF}`;
  const headBranch = `refs/remotes/origin/${process.env.GITHUB_HEAD_REF}`;

  await fetchBranches(baseBranch, headBranch);
  // Create the target commit (excluding any changes in the base branch)
  const mergeBase = await getMergeBase(baseBranch, headBranch);
  core.debug(`Comparing the branch ${headBranch} with ${mergeBase}`);
  // Compare the branches, and get the filename diff
  const { stdout, stderr } = await getExecOutput(
    'git',
    ['diff', '--name-only', headBranch, mergeBase],
    { silent: !core.isDebug() },
  );

  if (stderr) {
    console.error('Error getting changed files:', stderr);
    throw new Error(`Failed to get changed files: ${stderr}`);
  }

  const changedFiles = stdout.split('\n').filter((file) => file);
  return changedFiles;
}
