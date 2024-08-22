/* Classic Dash: calendar.js
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
  Clutter, GObject, St, GLib
} = imports.gi;

const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Menu = Me.imports.src.menu;
const Elements = Me.imports.src.elements;

class Cell extends Elements.Button {

  static {
    GObject.registerClass(this);
  }

  constructor(text) {
    super();
    this.reactive = true;
    this.track_hover = true;
    this.set_label_text(text);
    this._label.x_align = Clutter.ActorAlign.END;
    this._label.add_style_class_name('mono');
  }

}

class HeaderCell extends Cell {

  static {
    GObject.registerClass(this);
  }

  constructor(text) {
    super(text);
    this._label.style_class_name(true, 'bg');
    this._label.x_align = Clutter.ActorAlign.CENTER;
  }

}

class TodayButton extends Elements.Button {

  static {
    GObject.registerClass(this);
  }

  constructor() {
    super();
    this.set_label_text('...');
    this._label.x_align = Clutter.ActorAlign.CENTER;
    this._label.style_class_name(true, 'bold');
    this.y_expand = true;
  }

}

class Pager extends St.BoxLayout {

  static {
    GObject.registerClass(this);
  }

  constructor(cal) {

    super({
      x_expand: false,
      y_expand: true,
      vertical: false,
    });

    this._cal = cal;
    this._prev_button = new Elements.Button();
    this._prev_button.set_icon_name('go-previous-symbolic');
    this._today_button = new TodayButton();
    this._next_button = new Elements.Button();
    this._next_button.set_icon_name('go-next-symbolic');
    this.add_child(this._prev_button);
    this.add_child(this._today_button);
    this.add_child(this._next_button);

    this._prev_button.connectObject('clicked', () => {
      this._cal._selected_date = this._cal._selected_date.add_months(-1);
      this._cal._update_for_date(this._cal._selected_date);
    });
    this._today_button.connectObject('clicked', () => {
      this._cal._selected_date = GLib.DateTime.new_now_local();
      this._cal._update_for_date(this._cal._selected_date);
    });
    this._next_button.connectObject('clicked', () => {
      this._cal._selected_date = this._cal._selected_date.add_months(1);
      this._cal._update_for_date(this._cal._selected_date);
    });

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
    cal._days.forEach((cell, n) => { grid.attach(cell, n + 1, 0, 1, 1); });
    cal._weeks.forEach((cell, n) => { grid.attach(cell, 0, n + 1, 1, 1); });
     cal._days.forEach((day, x) => {
       cal._weeks.forEach((week, y) => {
        grid.attach(cal._cells[x][y], x + 1, y + 1, 1, 1);
      });
    });
  }

}

class Calendar extends St.BoxLayout {

  static {
    GObject.registerClass(this);
  }

  static DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  constructor() {

    super({
      style_class: 'classic-calendar',
      x_expand: false,
      y_expand: false,
      vertical: true,
    });

    this._pager = new Pager(this);
    this.add_child(this._pager);

    this._days = Calendar.DAYS.map((day) => new HeaderCell(day));
    this._weeks = [0, 1, 2, 3, 4, 5].map(() => new HeaderCell('00'));
    this._cells = this._days.map(() => {
      return this._weeks.map(() => new Cell('...'));
    });

    this._grid = new DateGrid(this);
    this.add_child(this._grid);

    this._selected_date = GLib.DateTime.new_now_local();
    this._current_date = GLib.DateTime.new_now_local();

    this._update_for_date(this._selected_date);

  }

  _update_for_date(selected) {
    this._pager._today_button.set_label_text(selected.format('%B %Y'));
    let first_day_of_month = GLib.DateTime.new_local(selected.get_year(), selected.get_month(), 1, 11, 59, 59);
    let current_week = selected.get_week_of_year();
    let current_day_of_week = selected.get_day_of_week();
    let start_date = first_day_of_month.add_days(1 - first_day_of_month.get_day_of_week());
    if (Calendar._equal_dates(start_date, first_day_of_month)) {
      start_date = start_date.add_days(-7);
    }
    this._weeks.forEach((cell, y) => {
      let date = start_date.add_days(7 * y);
      let week = date.get_week_of_year();
      cell.set_label_text(`${week}`.padStart(2, '0'));
      cell.style_class_name(week === current_week, 'selected');
    });
    this._days.forEach((day, x) => {
      day.style_class_name((x + 1) === current_day_of_week, 'selected');
      this._weeks.forEach((week, y) => {
        let cell = this._cells[x][y];
        let date = start_date.add_days(x + 7 * y);
        cell.set_label_text(`${date.get_day_of_month()}`);
        cell.style_class_name(Calendar._equal_dates(date, selected), 'framed');
        cell._label.style_class_name(selected.get_month() !== date.get_month(), 'bg');
        cell.style_class_name([6, 7].indexOf(date.get_day_of_week()) >= 0, 'special');
      });
    });
  }

  _update() {
    let now = GLib.DateTime.new_now_local();
    if (Calendar._equal_dates(now, this._current_date)) {
      // don't update if the date is the same
      // or hasn't been set
      return;
    } else {
      this._current_date = now;
    }
    this._selected_date = this._current_date;
    this._update_for_date(this._selected_date);
  }

  static _equal_dates(lhs, rhs) {
    if (lhs === null || rhs === null) {
      return false;
    }
    return lhs.get_year() === rhs.get_year()
      && lhs.get_day_of_year() === rhs.get_day_of_year();
  }

}

var CalendarMenu = class extends Menu.PopupMenu {

  static {
    GObject.registerClass(this);
  }

  constructor(anchor) {
    super(anchor, /* autoclose */ false);
    this._calendar = new Calendar(this);
    this.add_custom_item(this._calendar);
    this.connectObject('show', () => {
      this._calendar._update();
    }, this);
    Main.overview.connectObject(
      'showing', this._overview_showing.bind(this),
      this);
  }

  _update() {
    if (this._calendar.visible) {
      this._calendar._update();
    }
  }

  _overview_showing() {
    this.close_menu();
  }

}
