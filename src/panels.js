/* Classic Dash: panels.js
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
    GObject, GnomeDesktop, GLib, Shell, Meta, St
} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Elements = Me.imports.src.elements;
const Buttons = Me.imports.src.buttons;
const Menu = Me.imports.src.menu;
const Calendar = Me.imports.src.calendar;

const AppFavorites = imports.ui.appFavorites;

class FavButton extends Buttons.PushButton {

  static {
    GObject.registerClass(this);
  }

  constructor(app) {
    super();
    this.button_mask = St.ButtonMask.ONE;
    this._app = app;
    this.set_icon(this._app.create_icon_texture(Elements.Icon.ICON_SIZE));
    this.connectObject('clicked', this._launch.bind(this), this);
    this.set_tooltip_text(this._app.get_name());
    this.set_menu(
      this._create_menu.bind(this),
      this._destroy_menu.bind(this),
      [3]);
  }

  _launch() {
    if (this._app.state === Shell.AppState.RUNNING && this._app.can_open_new_window()) {
      this._app.open_new_window(-1);
    } else {
      this._app.activate();
    }
  }

  _create_menu() {
    return new Menu.FavButtonMenu(this, this._app);
  }

  _destroy_menu(menu) {
    menu.destroy();
  }

}

var FavPanel = class extends Elements.BoxPanel {

  static {
    GObject.registerClass(this);
  }

  constructor() {
    super('classic-fav-panel', false);
    this._favs = AppFavorites.getAppFavorites();
    this._favs.connectObject('changed', this._update.bind(this), this);
    this._update();
  }

  _update() {
    this.destroy_all_children();
    let favourites = this._favs.getFavoriteMap();
    for (let id in favourites) {
      let app = favourites[id];
      this.add_child(new FavButton(app));
    }
  }

}

class WinButton extends Buttons.PushButton {

  static {
    GObject.registerClass(this);
  }

  constructor(window) {
    super();
    this.add_style_class_name('width-12');
    this._window = window;
    let app = Shell.WindowTracker.get_default().get_window_app(this._window);
    if (app) {
      this.set_icon(app.create_icon_texture(Elements.Icon.ICON_SIZE));
    }
    let title = this.window_title;
    this.set_label_text(title);
    this.set_tooltip_text(title);
    this._window.connectObject(
      'unmanaging', this._set_unmanageable.bind(this),
      'notify::title', this._update_title.bind(this),
      'notify::minimized', this._update_style.bind(this),
      this);
    this.connectObject(
      'button-press-event', this._clicked.bind(this),
      'notify::allocation', this._update_minimise_geometry.bind(this),
      this);
    global.display.connectObject(
      'notify::focus-window', this._update_style.bind(this),
      this);
    this.set_menu(
      this._create_menu.bind(this),
      this._destroy_menu.bind(this),
      [3]);
    this._update_style();
  }

  get window_title() {
    if (!this._window.title || this._window.title === '') {
      return '...';
    } else {
      return this._window.title;
    }
  }

  get minimised() {
    return this._window.minimized;
  }

  get selected() {
    return this._window.has_focus();
  }

  _clicked(actor, event) {
    let button = event.get_button();
    if (button === 1) { // left click
      if (global.display.focus_window === this._window) {
        this._window.minimize();
      } else {
        this._window.activate(global.get_current_time());
      }
    }
  }

  _set_unmanageable() {
   this.destroy();
  }

  _update_title() {
    let title = this.window_title;
    this.set_label_text(title)
    this.set_tooltip_text(title);
  }

  _update_minimise_geometry () {
    let rect = new Meta.Rectangle();
    [rect.x, rect.y] = this.get_transformed_position();
    [rect.width, rect.height] = this.get_transformed_size();
    this._window.set_icon_geometry(rect);
  }

  _update_style() {
    this.style_class_name(this.minimised, 'bg');
    this.style_class_name(this.selected, 'fg');
    this.style_class_name(!this.selected && !this.minimised, 'normal');
    if (this.selected) {
      this.style_class_name(false, 'attention');
    }
  }

  _create_menu() {
    return new Menu.WinButtonMenu(this, this._window);
  }

  _destroy_menu(menu) {
    menu.destroy();
  }

}

var WinPanel = class extends Elements.BoxPanel {

  static {
    GObject.registerClass(this);
  }

  constructor() {
    super('classic-win-panel', true);
    global.display.connectObject(
      'window-created', this._add_window.bind(this),
      'window-demands-attention', this._attention.bind(this),
      'window-marked-urgent', this._attention.bind(this),
      this);
    this._update();
  }

  _update() {
    let windows = global.get_window_actors().sort((w1, w2) => {
      return w1.metaWindow.get_stable_sequence() - w2.metaWindow.get_stable_sequence();
    });
    for (let i = 0; i < windows.length; i++) {
      this._add_window(global.display, windows[i].metaWindow);
    }
  }

  _add_window(display, window) {
    if (window.skip_taskbar) {
      return;
    }
    let children = this.get_children();
    if (children.find(child => child._window === window)) {
      return;
    }
    this.add_child(new WinButton(window));
  }

  _attention(display, window) {
    if (!window || window.has_focus() || window.is_skip_taskbar()) {
      return;
    }
    let children = this.get_children();
    let button = children.find(child => child._window === window);
    if (button) {
      button.style_class_name(true, 'attention');
    }
  }

}

class CalButton extends Buttons.PushButton {

  static {
    GObject.registerClass(this);
  }

  constructor() {
    super();
    this.set_label_text('00:00');
    this.set_label_text_bold();
    this._settings = ExtensionUtils.getSettings();
    this._clock = new GnomeDesktop.WallClock({
      time_only: !this._settings.get_boolean('show-date')
    });
    this._clock.bind_property('clock', this._label, 'text', GObject.BindingFlags.SYNC_CREATE);
    this._label.connect('notify::text', this._update_tooltip.bind(this));
    this._settings.connectObject('changed::show-date', this._update_show_date.bind(this), this);
    this._update_tooltip();
    this.set_menu(
      this._create_menu.bind(this),
      this._hide_menu.bind(this),
      [1, 3]);
    this._calendar = null;
    this.connect('destroy', this._destroy_menu.bind(this));
    this.connectObject(
      'hide', this._destroy_menu.bind(this),
      this);
  }

  _update_tooltip() {
    let date = GLib.DateTime.new_now_local();
    let text = date.format('%A %d %B %Y %Z');
    this.set_tooltip_text(text);
  }

  _update_show_date() {
    this._clock.time_only = !this._settings.get_boolean('show-date');
  }

  _create_menu() {
    if (this._calendar === null) {
      this._calendar = new Calendar.CalendarMenu(this);
      this._clock.connectObject('notify::clock', this._update_date.bind(this), this);
    }
    return this._calendar;
  }

  _update_date() {
    this._calendar?._update();
  }

  _hide_menu(menu) {
    menu.hide();
  }

  _destroy_menu() {
    this._calendar?.destroy();
    this._calendar = null;
  }

}

class SystemButton extends Buttons.PushButton {

  static {
    GObject.registerClass(this);
  }

  constructor() {
    super();
    this.add_style_class_name('strong');
    this.set_icon_name('preferences-system');
    this.set_menu(
      this._create_menu.bind(this),
      this._destroy_menu.bind(this),
      [1, 3]);
  }

  _create_menu() {
    return new Menu.SysButtonMenu(this);
  }

  _destroy_menu(menu) {
    menu.destroy();
  }

}

var SysTrayPanel = class extends Elements.BoxPanel {

  static {
    GObject.registerClass(this);
  }

  constructor() {
    super('classic-cal-panel', false);
    this._cal_button = new CalButton();
    this.add_actor(this._cal_button);
    this._sys_button = new SystemButton();
    this.add_actor(this._sys_button);
    this._settings = ExtensionUtils.getSettings();
    this._settings.connectObject(
      'changed::show-calendar', () => {
        this._cal_button.visible = this._settings.get_boolean('show-calendar')
      },
      'changed::show-sys-menu', () => {
        this._sys_button.visible = this._settings.get_boolean('show-sys-menu')
      },
      this);
  }

}

