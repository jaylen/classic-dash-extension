/* Classic Dash: anchored.js
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
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class Anchored extends St.Widget {

  static {
    GObject.registerClass(this);
  }

  constructor(params) {
    super(params);
  }

  put_near_anchor(anchor) {
    const padding = 5;
    const m = Main.layoutManager.primaryMonitor;
    let rect = anchor.get_transformed_extents();
    let tl = rect.get_top_left();
    let br = rect.get_bottom_right();
    let h = br.y - tl.y;
    let x = Math.min((tl.x + br.x - this.width) / 2, m.width - this.width - padding);
    x = Math.max(x, padding);
    let y = m.y + m.height - h - 2 * anchor.y - padding - this.height;
    this.set_position(x, y);
  }

}
