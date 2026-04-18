/* Classic Dash: settings.js
 *
 * Copyright 2024-2026 Yury Khrustalev
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

'use strict';

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export const params = {
  'show-appmenu': {
    type: 'b',
    default: 'true',
    summary: 'Show applications menu',
    description: 'Show menu with launchers for installed applications',
    group: 'Appearance',
  },
  'show-favpanel': {
    type: 'b',
    default: 'true',
    summary: 'Show quick app launchers',
    description: 'Show panel with favourite application launchers',
    group: 'Appearance',
  },
  'show-calendar': {
    type: 'b',
    default: 'true',
    summary: 'Show calendar',
    description: 'Show a panel with current date, time, and weekday',
    group: 'Appearance',
  },
  'show-sysmenu': {
    type: 'b',
    default: 'true',
    summary: 'Show system menu button',
    description: 'Show menu with system actions',
    group: 'Appearance',
  },
  'win-filter-by-workspace': {
    type: 'b',
    default: 'true',
    summary: 'Filter windows by workspace',
    description: 'Only show labels for windows present on the current workspace',
    group: 'Windows',
  },
  'win-group-by-workspace': {
    type: 'b',
    default: 'true',
    summary: 'Group window buttons by workspace',
    description: 'Place buttons for windows on the same workspace next to each other',
    group: 'Windows',
  },
  'show-topbar-in-overview': {
    type: 'b',
    default: 'false',
    summary: 'Show topbar in overview mode',
    description: 'When GNOME overview is showing, show standard GNOME topbar',
    group: 'Miscellaneous',
  },
  'fav-hide-when-running': {
    type: 'b',
    default: 'false',
    summary: 'Hide favourite app launcher when app is running',
    description: 'Hide favourite app launcher when corresponding app is running',
    group: 'Miscellaneous',
  },
  'applications-button-text': {
    type: 's',
    default: '"Applications"',
    summary: 'Title for the Applications button',
    description: 'Title for the Applications button (use "icon:" prefix to replace text with an icon)',
    group: 'Miscellaneous',
  },
};

function get_schemas_dir() {
  let fn = Gio.File.new_for_uri(import.meta.url);
  let ws = fn.get_parent();
  let folder = ws.get_child('schemas');
  if (!folder.query_exists(null)) {
    folder.make_directory(null);
  }
  return folder;
}

function get_param_xml(key, param) {
  return `<key name="${key}" type="${param.type}">
    <default>${param.default}</default>
    <summary>${param.summary}</summary>
    <description>${param.description}</description>
  </key>`;
}

function get_schema_xml(sid) {
  const name = sid.split('.').at(-1);
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<schemalist>
<schema id="${sid}" path="/org/gnome/shell/extensions/${name}/">
  `;
  let items = [];
  for (const [key, param] of Object.entries(params)) {
    items.push(get_param_xml(key,param));
  }
  const footer = `\n</schema>
</schemalist>`;
  return header + items.join('\n  ') + footer;
}

function generate_schema(sid) {
  let schemas_dir = get_schemas_dir();
  let output = schemas_dir.get_child(`${sid}.gschema.xml`);
  let stream = output.replace(null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
  const bytes = new GLib.Bytes(get_schema_xml(sid));
  return stream.write_bytes(bytes, null);
}

if (ARGV.length > 0) {
  let sid = ARGV[0]; // schema id
  generate_schema(sid);
}
