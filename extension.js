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

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Dash = Me.imports.dash.Dash;
const TopBar = Me.imports.src.topbar;

const { Meta } = imports.gi;
const Overview = imports.ui.overview.Overview;

function _inject(target, method, fun) {
  let f = target[method];
  if (f instanceof Function) {
    target[method] = fun;
    return f;
  }
  return null;
}

class ClassicDashExtension {

  constructor() {
    this.dash = null;
    this._replaced = null; // for overview startup function
  }

  enable() {
    // this will hide the overview at startup
    this._replaced = _inject(Overview.prototype, 'runStartupAnimation', (callback) => {
      TopBar.hide();
      Meta.disable_unredirect_for_display(global.display);
      callback();
    });
    this.dash = new Dash();
  }

  disable() {
    if (this._replaced !== null) {
      _inject(Overview.prototype, 'runStartupAnimation', this._replaced);
      this._replaced = null;
    }
    if (this.dash !== null) {
      this.dash.destroy();
      this.dash = null;
    }
    TopBar.show();
  }

}

function init() {
  return new ClassicDashExtension();
}
