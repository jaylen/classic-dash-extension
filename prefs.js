/* Classic Dash: prefs.js
 *
 * Copyright 2024 Yury Khrustalev
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

const {Adw, Gio, GObject, Gtk} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

function init() {
}

class ClassicDashSettingsWidget extends Adw.PreferencesPage {

  static {
    GObject.registerClass(this);
  }

  constructor() {

    super();

    this._actions = new Gio.SimpleActionGroup();
    this.insert_action_group('classic-dash', this._actions);
    this._settings = ExtensionUtils.getSettings();
    this._actions.add_action(this._settings.create_action('show-app-menu'));
    this._actions.add_action(this._settings.create_action('show-favourites'));
    this._actions.add_action(this._settings.create_action('show-calendar'));
    this._actions.add_action(this._settings.create_action('show-date'));
    this._actions.add_action(this._settings.create_action('show-topbar-in-overview'));
    this._actions.add_action(this._settings.create_action('show-sys-menu'));

    let main_group = new Adw.PreferencesGroup({
      title: 'Main Settings',
    });
    this.add(main_group);
    main_group.add(this._toggle('show-app-menu', 'Show applications menu'));
    main_group.add(this._toggle('show-favourites', 'Show favourites'));
    main_group.add(this._toggle('show-calendar', 'Show clock and calendar'));
    main_group.add(this._toggle('show-date', 'Show date on calendar panel'));
    main_group.add(this._toggle('show-topbar-in-overview', 'Show topbar in overview mode'));
    main_group.add(this._toggle('show-sys-menu', 'Show menu with system actions'));

  }

  _toggle(action, title) {
    let toggle = new Gtk.Switch({
        action_name: `classic-dash.${action}`,
        valign: Gtk.Align.CENTER,
      });
      let row = new Adw.ActionRow({
        title: title,
        activatable_widget: toggle,
      });
      row.add_suffix(toggle);
      return row;
  }

}

function buildPrefsWidget() {
  return new ClassicDashSettingsWidget();
}
