// Tweaks-status - Put Gnome Tweaks on ALT/long-press on the panel's Settings
// Copyright (C) 2019 Philippe Troin <phil@fifi.org>
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

const Lang = imports.lang;
const Main = imports.ui.main;
const StatusSystem = imports.ui.status.system;
const Shell = imports.gi.Shell;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Logger = Me.imports.logger;

let logger = new Logger.Logger('Tweaks-Status');
logger.set_debug(true);

const TweaksStatusActionButton = new Lang.Class({
    Name: 'TweaksStatusActionButton',

    _init: function(extension, appName) {
	this._extension = extension;
	this._appName = appName;
	this._app = null;
	this._action = null;
	this._signalConnection = null;
    },

    _log_debug: function(msg) {
	logger.log_debug('TweaksStatusActionButton(' + this._appName + '): '+msg);
    },

    enable: function() {
	this._log_debug('enable()');

	this._app    = Shell.AppSystem.get_default().lookup_app( this._appName );
	this._action = this._extension._systemMenu._createActionButton(this._app.app_info.get_icon().names[0],
								       this._app.get_name());
	this._signalConnection = this._action.connect('clicked', this._on_clicked.bind(this));
    },

    disable: function(destroy) {
	this._log_debug('disable()');
	this._action.disconnect(this._signalConnection);

	if (destroy)
	    this._action.destroy()

	this._app = null;
	this._action = null;
	this._signalConnection = null;
    },

    setVisible: function(visible) {
	this._action.visible = visible;
    },

    getAction: function() {
	return this._action;
    },

    _on_clicked: function() {
	this._log_debug('_on_clicked()');
	this._extension._systemMenu.menu.itemActivated();
	Main.overview.hide();
	this._app.activate();
    }
});


const TweaksStatusExtension = new Lang.Class({
    Name: 'TweaksStatusExtension',

    _init: function() {
	this._systemMenu = null;

	this._tweaksButton = null;
	this._settingsButton = null;
	this._settingsSwitcher = null;
	this._openStateChangedConnectionId = null;
    },

    _findSystemAction: function(action) {
	let systemActions = this._systemMenu._actionsItem.actor.get_children();
	for (let i=0; i < systemActions.length; ++i) {
	    if (systemActions[i] == action) {
		logger.log_debug('_findSystemAction('+action+') = '+i);
		return i;
	    }
	}
	logger.log_debug('_findSystemAction('+action+') = <null>');
	return null;
    },

    enable: function() {
	logger.log_debug('enable()');

	this._systemMenu = Main.panel.statusArea.aggregateMenu._system;

	this._tweaksButton = new TweaksStatusActionButton(this, 'org.gnome.tweaks.desktop');
	this._tweaksButton.enable();

	if (false) {
	    this._systemMenu._actionsItem.actor.add(this._tweaksButton.getAction(), {expand: true, x_fill: false});
	    this._systemMenu._actionsItem.actor.set_child_at_index(this._tweaksButton.getAction(), 2);
	} else {
	    let settingsActionIndex = this._findSystemAction(this._systemMenu._settingsAction);

	    this._settingsButton = new TweaksStatusActionButton(this, 'gnome-control-center.desktop');
	    this._settingsButton.enable();

	    this._settingsSwitcher = new StatusSystem.AltSwitcher(this._settingsButton.getAction(), this._tweaksButton.getAction());

	    this._systemMenu._actionsItem.actor.add(this._settingsSwitcher.actor, {expand:true, x_fill:false});
	    this._systemMenu._actionsItem.actor.set_child_at_index(this._settingsSwitcher.actor, settingsActionIndex+1);

	    this._systemMenu._settingsAction.visible = false;
	}
	this._openStateChangedConnectionId = this._systemMenu.menu.connect('open-state-changed', this._on_open_state_changed.bind(this));
    },

    disable: function() {
	logger.log_debug('disable()');

	this._systemMenu.menu.disconnect(this._openStateChangedConnectionId);
	this._openStateChangedConnectionId = null;

	if (false) {
	    this._systemMenu._actionsItem.actor.remove_child(this._tweaksButton.getAction());

	    this._tweaksButton.disable(true);
	    this._tweaksButton = null;
	} else {
	    this._systemMenu._actionsItem.actor.remove_child(this._settingsSwitcher.actor);

	    this._tweaksButton.disable(false);
	    this._tweaksButton = null;

	    this._settingsButton.disable(false);
	    this._settingsButton = null;

	    this._settingsSwitcher.actor.destroy();
	    this._settingsSwitcher = null;

	    this._systemMenu._settingsAction.visible = true;
	}

	this._systemMenu = null;
    },

    _on_open_state_changed: function(menu, open) {
	logger.log_debug('_on_open_state_changed()');
	if (!open)
	    return;
	this._tweaksButton.setVisible(true);
	if (this._settingsButton != null)
	    this._settingsButton.setVisible(true);
    }

});

function init() {
    return new TweaksStatusExtension();
}
