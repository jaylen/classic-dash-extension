/* Classic Dash: panels.js
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

import St from 'gi://St';
import Mtk from 'gi://Mtk';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import GObject from 'gi://GObject';
import GnomeDesktop from 'gi://GnomeDesktop';

import * as AppFavourites from 'resource:///org/gnome/shell/ui/appFavorites.js';

import {
  BoxPanel,
  Button,
  Icon,
} from './elements.js';

import {
  WinButtonMenu,
  SysButtonMenu,
} from './menu.js';

import {
  AppMenu,
} from './apps.js';

import {
  CalendarMenu,
} from './calendar.js';

class WinButton extends Button {

  static {
    GObject.registerClass(this);
  }

  #window = null;
  #settings = null;
  #app = null;

  constructor(window, settings) {

    super();
    this.style_class_name(true, 'width-12');
    this.#window = window;
    this.#settings = settings;

    this.set_icon_name('application-x-executable');
    setTimeout(() => {
      let tracker = Shell.WindowTracker.get_default();
      let app = tracker.get_window_app(this.#window);
      if (app && !app.is_window_backed()) {
        let icon = app.create_icon_texture(Icon.ICON_SIZE);
        this.set_icon_name(icon.icon_name);
        this.#app = app;
      }
    }, 10);
    let title = this.title;
    this.set_text(title);
    this.set_tooltip_text(title);

    this.#window.connectObject(
      'unmanaging', this.#unmanageable.bind(this),
      'workspace-changed', this.#workspace.bind(this),
      'notify::title', this.#update_title.bind(this),
      'notify::minimized', this.#update_style.bind(this),
      this);

    this.connectObject(
      'button-press-event', this.#clicked.bind(this),
      'notify::allocation', this.#minimise_geometry.bind(this),
      this);

    global.display.connectObject(
      'notify::focus-window', this.#update_style.bind(this),
      this);

    this.set_menu(
      this.#create_menu.bind(this),
      this.#destroy_menu.bind(this));

    this.#update_style();
    this.#workspace();

  }

  get window() {
    return this.#window;
  }

  get title() {
    if (!this.#window.title || this.#window.title === '') {
      return '...';
    } else {
      return this.#window.title;
    }
  }

  get minimised() {
    return this.#window.minimized;
  }

  get selected() {
    return this.#window.has_focus();
  }

  get workspace_index() {
    return this.#window.get_workspace().index();
  }

  get app() {
    return this.#app;
  }

  update_workspace(workspace) {
    let filter = this.#settings.get_boolean('win-filter-by-workspace');
    let here = this.#window.located_on_workspace(workspace);
    if (here || !filter) {
      this.show_label();
      this.add_style_class_name('width-12');
    } else {
      this.hide_label();
      this.remove_style_class_name('width-12');
    }
  }

  #clicked(actor, event) {
    let button = event.get_button();
    if (button === 1) { // left click
      if (global.display.focus_window === this.#window) {
        if (this.#window.can_minimize()) {
          this.#window.minimize();
        }
      } else {
        this.#window.activate(global.get_current_time());
      }
    }
  }

  #minimise_geometry() {
    let rect = new Mtk.Rectangle();
    [rect.x, rect.y] = this.get_transformed_position();
    [rect.width, rect.height] = this.get_transformed_size();
    this.#window.set_icon_geometry(rect);
  }

  #update_title() {
    let title = this.title;
    this.set_text(title);
    this.set_tooltip_text(title);
  }

  #update_style() {
    this.style_class_name(this.minimised, 'bg');
    this.style_class_name(this.selected, 'fg');
    this.style_class_name(!this.selected && !this.minimised, 'normal');
    if (this.selected) {
      this.style_class_name(false, 'attention');
    }
  }

  #unmanageable() {
    this.destroy();
  }

  #workspace() {
    let workspace = global.workspace_manager.get_active_workspace();
    this.update_workspace(workspace);
  }

  #create_menu() {
    return new WinButtonMenu(this, this.#window);
  }

  #destroy_menu(menu) {
    menu.destroy();
  }

}

export class WinPanel extends BoxPanel {

  static {
    GObject.registerClass(this);
  }

  #settings = null;

  constructor(settings) {
    super('classic-win-panel', true);
    this.#settings = settings;
    global.display.connectObject(
      'window-created', this.#add_window.bind(this),
      'window-demands-attention', this.#attention.bind(this),
      'window-marked-urgent', this.#attention.bind(this),
      this);
    global.window_manager.connectObject(
      'switch-workspace', this.#workspace.bind(this),
      this);
    this.#settings.connectObject(
      'changed::win-filter-by-workspace', this.#workspace.bind(this),
      'changed::win-group-by-workspace', this.#update_grouping.bind(this),
      this);
    this.#update();
  }

  #update() {
    let windows = global.get_window_actors().sort((w1, w2) => {
      let m1 = w1.metaWindow;
      let m2 = w2.metaWindow;
      return m1.get_stable_sequence() - m2.get_stable_sequence();
    });
    for (let i = 0; i < windows.length; i++) {
      this.#add_window(null, windows[i].metaWindow);
    }
  }

  #add_window(unused, window) {

    /* Don't show windows that aren't supposed to be on the taskbar.  */
    if (window.skip_taskbar) {
      return;
    }

    /* Don't show windows that don't belong to an applications.  */
    let tracker = Shell.WindowTracker.get_default();
    let app = tracker.get_window_app(window);
    if (app === null) {
      return;
    }

    /* Skip if a window has already been added to the taskbar.  */
    let children = this.get_children();

    if (children.find(child => child.window === window)) {
      return;
    }

    /* Support grouping of window buttons that affects the
       order in which buttons appear in the taskbar.  */
    let group;
    if (this.#settings.get_boolean('win-group-by-workspace')) {
      let w = window.get_workspace().index();
      group = children.filter((button) => button.workspace_index === w);
      if (group.length === 0) {
        group = children;
      }
    } else {
      group = children;
    }
    if (group.length === 0) {
      this.add_child(new WinButton(window, this.#settings));
    } else {
      let last = group.at(-1);
      this.insert_child_above(new WinButton(window, this.#settings), last);
    }
  }

  #attention(display, window) {
    if (!window || window.has_focus() || window.is_skip_taskbar()) {
      return;
    }
    let children = this.get_children();
    let button = children.find(child => child._window === window);
    if (button) {
      button.style_class_name(true, 'attention');
    }
  }

  #workspace() {
    let children = this.get_children();
    let workspace = global.workspace_manager.get_active_workspace();
    children.forEach((button) => {
      button.update_workspace(workspace);
    });
  }

  #update_grouping() {
    this.destroy_all_children();
    this.#update();
  }

}

