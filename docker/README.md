# Curvenote CLI container images

Workflows run Curvenote commands in a prebuilt image instead of installing dependencies on each job.

Image: `ghcr.io/curvenote/actions/cli`

## Variants

| Target | Tag suffix | Contents |
|--------|------------|----------|
| `full` | none (e.g. `v1`, `main`) | Curvenote CLI, Typst, Noto fonts, Inkscape, ImageMagick, WebP, Ghostscript |
| `slim` | `-slim` (e.g. `v1-slim`, `main-slim`) | Curvenote CLI only |

Workflows select the variant from the `typst` and `images` inputs:

- `typst: true` **or** `images: true` → full image (default)
- both `false` → slim image

The full image always includes `fonts-noto`. If the `fonts` input is set to a different Debian package name, that package is installed at runtime (same as the pre-Docker setup action).

## Tags

Tags mirror the git release pattern:

| Event | Full tags | Slim tags |
|-------|-----------|-----------|
| Every push to `main` | `main`, `latest` | `main-slim`, `latest-slim` |
| Version release `v1.0.20` | `v1.0.20`, `v1.0`, `v1`, `latest` | `v1.0.20-slim`, `v1.0-slim`, `v1-slim`, `latest-slim` |
| Pull request `PR42` | `PR42` | `PR42-slim` |

Consumers pinned to `@v1` continue to work unchanged; the workflow pulls `ghcr.io/curvenote/actions/cli:v1` or `:v1-slim`, which are re-tagged on each v1 release.

## Publishing

Images are built and pushed by `.github/workflows/release.yml` and `.github/workflows/pr_release.yml`.

After the first publish, make the GHCR package public so workflows in other repositories can pull it without authentication:

**GitHub → Packages → curvenote/actions/cli → Package settings → Change visibility → Public**
