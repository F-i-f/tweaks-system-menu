// Tweaks-system-menu - Put Gnome Tweaks in the system menu.
// Copyright (C) 2019-2024 Philippe Troin (F-i-f on Github)
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw                                  from 'gi://Adw';
import Gio                                  from 'gi://Gio';
import Gtk                                  from 'gi://Gtk';

import * as Logger                          from './logger.js';

class TweaksSystemMenuGrid {

    _addEntry(ypos, setting_prefix, enable_label_val, position_label_val) {
	const enable_setting = setting_prefix + '-enable';
	const enable_sschema = this._settings.settings_schema.get_key(enable_setting);
	const enable_descr = _(enable_sschema.get_description());
	const enable_label = new Gtk.Label({
	    label: enable_label_val,
	    halign: Gtk.Align.START
	});
	enable_label.set_tooltip_text(enable_descr);
	const enable_control = new Gtk.Switch({halign: Gtk.Align.END});
	enable_control.set_tooltip_text(enable_descr);
	this._grid.attach(enable_label,   1, ypos, 1, 1);
	this._grid.attach(enable_control, 2, ypos, 1, 1);
	this._settings.bind(enable_setting, enable_control, 'active', Gio.SettingsBindFlags.DEFAULT);
	ypos += 1

	const position_setting = setting_prefix + '-position';
	const position_sschema = this._settings.settings_schema.get_key(position_setting);
	const position_descr = _(position_sschema.get_description());
	const position_label = new Gtk.Label({
	    label: position_label_val,
	    halign: Gtk.Align.START,
	    margin_start: 25
	});
	position_label.set_tooltip_text(position_descr);
	const position_range = position_sschema.get_range().deep_unpack()[1].deep_unpack()
	const position_control = new Gtk.SpinButton({
	    adjustment: new Gtk.Adjustment({
		lower: position_range[0],
		upper: position_range[1],
		step_increment: 1
	    }),
	    halign: Gtk.Align.END
	});
	position_control.set_tooltip_text(position_descr);
	this._grid.attach(position_label,   1, ypos, 1, 1);
	this._grid.attach(position_control, 2, ypos, 1, 1);
	this._settings.bind(position_setting, position_control, 'value', Gio.SettingsBindFlags.DEFAULT);
	ypos += 1

	this._settings.connect('changed::'+enable_setting, (function(settings, name) {
	    let val = settings.get_boolean(name);
	    position_label.set_sensitive(val);
	    position_control.set_sensitive(val);
	}).bind(this));

	return ypos;
    }

    build(metadata, settings) {
	this._metadata = metadata;
	this._settings = settings;
	this._grid = new Gtk.Grid();
	this._grid.margin_top = 12;
	this._grid.margin_bottom = this._grid.margin_top;
	this._grid.margin_start = 48;
	this._grid.margin_end = this._grid.margin_start;
	this._grid.row_spacing = 6;
	this._grid.column_spacing = this._grid.row_spacing;
	this._grid.orientation = Gtk.Orientation.VERTICAL;

	const logger = new Logger.Logger('Tweaks-System-Menu/prefs', this._metadata);
	logger.set_debug(this._settings.get_boolean('debug'));

	let ypos = 1;

	const title_label = new Gtk.Label({
	    use_markup: true,
	    label: '<span size="large" weight="heavy">'
		+_('Tweaks &amp; Extensions in System Menu')+'</span>',
	    hexpand: true,
	    halign: Gtk.Align.CENTER
	});
	this._grid.attach(title_label, 1, ypos, 2, 1);

	ypos += 1;

	const version_label = new Gtk.Label({
	    use_markup: true,
	    label: '<span size="small">'+_('Version')
		+ ' ' + logger.get_version() + '</span>',
	    hexpand: true,
	    halign: Gtk.Align.CENTER,
	});
	this._grid.attach(version_label, 1, ypos, 2, 1);

	ypos += 1;

	const link_label = new Gtk.Label({
	    use_markup: true,
	    label: '<span size="small"><a href="'+this._metadata.url+'">'
		+ this._metadata.url + '</a></span>',
	    hexpand: true,
	    halign: Gtk.Align.CENTER,
	    margin_bottom: this._grid.margin_bottom
	});
	this._grid.attach(link_label, 1, ypos, 2, 1);

	ypos += 1;

	ypos = this._addEntry(ypos, 'tweaks',     _("Show Tweaks:"), _("Tweaks position:"));
	ypos = this._addEntry(ypos, 'extensions', _("Show Extensions:"), _("Extensions position:"));

	const debug_descr = _(this._settings.settings_schema.get_key('debug').get_description());
	const debug_label = new Gtk.Label({label: _("Debug:"), halign: Gtk.Align.START});
	debug_label.set_tooltip_text(debug_descr);
	const debug_control = new Gtk.Switch({halign: Gtk.Align.END});
	debug_control.set_tooltip_text(debug_descr);
	this._grid.attach(debug_label,   1, ypos, 1, 1);
	this._grid.attach(debug_control, 2, ypos, 1, 1);
	this._settings.bind('debug', debug_control, 'active', Gio.SettingsBindFlags.DEFAULT);

	ypos += 1;

	const copyright_label = new Gtk.Label({
	    use_markup: true,
	    label: '<span size="small">'
		+ _('Copyright © 2019-2024 Philippe Troin (<a href="https://github.com/F-i-f">F-i-f</a> on GitHub)')
		+ '</span>',
	    hexpand: true,
	    halign: Gtk.Align.CENTER,
	    margin_top: this._grid.margin_top
	});
	this._grid.attach(copyright_label, 1, ypos, 2, 1);

	ypos += 1;

	return this._grid;
    }
}

export default class TweaksSystemMenuSettings extends ExtensionPreferences {

    fillPreferencesWindow(window) {
	const contents = new TweaksSystemMenuGrid();
	const group = new Adw.PreferencesGroup();
	group.add(contents.build(this.metadata, this.getSettings()));
	const page = new Adw.PreferencesPage();
	page.add(group);
	window.add(page);
    }
}
