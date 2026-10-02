# The Best Optimizer Depends on Batch Size

Standalone research blog with interactive scaling-rule searches, optimizer comparisons, and noisy-quadratic simulations.

- [Read the blog](https://dangxingyu.github.io/batch-size-blog/)
- Author: [Xingyu Dang](https://dangxingyu.github.io/)

The article is maintained and deployed here. The personal-site repository links to this project and redirects the old article URL.

## Develop

Node.js 22 or newer is sufficient; there are no package dependencies to install.

```sh
npm run dev    # http://127.0.0.1:5174/
npm test       # numerical, data-integrity, rendering and plot checks
npm run build  # verified static site in dist/
```

## Files

- `index.html`: article text and figure markup.
- `batch-size/`: local styles, interactions, fonts, KaTeX, measurements and submission PDF.
- `scripts/`: development server, static build and verification.
- `docs/batch-size-blog.md`: evidence boundaries and component implementation notes.

Pushes to `main` validate and deploy the article through GitHub Pages. The build publishes only `index.html`, `batch-size/`, and the sitemap, leaving development files out of the deployed site.

Bundled KaTeX and fonts retain their upstream license files. Measurement downloads preserve the original paper data; interpolation is labeled separately in the interface and protocol.
