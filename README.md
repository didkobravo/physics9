# physics9

Interactive physics explainers for 9th grade (Bulgarian curriculum), in Bulgarian.
Each lesson is one page with a small hands-on simulation.

```sh
npm install
npm run dev        # http://localhost:5173/physics9/
```

**Deploy:** every push to `main` runs `.github/workflows/deploy.yml`, which
typechecks, builds, and publishes `dist/` to GitHub Pages at
`https://<user>.github.io/physics9/`.
