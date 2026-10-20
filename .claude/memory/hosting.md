---
name: hosting
description: Where the demo hub is hosted and how to deploy it
metadata:
  type: reference
---

- Live: https://od-demo-lyart.vercel.app (production alias). First deployed 20 Oct 2026. The plain `od-demo.vercel.app` name was taken by another account.
- Vercel project: `od-demo` on team `abhinav00017s-projects`, account abhinav00017. Linked via `.vercel/` (git-ignored). No env vars needed.
- GitHub: https://github.com/abhinav00017/od-demo-1, branch `main`. Vercel could not connect the repo (GitHub app not installed), so pushes do not deploy on their own.
- Deploy: push to `main`, then `vercel deploy --prod --yes` from the repo root.
- Dev: `npm run dev` on port 3000. Shares the port with onlydevs_prod_1; only one can run at a time.

**How to apply:** After each change Abhinav wants live, push and run the deploy command. Tell him the live URL. See [[decisions]].
