/* Classic Dash: extension.js
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

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { Overview } from 'resource:///org/gnome/shell/ui/overview.js';
import { Dash } from './src/dash.js';
import { TopBar } from './src/topbar.js';

function inject(target, method, fun) {
  let f = target[method];
  if (f instanceof Function) {
    target[method] = fun;
    return f;
  }
  return null;
}

export default class ClassicDashExtension extends Extension {

  #dash = null;
  #topbar = null;
  #replaced = null;

  constructor(metadata) {
    super(metadata);
  }

  enable() {
    this.#dash = new Dash(this.getSettings());
    this.#topbar = new TopBar();
    let fun = (callback) => {
      this.#topbar?.hide();
      if (callback instanceof Function) {
        callback();
      }
    };
    this.#replaced = inject(Overview.prototype, 'runStartupAnimation', fun);
  }

  disable() {
    if (this.#replaced !== null) {
      inject(Overview.prototype, 'runStartupAnimation', this.#replaced);
      this.#replaced = null;
    }
    if (this.#dash !== null) {
      this.#dash.destroy();
      this.#dash = null;
    }
    if (this.#topbar !== null) {
      this.#topbar.destroy();
      this.#topbar = null;
    }
  }

}
