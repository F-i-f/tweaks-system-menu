// tweaks-system-menu - Put Gnome Tweaks in the system menu.
// Copyright (C) 2019 Philippe Troin (F-i-f on Github)
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
const Convenience = Me.imports.convenience;

const Logger = Me.imports.logger;

const TweaksSystemMenuActionButton = new Lang.Class({
    Name: 'TweaksSystemMenuActionButton',

    _init: function(extension, appName) {
	this._extension = extension;
	this._appName = appName;
	this._app = null;
	this._action = null;
	this._signalConnection = null;
    },

    _log_debug: function(msg) {
	this._extension._logger.log_debug('TweaksSystemMenuActionButton('
					  + this._appName + '): '+msg);
    },

    enable: function() {
	this._log_debug('enable()');

	this._app    = Shell.AppSystem.get_default().lookup_app(this._appName);
	this._action = this._extension._systemMenu
	    ._createActionButton(this._app.app_info.get_icon().names[0],
				 this._app.get_name());
	this._signalConnection = this._action.connect('clicked',
						      this._on_clicked.bind(this));
    },

    disable: function(destroy) {
	this._log_debug('disable(' + destroy +')');
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


const TweaksSystemMenuExtension = new Lang.Class({
    Name: 'TweaksSystemMenuExtension',

    _init: function() {
	this._logger = null;

	this._settings = null;
	this._debugSettingChangedConnection = null;
	this._buttonsMergeSettingChangeConnection = null;
	this._positionSettingChangedConnection = null;

	this._systemMenu = null;

	this._tweaksButton = null;
	this._settingsButton = null;
	this._settingsSwitcher = null;
	this._actorToPosition = null;
	this._openStateChangedConnectionId = null;
    },

    _findSystemAction: function(action) {
	let systemActions = this._systemMenu._actionsItem.actor.get_children();
	for (let i=0; i < systemActions.length; ++i) {
	    if (systemActions[i] == action) {
		this._logger.log_debug('_findSystemAction('+action+') = '+i);
		return i;
	    }
	}
	this._logger.log_debug('_findSystemAction('+action+') = <null>');
	return null;
    },

    enable: function() {
	this._logger = new Logger.Logger('Tweaks-System-Menu');
	this._settings = Convenience.getSettings();

	this._on_debug_change();

	this._logger.log_debug('enable()');

	this._debugSettingChangedConnection = this._settings.connect('changed::debug',
								     this._on_debug_change.bind(this));
	this._buttonsMergeSettingChangeConnection = this._settings.connect('changed::merge-with-settings',
									     this._on_buttons_merge_change.bind(this));
	this._positionSettingChangedConnection = this._settings.connect('changed::position',
									this._on_position_change.bind(this));

	this._systemMenu = Main.panel.statusArea.aggregateMenu._system;

	this._showButton();

	this._openStateChangedConnectionId = this._systemMenu.menu.connect('open-state-changed',
									   this._on_open_state_changed.bind(this));
	this._logger.log_debug('extension enabled');
    },

    disable: function() {
	this._logger.log_debug('disable()');

	this._systemMenu.menu.disconnect(this._openStateChangedConnectionId);
	this._openStateChangedConnectionId = null;

	this._hideButton();

	this._systemMenu = null;

	this._settings.disconnect(this._debugSettingChangedConnection);
	this._debugSettingChangedConnection = null;
	this._settings.disconnect(this._buttonsMergeSettingChangeConnection);
	this._buttonsMergeSettingChangeConnection = null;
	this._settings.disconnect(this._positionSettingChangedConnection);
	this._positionSettingChangedConnection = null;

	this._settings = null;

	this._logger = null;

	this._logger.log_debug('extension disabled');
    },

    _showButton: function() {
	this._logger.log_debug('_showButton()');

	this._tweaksButton = new TweaksSystemMenuActionButton(this, 'org.gnome.tweaks.desktop');
	this._tweaksButton.enable();

	if (this._settings.get_boolean('merge-with-settings')) {
	    this._settingsButton = new TweaksSystemMenuActionButton(this, 'gnome-control-center.desktop');
	    this._settingsButton.enable();

	    this._settingsSwitcher = new StatusSystem.AltSwitcher(this._settingsButton.getAction(),
								  this._tweaksButton.getAction());

	    this._systemMenu._actionsItem.actor.add(this._settingsSwitcher.actor,
						    {expand:true, x_fill:false});
	    this._actorToPosition = this._settingsSwitcher.actor;

	    this._systemMenu._settingsAction.visible = false;
	} else {
	    this._systemMenu._actionsItem.actor.add(this._tweaksButton.getAction(),
						    {expand: true, x_fill: false});
	    this._actorToPosition = this._tweaksButton.getAction();
	}

	this._on_position_change();
    },

    _hideButton: function() {
	this._logger.log_debug('_hideButton()');

	this._systemMenu._actionsItem.actor.remove_child(this._actorToPosition);
	this._actorToPosition = null;

	this._tweaksButton.disable(!this._areButtonsMerged());
	this._tweaksButton = null;

	if (this._areButtonsMerged()) {
	    this._settingsButton.disable(false);
	    this._settingsButton = null;

	    this._settingsSwitcher.actor.destroy();
	    this._settingsSwitcher = null;

	    this._systemMenu._settingsAction.visible = true;
	}
    },

    _areButtonsMerged: function() {
	return this._settingsSwitcher != null;
    },

    _on_debug_change: function() {
	this._logger.set_debug(this._settings.get_boolean('debug'));
	this._logger.log_debug('debug = '+this._logger.get_debug());
    },

    _on_buttons_merge_change: function() {
	let buttonsShouldMerge = this._settings.get_boolean('merge-with-settings');
	this._logger.log_debug('_on_buttons_merge_change(): merge='+buttonsShouldMerge);
	if (    (   buttonsShouldMerge && ! this._areButtonsMerged())
	     || ( ! buttonsShouldMerge &&   this._areButtonsMerged())) {
	    this._hideButton();
	    this._showButton();
	}
    },

    _on_position_change: function() {
	let position = this._settings.get_int('position');
	this._logger.log_debug('_on_position_change(): settings position=' + position);
	if (position == -1) {
	    position = this._findSystemAction(this._systemMenu._settingsAction)+1;
	    this._logger.log_debug('_on_position_change(): automatic position=' + position);
	}
	let n_children = this._systemMenu._actionsItem.actor.get_n_children();
	if (position >= n_children) {
	    position = n_children-1;
	    this._logger.log_debug('_on_position_change(): adjusting position='
				   + position + ' with '+n_children+' elements');
	}
	this._systemMenu._actionsItem.actor.set_child_at_index(this._actorToPosition, position);
    },

    _on_open_state_changed: function(menu, open) {
	this._logger.log_debug('_on_open_state_changed()');
	if (!open)
	    return;
	this._tweaksButton.setVisible(true);
	if (this._settingsButton != null)
	    this._settingsButton.setVisible(true);
    }

});

function init() {
    return new TweaksSystemMenuExtension();
}
