# Insert or Update a Comment - Curvenote GitHub Action

## Purpose

Streamlines the process of inserting or updating a comment on pull requests (PRs) within GitHub repositories. It allows for dynamic insertion or update of comments based on the results of build processes or any other automated workflow steps. This action can be particularly useful for providing feedback, results, or notifications directly within the context of a PR review process. If this action is run outside the context of a PR, it will make a comment on the commit.

## Features

- **Automated Comment Management:** Efficiently find and update existing comments or create new ones based on specific criteria.
- **Customizable Comments:** Allows the customization of the comment's title and body with dynamic content, supporting Markdown for rich text formatting.
- **Integration with Pull Requests:** Designed to work seamlessly with GitHub's pull request system, enhancing the review and feedback loop.

## Inputs

The action accepts the following inputs:

- **title:** (Optional) Specifies the title of the comment. This title is displayed in bold at the top of the comment and helps in identifying the correct comment to update. The default value is "Curvenote Preview".
- **comment:** (Required) The body of the comment, formatted in Markdown. This allows for flexible and rich text comments including links, code blocks, and more.

## Usage

To use this action in your workflows, add a step to your `.github/workflows` YAML file as follows:

```yaml
steps:
  - name: Comment on PR
    uses: curvenote/actions/upsert-comment@main
    with:
      title: 'Your Custom Title' # Optional
      comment: 'Your comment body in Markdown' # Required
```

Make sure to replace `@version` with the intended version of this action. To use the most up to date version, use `main` as shown.

## Permissions

To allow github actions to post a comment on your repository, you must add the following permissions:

```yaml
permissions:
  contents: read
  pull-requests: write
```

## How It Works

The action operates in a composite run steps mode and includes the following steps:

1. **Find Comment:** Initially, it attempts to find an existing comment in the PR that matches the given criteria (issue number, comment author, and body includes the specified title).
2. **Create Comment:** If no existing comment matches the criteria, a new comment is created in the pull request with the provided title and body. If there is no PR at all, a comment is created on the current commit.
3. **Update Comment:** If an existing comment is found, it is updated with the new content, replacing the old comment entirely.

## Support

This GitHub Action is made with love by Curvenote Inc.
For more details, updates, and support, please visit the [curvenote/actions](https://github.com/curvenote/actions).
