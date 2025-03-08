/* Classic Dash: apps.js
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
    GObject, St, GMenu, Shell
} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Menu = Me.imports.src.menu;
const Buttons = Me.imports.src.buttons;

const AppFavorites = imports.ui.appFavorites;
const Main = imports.ui.main;

class CatMenuItem extends Menu.MenuItem {

  static {
    GObject.registerClass(this);
  }

  constructor(cid, pane) {
    super(cid);
    this._pane = pane;
    this.connect('enter-event', this._show_category.bind(this));
  }

  _show_category() {
    this._pane.show();
  }

}

class AppMenuItem extends Menu.ActionMenuItem {

  static {
    GObject.registerClass(this);
  }

  static _fav = AppFavorites.getAppFavorites();

  constructor(app) {
    let icon = app.create_icon_texture(24);
    super(app.get_name(), icon);
    this.remove_style_class_name('width-12');
    this.add_style_class_name('width-20');
    this._app = app;
    this.connectObject('clicked', this._launch.bind(this), this);
    let fav = AppMenuItem._fav.isFavorite(app.get_id());
    const add_fav = () => {
      AppMenuItem._fav.addFavorite(app.get_id());
    };
    const rem_fav = () => {
      AppMenuItem._fav.removeFavorite(app.get_id());
    };
    this.set_action_button(
      fav ? 'zoom-out-symbolic' : 'zoom-in-symbolic',
      fav ? rem_fav : add_fav);
  }

  _launch() {
    if (this._app.state === Shell.AppState.RUNNING && this._app.can_open_new_window()) {
      this._app.open_new_window(-1);
    } else {
      this._app.activate();
    }
  }

}

class DummyMenuItem extends Menu.MenuItem {

  static {
    GObject.registerClass(this);
  }

  constructor() {
    super('');
    this.reactive = false;
    this.track_hover = false;
    this.can_focus = false;
  }

}

class ApplicationsMenu extends St.BoxLayout {

  static {
    GObject.registerClass(this);
  }

  static _sys = Shell.AppSystem.get_default();
  static _fav = AppFavorites.getAppFavorites();

  constructor(parent) {

    super({
      reactive: true,
      track_hover: true,
      x_expand: false,
      y_expand: false,
      vertical: false,
    });
    this._parent = parent;
    this._tree = new GMenu.Tree({menu_basename: 'applications.menu'});
    this._panes = [];
    this._update();
    this._tree.connectObject('changed', this._update.bind(this), this);
    ApplicationsMenu._fav.connectObject('changed', this._update.bind(this), this);

  }

  _update() {
    if (this.visible || this._parent.visible) {
      this._close_menu();
    }
    this.destroy_all_children();
    let sections = ApplicationsMenu._make_pane('classic-app-menu-pane', true);
    this.add_child(sections);
    this.add_child(ApplicationsMenu._make_pane('classic-app-menu-separator', true));
    this._tree.load_sync();
    let categories = ApplicationsMenu._get_categories(this._tree);
    let max_height = 0; // in menu items
    this._panes = [];
    for (const [cat, apps] of categories) {
      let pane = ApplicationsMenu._make_pane('classic-app-menu-pane', cat === 'Favourites');
      let item = new CatMenuItem(cat, pane);
      for (let app of apps) {
        let app_item = new AppMenuItem(app);
        app_item.connectObject('clicked', this._close_menu.bind(this), app_item);
        pane.add_child(app_item);
      }
      if (cat === 'Favourites') {
        // add button to show all apps
        let show_apps_button = new Buttons.PushButton();
        show_apps_button.set_label_text('Show All Applications');
        show_apps_button.set_icon_name('view-grid-symbolic');
        show_apps_button.connectObject('clicked', this._show_all_apps.bind(this), this);
        pane.add_child(show_apps_button);
      }
      this.add_child(pane);
      this._panes.push(pane);
      pane.connectObject('show', this._hide_panes.bind(this), pane);
      sections.add_child(item);
      max_height = Math.max(max_height, pane.get_children().length);
    }
    let num_sections = sections.get_children().length;
    max_height = Math.max(max_height, num_sections);
    // add dummy elements to the left panes to make sure
    // there is enough space for all sections
    let extra = max_height - num_sections;
    for (let i = 0; i < extra; i++) {
      sections.insert_child_at_index(new DummyMenuItem(), 0);
    }
    // make all app items the same width to avoid menu jumping
    // when hover over different sections and also align top
    // item in each section with section title where possible
    this._panes.forEach((pane, i) => {
      let children = pane.get_children();
      let pad = Math.min(extra + i, max_height - children.length);
      for (let i = 0; i < pad; i++) {
        pane.insert_child_at_index(new DummyMenuItem(), 0);
      }
    });
  }

  _show_all_apps() {
    Main.overview.showApps();
    this._close_menu();
  }

  _hide_panes(shown) {
    for (let pane of this._panes) {
      if (pane === shown) {
        continue;
      }
      pane.hide();
    }
  }

  _close_menu() {
    this._parent.hide();
  }

  static _make_pane(styleclass, visible) {
    return new St.BoxLayout({
      reactive: false,
      track_hover: false,
      x_expand: false,
      y_expand: false,
      vertical: true,
      visible: visible,
      style_class: styleclass,
    });
  }

  static _get_categories(tree) {
    let categories = new Map();
    categories.set('Favourites', ApplicationsMenu._fav.getFavorites());
    let root = tree.get_root_directory();
    let iter = root.iter();
    let next;
    while ((next = iter.next()) !== GMenu.TreeItemType.INVALID) {
      if (next !== GMenu.TreeItemType.DIRECTORY) {
        continue;
      }
      let dir = iter.get_directory();
      if (dir.get_is_nodisplay()) {
        continue;
      }
      let cid = dir.get_menu_id();
      let apps = ApplicationsMenu._load_category(dir);
      if (apps.length > 0) {
        categories.set(cid, apps);
      }
    }
    return categories;
  }

  static _load_category(dir) {
    let iter = dir.iter();
    let next;
    let apps = [];
    while ((next = iter.next()) !== GMenu.TreeItemType.INVALID) {
      if (next === GMenu.TreeItemType.ENTRY) {
        let entry = iter.get_entry();
        let aid = entry.get_desktop_file_id();
        let app = ApplicationsMenu._sys.lookup_app(aid) || new Shell.App({
          app_info: entry.get_app_info(),
        });
        if (app.get_app_info().should_show()) {
          apps.push(app);
        }
      } else if (next === GMenu.TreeItemType.DIRECTORY) {
        let subdir = iter.get_directory();
        if (!subdir.get_is_nodisplay()) {
          apps.push(...ApplicationsMenu._load_category(subdir));
        }
      }
    }
    return apps;
  }

}

class AppMenu extends Menu.PopupMenu {

  static {
    GObject.registerClass(this);
  }

  constructor(anchor) {
    super(anchor);
    this.add_custom_item(new ApplicationsMenu(this));
  }

}

var AppButton = class extends Buttons.PushButton {

  static {
    GObject.registerClass(this);
  }

  constructor() {
    super();
    this.add_style_class_name('sysbtn');

    this._settings = ExtensionUtils.getSettings();

    this._settings.connectObject(
      'changed::applications-button-text', () => {
        this._set_label_text_or_icon(this._settings.get_string('applications-button-text'));
      },
      this);

    this._set_label_text_or_icon(this._settings.get_string('applications-button-text'));
    this.set_menu(
      this._create_menu.bind(this),
      this._hide_menu.bind(this),
      [1, 3]);
    this._app_menu = null;
    this.connect('destroy', this._destroy_menu.bind(this));
    this.connectObject(
      'hide', this._destroy_menu.bind(this),
      this);
  }

  _create_menu() {
    // apps menu is too hard to create, so we'll do it once
    if (this._app_menu === null) {
      this._app_menu = new AppMenu(this);
    }
    return this._app_menu;
  }

  _hide_menu(menu) {
    menu.hide();
  }

  _destroy_menu() {
    this._app_menu?.destroy();
    this._app_menu = null;
  }

  _set_label_text_or_icon(value) {
    const prefix = 'icon:';
    if (value.startsWith(prefix)) {
      let name = value.substring(prefix.length);
      this.set_icon_name(name);
      this.delete_label_text();
    } else {
      this.set_label_text(value);
      this.set_label_text_bold();
      this.delete_icon();
    }
  }

}
