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

imports.gi.versions.Gtk = "4.0";

const { Adw, GObject, Gtk, Gio, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;

function init() {}

class SettingsWidget extends Adw.PreferencesPage {

  static {
    GObject.registerClass(this);
  }

  constructor() {

    super();

    let main = new Adw.PreferencesGroup({
      title: 'Classic Dash Settings',
    });
    this.add(main);

    this._settings = ExtensionUtils.getSettings();
    this._actions = new Gio.SimpleActionGroup();
    this.insert_action_group('classic-dash', this._actions);

    let schema = this._settings.settings_schema;
    let grid = SettingsWidget._box(12);
    main.add(grid);
    if (schema instanceof Gio.SettingsSchema) {
      schema.list_keys().forEach((name, n) => {
        let key = schema.get_key(name);
        let id = key.get_name();
        let summary = key.get_summary();
        let vtype = key.get_value_type();
        if (vtype.equal(GLib.VariantType.new('b'))) {
          this._actions.add_action(this._settings.create_action(id));
          grid.attach(SettingsWidget._toggle_row(id, summary), 0, n, 2, 1);
        } else if (vtype.equal(GLib.VariantType.new('s'))) {
          let action = this._settings.create_action(id);
          this._actions.add_action(action);
          grid.attach(SettingsWidget._label(summary), 0, n, 1, 1);
          let entry = SettingsWidget._entry(this._settings, action, id);
          this._settings.connect(`changed::${id}`, () => {
            entry.buffer.text = this._settings.get_string(id);
          });
          grid.attach(entry, 1, n, 1, 1);
        } else {
          grid.attach(SettingsWidget._label(`Unknown type of param '${name}'`), 0, n, 2, 1);
        }
      });
    } else {
      grid.attach(SettingsWidget._label('Error: Schema file not found'), 0, 0, 1, 1);
    }

  }

  static _box(spacing) {
    return new Gtk.Grid({
      column_spacing: spacing,
      row_spacing: spacing,
    });
  }

  static _label(text) {
    return new Gtk.Label({
      label: text,
      halign: Gtk.Align.START,
      valign: Gtk.Align.CENTER,
    });
  }

  static _toggle_row(id, summary) {
    let row = SettingsWidget._box(12);
    let label = SettingsWidget._label(summary);
    label.hexpand = true;
    let toggle = new Gtk.Switch({
      action_name: `classic-dash.${id}`,
      valign: Gtk.Align.CENTER,
    });
    row.attach(label, 0, 0, 1, 1);
    row.attach(toggle, 1, 0, 1, 1);
    return row;
  }

  static _entry(settings, action, id) {
    let entry = new Gtk.Entry({
      valign: Gtk.Align.CENTER,
      hexpand: true,
      secondary_icon_name: 'document-send',
    });
    entry.buffer.text = settings.get_string(id);
    let fun = () => {
      action.change_state(GLib.Variant.new_string(entry.buffer.text));
    };
    entry.connect('activate', fun);
    entry.connect('icon-release', fun);
    return entry;
  }

}

function buildPrefsWidget() {
  return new SettingsWidget();
}
