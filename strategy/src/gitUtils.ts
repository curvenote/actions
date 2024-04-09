import { getExecOutput } from '@actions/exec';

async function fetchBranches(baseBranch: string, headBranch: string) {
  // Fetch the two branches explicitly
  await getExecOutput(
    'git',
    [
      'fetch',
      '--no-tags',
      '--depth=1',
      'origin',
      `${process.env.GITHUB_BASE_REF}:refs/remotes/${baseBranch}`,
    ],
    { silent: true },
  );
  await getExecOutput(
    'git',
    [
      'fetch',
      '--no-tags',
      '--depth=1',
      'origin',
      `${process.env.GITHUB_HEAD_REF}:refs/remotes/${headBranch}`,
    ],
    { silent: true },
  );
}

async function getMergeBase(baseBranch: string, headBranch: string): Promise<string> {
  // Compare the branches, and get the filename diff
  const { stdout, stderr } = await getExecOutput('git', ['merge-base', headBranch, baseBranch], {
    silent: true,
  });

  if (stderr) {
    console.error('Error getting merge-base:', stderr);
    throw new Error(`Failed to get merge-base: ${stderr}`);
  }

  return stdout;
}

export async function getChangedFiles(): Promise<string[]> {
  // Use environment variables to dynamically refer to branches in the PR
  const baseBranch = `origin/${process.env.GITHUB_BASE_REF}`;
  const headBranch = `origin/${process.env.GITHUB_HEAD_REF}`;

  await fetchBranches(baseBranch, headBranch);
  // Create the target commit (excluding any changes in the base branch)
  const mergeBase = await getMergeBase(baseBranch, headBranch);
  // Compare the branches, and get the filename diff
  const { stdout, stderr } = await getExecOutput(
    'git',
    ['diff', '--name-only', headBranch, mergeBase],
    { silent: true },
  );

  if (stderr) {
    console.error('Error getting changed files:', stderr);
    throw new Error(`Failed to get changed files: ${stderr}`);
  }

  const changedFiles = stdout.split('\n').filter((file) => file);
  return changedFiles;
}
