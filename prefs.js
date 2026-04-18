/* Classic Dash: prefs.js
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
import Adw from 'gi://Adw';

import {
  ExtensionPreferences,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
  params,
} from './settings.js';

export default class ClassicPreferences extends ExtensionPreferences {

  fillPreferencesWindow(window) {

    const pages = new Map();

    for (const [key, param] of Object.entries(params)) {
      let group = param.group;
      if (!pages.has(group)) {
        pages.set(group, []);
      }
      param.key = key;
      pages.get(group).push(param);
    }

    window._settings = this.getSettings();

    pages.forEach((params, title) => {
      const page = new Adw.PreferencesPage({
        title: title,
        icon_name: 'gnome-settings',
      });
      window.add(page);
      const group = new Adw.PreferencesGroup();
      page.add(group);
      params.forEach((param) => {
        let row;
        switch (param.type) {
          case 'b':
            row = new Adw.SwitchRow({
              title: param.summary,
              subtitle: param.description,
            });
            window._settings.bind(param.key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
            break;
          case 's':
            row = new Adw.EntryRow({
              title: param.summary,
              text: window._settings.get_string(param.key),
              show_apply_button: true,
            });
            row.connect('apply', () => {
              window._settings.set_string(param.key, row.text);
            });
            window._settings.connect(`changed::${param.key}`, () => {
              row.text = window._settings.get_string(param.key);
            });
            break;
          default:
            return;
        }
        group.add(row);
      });

    });

    let page = new Adw.PreferencesPage({
      title: 'About',
      icon_name: 'info',
    });
    let group1 = new Adw.PreferencesGroup({
      title: `${this.metadata.name} ${this.metadata['version-name']}`,
      description: this.metadata.description,
    });
    page.add(group1);
    let group2 = new Adw.PreferencesGroup({ title: 'Authors:' });
    this.metadata['original-authors'].forEach((author) => {
      group2.add(new Adw.ActionRow({
        title: author,
        icon_name: 'person',
      }));
    });
    page.add(group2);
    window.add(page);

  }

}
