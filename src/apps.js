/* Classic Dash: apps.js
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
import GMenu from 'gi://GMenu';
import Shell from 'gi://Shell';
import GObject from 'gi://GObject';

import {
  MenuItem,
  PopupMenu,
  ActionMenuItem,
} from './menu.js';

import {
  Icon,
  Button,
} from './elements.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';

class CatMenuItem extends MenuItem {

  static {
    GObject.registerClass(this);
  }

  #pane = null;

  constructor(cid, pane) {
    super(cid);
    this.#pane = pane;
    this.connect('enter-event', this.#show_category.bind(this));
  }

  #show_category() {
    this.#pane.show();
  }

}

class AppMenuItem extends ActionMenuItem {

  static {
    GObject.registerClass(this);
  }

  static #fav = AppFavorites.getAppFavorites();
  #app = null;

  constructor(app) {
    const icon = app.create_icon_texture(Icon.ICON_SIZE);
    super(app.get_name(), icon);
    this.remove_style_class_name('width-12');
    this.add_style_class_name('width-20');
    this.#app = app;
    this.connectObject('clicked', this.#launch.bind(this), this);
    const fav = AppMenuItem.#fav.isFavorite(app.get_id());
    this.set_action_button(
      fav ? 'zoom-out-symbolic' : 'zoom-in-symbolic',
      fav ? () => {
      AppMenuItem.#fav.removeFavorite(app.get_id());
    } : () => {
      AppMenuItem.#fav.addFavorite(app.get_id());
    });
  }

  #launch() {
    if (this.#app.state === Shell.AppState.RUNNING && this.#app.can_open_new_window()) {
      this.#app.open_new_window(-1);
    } else {
      this.#app.activate();
    }
  }

}

class DummyMenuItem extends MenuItem {

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

class AppMenuWidget extends St.BoxLayout {

  static {
    GObject.registerClass(this);
  }

  static #sys = Shell.AppSystem.get_default();
  static #fav = AppFavorites.getAppFavorites();
  #parent = null;
  #tree = null;
  #panes = null;

  constructor(parent) {

    super({
      reactive: true,
      track_hover: true,
      x_expand: false,
      y_expand: false,
      vertical: false,
    });

    this.#parent = parent;
    this.#tree = new GMenu.Tree({
      menu_basename: 'applications.menu'
    });
    this.#panes = [];
    this.#update();
    this.#tree.connectObject('changed', this.#update.bind(this), this);
    AppMenuWidget.#fav.connectObject('changed', this.#update.bind(this), this);

  }

  #update() {
    if (this.visible || this.#parent.visible) {
      this.#close_menu();
    }
    this.destroy_all_children();
    let sections = AppMenuWidget.#make_pane('classic-app-menu-pane', true);
    this.add_child(sections);
    this.add_child(AppMenuWidget.#make_pane('classic-app-menu-separator', true));
    this.#tree.load_sync();
    let categories = AppMenuWidget.#get_categories(this.#tree);
    let max_height = 0; // in menu items
    this.#panes = [];
    for (const [cat, apps] of categories) {
      let pane = AppMenuWidget.#make_pane('classic-app-menu-pane', cat === 'Favourites');
      let item = new CatMenuItem(cat, pane);
      for (let app of apps) {
        let app_item = new AppMenuItem(app);
        app_item.connectObject('clicked', this.#close_menu.bind(this), app_item);
        pane.add_child(app_item);
      }
      if (cat === 'Favourites') {
        // add button to show all apps
        let show_apps_button = new Button();
        show_apps_button.set_text('Show All Applications');
        show_apps_button.set_icon_name('view-grid-symbolic');
        show_apps_button.connectObject('clicked', this.#show_all_apps.bind(this), this);
        pane.add_child(show_apps_button);
      }
      this.add_child(pane);
      this.#panes.push(pane);
      pane.connectObject('show', this.#hide_panes.bind(this), pane);
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
    this.#panes.forEach((pane, i) => {
      let children = pane.get_children();
      let pad = Math.min(extra + i, max_height - children.length);
      for (let i = 0; i < pad; i++) {
        pane.insert_child_at_index(new DummyMenuItem(), 0);
      }
    });
  }

  #show_all_apps() {
    Main.overview.showApps();
    this.#close_menu();
  }

  #hide_panes(shown) {
    for (let pane of this.#panes) {
      if (pane === shown) {
        continue;
      }
      pane.hide();
    }
  }

  #close_menu() {
    this.#parent.hide();
  }

  static #make_pane(styleclass, visible) {
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

  static #get_categories(tree) {
    let categories = new Map();
    categories.set('Favourites', AppMenuWidget.#fav.getFavorites());
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
      let apps = AppMenuWidget.#load_category(dir);
      if (apps.length > 0) {
        categories.set(cid, apps);
      }
    }
    return categories;
  }

  static #load_category(dir) {
    let iter = dir.iter();
    let next;
    let apps = [];
    while ((next = iter.next()) !== GMenu.TreeItemType.INVALID) {
      if (next === GMenu.TreeItemType.ENTRY) {
        let entry = iter.get_entry();
        let aid = entry.get_desktop_file_id();
        let app = AppMenuWidget.#sys.lookup_app(aid) || new Shell.App({
          app_info: entry.get_app_info(),
        });
        if (app.get_app_info().should_show()) {
          apps.push(app);
        }
      } else if (next === GMenu.TreeItemType.DIRECTORY) {
        let subdir = iter.get_directory();
        if (!subdir.get_is_nodisplay()) {
          apps.push(...AppMenuWidget.#load_category(subdir));
        }
      }
    }
    return apps;
  }

}

export class AppMenu extends PopupMenu {

  static {
    GObject.registerClass(this);
  }

  constructor(anchor) {
    super(anchor, true);
    this.add_custom_item(new AppMenuWidget(this));
  }

}
