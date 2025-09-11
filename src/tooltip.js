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

'use strict';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {
  Anchored,
} from './anchored.js';

import {
  Label,
} from './elements.js';

export class Tooltip extends Anchored {

  static {
    GObject.registerClass(this);
  }

  #anchor = null;

  constructor(text, anchor) {
    super({
      style_class: 'classic-tooltip',
      x_expand: false,
      y_expand: false,
      visible: false,
      layout_manager: new Clutter.BoxLayout({}),
    });
    this.#anchor = anchor;
    this.add_child(new Label(text));
    Main.layoutManager.addTopChrome(this, {
      affectsStruts: false,
      trackFullscreen: false,
    });
    this.connectObject('show', this.#showing.bind(this),this);
    this.connect('destroy', this.#cleanup.bind(this));
  }

  #cleanup() {
    Main.layoutManager.removeChrome(this);
  }

  #showing() {
    this.put_near_anchor(this.#anchor);
  }

  static show_tooltip(text, anchor) {
    if (text === null || text === undefined) {
      return;
    }
    Tooltip.hide_tooltip();
    Tooltip.#timeout_id = setTimeout(() => {
      Tooltip.hide_tooltip();
      Tooltip.#displaying = new Tooltip(text, anchor);
      Tooltip.#displaying.show();
      setTimeout(() => {
        Tooltip.hide_tooltip();
      }, Tooltip.#hide_timeout);
    }, Tooltip.#show_timeout);
  }

  static hide_tooltip() {
    clearTimeout(Tooltip.#timeout_id);
    Tooltip.#timeout_id = null;
    Tooltip.#displaying?.destroy();
    Tooltip.#displaying = null;
  }

  static #show_timeout = 800; // ms
  static #hide_timeout = 8000; // ms
  static #displaying = null;
  static #timeout_id = null;

}
