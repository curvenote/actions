import * as core from '@actions/core';
import * as github from '@actions/github';
import type { Octokit } from '@octokit/rest';

function getPullRequestInfo() {
  // Using the context from @actions/github to get the PR number
  const { owner, repo } = github.context.repo;
  const pull_number = github.context.payload.pull_request?.number;
  return { owner, repo, pull_number };
}

export async function getPullRequestLabels(octokit: Octokit) {
  const { owner, repo, pull_number } = getPullRequestInfo();
  if (!pull_number) {
    console.log('Could not find pull request number in the context.');
    return [];
  }
  try {
    const { data: labels } = await octokit.issues.listLabelsOnIssue({
      owner,
      repo,
      issue_number: pull_number,
    });
    return labels.map((label) => label.name);
  } catch (error) {
    console.log(error);
    core.setFailed('Error fetching pull request labels');
    return [];
  }
}

export async function getPullRequestReviewers(octokit: Octokit) {
  const { owner, repo, pull_number } = getPullRequestInfo();
  if (!pull_number) {
    console.log('Could not find pull request number in the context.');
    return [];
  }
  const { data: prData } = await octokit.pulls.get({
    owner,
    repo,
    pull_number,
  });

  console.log(
    'Assignees:',
    prData.assignees?.map((a) => a.login),
  );
  console.log(
    'Reviewers:',
    prData.requested_reviewers?.map((r) => r.login),
  );
}
