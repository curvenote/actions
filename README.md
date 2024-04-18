# @curvenote/actions

These actions allow you to connect your github repository to a Curvenote Site and run your editorial workflow from pull requests.

## Quickstart

Add a file to your repository at `.github/workflows/publish.yml` with the following contents:

```yaml
name: curvenote
on:
  pull_request:
    branches: ['main']
permissions:
  contents: read
  pull-requests: write
jobs:
  publish:
    uses: curvenote/actions/.github/workflows/publish.yml@v1
    with:
      monorepo: true
      id-pattern-regex: '^<MYJOURNAL-COLLECTION>-(?:[a-zA-Z0-9-_]{3,15})$'
      enforce-single-folder: true
      preview-label: paper
      submit-label: true
      venue: '<VENUE>'
      collection: '<COLLECTION>'
      kind: '<SUBMISSION-KIND>'
      path: papers/*
    secrets:
      CURVENOTE: ${{ secrets.CURVENOTE_TOKEN }}
      GITHUB: ${{ secrets.GITHUB_TOKEN }}
```

### Options

1. **`monorepo` (boolean)**
   When `true` indicates that this repository contains multiple projects that should be published. For example, if you have multiple articles, or tutorials that should be previewed and submitted when there are changes in the repository.

1. **`id-pattern-regex` (string - regex)**
   A regular expression that all IDs must follow, by default this matches a UUID.

   This can be used to enforce that all project IDs follow a specific pattern, such as,
   the conference name + year.

   The ID must also satisfy alphanumeric characters, dashes, and underscores.

1. **`enforce-single-folder` (boolean)**
   When `true`, an error will be raised if a pull-request is touching multiple
   different folders. This can either be `true` or a label string.
   Multiple labels can be added with comma-separated values.

   If labels are used to control this property, the pull request will only fail in
   PRs with these labels.

   This can be used in conjunction with the `preview-label`, for example, if they
   are both `paper` then the PRs with those labels will be required to only make changes
   in a single folder and will not be previewed if that condition fails.
   However, you can add additional preview labels, e.g. `all-papers`, which will build
   previews for all papers, as the single folder condition is not enforced for that label.

1. **`preview-label` (string)**
   A pull-request label that indicates the preview and checks should be run.
   Multiple labels can be added with comma-separated values.

   If no label is supplied, the preview will run on all PRs.

1. **`submit-label` (string)**
   A pull-request label that indicates the branch should be turned into a submission.
   This will notify all curators of the Curvenote site.

   The submission identifiers will be written directly to the repository in a commit,
   and the submission will be available to be merged on the Curvenote platform.

   A submission will not happen unless both the `enforce-single-folder` and `preview-label`
   conditions are satisfied.

1. **`venue` (string)**
   The site or venue that this project is being submitted to.

1. **`collection` (string)**
   The venue's collection that this project is being submitted to.

1. **`kind` (string)**
   The kind of the submission, that must be a kind included in the `collection` being submitted to.

1. **`path` (string - glob pattern)**
   The root directory path(s) where the Curvenote CLI will be invoked. If `multiple` paths are being used, separate the `path` string with ','. The paths can also be glob-like patterns (but only one `*`), for example:

   ```yaml
   path: my/project
   path: my/paper, my/poster
   path: papers/*, posters/*
   ```

   The default path is the root of the repository.

### Secrets

A Curvenote API token is required. This can be added as a secret within your [GitHub Repository or Environment](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions).

An API Token can be generated for any user account at [curvenote.com](https://curvenote.com/profile?settings=true&tab=profile-api&subtab=general), the user account used must be on the Team a associated with your site and have sufficient rights.
