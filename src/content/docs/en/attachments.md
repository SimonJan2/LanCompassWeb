---
title: "Pages & Attachments"
description: "User-authored markdown pages plus file attachments on every entity."
category: "operations"
version: "0.7.0"
order: 40
---

# Pages & Attachments

Two additions for day-to-day ops: **Pages** — user-authored markdown
documents that live beside this help — and **Attachments** — files
stored directly on devices, racks, sites, IPs, certificates, circuits,
assets, and pages themselves.

## Pages

The built-in help (what you're reading now) is written by developers and
ships with the app. **Pages** are yours: runbooks, procedures, notes —
anything you'd otherwise keep in a wiki or a README on a share.

- Open Docs — the **Pages** section sits below the built-in
  guides, on a dashed-border list so the two never blur together.
- **New page** needs the `data:write` role. The editor is split-screen:
  markdown on the left, live preview on the right, a formatting toolbar
  on top.
- The **slug** auto-suggests from the title (`My Runbook` →
  `my-runbook`); the server owns the final slug and appends `-2`, `-3`…
  on collisions.
- Pages render with the same GitHub-flavored markdown as these guides —
  tables, task lists, links — plus fenced-code **syntax highlighting**,
  a copy button on every code block, and callouts written as
  `> [!NOTE]` / `> [!TIP]` / `> [!IMPORTANT]` / `> [!WARNING]` /
  `> [!CAUTION]`. Raw HTML is not rendered.
- Hebrew and other RTL text works: titles and paragraphs render with
  `dir="auto"`.
- Deleting a page requires `data:delete` and is permanent — there is no
  trash.

**Two people editing one page.** When someone saves a page after you
opened it, your save is refused and a dialog asks what to do: **Reload**
shows their version and keeps your text as a draft — the draft banner
offers it back, so you can restore it and save again — **Overwrite**
replaces their version with yours, and **Cancel** leaves your edit open.
Nothing is lost either way, and the page's history shows every save.

### Writing

- Toolbar buttons cover headings, bold/italic, inline and fenced code,
  links, lists, checklists, and quotes. Keyboard shortcuts work too:
  `Ctrl/⌘+B` bold, `Ctrl/⌘+I` italic, `Ctrl/⌘+K` link, `Ctrl/⌘+S` save,
  `Ctrl/⌘+Shift+7` numbered list, `Ctrl/⌘+Shift+8` bullets,
  `Ctrl/⌘+Shift+9` checklist; `Tab` indents.
- **Drafts autosave** to the browser every second while you're dirty —
  reopen the editor and you'll be offered the draft back (or discard
  it). Leaving with unsaved work prompts before navigating away.
- The status line under the editor shows word/character counts, a
  ~minutes read estimate, and saved/draft state.
- New pages can start from a **template** — Blank, Runbook, Procedure,
  or Incident report — picked beside Category (or via
  `/docs/pages/new?template=runbook`). The four built-in skeletons are
  written in your language: a Hebrew runbook starts in Hebrew. **Team
  templates**: any page in category `template` is offered under the
  built-ins, so a team keeps its own skeletons.
- Callouts are labelled in the reader's language (`> [!WARNING]` reads
  "אזהרה" on a Hebrew page).
