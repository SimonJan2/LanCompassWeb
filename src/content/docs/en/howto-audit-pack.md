---
title: "Hand the auditor the quarter"
description: "Last quarter's evidence pack: build it, check it as the auditor will, and hand it over with its signed cover."
category: "how-to"
keywords: "auditor, audit, evidence pack, quarter, audit trail, compliance, manifest, verify, check"
version: "0.7.0"
order: 13
---

# Hand the auditor the quarter

Goal: give the auditor one file that answers most of their request for last
quarter, and that can be checked with no network. You need the Operator or
the Administrator role.

1. In the sidebar, under **Operations**, open **Reports**.
2. In **Site scope**, choose the site the audit covers, or keep **All sites**.
3. In **Period**, choose **Last quarter**.
4. Click **Evidence pack**. The **Evidence pack** window opens, with the scope
   and the quarter's **From** and **To**.
5. In **Parts**, keep every part ticked, or untick a part the auditor did not
   ask for. Each part says which regulation or ISO clause it answers.
6. Click **Build pack**.

   The browser saves one ZIP named
   `lancompass-evidence-<scope>-<from>_<to>-<today>.zip`.

7. Unzip it and open its `index.html` — the cover. Print it on A4: it lists
   every file with its rows, size and SHA-256, and prints the manifest's own
   hash in a box.
8. In the unzipped folder, check it as the auditor will, with no network:

   ```bash
   sha256sum manifest-sha256.txt
   ```

   The hash must equal the one in the cover's box. Then:

   ```bash
   sha256sum -c manifest-sha256.txt
   ```

   Every line must end in OK.

9. Sign **Prepared by** on the printed cover and hand the ZIP and the cover to
   the auditor, who signs **Received by**.

The **Changelog** keeps one **Evidence pack** row with the scope, the period and
the manifest's hash.

## See also

- [Reports](/docs/reports/) — *Evidence pack*: every part, and how an outsider verifies it.
- [Changelog](/docs/changelog/) — the audit trail the pack carries.
- [Take a backup and prove it restores](/docs/howto-backup-drill/) — the restore drills the pack lists.
