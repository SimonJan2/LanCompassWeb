---
title: "Write a runbook and link it to the switch"
description: "A runbook started from the switch's own page: write the steps, save, have it approved."
category: "how-to"
keywords: "runbook, page, procedure, switch, replace, link, template, version, approve"
version: "0.7.0"
order: 10
---

# Write a runbook and link it to the switch

Goal: write the switch-replacement runbook on the switch's own page, so whoever
replaces it finds the steps there. You need a role that can add data
(Contributor or above); approving takes an Operator or an Administrator.

1. Open the switch: in the sidebar, under **Inventory**, open **Devices** and
   click the switch's name.
2. On the device's page, in **Documentation**, click **New page about this
   item**.

   The editor opens on the **Runbook** template, and **Linked to** already
   shows the switch.

3. In **Title**, type the runbook's name, for example "Replace the core switch".
4. In the editor, replace each line of the template with your own: the goal,
   what to have ready, the numbered steps, how to check it worked and how to
   roll back. The preview beside the editor shows the page as it will read.
5. Click **Create page**.

   The page opens, and under its title it says **Version 1 · not approved**;
   **Linked to** shows the switch.

6. Go back to the switch's page: the runbook is listed in **Documentation**,
   with its version line.
7. An Operator or an Administrator opens the page, clicks **History**, and in
   the window, under **Versions**, clicks **Approve**. Under the title it now
   says **Version 1 · approved by**, who and when.

The next save is version 2, not approved until someone approves it again. In
**History** you can compare two versions and restore an old one.

## See also

- [Pages & Attachments](/docs/attachments/) — writing, versions, two people editing one page, sending a page outside.
- [Devices](/docs/devices/) — the device's page.
