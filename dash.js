/* Classic Dash: dash.js
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
const { GObject, Meta, Clutter } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Panels = Me.imports.src.panels;
const Apps = Me.imports.src.apps;
const Elements = Me.imports.src.elements;

const PanelBox = Main.layoutManager.panelBox;

var Dash = class extends Elements.BoxPanel {

  static {
    GObject.registerClass(this);
  }

  constructor() {

    super('classic-dash-panel', true, 'classic-dash-panel');

    this.connect('destroy', this._destroy.bind(this));

    let mman = Meta.MonitorManager.get();

    mman.connectObject('monitors-changed', this._position.bind(this), this);
    this.connectObject('notify::height', this._position.bind(this), this);

    Main.overview.connectObject(
      'showing', this._overview_showing.bind(this),
      'hiding', this._overview_hiding.bind(this),
      this);
    Main.sessionMode.connectObject('updated', this._session_mode.bind(this), this);

    this._settings = ExtensionUtils.getSettings();

    this._app_button = new Apps.AppButton();
    this.add_child(this._app_button);

    this._fav_panel = new Panels.FavPanel();
    this.add_child(this._fav_panel);

    this._win_panel = new Panels.WinPanel();
    this.add_child(this._win_panel);

    this._sys_panel = new Panels.SysTrayPanel();
    this.add_child(this._sys_panel);

    this._settings.connectObject(
      'changed::show-app-menu', () => {
        this._app_button.visible = this._settings.get_boolean('show-app-menu')
      },
      'changed::show-favourites', () => {
        this._fav_panel.visible = this._settings.get_boolean('show-favourites')
      },
      this);

    Main.layoutManager.addTopChrome(this, {
      affectsStruts: true,
      trackFullscreen: true,
    });

  }

  _destroy() {
    this._show_topbar();
    Main.layoutManager.removeChrome(this);
  }

  _position() {
    this._hide_topbar();
    let monitor = Main.layoutManager.primaryMonitor;
    this.width = monitor.width;
    this.set_position(monitor.x, monitor.y + monitor.height - this.height);
  }

  _overview_showing() {
    let monitor = Main.layoutManager.primaryMonitor;
    this.ease({
      y: monitor.height,
      duration: 200,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD
    });
    let stbio = this._settings.get_boolean('show-topbar-in-overview');
    if (stbio) {
      this._show_topbar();
    }
  }

  _overview_hiding() {
    this._hide_topbar();
    let monitor = Main.layoutManager.primaryMonitor;
    this.ease({
      y: monitor.height - this.height,
      duration: 200,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD
    });
  }

  _session_mode(session) {
    if (session === 'user') {
      this._hide_topbar();
    }
  }

  _show_topbar() {
    this._move_top_bar(0);
  }

  _hide_topbar() {
    this._move_top_bar(-PanelBox.height);
  }

  _move_top_bar(top) {
    if (PanelBox.has_allocation()) {
      PanelBox.y = top;
    } else {
      let slot = PanelBox.connect('notify::allocation', () => {
        PanelBox.y = top;
        PanelBox.disconnect(slot);
      });
    }
  }

}
