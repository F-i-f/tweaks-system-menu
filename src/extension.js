// tweaks-system-menu - Put Gnome Tweaks in the system menu.
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

const BoxPointer = imports.ui.boxpointer;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Shell = imports.gi.Shell;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Logger = Me.imports.logger;

const TweaksSystemMenuExtension = class TweaksSystemMenuExtension {
    constructor() {
	this._logger = null;

	this._settings = null;
	this._debugSettingChangedConnection = null;
	this._positionSettingChangedConnection = null;
	this._systemMenu = null;

	this._applications = {
	    'tweaks': {
		appName: 'org.gnome.tweaks.desktop',
		check: (function() {
		    return true;
		}).bind(this),
		getDefaultPosition: (function() {
		    return this._findMenuItemPosition(this._systemMenu._settingsItem)+1;
		}).bind(this),
		preUpdatePosition: (function () {
		    if (this._applications['extensions'].menuItem !== undefined) {
			this._moveMenuItemToEnd(this._applications['extensions'].menuItem);
		    }
		}).bind(this),
		postUpdatePosition: (function () {
		    if (this._applications['extensions'].menuItem !== undefined) {
			this._on_position_change('extensions');
		    }
		}).bind(this)
	    },
	    'extensions': {
		appName: 'org.gnome.Extensions.desktop',
		check: (function() {
		    let info = Shell.AppSystem.get_default().lookup_app('org.gnome.Extensions.desktop');
		    return info != null;
		}).bind(this),
		getDefaultPosition: (function() {
		    if (this._applications['tweaks'].menuItem !== undefined) {
			return this._findMenuItemPosition(this._applications['tweaks'].menuItem)+1;
		    } else {
			return this._applications['tweaks'].getDefaultPosition();
		    }
		}).bind(this),
		preUpdatePosition:  (function () { return; }).bind(this),
		postUpdatePosition: (function () { return; }).bind(this)
	    }
	};

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

    _moveMenuItemToEnd(item) {
	this._systemMenu.menu.moveMenuItem(item, this._systemMenu.menu._getMenuItems().length-1);
    }

    _getEnableSettingsName(appKey) {
	return appKey+'-enable';
    }

    _getPositionSettingsName(appKey) {
	return appKey+'-position';
    }

    // Enable/disable
    enable() {
	this._logger = new Logger.Logger('Tweaks-System-Menu');
	this._settings = ExtensionUtils.getSettings();

	this._on_debug_change();

	this._logger.log_debug('enable()');

	this._debugSettingChangedConnection = this._settings.connect('changed::debug',
								     this._on_debug_change.bind(this));
	this._systemMenu = Main.panel.statusArea.aggregateMenu._system;

	for (let appKey in this._applications) {
	    this._enableApp(appKey);
	}

	this._logger.log_debug('extension enabled');
    }

    _enableApp(appKey) {
	let appData = this._applications[appKey];
	if (! appData.check()) return;
	this._logger.log_debug('_enableApp('+appKey+')');
	appData.enableSettingChangedConnection = this._settings.connect('changed::'+this._getEnableSettingsName(appKey),
									 (function() {
									     this._on_enable_change(appKey);
									 }).bind(this));
	appData.positionSettingChangedConnection = this._settings.connect('changed::'+this._getPositionSettingsName(appKey),
									   (function() {
									       this._on_position_change(appKey);
									   }).bind(this));
	if (this._settings.get_boolean(this._getEnableSettingsName(appKey))) {
	    this._showItem(appKey);
	}
    }

    disable() {
	this._logger.log_debug('disable()');

	for (let appKey in this._applications) {
	    this._disableApp(appKey);
	}

	this._systemMenu = null;

	this._settings.disconnect(this._debugSettingChangedConnection);
	this._debugSettingChangedConnection = null;

	this._settings = null;

	this._logger.log_debug('extension disabled');
	this._logger = null;
    }

    _disableApp(appKey) {
	let appData = this._applications[appKey];
	if (! appData.check()) return;
	this._logger.log_debug('_disableApp('+appKey+')');
	this._hideItem(appKey);
	if (appData.enableSettingChangedConnection !== undefined) {
	    this._settings.disconnect(appData.enableSettingChangedConnection);
	    delete appData.enableSettingChangedConnection;
	}
	if (appData.positionSettingChangedConnection !== undefined) {
	    this._settings.disconnect(appData.positionSettingChangedConnection);
	    delete appData.positionSettingChangedConnection;
	}
    }

    // Show/hide item
    _showItem(appKey) {
	this._logger.log_debug('_showItem('+appKey+')');
	let appData = this._applications[appKey];
	appData.appInfo = Shell.AppSystem.get_default().lookup_app(appData.appName);
	if (appData.appInfo) {
	    let name = appData.appInfo.get_name();
	    let icon = appData.appInfo.app_info.get_icon().names[0];
	    appData.menuItem = new PopupMenu.PopupImageMenuItem(name, icon);
	    appData.activateConnection = appData.menuItem.connect('activate', (function() {
		this._on_activate(appKey);
	    }).bind(this));
	    this._systemMenu.menu.addMenuItem(appData.menuItem);
	    this._on_position_change(appKey);
	} else {
	    this._logger.log(appData.appName+' is missing');
	}
    }

    _hideItem(appKey) {
	this._logger.log_debug('_hideItem('+appKey+')');
	let appData = this._applications[appKey];
	if (appData.menuItem !== undefined) {
	    appData.menuItem.disconnect(appData.activateConnection);
	    delete appData.activateConnection;
	    this._systemMenu.menu._getMenuItems().splice(this._findMenuItemPosition(appData.menuItem), 1);
	    appData.menuItem.destroy();
	    delete appData.menuItem;
	}
    }

    // Event handlers
    _on_debug_change() {
	this._logger.set_debug(this._settings.get_boolean('debug'));
	this._logger.log_debug('debug = '+this._logger.get_debug());
    }

    _on_enable_change(appKey) {
	let appData = this._applications[appKey];
	let enable = this._settings.get_boolean(this._getEnableSettingsName(appKey));
	this._logger.log_debug('_on_enable_change('+appKey+'): enable=' + enable);
	if (enable) {
	    this._showItem(appKey);
	} else {
	    this._hideItem(appKey);
	}
    }

    _on_position_change(appKey) {
	let appData = this._applications[appKey];
	let position = this._settings.get_int(this._getPositionSettingsName(appKey));
	this._logger.log_debug('_on_position_change('+appKey+'): settings position=' + position);
	this._moveMenuItemToEnd(appData.menuItem);
	appData.preUpdatePosition();
	if (position == -1) {
	    position = appData.getDefaultPosition();
	    this._logger.log_debug('_on_position_change('+appKey+'): automatic position=' + position);
	}
	// let curPosition = this._findMenuItemPosition(appData.menuItem);
	// if (curPosition < position) {
	//     position -= 1;
	// }
	// this._logger.log_debug('_on_position_change('+appKey+'): ajusted position=' + position);
	this._systemMenu.menu.moveMenuItem(appData.menuItem, position);
	appData.postUpdatePosition();
    }

    _on_activate(appKey) {
	let appData = this._applications[appKey];
	this._logger.log_debug('_on_activate('+appKey+')');
	this._systemMenu.menu.itemActivated(BoxPointer.PopupAnimation.NONE);
	Main.overview.hide();
	appData.appInfo.activate();
    }
};

function init() {
    return new TweaksSystemMenuExtension();
}
