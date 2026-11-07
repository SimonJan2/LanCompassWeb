---
title: "Add a colleague as a contributor"
description: "Give a colleague their own account that can view, add and edit data — but not delete or manage users."
category: "how-to"
keywords: "user, account, colleague, role, contributor, tier, permission, password"
version: "0.7.0"
order: 8
---

# Add a colleague as a contributor

Goal: give a colleague their own account that can view, add and edit data —
but cannot delete anything, run backups or manage users. You need the
Administrator role.

1. In the sidebar, under **System**, open **Settings**, and in the settings
   menu choose **Users & Roles**.
2. Click **New user**. The **New user** window opens.
3. In **Username**, type your colleague's user name, for example `dana`.
4. In **Temporary password**, type a password of at least 8 characters.
5. In **Role**, choose **Tier-2 · Contributor**. The line under the field
   says what the role allows.
6. Click **Create user**.

   The window closes, the message **Created dana** appears, and the table has
   a new row with the role **Tier-2**. The **Tier-2** card above the table
   counts one more.

7. Give your colleague the user name and the temporary password. After the
   first sign-in they can change the password under **Settings** →
   **Account & Security**.

To change the role later, click the pencil (**Edit user**) in the row, choose
another **Role** and click **Save**.

When the install is connected to a directory (LDAP) or to SSO, the window also
shows **Sign-in source**; for a colleague with an account in your
organisation choose that source there, and the password stays with the
organisation.

## See also

- [Accounts & Roles](/docs/accounts-and-roles/) — what each of the four roles may do.
- [Settings](/docs/settings/) — the other Settings sections.
