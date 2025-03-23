/* Classic Dash: elements.js
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
    Clutter, GObject, St
} = imports.gi;

var Label = class extends St.Label {

  static {
    GObject.registerClass(this);
  }

  constructor(text) {
    super({
      style_class: 'classic-label',
      text: text,
      x_align: Clutter.ActorAlign.CENTER,
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

var Icon = class extends St.Bin {

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

  set_icon(icon) {
    this.set_child(icon);
  }

  set_icon_name(name) {
    this.set_child(new St.Icon({
      icon_name: name,
      icon_size: Icon.ICON_SIZE,
    }));
  }

}

var BoxPanel = class extends St.BoxLayout {

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

var Button = class extends St.Button {

  static {
    GObject.registerClass(this);
  }

  constructor() {

    super({
      style_class: 'classic-button',
      can_focus: true,
      button_mask: St.ButtonMask.ONE | St.ButtonMask.THREE,
      x_expand: false,
      y_expand: false
    });

    this._box = new St.BoxLayout({
      x_expand: false,
      y_expand: true,
      vertical: false,
      layout_manager: new Clutter.BoxLayout({}),
    });
    this.add_actor(this._box);

    this._icon = null;
    this._label = null;

  }

  set_label_text(text) {
    if (this._label === null) {
      this._label = new Label(text);
      this._label.x_align = Clutter.ActorAlign.START;
      this._box.insert_child_at_index(this._label, -1); // insert at the end
    } else {
      this._label.text = text;
    }
  }

  delete_label_text() {
    if (this._label !== null) {
      this._box.remove_child(this._label);
      this._label = null;
    }
  }

  add_label_style_class_name(styleclass) {
    this._label?.style_class_name(true, styleclass);
  }

  set_icon(icon) {
    if (this._icon === null) {
      this._icon = new Icon('application-x-executable');
      this._box.insert_child_at_index(this._icon, 0); // insert at the start
    }
    this._icon.set_child(icon);
  }

  set_icon_name(name) {
    if (this._icon === null) {
      this._icon = new Icon(name);
      this._box.insert_child_at_index(this._icon, 0); // insert at the start
    } else {
      this._icon.child.icon_name = name;
    }
  }

  delete_icon() {
    if (this._icon !== null) {
      this._box.remove_child(this._icon);
      this._icon = null;
    }
  }

  style_class_name(active, styleclass) {
    this._label?.style_class_name(active, styleclass);
    if (active) {
      this.add_style_class_name(styleclass);
    } else {
      this.remove_style_class_name(styleclass);
    }
  }

}
