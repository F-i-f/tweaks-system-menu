// -*- indent-tabs-mode: nil; -*-
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

import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';

import {
    Extension,
    gettext as _,
} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {QuickSettingsItem} from 'resource:///org/gnome/shell/ui/quickSettings.js';

import * as Logger from './logger.js';

const TweaksSystemMenuApplication = GObject.registerClass(
    class TweaksSystemMenuApplication extends QuickSettingsItem {
        constructor(appInfo) {
            super({
                style_class: 'icon-button',
                can_focus: true,
                icon_name: appInfo.app_info.get_icon().names[0],
                visible: !Main.sessionMode.isGreeter,
                accessible_name: appInfo.get_name(),
            });

            this.connect('clicked', () => {
                Main.overview.hide();
                Main.panel.closeQuickSettings();
                appInfo.activate();
            });
        }
    }
);

export default class TweaksSystemMenuExtension extends Extension {
    constructor(metadata) {
        super(metadata);

        this._logger = null;
        this._settings = null;
        this._delayedStage2Source = null;
        this._launcherButtons = null;
        this._systemItem = null;
        this._debugSettingChangedConnection = null;
        this._positionSettingChangedConnection = null;
        this._applicationsSettingChangedConnection = null;
    }

    // Helpers
    _removeAppLauncher(app) {
        this._logger.log_debug('removing button for ' + app);
        const button = this._launcherButtons[app];
        this._systemItem.remove_child(button);
        button.destroy();
        delete this._launcherButtons[app];
    }

    // Enable/disable
    enable() {
        this._logger = new Logger.Logger('Tweaks-System-Menu', this.metadata);
        this._settings = this.getSettings();

        this._on_debug_change();

        this._logger.log_debug('enable()');

        if (
            Main?.panel?.statusArea?.quickSettings?._system?._systemItem?.child
        ) {
            this._enable_stage2();
        } else {
            this._logger.log(
                'enable(): Race condition detect at initialization, postponing stage 2...'
            );
            this._delayedStage2Source = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                1000,
                () => {
                    this._delayedStage2Source = null;
                    this._logger.log('enable(): stage 2 resuming...');
                    this._enable_stage2();
                    this._logger.log('enable(): 2-stage enable successful!');
                }
            );
        }
    }

    _enable_stage2() {
        this._logger.log_debug('enable_stage2()');

        this._systemItem =
            Main.panel.statusArea.quickSettings._system._systemItem.child;
        this._launcherButtons = {};

        this._debugSettingChangedConnection = this._settings.connect(
            'changed::debug',
            this._on_debug_change.bind(this)
        );
        this._positionSettingChangedConnection = this._settings.connect(
            'changed::position',
            this._on_position_change.bind(this)
        );
        this._applicationsSettingChangedConnection = this._settings.connect(
            'changed::applications',
            this._on_applications_change.bind(this)
        );

        this._on_applications_change();

        this._logger.log_debug('extension enabled');
    }

    disable() {
        this._logger.log_debug('disable()');

        if (this._delayedStage2Source !== null) {
            GLib.source_remove(this._delayedStage2Source);
            this._delayedStage2Source = null;
        }

        if (this._debugSettingChangedConnection !== null) {
            this._settings.disconnect(this._debugSettingChangedConnection);
            this._debugSettingChangedConnection = null;
        }
        if (this._positionSettingChangedConnection !== null) {
            this._settings.disconnect(this._positionSettingChangedConnection);
            this._positionSettingChangedConnection = null;
        }
        if (this._applicationsSettingChangedConnection !== null) {
            this._settings.disconnect(
                this._applicationsSettingChangedConnection
            );
            this._applicationsSettingChangedConnection = null;
        }

        for (let app in this._launcherButtons) {
            this._removeAppLauncher(app);
        }
        this._launcherButtons = null;
        this._systemItem = null;
        this._settings = null;

        this._logger.log_debug('extension disabled');
        this._logger = null;
    }

    // Event handlers
    _on_debug_change() {
        this._logger.set_debug(this._settings.get_boolean('debug'));
        this._logger.log_debug('debug = ' + this._logger.get_debug());
    }

    _on_applications_change() {
        this._logger.log_debug('_on_applications_change()');
        const wantedApps = this._settings.get_strv('applications');
        const wantedAppsDict = {};
        for (const app of wantedApps) {
            if (app in this._launcherButtons) {
                wantedAppsDict[app] = true;
            } else {
                const appInfo = Shell.AppSystem.get_default().lookup_app(app);
                if (appInfo !== null) {
                    wantedAppsDict[app] = true;
                    this._logger.log_debug('adding button for ' + app);
                    const button = new TweaksSystemMenuApplication(appInfo);
                    this._launcherButtons[app] = button;
                    this._systemItem.add_child(button);
                } else {
                    this._logger.log('app "' + app + '" not found');
                }
            }
        }
        for (let app in this._launcherButtons) {
            if (!(app in wantedAppsDict)) {
                this._removeAppLauncher(app);
            }
        }
        this._on_position_change();
    }

    _on_position_change() {
        this._logger.log_debug('_on_position_change()');
        const endPos = this._systemItem.get_n_children() - 1;
        for (const app in this._launcherButtons) {
            this._systemItem.set_child_at_index(
                this._launcherButtons[app],
                endPos
            );
        }
        let position = this._settings.get_int('position');
        if (position < 0) {
            const children = this._systemItem.get_children();
            for (let i = 0; i < children.length; ++i) {
                if (children[i]._settingsApp !== undefined) {
                    position = i + 1;
                    break;
                }
            }
        }
        if (position < 0) {
            this._logger.log('Could not find Settings in system menu');
            position = 1;
        }

        for (const app of this._settings.get_strv('applications')) {
            if (this._launcherButtons[app] !== undefined) {
                this._systemItem.set_child_at_index(
                    this._launcherButtons[app],
                    position
                );
                position += 1;
            }
        }
    }
}
