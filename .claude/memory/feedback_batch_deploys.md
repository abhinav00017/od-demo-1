---
name: feedback_batch_deploys
description: Do not deploy after each change; group improvements and do one final deployment when Abhinav says so
metadata:
  type: feedback
---

From 10 Nov 2026 Abhinav said: "Don't deploy everything. Now we will group all the improvements together, and we will do a final deployment."

**Why:** He wants to review a batch of improvements together and ship once, instead of a live change after every request.

**How to apply:** Build, test and commit each change locally as before. Do not run `vercel deploy`. Pushing to GitHub is fine (Vercel is not connected to the repo, so a push does not deploy). Keep a running list of undeployed changes in [[decisions]] and show it when he asks for the final deploy. Deploy from a clean worktree of the committed code only when he says to.
