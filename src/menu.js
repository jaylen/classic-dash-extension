/* Classic Dash: menu.js
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
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';

import {
  Anchored,
} from './anchored.js';

import {
  BaseButton,
} from './elements.js';

import {
  Extension
} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as SystemActions from 'resource:///org/gnome/shell/misc/systemActions.js';

export class MenuItem extends BaseButton {

  static {
    GObject.registerClass(this);
  }

  #data = null;

  constructor(text) {
    super();
    this.add_style_class_name('width-12');
    this.add_style_class_name('height-2');
    this.set_text(text);
  }

  set_sensitive(sensitive) {
    this.reactive = sensitive;
    this.can_focus = sensitive;
    this.style_class_name(!sensitive, 'insensitive');
  }

  set data(value) {
    this.#data = value;
  }

  get data() {
    return this.#data;
  }

}

export class PopupMenu extends Anchored {

  static {
    GObject.registerClass(this);
  }

  #anchor = null;
  #autoclose = null;
  #container = null;
  #grab = null;

  constructor(anchor, autoclose) {

    super({
      reactive: true,
      track_hover: true,
      x_expand: false,
      y_expand: false,
      visible: false,
    });

    this.#anchor = anchor;
    this.#autoclose = autoclose;
    this.#container = new St.BoxLayout({
      style_class: 'classic-popup-menu',
      reactive: true,
      track_hover: true,
      x_expand: false,
      y_expand: false,
      vertical: true,
    });
    this.add_child(this.#container);

    this.connect('destroy', this.#cleanup.bind(this));
    this.#container.connectObject(
        'child-removed', this.#update_position.bind(this),
        'child-added', this.#update_position.bind(this),
        this);

    this.connectObject(
      'key-press-event', this.#key_pressed.bind(this),
      'show', this.#showing.bind(this),
      'hide', this.#hiding.bind(this),
      this);

    if (this.#autoclose) {
      this.connectObject(
        'button-press-event', this.close_menu.bind(this),
        this);
    }

    global.display.connectObject(
      'in-fullscreen-changed', this.close_menu.bind(this),
      this);

    Main.layoutManager.addTopChrome(this, {
      affectsStruts: false,
      trackFullscreen: false,
    });

  }

  add_menu_item(text, callback) {
    let item = new MenuItem(text);
    if (callback) {
      item.connectObject('clicked', callback, this);
    }
    item.connectObject('clicked', this.close_menu.bind(this), this);
    this.add_custom_item(item);
    return item;
  }

  add_separator_menu_item() {
    let separator = new St.Widget({
      style_class: 'classic-menu-item-separator',
      x_expand: true,
      y_expand: true,
      y_align: Clutter.ActorAlign.CENTER,
    });
    this.add_custom_item(separator);
    return separator;
  }

  add_custom_item(widget) {
    this.#container.add_child(widget);
  }

  get_items() {
    return this.#container.get_children();
  }

  #cleanup() {
    Main.layoutManager.removeChrome(this);
  }

  #key_pressed(actor, event) {
    let key = event.get_key_symbol();
    if (key === Clutter.KEY_Escape) {
      this.close_menu();
    }
  }

  #showing() {
    // set location of the menu wrt the anchor button
    this.put_near_anchor(this.#anchor);
    // display as modal element
    if (this.#autoclose) {
      this.#grab = Main.pushModal(this);
    }
  }

  #hiding() {
    // undo modal display
    if (this.#autoclose && this.#grab) {
      Main.popModal(this.#grab);
    }
    this.#grab = null;
  }

  #update_position() {
    if (this.get_items().length === 0) {
      this.close_menu();
    }
    this.put_near_anchor(this.#anchor);
  }

  close_menu() {
    this.hide();
  }

}

export class WinButtonMenu extends PopupMenu {

  static {
    GObject.registerClass(this);
  }

  #window = null;

  constructor(anchor, window) {

    super(anchor, true);
    this.#window = window;

    /* Open new window if this is supported.  */
    let tracker = Shell.WindowTracker.get_default();
    let app = tracker.get_window_app(this.#window);
    if (app.can_open_new_window()) {
      this.add_menu_item(
        'Open New Window',
        this.#open_new_window.bind(this));
      this.add_separator_menu_item();
    }

    /* Toggle maximised state.  */
    let maximised = this.#window.get_maximized() === Meta.MaximizeFlags.BOTH;
    let maximise = this.add_menu_item(
      maximised ? 'Unmaximise' : 'Maximise',
      this.#toggle_maximise.bind(this));
    maximise.set_sensitive(this.#window.can_maximize());

    /* Toggle minimised state.  */
    let minimise = this.add_menu_item(
      this.#window.minimized ? 'Unminimise' : 'Minimise',
      this.#toggle_minimise.bind(this));
    minimise.set_sensitive(this.#window.can_minimize());

    /* Close window.  */
    this.add_separator_menu_item();
    let close = this.add_menu_item(
      'Close Window',
      this.#close_window.bind(this));
    close.set_sensitive(this.#window.can_close());

    this.#window.connectObject(
      'unmanaging', this.#unmanageable.bind(this),
      this);

  }

  #unmanageable() {
    this.#window = null;
  }

  #toggle_minimise() {
    if (this.#window) {
      if (this.#window.minimized) {
        this.#window.unminimize();
        this.#window.activate(global.get_current_time());
      } else {
        this.#window.minimize();
      }
    }
  }

  #toggle_maximise() {
    if (this.#window) {
      if (this.#window.get_maximized() === Meta.MaximizeFlags.BOTH) {
        this.#window.unmaximize(Meta.MaximizeFlags.BOTH);
      } else {
        this.#window.maximize(Meta.MaximizeFlags.BOTH);
      }
      this.#window.activate(global.get_current_time());
    }
  }

  #close_window() {
    if (this.#window) {
      this.#window.delete(global.get_current_time());
    }
  }

  #open_new_window() {
    let tracker = Shell.WindowTracker.get_default();
    let app = tracker.get_window_app(this.#window);
    if (app.can_open_new_window()) {
      app.open_new_window(-1);
    }
  }

}

class ImageMenuItem extends MenuItem {

  static {
    GObject.registerClass(this);
  }

  constructor(text, icon) {
    super(text);
    this.set_icon(icon);
  }

}

export class ActionMenuItem extends ImageMenuItem {

  static {
    GObject.registerClass(this);
  }

  constructor(text, icon) {
    super(text, icon);
  }

  set_action_button(icon, fun) {
    let button = new BaseButton();
    button.add_style_class_name('naked');
    button.add_style_class_name('subtle');
    button.set_icon_name(icon);
    button.connectObject('clicked', fun, this);
    this.set_widget(button);
  }

}

export class SysButtonMenu extends PopupMenu {

  static {
    GObject.registerClass(this);
  }

  static #sys = Shell.AppSystem.get_default();
  static #act = SystemActions.getDefault();

  constructor(anchor) {
    super(anchor, true);
    if (SysButtonMenu.#act.canPowerOff) {
      this.add_menu_item(
        'Power Off...',
        this.#system_power_off.bind(this));
    }
    if (SysButtonMenu.#act.canRestart) {
      this.add_menu_item(
        'Restart...',
        this.#system_restart.bind(this));
    }
    if (SysButtonMenu.#act.canPowerOff) {
      this.add_menu_item(
        'Logout...',
        this.#system_logout.bind(this));
    }
    if (SysButtonMenu.#act.canLockScreen) {
      this.add_menu_item(
        'Lock screen...',
        this.#system_lock_screen.bind(this));
    }
    if (SysButtonMenu.#act.canSuspend) {
      this.add_menu_item(
        'Suspend...',
        this.#system_suspend.bind(this));
    }
    this.add_separator_menu_item();
    if (SysButtonMenu.#sys.lookup_app('org.gnome.Settings.desktop')) {
      this.add_menu_item(
        'System Settings',
        this.#system_settings.bind(this));
    }
    this.add_menu_item(
      'Dash Settings',
      this.#dash_settings.bind(this));
    this.add_separator_menu_item();
    this.add_menu_item(
      'Show Overview',
      this.#show_overview.bind(this));
    this.add_menu_item(
      'Minimise All Windows',
      this.#minimise_all_windows.bind(this));
  }

  #minimise_all_windows() {
    let windows = global.get_window_actors().map(w => w.metaWindow);
    for (let window of windows) {
      if (window.skip_taskbar) {
        continue;
      }
      window.minimize();
    }
  }

  #show_overview() {
    Main.overview.show();
  }

  #dash_settings() {
    const self = Extension.lookupByURL(import.meta.url);
    self.openPreferences();
  }

  #system_settings() {
    const settings_app = SysButtonMenu.#sys.lookup_app('org.gnome.Settings.desktop');
    settings_app?.activate();
  }

  #system_lock_screen() {
    Main.overview.hide();
    SysButtonMenu.#act.activateLockScreen();
  }

  #system_suspend() {
    Main.overview.hide();
    SysButtonMenu.#act.activateSuspend();
  }

  #system_logout() {
    Main.overview.hide();
    SysButtonMenu.#act.activateLogout();
  }

  #system_restart() {
    Main.overview.hide();
    SysButtonMenu.#act.activateRestart();
  }

  #system_power_off() {
    Main.overview.hide();
    SysButtonMenu.#act.activatePowerOff();
  }

}
