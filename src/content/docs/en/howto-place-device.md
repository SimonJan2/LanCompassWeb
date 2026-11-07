---
title: "Place a device in a rack"
description: "Give a device that is already documented — imported or found by a scan — its place in a rack: rack, U and face."
category: "how-to"
keywords: "place, mount, rack, device, elevation, add device, free U, unit"
version: "0.7.0"
order: 7
---

# Place a device in a rack

Goal: give a device that is already documented — imported from the
spreadsheet or created from a scan — its place in a rack: the rack, its
bottom U and the face. You need a role that can add data (Contributor or
above).

1. In the sidebar, under **Inventory**, open **Racks**.
2. In the list, click the rack's name. The rack opens, drawn as a real
   cabinet.

   On the **Insights** card beside it, "1 device at this site is unracked"
   says how many of the site's devices are waiting for a place.

3. Click **Add device**. The **Add device** window opens.
4. Click the **Existing device** tab. The **Unracked devices** list appears.
5. In the search field, type part of the device's name, IP address, serial
   number or MAC address, and click the device in the list.
6. Click the button beside **Start U** (**Find free U**): the field takes the
   next free U the device fits in. Or type the bottom U it should start at —
   the field starts at 1 whether or not U1 is free.
7. In **Face**, keep **front**, or choose **rear**.
8. Click **Place**.

   The window closes, a message says the device was placed in this rack,
   the device is drawn in the rack at its height, and the table under the
   **Insights** card has a new row with its U. The **Space** meter counts
   the U now taken.

The U is taken? The device is not placed, and the message says what is in
the way. A device that does not exist yet: click **New device** in the same
window and pick it from the **Device library**. To move a device later,
click **Edit** and drag it to another U.

## See also

- [Racks](/docs/racks/) — editing the elevation, carriers, lenses and finding free space.
- [Devices](/docs/devices/) — the device's page.
