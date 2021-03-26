Tweaks and Extensions in System Menu Gnome Shell Extension
===========================================================

[![Build Status](https://travis-ci.org/F-i-f/tweaks-system-menu.svg?branch=master)](https://travis-ci.org/F-i-f/tweaks-system-menu)

## Overview

Tweaks in System Menu adds a shortcut button to the _Gnome
Tweaks_(a.k.a. _Tweak UI_) and to the shell's _Extensions_ (on Gnome
40 later) in the panel's system menu.

![The Tweaks button shown as separate and not merged with the Settings
button](docs/tweaks-in-system-menu.png)

The buttons can be positioned anywhere in the system menu.

On old Shell versions (up to 3.34), the button can even be merged with
the Settings button.  If merged, the Settings button will be shown
when opening the system menu, and Tweaks will be shown if "Alt" is
pressed on the keyboard, or if the Settings button is pressed for a
half second or so.

## Configuration

Tweaks in System Menu comes with a preference panel which can be found
from the "Tweaks" or "Extensions" applications or the [Gnome Shell
Extensions page](https://extensions.gnome.org/local/).

![Tweaks in System Menu preference panel](docs/preferences.png)

## License

Tweaks in System Menu is free software: you can redistribute it and/or
modify it under the terms of the GNU General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see [http://www.gnu.org/licenses/].

## Download / Install

Install directly from the [Gnome Shell Extensions
site](https://extensions.gnome.org/extension/1653/tweaks-in-system-menu/).

Or download the zip file from the GitHub [releases
page](https://github.com/F-i-f/tweaks-system-menu/releases) and unzip
[the
file](https://github.com/F-i-f/tweaks-system-menu/releases/download/v13/tweaks-system-menu@extensions.gnome-shell.fifi.org.v13.shell-extension.zip)
in the
`~/.local/share/gnome-shell/extensions/tweaks-system-menu@extensions.gnome-shell.fifi.org`
directory (you may have to create the directory).

## Building from source

### Requirements

- [meson](http://mesonbuild.com/) v0.44.0 or later.

### Running the build

- Check out: `git clone https://github.com/F-i-f/tweaks-system-menu`

- `cd tweaks-system-menu`

- Run meson: `meson build`

- To install in your your gnome shell extensions' directory (~/.local/share/gnome-shell/extensions), run ninja: `ninja -C build install`

- To build the extension zip files, run: `ninja -C build extension.zip`, the extension will be found under `build/extension.zip`.

## Changelog

### Version 12 & 13
#### March 25, 2021

- Gnome-shell 40 compatibility.
- Update preferences for Gnome-shell 40.
- Update meson-gse to latest:
  - Now prints the GJS version in the system log at start-up (if debug
	is enabled).
  - Support more mozjs version (78, 68, 52) for build-time syntax
	checks (`ninja test`).

### Version 11
#### October 6, 2020

- Declare gnome-shell 3.38 compatibility (no code changes required).

### Version 10
#### May 12, 2020

- Update German translation.

### Version 9
#### March 11, 2020

- Gnome-shell 3.36 compatibility:
  - The Tweaks entry cannot be merged with Settings anymore.
  - This version is not compatible with earlier shell versions (use
	version 8 for Gnome Shell 3.34 and below).
- Fix deprecation warning in preferences.
- Update meson-gse to latest.
- Now prints the gnome-shell version and the session type on start-up.

### Version 8
#### October 15, 2019

- Update German translation.

### Version 7
#### October 11, 2019

- Add German translation.

### Version 6
#### September 30, 2019

- Declare compatibility with shell version 3.34 (no code changes required).

### Version 5
#### August 21, 2019

- Declare compatibility with shell version 3.33.90.
- No functional changes.

### Version 4
#### August 19, 2019

- Supports shell version 3.33 (new compatibility code).
- Also declare as compatible with shell version 3.28 (no new code needed).
- Code clean-ups without any user-visible changes in the preference pane.
- Added Travis CI support in build tree.

### Version 3
#### March 30, 2019

- Fix warning in logger.js that was introduced in version 2.

### Version 2
#### March 26, 2019

- ES6 / Gnome-Shell 3.32 compatibility (still compatible with 3.30 and lower).
- Updated meson-gse to latest.
- Minor doc updates.

### Version 1
#### February 11, 2019

- Initial release.

## Credits

- The [`meson-gse` credits](https://github.com/F-i-f/meson-gse/) are
  included here by reference.
- Inspiration for `AltSwitcher()` usage com from the [Hibernate Status
  Button](https://extensions.gnome.org/extension/755/hibernate-status-button/)
  extension.
- German translation by [Etamuk](https://github.com/Etamuk).

<!--  LocalWords:  UI cd extensions' Changelog gse AltSwitcher js ES6
-->
<!--  LocalWords:  MERCHANTABILITY Etamuk GJS mozjs
 -->
