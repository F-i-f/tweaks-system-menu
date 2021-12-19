// Tweaks-system-menu - Put Gnome Tweaks in the system menu.
// Copyright (C) 2019-2021 Philippe Troin (F-i-f on Github)
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

const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

const Logger = Me.imports.logger;

const TweaksSystemMenuSettings = GObject.registerClass(class TweaksSystemMenuSettings extends Gtk.Grid {

    _addEntry(ypos, setting_prefix, enable_label_val, position_label_val) {
	let enable_setting = setting_prefix + '-enable';
	let enable_sschema = this._settings.settings_schema.get_key(enable_setting);
	let descr = _(enable_sschema.get_description());
	let enable_label = new Gtk.Label({
	    label: enable_label_val,
	    halign: Gtk.Align.START
	});
	enable_label.set_tooltip_text(descr);
	let enable_control = new Gtk.Switch({halign: Gtk.Align.END});
	enable_control.set_tooltip_text(descr);
	this.attach(enable_label,   1, ypos, 1, 1);
	this.attach(enable_control, 2, ypos, 1, 1);
	this._settings.bind(enable_setting, enable_control,
			    'active', Gio.SettingsBindFlags.DEFAULT);
	ypos += 1

	let position_setting = setting_prefix + '-position';
	let position_sschema = this._settings.settings_schema.get_key(position_setting);
	descr = _(position_sschema.get_description());
	let position_label = new Gtk.Label({
	    label: position_label_val,
	    halign: Gtk.Align.START,
	    margin_start: 25
	});
	position_label.set_tooltip_text(descr);
	let position_range = position_sschema.get_range().deep_unpack()[1].deep_unpack()
	let position_control = new Gtk.SpinButton({
	    adjustment: new Gtk.Adjustment({
		lower: position_range[0],
		upper: position_range[1],
		step_increment: 1
	    }),
	    halign: Gtk.Align.END
	});
	position_control.set_tooltip_text(descr);
	this.attach(position_label,   1, ypos, 1, 1);
	this.attach(position_control, 2, ypos, 1, 1);
	this._settings.bind(position_setting, position_control,
			    'value', Gio.SettingsBindFlags.DEFAULT);
	ypos += 1

	this._settings.connect('changed::'+enable_setting, (function(settings, name) {
	    let val = settings.get_boolean(name);
	    position_label.set_sensitive(val);
	    position_control.set_sensitive(val);
	}).bind(this));

	return ypos;
    }

    setup() {
	let gnome_shell_version = imports.misc.config.PACKAGE_VERSION;
	let gnome_shell_major = /^([0-9]+)\.([0-9]+)(\.([0-9]+)(\..*)?)?$/.exec(gnome_shell_version)[1];

	this.margin_top = 12;
	this.margin_bottom = this.margin_top;
	this.margin_start = 48;
	this.margin_end = this.margin_start;
	this.row_spacing = 6;
	this.column_spacing = this.row_spacing;
	this.orientation = Gtk.Orientation.VERTICAL;

	this._settings = ExtensionUtils.getSettings();
	this._logger = new Logger.Logger('Tweaks-System-Menu/prefs');
	this._logger.set_debug(this._settings.get_boolean('debug'));

	let ypos = 1;
	let descr;

	this.title_label = new Gtk.Label({
	    use_markup: true,
	    label: '<span size="large" weight="heavy">'
		+_('Tweaks &amp; Extensions in System Menu')+'</span>',
	    hexpand: true,
	    halign: Gtk.Align.CENTER
	});
	this.attach(this.title_label, 1, ypos, 2, 1);

	ypos += 1;

	this.version_label = new Gtk.Label({
	    use_markup: true,
	    label: '<span size="small">'+_('Version')
		+ ' ' + this._logger.get_version() + '</span>',
	    hexpand: true,
	    halign: Gtk.Align.CENTER,
	});
	this.attach(this.version_label, 1, ypos, 2, 1);

	ypos += 1;

	this.link_label = new Gtk.Label({
	    use_markup: true,
	    label: '<span size="small"><a href="'+Me.metadata.url+'">'
		+ Me.metadata.url + '</a></span>',
	    hexpand: true,
	    halign: Gtk.Align.CENTER,
	    margin_bottom: this.margin_bottom
	});
	this.attach(this.link_label, 1, ypos, 2, 1);

	ypos += 1;

	ypos = this._addEntry(ypos, 'tweaks', _("Show Tweaks:"), _("Tweaks position:"));
	if (gnome_shell_major >= 40) {
	    ypos = this._addEntry(ypos, 'extensions', _("Show Extensions:"), _("Extensions position:"));
	}

	descr = _(this._settings.settings_schema.get_key('debug').get_description());
	this.debug_label = new Gtk.Label({label: _("Debug:"), halign: Gtk.Align.START});
	this.debug_label.set_tooltip_text(descr);
	this.debug_control = new Gtk.Switch({halign: Gtk.Align.END});
	this.debug_control.set_tooltip_text(descr);
	this.attach(this.debug_label,   1, ypos, 1, 1);
	this.attach(this.debug_control, 2, ypos, 1, 1);
	this._settings.bind('debug', this.debug_control, 'active', Gio.SettingsBindFlags.DEFAULT);

	ypos += 1;

	this.copyright_label = new Gtk.Label({
	    use_markup: true,
	    label: '<span size="small">'
		+ _('Copyright © 2019-2021 Philippe Troin (<a href="https://github.com/F-i-f">F-i-f</a> on GitHub)')
		+ '</span>',
	    hexpand: true,
	    halign: Gtk.Align.CENTER,
	    margin_top: this.margin_bottom
	});
	this.attach(this.copyright_label, 1, ypos, 2, 1);

	ypos += 1;
    }
});

function init() {
    ExtensionUtils.initTranslations();
}

function buildPrefsWidget() {
    let widget = new TweaksSystemMenuSettings();
    widget.setup();
    // show_all() is only available/necessary on GTK < 4.0.
    if (widget.show_all !== undefined) {
	widget.show_all();
    }

    return widget;
}
