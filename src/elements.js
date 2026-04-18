/* Classic Dash: elements.js
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

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';

import {
  Tooltip
} from './tooltip.js';

export class BoxPanel extends St.BoxLayout {

  static {
    GObject.registerClass(this);
  }

  constructor(name, extend, styleclass) {
    super({
      name: name,
      style_class: styleclass === undefined ? 'classic-panel' : styleclass,
      reactive: true,
      track_hover: true,
      x_expand: extend,
      y_expand: true,
    });
  }

}

export class Label extends St.Label {

  static {
    GObject.registerClass(this);
  }

  constructor(text, align) {
    super({
      style_class: 'classic-label',
      text: text,
      x_align: align === undefined ? Clutter.ActorAlign.CENTER : align,
      y_align: Clutter.ActorAlign.CENTER,
      x_expand: true,
      y_expand: true,
    });
  }

  style_class_name(active, styleclass) {
    if (active) {
      this.add_style_class_name(styleclass);
    } else {
      this.remove_style_class_name(styleclass);
    }
  }

}

export class Icon extends St.Bin {

  static {
    GObject.registerClass(this);
  }

  static ICON_SIZE = 24;

  constructor(name) {
    super({
      style_class: 'classic-icon',
      child: new St.Icon({
        icon_name: name,
        icon_size: Icon.ICON_SIZE,
      }),
    });
  }

  set_gicon(icon) {
    if (icon) {
      this.child.set_gicon(icon);
    }
  }

}

export class BaseButton extends St.Button {

  static {
    GObject.registerClass(this);
  }

  #box = null;
  #icon = null;
  #label = null;

  constructor(text, iconname) {

    super({
      style_class: 'classic-button',
      can_focus: true,
      button_mask: St.ButtonMask.ONE | St.ButtonMask.THREE,
      x_expand: false,
      y_expand: false,
    });

    this.#box = new St.BoxLayout({
      x_expand: true,
      y_expand: true,
      vertical: false,
      layout_manager: new Clutter.BoxLayout({}),
    });
    this.add_child(this.#box);

    if (text !== undefined) {
      this.set_text(text);
    }

    if (iconname !== undefined) {
      this.set_icon_name(iconname)
    }

  }

  set_text(text) {
    if (this.#label === null) {
      this.#label = new Label(text, Clutter.ActorAlign.START);
      this.set_widget(this.#label);
    } else {
      this.#label.text = text;
    }
  }

  set_icon_name(iconname) {
    if (this.#icon === null) {
      this.#icon = new Icon(iconname);
      this.#box.insert_child_at_index(this.#icon, 0); // insert at the start
    } else {
      this.#icon.child.icon_name = iconname;
    }
  }

  set_icon(icon) {
    if (this.#icon === null) {
      this.#icon = new Icon('application-x-executable');
      this.#box.insert_child_at_index(this.#icon, 0); // insert at the start
    }
    this.#icon.set_child(icon);
  }

  set_widget(widget) {
    this.#box.insert_child_at_index(widget, -1); // insert at the end
  }

  style_class_name(active, styleclass) {
    this.#label?.style_class_name(active, styleclass);
    if (active) {
      this.add_style_class_name(styleclass);
    } else {
      this.remove_style_class_name(styleclass);
    }
  }

  delete_text() {
    if (this.#label !== null) {
      this.#box.remove_child(this.#label);
      this.#label = null;
    }
  }

  delete_icon() {
    if (this.#icon !== null) {
      this.#box.remove_child(this.#icon);
      this.#icon = null;
    }
  }

  hide_label() {
    this.#label.hide();
  }

  show_label() {
    this.#label.show();
  }

  hide_icon() {
    this.#icon.hide();
  }

  show_icon() {
    this.#icon.show();
  }

  get label_widget() {
    return this.#label;
  }

}

export class Button extends BaseButton {

  static {
    GObject.registerClass(this);
  }

  static MOUSE_BUTTON_LEFT = 1;
  static MOUSE_BUTTON_MIDDLE = 2;
  static MOUSE_BUTTON_RIGHT = 3;

  #tooltip_text = null;
  #menu_ctor = null;
  #menu_dtor = null;
  #menu = null;
  #menu_button = Button.MOUSE_BUTTON_RIGHT;

  constructor(text, iconname) {
    super(text, iconname);
    this.connect('destroy', this.#cleanup.bind(this));
  }

  #cleanup() {
    this.#hide_tooltip();
  }

  set_tooltip_text(text) {
    // we may change tooltip text many times
    // but the event callbacks will remain the same
    let first_time = this.#tooltip_text === null;
    this.#tooltip_text = text;
    if (first_time) {
      this.connectObject(
        'enter-event', this.#show_tooltip.bind(this),
        'leave-event', this.#hide_tooltip.bind(this),
        this);
    }
  }

  set_menu(menu_ctor, menu_dtor) {
    if (this.#menu_ctor !== null) {
      // menu should be set up once
      return;
    }
    this.#menu_ctor = menu_ctor;
    this.#menu_dtor = menu_dtor;
    this.connectObject(
      'button-press-event', this.#button_pressed.bind(this),
      this);
  }

  set_menu_button(btn) {
    this.#menu_button = btn;
  }

  #button_pressed(actor, event) {

    this.#hide_tooltip();
    if (!this.#menu_ctor || !this.#menu_dtor) {
      return;
    }
    let button = event.get_button();
    if (button !== this.#menu_button) {
      return;
    }

    // create menu instance
    this.#menu = this.#menu_ctor();

    // destroy menu on hiding
    this.#menu.connectObject(
      'hide', () =>  this.#hide_menu.bind(this),
      'show', this.#show_menu.bind(this),
      this.#menu);

    // toggle menu visibility on click
    if (this.#menu?.visible) {
      this.#menu?.hide();
    } else {
      this.#menu?.show();
    }
  }

  #show_tooltip() {
    Tooltip.show_tooltip(this.#tooltip_text, this);
  }

  #hide_tooltip() {
    Tooltip.hide_tooltip();
  }

  #show_menu() {
    this.#hide_tooltip();
  }

  #hide_menu() {
    if (this.#menu && this.#menu_dtor) {
      this.#menu_dtor(this.#menu);
      this.#menu = null;
    }
  }
  
}
