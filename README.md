# Classic Dash Extension for GNOME

This extension brings classic look-and-feel for the dash panel that gives access to:

 * Applications menu
 * Favourite app launchers
 * Open windows
 * Clock and calendar
 * System actions

It also hides the top bar to allow more space on your screen.

Some configurable options available via the Dash Settings menu item in the system
actions menu.

The applications menu allows to add and remove favourite apps and to show standard
Gnome dashboard with all installed applications.

## Installation

To install, run the following command that will install the extension into the
`${HOME}/.local/share/gnome-shell/extensions` directory.

```
make install
```

To configure or uninstall, use standard GNOME `gnome-shell-extension-prefs` app.
Look and feel can be adjusted by modifying CSS styles in [stylesheet.css](stylesheet.css).

## System Requirements

Currently this extension is written for and tested on Debian 12 and GNOME 43.

## To Do

The following things are planned for implementation but are not ready yet:

 * Sound volume indicator.
 * Network connection indicator.
 * Battery indicator.

## Licence

SPDX-License-Identifier: GPL-2.0-or-later (see [COPYING](COPYING)).
