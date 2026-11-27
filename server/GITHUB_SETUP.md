# GitHub keepsake upload setup

GitHub is a repository, not a private photo database. Photos committed to a public
repository can be seen by anyone. Create a **private** repository for keepsakes.
Repeated photos create permanent commits and use repository storage.

1. Create a private GitHub repository. Create a fine-grained personal access token
   restricted to that repository with **Contents: Read and write** permission.
2. Deploy `server/github-keepsake-worker.mjs` as a Cloudflare Worker. Configure:
   - `GITHUB_TOKEN`: the token, as a **secret** (never put it in the web app).
   - `GITHUB_OWNER`: your GitHub user or organization.
   - `GITHUB_REPO`: the private repository's name.
   - `ALLOWED_ORIGIN`: the exact website origin, e.g. `https://example.com`.
   - `GITHUB_BRANCH`: optional branch name; otherwise uses the default branch.
3. Set `GITHUB_UPLOAD_ENDPOINT` in `src/lib/keepsake.ts` to the deployed Worker URL
   and rebuild the website. The page sends PNGs only when the visitor explicitly
   starts the visible 10-second memories mode. It shows failures and can stop
   at any time. No GitHub token is stored in the browser.
4. Host the webpage using HTTPS so the phone camera can be opened. `localhost`
   works for local testing. Serving only `dist/index.html` does not host the
   Worker; it must be deployed separately.

The Worker accepts PNG uploads up to 5 MB from the configured origin and creates
uniquely named files in `birthday-keepsakes/YYYY-MM-DD/` using GitHub's Contents API.
For a production deployment, add authentication/rate limiting to the Worker too:
CORS restricts browsers, but **is not authentication** and cannot stop direct
requests by an attacker who knows the endpoint.