// tweaks-system-menu - Put Gnome Tweaks in the system menu.
// Copyright (C) 2019, 2020 Philippe Troin (F-i-f on Github)
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

const BoxPointer = imports.ui.boxpointer;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Shell = imports.gi.Shell;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Logger = Me.imports.logger;

const TweaksSystemMenuExtension = class TweaksSystemMenuExtension {
    constructor() {
	this._logger = null;

	this._settings = null;
	this._debugSettingChangedConnection = null;
	this._positionSettingChangedConnection = null;
	this._systemMenu = null;

	this._tweaksApp = null;
	this._tweaksItem = null;
	this._tweaksActivateConnection = null;
    }

    // Utilities
    _findMenuItemPosition(item) {
	let items = this._systemMenu.menu._getMenuItems();
	for (let i=0; i < items.length; ++i) {
	    if (items[i] == item) {
		this._logger.log_debug('_findMenuItemPosition('+item+') = '+i);
		return i;
	    }
	}
	this._logger.log_debug('_findMenuItemPosition('+item+') = <null>');
	return null;
    }

    // Enable/disable
    enable() {
	this._logger = new Logger.Logger('Tweaks-System-Menu');
	this._settings = Convenience.getSettings();

	this._on_debug_change();

	this._logger.log_debug('enable()');

	this._debugSettingChangedConnection = this._settings.connect('changed::debug',
								     this._on_debug_change.bind(this));
	this._positionSettingChangedConnection = this._settings.connect('changed::position',
									this._on_position_change.bind(this));

	this._systemMenu = Main.panel.statusArea.aggregateMenu._system;
	this._showItem();

	this._logger.log_debug('extension enabled');
    }

    disable() {
	this._logger.log_debug('disable()');

	this._hideItem();

	this._systemMenu = null;

	this._settings.disconnect(this._debugSettingChangedConnection);
	this._debugSettingChangedConnection = null;
	this._settings.disconnect(this._positionSettingChangedConnection);
	this._positionSettingChangedConnection = null;

	this._settings = null;

	this._logger.log_debug('extension disabled');
	this._logger = null;
    }

    // Show/hide item
    _showItem() {
	this._logger.log_debug('_showItem()');

	this._tweaksApp = Shell.AppSystem.get_default().lookup_app('org.gnome.tweaks.desktop');
	if (this._tweaksApp) {
	    let [icon, name] = [this._tweaksApp.app_info.get_icon().names[0],
				this._tweaksApp.get_name()];
	    this._tweaksItem = new PopupMenu.PopupImageMenuItem(name, icon);
	    this._tweaksActivateConnection = this._tweaksItem.connect('activate', this._on_activate.bind(this));
	    this._systemMenu.menu.addMenuItem(this._tweaksItem);
	    this._on_position_change();
	} else {
	    this._logger.log('Missing Gnome Tweaks, expect trouble…');
	}
    }

    _hideItem() {
	this._logger.log_debug('_hideItem()');
	if (this._tweaksItem !== null) {
	    this._tweaksItem.disconnect(this._tweaksActivateConnection);
	    this._tweaksActivateConnection = null;

	    this._systemMenu.menu._getMenuItems().splice(this._findMenuItemPosition(this._tweaksItem), 1);
	    this._tweaksItem.destroy();
	    this._tweaksItem = null;
	}
	this._tweaksApp = null;
    }

    // Event handlers
    _on_debug_change() {
	this._logger.set_debug(this._settings.get_boolean('debug'));
	this._logger.log_debug('debug = '+this._logger.get_debug());
    }

    _on_position_change() {
	let position = this._settings.get_int('position');
	this._logger.log_debug('_on_position_change(): settings position=' + position);
	if (position == -1) {
	    position = this._findMenuItemPosition(this._systemMenu._settingsItem);
	    let tweaksPosition = this._findMenuItemPosition(this._tweaksItem);
	    if (tweaksPosition > position) {
		position += 1;
	    }
	    this._logger.log_debug('_on_position_change(): automatic position=' + position);
	}
	this._systemMenu.menu.moveMenuItem(this._tweaksItem, position);
    }

    _on_activate() {
	this._logger.log_debug('_on_activate()');
	this._systemMenu.menu.itemActivated(BoxPointer.PopupAnimation.NONE);
	Main.overview.hide();
	this._tweaksApp.activate();
    }
};

function init() {
    return new TweaksSystemMenuExtension();
}
