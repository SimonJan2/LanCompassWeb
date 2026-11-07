---
title: "Take a backup and prove it restores"
description: "A snapshot now, a restore drill that proves it restores, and a copy off the server."
category: "how-to"
keywords: "backup, restore, drill, restore drill, snapshot, verify, recovery"
version: "0.7.0"
order: 12
---

# Take a backup and prove it restores

Goal: take a backup now, prove it restores — without touching your data —
and keep a copy somewhere other than the server. You need the Administrator
or the Operator role.

1. In the sidebar, under **System**, open **Settings**, and in the settings
   menu choose **Backup & Restore**.
2. On the **Backup** card, click **Snapshot now**.

   Within a minute the backup is the first row of the file list, with its
   **Size**, **Age** and **Created**.

3. On the **Verification** card, click **Run drill now**.

   The drill restores the newest backup into a throwaway schema, checks every
   table, the row counts and the foreign keys, and drops the schema — your
   data does not change.

4. Wait until the drill's new row says **Passed** under **Result**, with the
   **Tables** and **Rows** it checked and the drill's **Duration**.
5. In the backup's row, under **Actions**, click the download icon to keep a
   copy off the server — on a share, on a disk in a safe, wherever your
   backups live.
6. In **Drill cadence**, keep **Weekly** (the default), so the drill repeats on
   its own; a failed drill sends an alert.

The newest drill is the proof an auditor asks for: it is listed, with its date
and result, in the evidence pack's `controls.xlsx`.

## See also

- [Settings](/docs/settings/) — *Backup & Restore notes*: what a backup holds and how a real restore works.
- [Warm standby](/docs/standby/) — a second install kept ready to take over.
- [Hand the auditor the quarter](/docs/howto-audit-pack/).
