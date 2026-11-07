---
title: "Run a first scan and sort what it found"
description: "Scan one network, then decide about every new host in the Discovery Inbox."
category: "how-to"
keywords: "scan, first scan, discovery, inbox, new hosts, triage, review"
version: "0.7.0"
order: 6
---

# Run a first scan and sort what it found

Goal: scan one network you are allowed to scan, then decide about every host
the scan found. You need a role that can add data (Contributor or above).

1. In the sidebar, under **Operations**, open **Scans**.
2. In the top bar, click **Quick scan**. The **Network scan** window opens.
3. In **CIDR (optional)**, type the network to scan, for example `192.168.1.0/24`.
4. Click **Start scan**.

   The window shows the scan's progress, and the scan becomes the first row
   of **Job history**.

5. Wait until the window says **Completed**, with how many hosts are live
   and how many are new, then click **Close**. In **Job history**, the
   **New** column counts the hosts the scan found that nobody has
   documented yet.
6. In the scan's row, click the number under **New**. The **Discovery
   inbox** opens.
7. Decide about each host, in its **Actions**:
   - one of yours that should be documented — click **Active**;
   - an address to keep for a device that is not switched on yet — click
     **Reserve**;
   - something that should not be on the network — click the bin
     (**Delete**), once you know what it is.

   Each decision is saved at once and the host leaves the inbox. The message
   **Marked active** confirms the first one.

8. Open **Review** (under **Operations**). It lists everything else the scan
   raised — a MAC address that changed, a host that left the network, a
   device with no rack — in sections, each with its count. Work through them
   the same way.

When the inbox is empty, every address the scan saw is documented, kept or
gone — and the next scan brings only what is new.

**If the scan is refused** with a message that only configured networks may
be scanned: the **Scanner configuration** card on **Scans** has a button for
each configured network — click it to scan that one, or ask an administrator
to add the network under **Settings** → **Scanning**.

## See also

- [Scans](/docs/scans/) — how a scan works, what it may scan and why one finds nothing.
- [Discovery](/docs/discovery/) — the inbox and deep discovery.
- [Review Center](/docs/review/) — every section of the queue.
