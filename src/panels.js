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
  }

  _launch() {
    if (this._app.state === Shell.AppState.RUNNING && this._app.can_open_new_window()) {
      this._app.open_new_window(-1);
    } else {
      this._app.activate();
    }
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
    this._settings = ExtensionUtils.getSettings();
    let app = Shell.WindowTracker.get_default().get_window_app(this._window);
    if (app) {
      this.set_icon(app.create_icon_texture(Elements.Icon.ICON_SIZE));
    }
    let title = this.window_title;
    this.set_label_text(title);
    this.set_tooltip_text(title);
    this._window.connectObject(
      'unmanaging', this._set_unmanageable.bind(this),
      'workspace-changed', this._workspace_changed.bind(this),
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
    this._workspace_changed();
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

  get_workspace_index() {
    return this._window.get_workspace().index();
  }

  get_app_id() {
    let app = Shell.WindowTracker.get_default().get_window_app(this._window);
    if (app) {
      return app.get_id();
    } else {
      return '';
    }
  }

  update_workspace(workspace) {
    let filter = this._settings.get_boolean('win-filter-workspace');
    let here = this._window.located_on_workspace(workspace);
    if (here || !filter) {
      this._label?.show();
      this.add_style_class_name('width-12');
    } else {
      this._label?.hide();
      this.remove_style_class_name('width-12');
    }
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

  _workspace_changed() {
    let workspace = global.workspace_manager.get_active_workspace();
    this.update_workspace(workspace);
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
    global.window_manager.connectObject(
      'switch-workspace', this._switch_workspace.bind(this),
      this
    );
    this._settings = ExtensionUtils.getSettings();
    this._settings.connectObject(
      'changed::win-filter-workspace', this._switch_workspace.bind(this),
      'changed::win-group-by-workspace', this._update_grouping.bind(this),
      'changed::win-group-by-app', this._update_grouping.bind(this),
      this);
    this._update();
  }

  _update() {
    let windows = global.get_window_actors().sort((w1, w2) => {
      let m1 = w1.metaWindow;
      let m2 = w2.metaWindow;
      return m1.get_stable_sequence() - m2.get_stable_sequence();
    });
    for (let i = 0; i < windows.length; i++) {
      this._add_window(null, windows[i].metaWindow);
    }
  }

  _switch_workspace() {
    let children = this.get_children();
    let workspace = global.workspace_manager.get_active_workspace();
    children.forEach((button) => {
      button.update_workspace(workspace);
    });
  }

  _update_grouping() {
    this.destroy_all_children();
    this._update();
  }

  _add_window(unused, window) {
    if (window.skip_taskbar) {
      return;
    }
    let children = this.get_children();
    if (children.find(child => child._window === window)) {
      return;
    }
    let group;
    // group window buttons by workspace
    if (this._settings.get_boolean('win-group-by-workspace')) {
      let w = window.get_workspace().index();
      group = children.filter((button) => button.get_workspace_index() === w);
      if (group.length === 0) {
        group = children;
      }
    } else {
      group = children;
    }
    // group window buttons by application (in addition to any prev grouping)
    if (this._settings.get_boolean('win-group-by-app')) {
      let a = Shell.WindowTracker.get_default().get_window_app(window);
      group = group.filter((button) => button.get_app_id() === a.get_id());
    }
    if (group.length === 0) {
      this.add_child(new WinButton(window));
    } else {
      let last = group.at(-1);
      this.insert_child_above(new WinButton(window), last);
    }
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
    this.add_style_class_name('width-11');
    this.set_label_text('00:00');
    this.set_label_text_bold();
    this._settings = ExtensionUtils.getSettings();
    this._clock = new GnomeDesktop.WallClock();
    this._clock.bind_property('clock', this._label, 'text', GObject.BindingFlags.SYNC_CREATE);
    this._label.connect('notify::text', this._update_tooltip.bind(this));
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
    this.add_style_class_name('sysbtn');
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


