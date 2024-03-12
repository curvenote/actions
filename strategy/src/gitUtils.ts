import { getExecOutput } from '@actions/exec';

export const getChangedFiles = async (): Promise<string[]> => {
  // Use environment variables to dynamically refer to branches in the PR
  const baseBranch = `origin/${process.env.GITHUB_BASE_REF}`;
  const headBranch = `origin/${process.env.GITHUB_HEAD_REF}`;

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

  // Compare the branches, and get the filename diff
  const { stdout, stderr } = await getExecOutput(
    'git',
    ['diff', '--name-only', baseBranch, headBranch],
    { silent: true },
  );

  if (stderr) {
    console.error('Error getting changed files:', stderr);
    throw new Error(`Failed to get changed files: ${stderr}`);
  }

  const changedFiles = stdout.split('\n').filter((file) => file);
  return changedFiles;
};
