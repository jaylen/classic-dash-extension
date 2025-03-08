/* Classic Dash: tooltip.js
 *
 * Copyright 2024-2025 Yury Khrustalev
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

const {
    Clutter, GObject
} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Menu = Me.imports.src.menu;
const Label = Me.imports.src.elements.Label;

const Main = imports.ui.main;

var Tooltip = class extends Menu.Anchored {

  static {
    GObject.registerClass(this);
  }

  constructor(text, anchor) {
    super({
      style_class: 'classic-tooltip',
      x_expand: false,
      y_expand: false,
      visible: false,
      layout_manager: new Clutter.BoxLayout({}),
    });
    this._anchor = anchor;
    this.add_actor(new Label(text));
    this.connectObject(
      'show', this._showing.bind(this),
      this);
    Main.layoutManager.addTopChrome(this, {
      affectsStruts: false,
      trackFullscreen: false,
    });
    this.connect('destroy', this._destroy.bind(this));
  }

  _destroy() {
    Main.layoutManager.removeChrome(this);
  }

  static tooltip_show_timeout = 900; // ms
  static tooltip_hide_timeout = 6000; // ms
  static tooltip_displaying = null;
  static tooltip_timeout_id = null;

  static show_tooltip(text, anchor) {
    if (text === null || text === undefined) {
      return;
    }
    Tooltip.hide_tooltip();
    Tooltip.tooltip_timeout_id = setTimeout(() => {
      Tooltip.hide_tooltip();
      Tooltip.tooltip_displaying = new Tooltip(text, anchor);
      Tooltip.tooltip_displaying.show();
      // hide tooltip anyway after some time
      setTimeout(() => {
        Tooltip.hide_tooltip();
      }, Tooltip.tooltip_hide_timeout);
    }, Tooltip.tooltip_show_timeout);
  }

  static hide_tooltip() {
    clearTimeout(Tooltip.tooltip_timeout_id);
    Tooltip.tooltip_timeout_id = null;
    Tooltip.tooltip_displaying?.destroy();
    Tooltip.tooltip_displaying = null;
  }

  _showing() {
    // set location of the menu wrt the anchor button
    this.set_location_near_anchor(this._anchor);
  }

}