- A PDF (or any file that isn't an image) linked in a page shows as a file
  chip with **Download** — PDFs open in your own viewer, never inline.
- **Paste or drop an image** straight into the editor — it uploads as a
  page attachment and lands as `![name](…)` at the cursor. (Available
  once the page exists; save first on a brand-new page.)

### Reading

- A page view is a centered reading column with an **On this page**
  contents rail (on wide screens) built from `##`/`###` headings.
- **Pin** a page and it leads the Docs list in a *Pinned* strip.
- Under the title the page says **which version** you are reading and
  whether it is approved: "Version 4 · approved by dana on …" or
  "Version 4 · not approved".
- The **History** button opens the page's **Versions**, its changelog
  entries below them:
  - **Every save is a version.** A save that changes the title, the
    text, the language or the linked site is the page's next version
    (who, when); pinning or recategorising alone writes none. A page
    created before versions existed starts at version 1.
  - **Compare**: tick two versions — their title and text side by side,
    each line marked removed, added or changed.
  - **Restore this version** (writers): the page takes that version's
    content as a **new** version — nothing is deleted, so a restore can
    itself be undone. If someone saved the page after you opened it,
    the restore is refused like a stale save; reopen and try again.
  - **Approve** (operators and admins): marks a version approved, with
    who and when; the changelog records it. An approval stays with its
    version — the next save is a new, unapproved version.
  - In the changelog list a text change reads "The text changed — see
    Versions", linked to the list above; every field is named in your
    language.
- How many versions are kept is **Settings → Features → Data retention →
  Team-page versions kept per page** (0, the default, keeps every
  version; approved versions are always kept).
- Filter Docs by title or category, and when nothing matches the page
  bodies are searched too — hits show a snippet of the match. The `⌘K`
  palette searches page bodies the same way.
- **Print** opens the page's print view (`/docs/pages/<slug>/print`):
  the page on **A4 portrait** by default (the chips switch to A3 or
  landscape), in the same frame as every printed sheet — the page's
  title with its version and approval and its linked site (else its
  category) at the top, "As of"
  the page's last save, "Produced by" you and "Page 1 of 2" at the
  bottom. Nav, actions and the contents rail stay off the paper, code
  prints black-on-white, and the "updated" line prints a date, never a
  time counted back from now. A built-in help chapter prints the same way from the
  **Print** link beside its breadcrumb (`/docs/<slug>/print`).

Every create/edit/delete lands in the **Changelog** like any other
object, and pages and their versions ride along in **Backup**. On a
phone the guides fold into one **Guides** button above the page, and the
page's actions wrap.

### Import & export

Pages are plain markdown — they move in and out as files.

- **Export one page**: the **Export** button on a page downloads
  `<slug>.md` with a frontmatter block (title, slug, category, pinned,
  linked site, and the version with its approval) — drop it in git or
  mail it.
- **Export all**: **Export all** on Docs downloads a zip —
  `pages/<slug>.md` for every page, plus an `attachments/<slug>/` tree
  with each page's files. Image refs inside the markdown are rewritten
  to those relative paths, so the zip is fully portable.
- **Import**: the **Import** button takes `.md`/`.txt` files or a
  `.zip` export. Frontmatter restores title/category/pin and re-links
  the page to a site **by name** (a link to a site that doesn't exist
  imports unlinked, with a warning — never a failure).
- **Slug conflicts** get a per-import choice: *Keep both* (imported
  page gets `-2`), *Skip duplicates*, or *Overwrite* (the file replaces
  the existing page — the changelog records it).
- A file with no frontmatter still imports: the title falls back to
  its first `#` heading, then the filename.
- One bad file can't sink the batch — every file lands in exactly one
  of *created / updated / skipped / errors* in the result.

### Sending a page outside

**Export** gives a page as Markdown for another LanCompass. To send one
page to someone outside — a support vendor, a contractor, an auditor —
use **Send outside** on the page (contributors and above). Write **For
whom** (a name or a company) and press **Build the file**: one ZIP,
`lancompass-share-page-<page>-YYYY-MM-DD.zip`, in the evidence pack's
sealed shape (see [Reports](/docs/reports/)).

- **What it holds**: `data/page.md` (the page with its frontmatter, its
  version and its approval), `data/page.html` — the page ready to print on
  A4, framed with the install, the title, as of, who produced it and page
  x of y — and every file attached to the page under `data/attachments/`.
  The images the page shows open from that folder.
- **Nothing points back inside.** A link to a device, a rack, a subnet or
  any other page of the install becomes its name with "(in LanCompass)";
  a file attached to something else stays home and is named the same
  way. Links to the outside world stay links.
- **The cover**, `index.html`, starts with "Prepared for … by … on …" in
  your language, then lists each file with its SHA-256 and prints the
  manifest's own hash in a box.
- **What the vendor checks**, with no network and no LanCompass: unzip
  it, run `sha256sum manifest-sha256.txt` in its folder — the hash must
  equal the one on the cover — then `sha256sum -c manifest-sha256.txt`:
  every line must end in OK. Then open `data/page.html` and print it.

The same **Send outside** is on a rack (the **⋯** menu: its elevation and
its workbook), a design (the **Export** menu: its newest official drawing
and its `.lancompass-design.json`) and Reports. Each pack writes one
changelog row, `share.pack`, with what was sent, for whom and the
manifest's hash. Nothing is stored on the server, and no link to the
install leaves with the file.

**A read-only link instead of the file** (administrators). When the person
outside has no LanCompass account and needs to look rather than keep a
file, choose **Link** in the same dialog. Links are **off by default**:
they need HTTPS and an administrator turning on **Allow read-only links**
in Settings → Account & Security → **Links** (see
[Settings](/docs/settings/)); until then the choice is shown disabled with
that reason. **Sealed file** stays the default.

- **One link per person.** Write **For whom** and press **Make the
  link**: the same pack is built now and kept on the server, and its
  address, `https://<install>/s/<token>`, is shown **once** — copy it
  then. Someone else gets a link of their own.
- **What it opens**: the page as it was when the link was made (an edit
  after that is not shown), each of its files to view or to download, and
  the whole sealed ZIP — no menu, no sign-in, nothing else of the install.
- **It expires** after the days set on the Links card (7 by default, at
  most 30). Until then anyone the address reaches can open it.
- **Revoke** it at once in Settings → Account & Security → **Links** (the
  person who made it, or any administrator): it then answers "not
  available", and the other people's links stay. Links also stop when
  the person who made them is disabled or deleted and when the master key
  is rotated; turning links off stops them all.
- **Every open is logged**: the Links list counts the opens and shows the
  last one, and the changelog has a `share.open` row with the address and
  the browser of each (`share.link` when it was made, `share.revoke` when
  it stopped).

## Site documents

A page can be about many things: in the editor, **Linked to** searches
devices, racks, sites, subnets, VLANs, VRFs, addresses, circuits,
certificates and diagrams (the same search as the command palette) — pick
as many as the page covers. The first one is the page's main link, the
one its exported `.md` file carries.

- **Documentation on objects.** A device's, a rack's and a subnet's own
  page has a **Documentation** section listing the pages linked to it,
  each with its version line, and **New page about this item** — the
  editor opens linked to the object, on the runbook template. A site's
  pages are in its Documents dialog (below).
- **A linked object deleted.** The page keeps what it was about: "The
  linked Device “sw-1” was deleted on 25/10/2026." stays under its title,
  and the changelog records the unlink. Deleting a device or a rack also
  says how many attachments go with it before you confirm.

Click **New page** inside a site's Documents dialog and the form arrives
pre-linked to the site.

- Every **site row** has a **Documents** button (book icon) that opens
  the site's pages *and* its attached files in one dialog. A count badge
  on the button shows how many pages are linked (a page about two sites
  counts on both).
- On Docs, linked pages group under a heading per site — the
  heading jumps to the sites table filtered to that site — and unlinked
  pages trail in **General**.
- A linked page's header carries a site chip → the same filtered sites
  table.
- **Unlink ≠ delete.** Removing the link — the unlink action in the
  dialog (the page's other links stay), removing the chip in the editor,
  or deleting the site itself — clears the reference and the page
  survives (in *General* when nothing is left); the changelog records
  the unlink. (Files are the opposite: attachments are owned bytes and
  are deleted with their entity.)

## Attachments

Anything with a detail surface can carry files — a photo of a rack, a
certificate export, a signed circuit contract, a switch config dump.

- On **device** and **rack** detail pages the *Attachments* card sits
  with the other metadata cards. On **certificates**, **circuits**, and
  **inventory** click the paperclip in the row's actions (sites use the
  Documents button described above). On an **IP address** open the
  drawer — attachments are below the monitor section. A **page** carries
  attachments for images pasted into its body — manage them in the
  editor's attachments strip.
- Click **Attach** (or drop a file onto the card) → pick a file →
  optional label → Upload.
- Limits and rules:
  - **6 MB per file**, enforced at upload.
  - Allowed types: images, PDF, plain text, ZIP. The server stores the
    bytes honestly — it doesn't try to preview what it can't render.
  - Filenames may repeat; use the label to distinguish.
  - **No versioning**: to replace a file, delete the attachment and
    upload the new one — the history stays honest.
- Click a chip to download (byte-identical to what was uploaded). Image
  attachments open a lightbox preview instead.
- The Docs search finds a page by the names of the files it holds too —
  `נוהל-ספק` finds the runbook the supplier's procedure is attached to.
- Uploading needs `data:write`; deleting needs `data:delete`.

### Images inside pages

Paste/drop in the editor inserts `![filename](/api/v1/attachments/<id>/inline)`.
The `/inline` endpoint is deliberately narrow — it only serves raster
image types (PNG, JPEG, GIF, WebP, AVIF, BMP) with
`X-Content-Type-Options: nosniff`. Everything else — including SVG,
which is an HTML execution context — answers **415** and stays
download-only, so a stored file can never run script in your browser.

Files live as rows in Postgres — no shared filesystem, so a backup
restore brings them back with the rest of the database. Deleting an
entity (or a page) sweeps its attachments in the same transaction:
nothing is left dangling, and the changelog records the file's name —
never its bytes.

> **Note:** this is a trusted-LAN tool. Uploaded files are stored as-is
> and are **not virus-scanned** — attach files you trust, from machines
> you trust.

## What's not here (yet)

- Ranked full-text search (page search today is substring matching —
  `to_tsvector` ranking is a separate step), non-image file previews,
  and attachment versioning.
