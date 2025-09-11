/* Classic Dash: calendar.js
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
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {
  BaseButton,
} from './elements.js';

import {
  PopupMenu,
} from './menu.js';

class Cell extends BaseButton {

  static {
    GObject.registerClass(this);
  }

  constructor(text) {
    super();
    this.reactive = true;
    this.track_hover = true;
    this.set_text(text);
    this.label_widget.style_class_name(true, 'mono');
    this.label_widget.x_align = Clutter.ActorAlign.END;
  }

}

class HeaderCell extends Cell {

  static {
    GObject.registerClass(this);
  }

  constructor(text) {
    super(text);
    this.label_widget.style_class_name(true, 'bg');
    this.label_widget.x_align = Clutter.ActorAlign.CENTER;
  }

}

class TodayButton extends BaseButton {

  static {
    GObject.registerClass(this);
  }

  constructor() {
    super();
    this.set_text('...');
    this.label_widget.style_class_name(true, 'bold');
    this.y_expand = true;
    this.label_widget.x_align = Clutter.ActorAlign.CENTER;
  }

}

class Pager extends St.BoxLayout {

  static {
    GObject.registerClass(this);
  }

  #cal = null;
  #prev_button = null;
  #today_button = null;
  #next_button = null;

  constructor(cal) {

    super({
      x_expand: false,
      y_expand: true,
      vertical: false,
    });

    this.#cal = cal;
    this.#prev_button = new BaseButton();
    this.#prev_button.set_icon_name('go-previous-symbolic');
    this.#today_button = new TodayButton();
    this.#next_button = new BaseButton();
    this.#next_button.set_icon_name('go-next-symbolic');
    this.add_child(this.#prev_button);
    this.add_child(this.#today_button);
    this.add_child(this.#next_button);

    this.#prev_button.connectObject('clicked', () => {
      this.#cal.selected_date = this.#cal.selected_date.add_months(-1);
      this.#cal.update_for_date(this.#cal.selected_date);
    });
    this.#today_button.connectObject('clicked', () => {
      this.#cal.selected_date = GLib.DateTime.new_now_local();
      this.#cal.update_for_date(this.#cal.selected_date);
    });
    this.#next_button.connectObject('clicked', () => {
      this.#cal.selected_date = this.#cal.selected_date.add_months(1);
      this.#cal.update_for_date(this.#cal.selected_date);
    });

  }

  get today_button() {
    return this.#today_button;
  }

}

class DateGrid extends St.Widget {

  static {
    GObject.registerClass(this);
  }

  constructor(cal) {
    super({
      x_expand: false,
      y_expand: false,
      layout_manager: new Clutter.GridLayout({}),
    });
    let grid = this.layout_manager;
    cal.days.forEach((cell, n) => { grid.attach(cell, n + 1, 0, 1, 1); });
    cal.weeks.forEach((cell, n) => { grid.attach(cell, 0, n + 1, 1, 1); });
     cal.days.forEach((day, x) => {
       cal.weeks.forEach((week, y) => {
        grid.attach(cal.cells[x][y], x + 1, y + 1, 1, 1);
      });
    });
  }

}

class Calendar extends St.BoxLayout {

  static {
    GObject.registerClass(this);
  }

  static DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  #selected_date = null;
  #current_date = null;
  #pager = null;
  #days = null;
  #weeks = null;
  #cells = null;
  #grid = null;

  constructor() {

    super({
      style_class: 'classic-calendar',
      x_expand: false,
      y_expand: false,
      vertical: true,
    });

    this.#pager = new Pager(this);
    this.add_child(this.#pager);

    this.#days = Calendar.DAYS.map((day) => new HeaderCell(day));
    this.#weeks = [0, 1, 2, 3, 4, 5].map(() => new HeaderCell('00'));
    this.#cells  = this.#days.map(() => {
      return this.#weeks.map(() => new Cell('...'));
    });

    this.#grid = new DateGrid(this);
    this.add_child(this.#grid);

    this.#selected_date = GLib.DateTime.new_now_local();
    this.#current_date = GLib.DateTime.new_now_local();

    this.update_for_date(this.#selected_date);

  }

  get selected_date() {
    return this.#selected_date;
  }

  set selected_date(value) {
    this.#selected_date = value;
  }

  get days() {
    return this.#days;
  }

  get weeks() {
    return this.#weeks;
  }

  get cells() {
    return this.#cells;
  }

  update_for_date(selected) {
    this.#pager.today_button.set_text(selected.format('%B %Y'));
    let first_day_of_month = GLib.DateTime.new_local(selected.get_year(), selected.get_month(), 1, 11, 59, 59);
    let current_week = selected.get_week_of_year();
    let current_day_of_week = selected.get_day_of_week();
    let start_date = first_day_of_month.add_days(1 - first_day_of_month.get_day_of_week());
    if (Calendar.#equal_dates(start_date, first_day_of_month)) {
      start_date = start_date.add_days(-7);
    }
    this.#weeks.forEach((cell, y) => {
      let date = start_date.add_days(7 * y);
      let week = date.get_week_of_year();
      cell.set_text(`${week}`.padStart(2, '0'));
      cell.style_class_name(week === current_week, 'selected');
    });
    this.#days.forEach((day, x) => {
      day.label_widget.style_class_name((x + 1) === current_day_of_week, 'selected');
      this.#weeks.forEach((week, y) => {
        let cell = this.#cells [x][y];
        let date = start_date.add_days(x + 7 * y);
        cell.set_text(`${date.get_day_of_month()}`);
        cell.style_class_name(Calendar.#equal_dates(date, selected), 'framed');
        cell.label_widget.style_class_name(selected.get_month() !== date.get_month(), 'bg');
        cell.style_class_name([6, 7].indexOf(date.get_day_of_week()) >= 0, 'special');
      });
    });
  }

  update() {
    let now = GLib.DateTime.new_now_local();
    if (Calendar.#equal_dates(now, this._current_date)) {
      // don't update if the date is the same
      // or hasn't been set
      return;
    } else {
      this._current_date = now;
    }
    this.#selected_date = this._current_date;
    this.update_for_date(this.#selected_date);
  }

  static #equal_dates(lhs, rhs) {
    if (!lhs || !rhs) {
      return false;
    }
    return lhs.get_year() === rhs.get_year()
      && lhs.get_day_of_year() === rhs.get_day_of_year();
  }

}

export class CalendarMenu extends PopupMenu {

  static {
    GObject.registerClass(this);
  }

  #calendar = null;

  constructor(anchor) {
    super(anchor, false);
    this.#calendar = new Calendar(this);
    this.add_custom_item(this.#calendar);
    this.connectObject('show', () => { this.#calendar.update(); }, this);
    Main.overview.connectObject(
      'showing', this.#overview_showing.bind(this),
      this);
  }

  update() {
    if (this.#calendar.visible) {
      this.#calendar.update();
    }
  }

  #overview_showing() {
    this.close_menu();
  }

}
