---
title: "Send the manager the monthly report"
description: "Last month's report for one site — on paper today, and mailed to the manager every month."
category: "how-to"
keywords: "report, monthly, month, manager, schedule, print, workbook, mail, branch"
version: "0.7.0"
order: 11
---

# Send the manager the monthly report

Goal: give the branch's manager last month's report on paper today, and mail
it on the first of every month. Printing is open to every role; a schedule
needs the Administrator role and a mail channel
([Send alerts to the team's mailbox](/docs/howto-alerts-to-mailbox/)).

**Today, on paper**

1. In the sidebar, under **Operations**, open **Reports**.
2. In **Site scope**, choose the site.
3. In **Period**, choose **Last month**.

   The sections that count the month are marked with its dates, and the line
   under the figures says the other figures are as of now.

4. Click **Print**. A print preview opens: the site and the month beside the
   title, and **Paper** A4 already chosen (A3 and Letter beside it).
5. Click **Print / save as PDF**, and print or save from the browser's print
   window. Every page prints **As of** and **Produced by** at the bottom, and
   the report ends with two lines to sign: **Prepared by** and **Approved by**.

**Every month, by mail**

6. Go back to **Reports**, click **Schedules**, then **Add schedule**.
7. Fill in:
   - **Name** — for example "North Branch monthly";
   - **Recipient** — the manager's address, for example `manager@example.org`;
   - **Language** — the language the report will be read in;
   - **Scope** — the site;
   - **Period** **Month**, **Day** 1, **Hour** 07:00 — the defaults;
   - **Send through** — the mail channel;
   - leave **Attach the workbook** and **On** switched on.

   Under the fields it says **Every month on day 1 at 07:00**.

8. Click **Save**. The message **Schedule saved** appears, and the schedule is
   a row in the table.
9. In its row, click **Send now** to test: the recipient gets this month so
   far, with the workbook attached, and **Last sent** updates.

On the first of every month the recipient gets the whole previous month.

## See also

- [Reports](/docs/reports/) — the period, the sections, printing, the files and schedules.
