/* Classic Dash: topbar.js
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

const Main = imports.ui.main;
const PanelBox = Main.layoutManager.panelBox;

const move_top_bar = (top) => {
  if (PanelBox.has_allocation()) {
    PanelBox.y = top;
  } else {
    let eid = PanelBox.connect('notify::allocation', () => {
      PanelBox.y = top;
      PanelBox.disconnect(eid);
    });
  }
};

var hide = () => {
  move_top_bar(0 - PanelBox.height);
};

var show = () => {
  move_top_bar(0);
};