class FavButton extends Button {

  static {
    GObject.registerClass(this);
  }

  #app = null;
  #settings = null;
  #sys = null;

  constructor(app, settings) {
    super();
    this.button_mask = St.ButtonMask.ONE;
    this.#app = app;
    this.#settings = settings;
    this.#sys = Shell.AppSystem.get_default();
    this.set_icon(app.create_icon_texture(Icon.ICON_SIZE));
    this.set_tooltip_text(this.#app.get_name());
    this.connectObject('clicked', this.#launch.bind(this), this);
    this.#setup_app_state_changed();
    this.#settings.connectObject(
      'changed::fav-hide-when-running', this.#setup_app_state_changed.bind(this),
      this);
  }

  #launch() {
    if (this.#app.state === Shell.AppState.RUNNING && this.#app.can_open_new_window()) {
      this.#app.open_new_window(-1);
    } else {
      this.#app.activate();
    }
  }

  #setup_app_state_changed() {
    if (this.#settings.get_boolean('fav-hide-when-running')) {
      this.#sys.connectObject(
        'app-state-changed', this.#app_state_changed.bind(this),
        this);
      if (this.#app.state === Shell.AppState.RUNNING) {
        this.hide();
      }
    } else {
      this.#sys.disconnectObject(this);
      this.show();
    }
  }

  #app_state_changed(sys, app) {
    if (app.get_id() !== this.#app.get_id()) {
      return;
    }
    if (app.state === Shell.AppState.RUNNING) {
      this.hide();
    } else {
      this.show();
    }
  }

}

export class FavPanel extends BoxPanel {

  static {
    GObject.registerClass(this);
  }

