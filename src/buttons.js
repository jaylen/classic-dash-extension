/* Classic Dash: buttons.js
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
    GObject
} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Elements = Me.imports.src.elements;
const Tooltip = Me.imports.src.tooltip;

var PushButton = class extends Elements.Button {

  static {
    GObject.registerClass(this);
  }

  constructor() {
    super();
    this._tooltip_text = null;
    this._menu_create_fun = null;
    this._menu_destroy_fun = null;
    this._menu_buttons = null;
    this._menu = null;
    this.connect('destroy', this._destroy.bind(this));
  }

  _destroy() {
    this._hide_tooltip();
  }

  set_tooltip_text(text) {
    let first_time = this._tooltip_text === null;
    this._tooltip_text = text;
    // we may change tooltip text many times
    // but the event callbacks will remain the same
    if (first_time) {
      this.connectObject(
        'enter-event', this._show_tooltip.bind(this),
        'leave-event', this._hide_tooltip.bind(this),
        this);
    }
  }

  set_menu(create_fun, destroy_fun, buttons) {
    if (this._menu_create_fun !== null) {
      // menu should be set up once
      return;
    }
    this._menu_create_fun = create_fun;
    this._menu_destroy_fun = destroy_fun;
    this._menu_buttons = buttons;
    this.connectObject(
      'button-press-event', this._button_pressed.bind(this),
      this);
  }

  _show_tooltip() {
    if (this._menu?.visible) {
      return;
    }
    Tooltip.Tooltip.show_tooltip(this._tooltip_text, this);
  }

  _hide_tooltip() {
    Tooltip.Tooltip.hide_tooltip();
  }

  _button_pressed(actor, event) {
    this._hide_tooltip();
    if (this._menu_create_fun === null || this._menu_destroy_fun === null || this._menu_buttons === null) {
      return;
    }
    let button = event.get_button();
    if (this._menu_buttons.indexOf(button) < 0) {
      return;
    }
    this._menu = this._menu_create_fun();
    // destroy menu on hiding
    this._menu.connectObject(
      'hide', () => {
        if (this._menu === null) {
          return;
        }
        this._menu_destroy_fun(this._menu);
        this._menu = null;
      },
      'show', () => {
        this._hide_tooltip();
      }, this._menu);
    // toggle menu visibility on click
    if (this._menu.visible) {
      this._menu.hide();
    } else {
      this._menu.show();
    }
  }

}
