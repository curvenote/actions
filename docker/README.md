# Curvenote CLI container image

Workflows run Curvenote commands in a prebuilt image instead of installing dependencies on each job.

Image: `ghcr.io/curvenote/actions/cli`

## Tags

Tags mirror the git release pattern:

| Event | Image tags | Referenced in stamped workflows |
|-------|------------|--------------------------------|
| Every push to `main` | `main`, `latest` | `latest` (on `latest` git tag) |
| Version release `v1.0.20` | `v1.0.20`, `v1.0`, `v1`, `latest` | `v1` |
| Pull request `PR42` | `PR42` | `PR42` |

Consumers pinned to `@v1` continue to work unchanged; the workflow pulls `ghcr.io/curvenote/actions/cli:v1`, which is re-tagged on each v1 release.

## Contents

- Node 24 (Active LTS)
- Curvenote CLI (`curvenote@latest` at image build time)
- Typst (latest release at image build time; same asset as `typst-community/setup-typst` on linux/x64)
- Noto fonts
- Inkscape, ImageMagick, WebP tools, Ghostscript

## Publishing

Images are built and pushed by `.github/workflows/release.yml` and `.github/workflows/pr_release.yml`.

After the first publish, make the GHCR package public so workflows in other repositories can pull it without authentication:

**GitHub → Packages → curvenote/actions/cli → Package settings → Change visibility → Public**