  static #favs = AppFavourites.getAppFavorites();
  #settings = null;

  constructor(settings) {
    super('classic-win-panel', false);
    this.#settings = settings;
    FavPanel.#favs.connectObject('changed', this.#update.bind(this), this);
    this.#update();
  }

  #update() {
    this.destroy_all_children();
    let favourites = FavPanel.#favs.getFavoriteMap();
    for (let id in favourites) {
      let app = favourites[id];
      this.add_child(new FavButton(app, this.#settings));
    }
  }

}

export class AppButton extends Button {

  static {
    GObject.registerClass(this);
  }

  #settings = null;
  #appmenu = null;

  constructor(settings) {

    super();
    this.add_style_class_name('sysbtn');
    this.#settings = settings;

    this.#settings.connectObject(
      'changed::applications-button-text', () => {
        this.#set_label_text_or_icon(this.#settings.get_string('applications-button-text'));
      }, this);

    this.#set_label_text_or_icon(this.#settings.get_string('applications-button-text'));
    this.set_menu(
      this.#create_menu.bind(this),
      this.#hide_menu.bind(this));
    this.set_menu_button(Button.MOUSE_BUTTON_LEFT);
    this.connect('destroy', this.#destroy_menu.bind(this));
    this.connectObject('hide', this.#destroy_menu.bind(this), this);
  }

  #create_menu() {
    // apps menu is too much work to create, so we'll do it once
    if (this.#appmenu === null) {
      this.#appmenu = new AppMenu(this);
    }
    return this.#appmenu;
  }

  #hide_menu(menu) {
    menu.hide();
  }

  #destroy_menu() {
    this.#appmenu?.destroy();
    this.#appmenu = null;
  }

  #set_label_text_or_icon(value) {
    const prefix = 'icon:';
    if (value.startsWith(prefix)) {
      let name = value.substring(prefix.length);
      this.set_icon_name(name);
      this.delete_text();
    } else {
      this.set_text(value);
      this.delete_icon();
      this.style_class_name(true, 'bold');
    }
  }

}

export class SysButton extends Button {

  static {
    GObject.registerClass(this);
  }

  #settings = null;

  constructor(settings) {
    super();
    this.#settings = settings;
    this.add_style_class_name('sysbtn');
    this.set_icon_name('preferences-system');
    this.set_menu(
      this.#create_menu.bind(this),
      this.#destroy_menu.bind(this));
    this.set_menu_button(Button.MOUSE_BUTTON_LEFT);
  }

  #create_menu() {
    return new SysButtonMenu(this);
  }

  #destroy_menu(menu) {
    menu?.destroy();
  }

}

export class CalButton extends Button {

  static {
    GObject.registerClass(this);
  }

  #settings = null;
  #clock = null;
  #calendar = null;

  constructor(settings) {
    super();
    this.#settings = settings;
    this.set_text('00:00');
    this.style_class_name(true, 'bold');
    this.style_class_name(true, 'mono');
    this.#clock = new GnomeDesktop.WallClock();
    this.#clock.bind_property('clock', this.label_widget, 'text', GObject.BindingFlags.SYNC_CREATE);
    this.label_widget.connect('notify::text', this.#update_tooltip.bind(this));
    this.#update_tooltip();
    this.set_menu(
      this.#create_menu.bind(this),
      this.#hide_menu.bind(this));
    this.set_menu_button(Button.MOUSE_BUTTON_LEFT);
    this.connect('destroy', this.#destroy_menu.bind(this));
    this.connectObject('hide', this.#destroy_menu.bind(this), this);
  }

  #update_tooltip() {
    let date = GLib.DateTime.new_now_local();
    let text = date.format('%A %d %B %Y %Z');
    this.set_tooltip_text(text);
  }

  #create_menu() {
    if (this.#calendar === null) {
      this.#calendar = new CalendarMenu(this);
      this.#clock.connectObject('notify::clock', this.#update_date.bind(this), this);
    }
    return this.#calendar;
  }

  #update_date() {
    this.#calendar?.update();
  }

  #hide_menu(menu) {
    menu.hide();
  }

  #destroy_menu() {
    this.#calendar?.destroy();
    this.#calendar = null;
  }

}
