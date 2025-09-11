/* Classic Dash: dash.js
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

import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {
  BoxPanel,
} from './elements.js';
import {
  AppButton,
  FavPanel,
  WinPanel,
  CalButton,
  SysButton,
} from './panels.js';

export class Dash extends BoxPanel {

  static {
    GObject.registerClass(this);
  }

  static mm = global.backend.get_monitor_manager();
  static lm = Main.layoutManager;

  #settings = null;
  #appmenu = null;
  #favpanel = null;
  #winpanel = null;
  #calmenu = null;
  #sysmenu = null;

  constructor(settings) {

    super('classic-dash-panel', true, 'classic-dash-panel');

    this.#settings = settings;

    this.connect('destroy', this.#cleanup.bind(this));
    this.connectObject('notify::height', this.#pos.bind(this), this);
    Dash.mm.connectObject('monitors-changed', this.#pos.bind(this), this);

    Main.overview.connectObject(
      'showing', this.#overview_showing.bind(this),
      'hiding', this.#overview_hiding.bind(this),
      this);

    this.#appmenu = new AppButton(this.#settings);
    this.add_child(this.#appmenu);

    this.#favpanel = new FavPanel(this.#settings);
    this.add_child(this.#favpanel);

    this.#winpanel = new WinPanel(this.#settings);
    this.add_child(this.#winpanel);

    this.#calmenu = new CalButton(this.#settings);
    this.add_child(this.#calmenu);

    this.#sysmenu = new SysButton(this.#settings);
    this.add_child(this.#sysmenu);

    this.#settings.bind(
      'show-appmenu', this.#appmenu, 'visible',
      Gio.SettingsBindFlags.DEFAULT);

    this.#settings.bind(
      'show-favpanel', this.#favpanel, 'visible',
      Gio.SettingsBindFlags.DEFAULT);

    this.#settings.bind(
      'show-calendar', this.#calmenu, 'visible',
      Gio.SettingsBindFlags.DEFAULT);

    this.#settings.bind(
      'show-sysmenu', this.#sysmenu, 'visible',
      Gio.SettingsBindFlags.DEFAULT);

    Dash.lm.addTopChrome(this, {
      affectsStruts: true,
      trackFullscreen: true,
    });
  }

  #pos() {
    let monitor = Dash.lm.primaryMonitor;
    this.width = monitor.width;
    this.set_position(monitor.x, monitor.y + monitor.height - this.height);
  }

  #cleanup() {
    Dash.lm.removeChrome(this);
  }

  #overview_showing() {
    let monitor = Dash.lm.primaryMonitor;
    this.ease({
      y: monitor.height,
      duration: 100,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD
    });
  }

  #overview_hiding() {
    let monitor = Dash.lm.primaryMonitor;
    this.ease({
      y: monitor.height - this.height,
      duration: 100,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD
    });
  }

}
