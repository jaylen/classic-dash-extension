/* Classic Dash: topbar.js
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

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import Clutter from 'gi://Clutter';

import {
  Extension
} from 'resource:///org/gnome/shell/extensions/extension.js';

export class TopBar {

  static #panel = Main.layoutManager.panelBox;
  static #mm = global.backend.get_monitor_manager();
  #eid = null;
  #hid = null;
  #mid = null;
  #settings = null;

  constructor() {
    this.#settings = Extension.lookupByURL(import.meta.url)?.getSettings();
    this.#eid = Main.overview.connect('shown', this.#showing.bind(this));
    this.#hid = Main.overview.connect('hidden', this.#hiding.bind(this));
    this.#mid = TopBar.#mm.connect('monitors-changed', this.#hiding.bind(this));
    this.hide();
  }

  destroy() {
    this.show();
    if (this.#eid !== null) {
      Main.overview.disconnect(this.#eid);
      this.#eid = null;
    }
    if (this.#hid !== null) {
      Main.overview.disconnect(this.#hid);
      this.#hid = null;
    }
    if (this.#mid !== null) {
      TopBar.#mm.disconnect(this.#mid);
      this.#hid = null;
    }
    this.#settings = null;
  }

  hide() {
    TopBar.#move(0 - TopBar.#panel.height);
  }

  show() {
    TopBar.#move(0);
  }

  #showing() {
    if (this.#settings?.get_boolean('show-topbar-in-overview')) {
      this.show();
    }
  }

  #hiding() {
    this.hide();
  }

  static #ease(top) {
    TopBar.#panel.ease({
      y: top,
      duration: 25,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD
    });
  }

  static #move(top) {
    if (TopBar.#panel.y === top) {
      return;
    }
    if (TopBar.#panel.has_allocation()) {
      TopBar.#ease(top);
    } else {
      let eid = TopBar.#panel.connect('notify::allocation', () => {
        TopBar.#ease(top);
        TopBar.#panel.disconnect(eid);
      });
    }
  }

}
