/* Classic Dash: menu.js
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

const {
  Clutter, GObject, St, Meta, Shell
} = imports.gi;

const AppSystem = imports.gi.Shell.AppSystem;
const SystemActions = imports.misc.systemActions;

const Main = imports.ui.main;
const AppFavorites = imports.ui.appFavorites;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Elements = Me.imports.src.elements;

var Anchored = class extends St.Widget {

  static {
    GObject.registerClass(this);
  }

  constructor(params) {
    super(params);
  }

  set_location_near_anchor(anchor) {
    if (anchor._unmamaging) {
      return;
    }
    const padding = 10;
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

var MenuItem = class extends Elements.Button {

  static {
    GObject.registerClass(this);
  }

  constructor(text) {
    super();
    this.add_style_class_name('width-12');
    this.add_style_class_name('height-2');
    this.set_label_text(text);
  }

  set_sensitive(sensitive) {
    this.reactive = sensitive;
    this.can_focus = sensitive;
    this.style_class_name(!sensitive, 'insensitive');
  }

}

var ImageMenuItem = class extends MenuItem {

  static {
    GObject.registerClass(this);
  }

  constructor(text, icon) {
    super(text);
    this.set_icon(icon);
  }

}

var PopupMenu = class extends Anchored {

  static {
    GObject.registerClass(this);
  }

  constructor(anchor, autoclose) {

    super({
      reactive: true,
      track_hover: true,
      x_expand: false,
      y_expand: false,
      visible: false,
    });
    this._anchor = anchor;
    this._autoclose = autoclose === undefined ? true : autoclose;
    this._container = new St.BoxLayout({
      style_class: 'classic-popup-menu',
      reactive: true,
      track_hover: true,
      x_expand: false,
      y_expand: false,
      vertical: true,
    });
    this.add_actor(this._container);

    this.connect('destroy', this._destroy.bind(this));

    this.connectObject(
      'key-press-event', this._key_pressed.bind(this),
      'show', this._showing.bind(this),
      'hide', this._hiding.bind(this),
      this);

    if (this._autoclose) {
      this.connectObject(
        'button-press-event', this.close_menu.bind(this),
        this);
    }

    global.display.connectObject(
      'in-fullscreen-changed', this.close_menu.bind(this),
      this);

    this._grab = null; // for modal popup

    // add to stage
    Main.layoutManager.addTopChrome(this, {
      affectsStruts: false,
      trackFullscreen: false,
    });

  }

  _destroy() {
    // remove from stage
    Main.layoutManager.removeChrome(this);
  }

  _key_pressed(actor, event) {
    let key = event.get_key_symbol();
    if (key === Clutter.KEY_Escape) {
      this.hide();
    }
  }

  _showing() {
    // set location of the menu wrt the anchor button
    this.set_location_near_anchor(this._anchor);
    // display as modal element
    if (this._autoclose) {
      this._grab = Main.pushModal(this);
    }
  }

  _hiding() {
    // undo modal display
    if (this._autoclose) {
      if (this._grab) {
        Main.popModal(this._grab);
      }
      this._grab = null;
    }
  }

  add_menu_item(text, callback) {
    let item = new MenuItem(text);
    item.connectObject('clicked', callback, this);
    item.connectObject('clicked', this.close_menu.bind(this), this);
    this._container.add_child(item);
    return item;
  }

  add_separator_menu_item() {
    let separator = new St.Widget({
      style_class: 'classic-menu-item-separator',
      x_expand: true,
      y_expand: true,
      y_align: Clutter.ActorAlign.CENTER,
    });
    this._container.add_child(separator);
    return separator;
  }

  add_custom_item(widget) {
    this._container.add_child(widget);
  }

  close_menu() {
    this.hide();
  }

}

var FavButtonMenu = class extends PopupMenu {

  static {
    GObject.registerClass(this);
  }

  static _favs = AppFavorites.getAppFavorites();

  constructor(anchor, app) {
    super(anchor);
    this._app = app;
    this.add_menu_item('Remove from Favourites', this._rem_from_favs.bind(this));
  }

  _rem_from_favs() {
    FavButtonMenu._favs.removeFavorite(this._app.get_id());
  }

}

var WinButtonMenu = class extends PopupMenu {

  static {
    GObject.registerClass(this);
  }

  static _favs = AppFavorites.getAppFavorites();

  constructor(anchor, window) {

    super(anchor);
    this._window = window;

    let app = Shell.WindowTracker.get_default().get_window_app(this._window);
    if (app) {
      if (!WinButtonMenu._favs.isFavorite(app.get_id())) {
        this.add_menu_item('Add to Favourites', this._add_to_favs.bind(this));
        this.add_separator_menu_item();
      }
    }

    let maximized = this._window.get_maximized() === Meta.MaximizeFlags.BOTH;
    let max_text = maximized ? 'Unmaximise' : 'Maximise';
    let maximise = this.add_menu_item(max_text, this._toggle_maximise.bind(this));
    maximise.set_sensitive(this._window.can_maximize());

    let min_text = this._window.minimized ? 'Unminimise' : 'Minimise';
    let minimise = this.add_menu_item(min_text, this._toggle_minimise.bind(this));
    minimise.set_sensitive(this._window.can_minimize());

    this.add_separator_menu_item();

    let close = this.add_menu_item('Close Window', this._close_window.bind(this));
    close.set_sensitive(this._window.can_close());

    this._window.connectObject(
      'unmanaging', this._set_unmanageable.bind(this),
      this);

  }

  _set_unmanageable() {
    this._window = null;
  }

  _toggle_minimise() {
    if (this._window === null) {
      return;
    }
    if (this._window.minimized) {
      this._window.unminimize();
      this._window.activate(global.get_current_time());
    } else {
      this._window.minimize();
    }
  }

  _toggle_maximise() {
    if (this._window === null) {
      return;
    }
    if (this._window.get_maximized() === Meta.MaximizeFlags.BOTH) {
      this._window.unmaximize(Meta.MaximizeFlags.BOTH);
    } else {
      this._window.maximize(Meta.MaximizeFlags.BOTH);
    }
    this._window.activate(global.get_current_time());
  }

  _close_window() {
    if (this._window === null) {
      return;
    }
    this._window.delete(global.get_current_time());
  }

  _add_to_favs() {
    if (this._window === null) {
      return;
    }
    let app = Shell.WindowTracker.get_default().get_window_app(this._window);
    if (app) {
      WinButtonMenu._favs.addFavorite(app.get_id());
    }
  }

}

var SysButtonMenu = class extends PopupMenu {

  static {
    GObject.registerClass(this);
  }

  constructor(anchor) {
    super(anchor);
    this.add_menu_item('Power Off...', this._system_power_off.bind(this));
    this.add_menu_item('Restart...', this._system_restart.bind(this));
    this.add_menu_item('Logout...', this._system_logout.bind(this));
    this.add_separator_menu_item();
    this.add_menu_item('System Settings', this._system_settings.bind(this));
    this.add_menu_item('Dash Settings', this._dash_settings.bind(this));
    this.add_separator_menu_item();
    this.add_menu_item('Show Overview', this._show_overview.bind(this));
    this.add_menu_item('Minimise All Windows', this._minimise_all_windows.bind(this));
  }

  _minimise_all_windows() {
    let windows = global.get_window_actors().map(w => w.metaWindow);
    for (let window of windows) {
      if (window.skip_taskbar) {
        continue;
      }
      window.minimize();
    }
  }

  _show_overview() {
    Main.overview.show();
  }

  _dash_settings() {
    ExtensionUtils.openPrefs();
  }

  _system_settings() {
    const settings_app = AppSystem.get_default().lookup_app('org.gnome.Settings.desktop');
    settings_app?.activate();
  }

  _system_logout() {
    Main.overview.hide();
    SystemActions.getDefault().activateLogout();
  }

  _system_restart() {
    Main.overview.hide();
    SystemActions.getDefault().activateRestart();
  }

  _system_power_off() {
    Main.overview.hide();
    SystemActions.getDefault().activatePowerOff();
  }

}
