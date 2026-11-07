---
title: "Send alerts to the team's mailbox"
description: "A mail channel for the team's shared mailbox: set it up, test it before saving, and choose which alerts it carries."
category: "how-to"
keywords: "alert, alerts, email, mail, smtp, channel, notification, mailbox, team"
version: "0.7.0"
order: 9
---

# Send alerts to the team's mailbox

Goal: have LanCompass mail its alerts — a monitor down, a certificate about to
expire, a failed backup — to the team's shared mailbox. You need the
Administrator role, and your mail server's name and port.

1. In the sidebar, under **System**, open **Settings**, and in the settings
   menu choose **Monitoring**.
2. On the **Notification channels** card, click **New channel**. The **New
   channel** window opens.
3. In the **Channel kind** step, choose **SMTP email** and click **Continue**.
4. In the **Configure** step, fill in:
   - **Name** — for example "Team mailbox";
   - **SMTP host** — the mail server, for example `mail.example.org`;
   - **Port** — click your server's port (25, 465 or 587); the line below
     says what each means for encryption;
   - **From** — the sender address, for example `lancompass@example.org`;
   - **Recipients** — the team's mailbox, for example `noc@example.org`,
     then Enter.

   **Provider preset** fills the fields for a known provider (Gmail,
   Microsoft 365, a local relay), and every field stays editable. For a
   server that needs a sign-in, fill in **Username** and the password too.
   Click **Continue**.

5. In the **Events** step, leave **All events**, or pick only the alerts the
   team wants. Click **Continue**.
6. In the **Test** step, click **Run test**. Each stage — **Resolve host**,
   **TCP connect**, **TLS**, **Authenticate**, **Send message** — gets a
   green tick, and a test mail reaches the mailbox. A stage that fails shows
   the server's own error.
7. Click **Create**. The message **Channel created** appears, and the channel
   is a row under **Notification channels**, with **Enabled** on.

From now on every alert reaches the mailbox, in the channel's language, with
the time in the install's time zone.

## See also

- [Monitoring](/docs/monitoring/) — *Notification channels* and *The channel wizard*.
- [Send the manager the monthly report](/docs/howto-monthly-report/) — a report schedule sends through this channel.
