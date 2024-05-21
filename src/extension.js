// tweaks-system-menu - Put Gnome Tweaks in the system menu.
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

import GObject                   from 'gi://GObject';
import Shell                     from 'gi://Shell';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main                 from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu            from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {QuickSettingsItem}       from 'resource:///org/gnome/shell/ui/quickSettings.js';

import * as Logger               from './logger.js';

const TweaksSystemMenuApplication = GObject.registerClass(
class TweaksSystemMenuApplication extends QuickSettingsItem {
    _init(appData) {
	super._init({
	    style_class: 'icon-button',
	    can_focus: true,
	    icon_name: appData.appInfo.app_info.get_icon().names[0],
	    visible: !Main.sessionMode.isGreeter,
	    accessible_name: appData.appInfo.get_name(),
	});

	this.connect('clicked', () => {
	    Main.overview.hide();
	    Main.panel.closeQuickSettings();
	    appData.appInfo.activate();
	});
    }
});

export default class TweaksSystemMenuExtension extends Extension {
    constructor(metadata) {
	super(metadata);

	this._logger = null;

	this._settings = null;
	this._debugSettingChangedConnection = null;
	this._positionSettingChangedConnection = null;
	this._systemItem = null;

	this._applications = {
	    'tweaks': {
		appName: 'org.gnome.tweaks.desktop',
		check: (function() {
		    return true;
		}).bind(this),
		getDefaultPosition: (function() {
		    let children = this._systemItem.get_children();
		    for (let i=0; i < children.length; ++i) {
			if (children[i]._settingsApp !== undefined) {
			    return i+1;
			}
		    }
		    return 1;
		}).bind(this),
		preUpdatePosition: (function () {
		    if (this._applications['extensions'].tsmApp !== undefined) {
			this._moveMenuItemToEnd(this._applications['extensions'].tsmApp);
		    }
		}).bind(this),
		postUpdatePosition: (function () {
		    if (this._applications['extensions'].tsmApp !== undefined) {
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
		    if (this._applications['tweaks'].tsmApp !== undefined) {
			return this._findMenuItemPosition(this._applications['tweaks'].tsmApp)+1;
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
	let items = this._systemItem.get_children();
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
	this._systemItem.set_child_at_index(item, this._systemItem.get_n_children()-1);
    }

    _getEnableSettingsName(appKey) {
	return appKey+'-enable';
    }

    _getPositionSettingsName(appKey) {
	return appKey+'-position';
    }

    // Enable/disable
    enable() {
	this._logger = new Logger.Logger('Tweaks-System-Menu', this.metadata);
	this._settings = this.getSettings();

	this._on_debug_change();

	this._logger.log_debug('enable()');

	this._debugSettingChangedConnection = this._settings.connect('changed::debug',
								     this._on_debug_change.bind(this));
	this._systemItem = Main.panel.statusArea.quickSettings._system._systemItem.child;

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

	this._systemItem = null;

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
	    appData.tsmApp = new TweaksSystemMenuApplication(appData);
	    this._systemItem.add_child(appData.tsmApp);
	    this._on_position_change(appKey);
	} else {
	    this._logger.log(appData.appName+' is missing');
	}
    }

    _hideItem(appKey) {
	this._logger.log_debug('_hideItem('+appKey+')');
	let appData = this._applications[appKey];
	if (appData.tsmApp !== undefined) {
	    this._systemItem.remove_child(appData.tsmApp);
	    appData.tsmApp.destroy();
	    delete appData.tsmApp;
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
	this._moveMenuItemToEnd(appData.tsmApp);
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
	this._systemItem.set_child_at_index(appData.tsmApp, position);
	appData.postUpdatePosition();
    }
};
