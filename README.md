# @curvenote/actions

These actions allow you to connect your github repository with [MyST](https://mystmd.org) content to a Curvenote site and run your editorial workflow from pull requests.

Currently there are three actions available:

1. `draft.yml` to create preview drafts and run journal checks

1. `submit.yml` to submit to a journal

1. `push.yml` to push a work to Curvenote and add as landing content for a site

# Journal Submissions

## Get Started: Create a draft from your repository

To begin publishing content from your github repository with curvenote, add a file to your repository at `.github/workflows/draft.yml` with the following contents:

```yaml
name: curvenote draft
on:
  pull_request:
    branches: ['main']
permissions:
  contents: read
  pull-requests: write
jobs:
  create-preview-draft:
    uses: curvenote/actions/.github/workflows/draft.yml@v1
    with:
      venue: '<VENUE>'
      kind: '<SUBMISSION-KIND>'
    secrets:
      CURVENOTE: ${{ secrets.CURVENOTE_TOKEN }}
      GITHUB: ${{ secrets.GITHUB_TOKEN }}
```

This workflow runs on all PRs made to branch `main` and creates a draft submission to `<VENUE>`. A comment will also be added to the PR with links to results of automated content checks and the preview version of your content.

### Options

1. **`venue` (string)**
   The Curvenote site or venue that this project is being submitted to.

1. **`kind` (string)**
   The kind of the submission, which must be a kind included in the `collection` being submitted to. If you are submitting to a site's non-default collection, you may need to specify `collection: '<SUBMISSION-COLLECTION>` alongside venue and kind.

### Permissions

1. **contents: read**
   This permission level is required to clone the repository during the action. It is necessary for all curvenote actions.

1. **pull-requests: write**
   This permission level is required to (1) access changes on a pull request and (2) comment on the pull request. If you do not want to give **write** permissions, you may add `comment: false` to the `with:` section; this will disable commenting.
   If you run this workflow outside of pull requests (for example on `push` instead of on `pull_request`), you do not need pull request permissions at all.

### Secrets

1. **`CURVENOTE_TOKEN`**
   A Curvenote API token is required. This can be added as a secret within your [GitHub Repository or Environment](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions). An API Token can be generated for any user account at [curvenote.com](https://curvenote.com/profile?settings=true&tab=profile-api&subtab=general), the user account used must be on the Team a associated with your site and have sufficient rights.

2. **`GITHUB_TOKEN`**
   The github token is available when all actions are run and does not need to be explicitly set anywhere.

## Next step: Submit your content

When you are ready to submit your content to a Curvenote site after reviewing your draft preview, you need another workflow file `.github/workflows/submit.yml`:

```yaml
name: curvenote submit
on:
  push:
    branches: ['main']
permissions:
  contents: write
jobs:
  create-submission:
    uses: curvenote/actions/.github/workflows/submit.yml@v1
    with:
      venue: '<VENUE>'
      kind: '<SUBMISSION-KIND>'
    secrets:
      CURVENOTE: ${{ secrets.CURVENOTE_TOKEN }}
      GITHUB: ${{ secrets.GITHUB_TOKEN }}
```

This workflow runs on all pushes to `main`, so it will run when you merge the pull request used by the previous workflow. Besides running on push, the only differences between this workflow and the draft workflow are:

- it uses Curvenote's `submit.yml` workflow instead of `draft.yml`

- it requires `contents: write`. Similar to the previous workflow, you may downgrade this to `contents: read` if you add `comment: false` to the `with:` section.

## A more complicated example: Journal monorepo drafts

These Curvenote actions may be used by a journal to accept submissions. In the previous examples, authors were expected to add the workflows to their source repository. In this example, a journal has a monorepo that accepts pull requests from authors. First, the monorepo can have an action that runs content checks and creates preview builds when an author opens a PR:

```yaml
name: curvenote journal draft
on:
  pull_request_target:
    branches: ['main']
permissions:
  contents: read
  pull-requests: write
jobs:
  create-preview-draft:
    uses: curvenote/actions/.github/workflows/draft.yml@v1
    with:
      venue: '<VENUE>'
      kind: '<SUBMISSION-KIND>'
      collection: '<SUBMISSION-COLLECTION>'
      path: submissions/*
      enforce-single-folder: true
      id-pattern-regex: '^my-journal-[0-9]{1,10}$'
    secrets:
      CURVENOTE: ${{ secrets.CURVENOTE_TOKEN }}
      GITHUB: ${{ secrets.GITHUB_TOKEN }}
```

Since the journal must accept pull requests from forks, `pull_request_target` is required instead of `pull_request` in the simpler example. This grants a more permissive `GITHUB_TOKEN` to the action; you may read about the implications in [GitHub's Docs](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target). Aside from that change, permissions and secrets match the simpler workflow described above. This workflow introduces new options:

### Options

1. **`collection` (string)**
   The venue's collection that projects are submitted to.

1. **`path` (string)**
   The root directory path(s) where the Curvenote CLI will be invoked. If multiple paths are being used, separate the `path` string with ','. The paths can also end in one wildcard `*`, which will match all individual subfolders, for example:

   ```yaml
   path: my/project
   path: my/paper, my/poster
   path: papers/*, posters/*
   ```

   The default path is the root of the repository.

   For this example, specifying `path: submissions/*` means authors must fork the repository and create a unique subfolder inside `submissions/`.

1. **`enforce-single-folder` (boolean)**
   When true, an error will be raised if a pull request is touching multiple different folders. It will also error if changes are made outside a folder described in `path`.

   For this example, `enforce-single-folder` is `true` so authors do not make changes to the repository outside their single submission.

1. **`id-pattern-regex` (string - regex)**
   A regular expression that all IDs must follow, by default this matches a UUID. This can be used to enforce that all project IDs follow a specific pattern, such as, the conference name + year. The ID must also satisfy alphanumeric characters, dashes, and underscores.

## A more complicated example: Journal monorepo submissions

For this journal monorepo, once editors are happy with an author's pull request, they can submit by adding the `ready` label:

```yaml
name: curvenote journal submit
on:
  pull_request_target:
    branches: ['main']
    types: ['labeled']
permissions:
  contents: read
  pull-requests: write
jobs:
  create-submission:
    uses: curvenote/actions/.github/workflows/submit.yml@v1
    with:
      venue: '<VENUE>'
      kind: '<SUBMISSION-KIND>'
      collection: '<SUBMISSION-COLLECTION>'
      path: submissions/*
      enforce-single-folder: true
      id-pattern-regex: '^my-journal-[0-9]{1,10}$'
      label: ready
      strict: true
    secrets:
      CURVENOTE: ${{ secrets.CURVENOTE_TOKEN }}
      GITHUB: ${{ secrets.GITHUB_TOKEN }}
```

Of course, this workflow could also be triggered `on` push to `main` or even setup to only run manually. The Curvenote action is unopinionated about the [events to trigger workflows](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows). This workflow file adds the options:

### Options

1. **`label` (string)**
   A pull request label that indicates the submission should be run. Multiple labels can be added with comma-separated values. If no label is supplied, the submission will run on all PRs. This option is incompatible with workflows triggered outside of PRs.

   For this example, the workflow is triggered on the `labeled` action - so adding the `ready` label will cause the action to run once and perform the submission.

1. **`strict` (boolean)**
   Stop submission if checks fail. By default, strict is `false` and submissions always proceed even if checks fail. This allows editors flexibility to publish a submission even if a check fails (e.g. a link does not resolve).

   For this example, however, strict is set to `true`; during the submit workflow, the submission will not be attempted if checks fail. One major caveat here is without the submission, check results are also not uploaded to the Curvenote preview. This means for an effective submission workflow, the author must have access to checks from the `draft` action so they may review and fix their content.

# Work Pushing

Currently, pushing a Work to Curvenote is a simpler action than journal submissions. Pushing your work will upload a version to the Curvenote platform, which may then subsequently be used for journal submissions or site landing content. The push action currently only acts on the root folder of your repository. A simple usage of this action to push on merge to main looks like:

```yaml
name: curvenote push
on:
  push:
    branches: ['main']
jobs:
  journal-draft:
    uses: curvenote/actions/.github/workflows/push.yml@v1
    secrets:
      CURVENOTE: ${{ secrets.CURVENOTE_TOKEN }}
```

You may also use this action to set the landing content for a Curvenote site. You must have admin privileges on the Site:

```yaml
name: curvenote push
on:
  push:
    branches: ['main']
jobs:
  journal-draft:
    uses: curvenote/actions/.github/workflows/push.yml@v1
    with:
      landing-content: '<SITE-NAME>'
    secrets:
      CURVENOTE: ${{ secrets.CURVENOTE_TOKEN }}
```