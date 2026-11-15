---
name: feedback_show_before_commit
description: Show changes locally first; commit and push only after Abhinav reviews and says OK
metadata:
  type: feedback
---

From 15 Nov 2026 Abhinav said: "Run it locally first and show me. If there are any changes or updates, I will tell you, and then we can do a commit and push."

**Why:** He wants to review every change before it lands in git, not after.

**How to apply:** Build or edit, then show it: open it in the browser pane or a local dev server, or send the file. Wait for his OK or his changes. Only then commit and push. This applies to docs and memory updates too: leave them uncommitted until he approves the batch. Deploys still follow [[feedback_batch_deploys]].
