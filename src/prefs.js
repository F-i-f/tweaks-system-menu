// -*- indent-tabs-mode: nil; -*-
// Tweaks-system-menu - Put Gnome Tweaks in the system menu.
// Copyright (C) 2019-2025 Philippe Troin (F-i-f on Github)
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

import {
    ExtensionPreferences,
    gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import * as Logger from './logger.js';

const HeaderGroup = GObject.registerClass(
    class HeaderGroup extends Adw.PreferencesGroup {
        constructor(metadata, logger) {
            super({});
            this._metadata = metadata;

            const titleLabel = new Gtk.Label({
                use_markup: true,
                label:
                    '<span size="large" weight="heavy">' +
                    _('Tweaks &amp; Extensions in System Menu') +
                    '</span>',
                hexpand: true,
                halign: Gtk.Align.CENTER,
                margin_bottom: 8,
            });
            this.add(titleLabel);

            const versionLabel = new Gtk.Label({
                use_markup: true,
                label:
                    '<span size="small">' +
                    _('Version') +
                    ' ' +
                    logger.get_version() +
                    '</span>',
                hexpand: true,
                halign: Gtk.Align.CENTER,
                margin_bottom: 8,
            });
            this.add(versionLabel);

            const linkLabel = new Gtk.Label({
                use_markup: true,
                label:
                    '<span size="small"><a href="' +
                    metadata.url +
                    '">' +
                    metadata.url +
                    '</a></span>',
                hexpand: true,
                halign: Gtk.Align.CENTER,
            });
            this.add(linkLabel);
        }
    }
);

const FooterGroup = GObject.registerClass(
    class FooterGroup extends Adw.PreferencesGroup {
        constructor() {
            super({});

            const copyrightLabel = new Gtk.Label({
                use_markup: true,
                label:
                    '<span size="small">' +
                    _(
                        'Copyright © 2019-2025 Philippe Troin (<a href="https://github.com/F-i-f">F-i-f</a> on GitHub)'
                    ) +
                    '</span>',
                hexpand: true,
                halign: Gtk.Align.CENTER,
            });
            this.add(copyrightLabel);
        }
    }
);

const DebugGroup = GObject.registerClass(
    class DebugGroup extends Adw.PreferencesGroup {
        constructor(settings) {
            super({
                title: _('Developer Settings'),
                description: _(
                    'Turn on Debug and collect log data before submitting a bug report.'
                ),
            });

            const debugToggle = new Adw.SwitchRow({
                title: _('Debug'),
                subtitle: _(
                    settings.settings_schema.get_key('debug').get_description()
                ),
            });
            settings.bind(
                'debug',
                debugToggle,
                'active',
                Gio.SettingsBindFlags.DEFAULT
            );
            this.add(debugToggle);
        }
    }
);

const PositionGroup = GObject.registerClass(
    class PositionGroup extends Adw.PreferencesGroup {
        constructor(settings) {
            super({
                title: _('Position'),
            });

            const positionSchema = settings.settings_schema.get_key('position');
            const positionRange = positionSchema
                .get_range()
                .deep_unpack()[1]
                .deep_unpack();
            const positionSpinner = new Adw.SpinRow({
                title: _(positionSchema.get_summary()),
                subtitle: _(positionSchema.get_description()),
                adjustment: new Gtk.Adjustment({
                    lower: positionRange[0],
                    upper: positionRange[1],
                    page_increment: 5,
                    step_increment: 1,
                }),
            });
            settings.bind(
                'position',
                positionSpinner,
                'value',
                Gio.SettingsBindFlags.DEFAULT
            );
            this.add(positionSpinner);
        }
    }
);

const ApplicationsPicker = GObject.registerClass(
    class ApplicationsPicker extends Adw.PreferencesGroup {
        constructor(settings) {
            super({
                title: _('Applications'),
                description: _(
                    settings.settings_schema
                        .get_key('applications')
                        .get_description()
                ),
            });
            this._settings = settings;
            this._displayedApps = [];

            const addAppsButton = new Gtk.Button({
                child: new Adw.ButtonContent({
                    icon_name: 'list-add-symbolic',
                    label: _('Add...'),
                }),
                tooltip_text: _('Add an application'),
            });
            addAppsButton.connect('clicked', this._onAddApp.bind(this));
            this.set_header_suffix(addAppsButton);
            this._settings.connect(
                'changed::applications',
                this._refreshApps.bind(this)
            );
            this._refreshApps();
        }

        _onAddApp() {
            const dialog = new Gtk.AppChooserDialog({
                transient_for: this.get_root(),
                modal: true,
            });
            dialog.get_widget().set({show_all: true});
            dialog.connect('response', (dlg, id) => {
                if (id === Gtk.ResponseType.OK) {
                    const appInfo = dialog.get_widget().get_app_info();
                    const apps = this._settings.get_strv('applications');
                    apps.push(appInfo.get_id());
                    this._settings.set_strv('applications', apps);
                }
                dialog.destroy();
            });
            dialog.show();
        }

        _refreshApps() {
            const apps = this._settings.get_strv('applications');

            // Remove old
            for (let i = 0; i < this._displayedApps.length; i++) {
                this.remove(this._displayedApps[i]);
            }
            this._displayedApps.length = 0;

            // Add new
            for (let index = 0; index < apps.length; ++index) {
                const app = apps[index];

                const appInfo = Gio.DesktopAppInfo.new(app);
                let title;
                let appIcon;
                if (appInfo === null) {
                    title = _('Application not found...');
                    appIcon = new Gtk.Image({
                        icon_name: 'process-stop-symbolic',
                        pixel_size: 32,
                    });
                } else {
                    title = appInfo.get_display_name();
                    appIcon = new Gtk.Image({
                        gicon: appInfo.get_icon(),
                        pixel_size: 32,
                    });
                }
                appIcon.get_style_context().add_class('icon-dropshadow');

                const buttonBox = new Gtk.Box({
                    orientation: Gtk.Orientation.HORIZONTAL,
                    halign: Gtk.Align.CENTER,
                    spacing: 5,
                    hexpand: false,
                    vexpand: false,
                });

                const upButton = new Gtk.Button({
                    icon_name: 'go-up-symbolic',
                    valign: Gtk.Align.CENTER,
                    hexpand: false,
                    vexpand: false,
                    tooltip_text: _('Move up'),
                });
                if (index === 0) {
                    upButton.set_opacity(0.0);
                    upButton.sensitive = false;
                } else {
                    upButton.connect('clicked', () => {
                        apps.splice(index, 1);
                        apps.splice(index - 1, 0, app);
                        this._settings.set_strv('applications', apps);
                    });
                }
                buttonBox.append(upButton);

                const downButton = new Gtk.Button({
                    icon_name: 'go-down-symbolic',
                    valign: Gtk.Align.CENTER,
                    hexpand: false,
                    vexpand: false,
                    tooltip_text: _('Move down'),
                });
                if (index === apps.length - 1) {
                    downButton.set_opacity(0.0);
                    downButton.sensitive = false;
                } else {
                    downButton.connect('clicked', () => {
                        apps.splice(index, 1);
                        apps.splice(index + 1, 0, app);
                        this._settings.set_strv('applications', apps);
                    });
                }
                buttonBox.append(downButton);

                const deleteButton = new Gtk.Button({
                    icon_name: 'edit-delete-symbolic',
                    valign: Gtk.Align.CENTER,
                    hexpand: false,
                    vexpand: false,
                    tooltip_text: _('Remove'),
                });
                deleteButton.connect('clicked', () => {
                    apps.splice(index, 1);
                    this._settings.set_strv('applications', apps);
                });
                buttonBox.append(deleteButton);

                const row = new Adw.ActionRow({
                    title: title,
                    subtitle: app.replace('.desktop', ''),
                });
                row.add_prefix(appIcon);
                row.add_suffix(buttonBox);

                this.add(row);
                this._displayedApps.push(row);
            }
        }
    }
);

export default class TweaksSystemMenuSettings extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const logger = new Logger.Logger(
            'Tweaks-System-Menu/prefs',
            this.metadata
        );
        const settings = this.getSettings();
        logger.set_debug(settings.get_boolean('debug'));

        const page = new Adw.PreferencesPage({
            title: _('Tweaks &amp; Extensions in System Menu'),
        });
        page.add(new HeaderGroup(this.metadata, logger));
        page.add(new PositionGroup(settings));
        page.add(new ApplicationsPicker(settings));
        page.add(new DebugGroup(settings));
        page.add(new FooterGroup());
        window.add(page);
    }
}
