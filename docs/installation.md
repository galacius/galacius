# Installation

Galacius is a single ~50 MB self-contained binary — no runtimes or libraries to install, and no setup beyond a working `~/.kube/config` pointing at the clusters you want to manage.

## macOS

### Homebrew

```sh
brew tap galacius/homebrew-galacius
brew trust galacius/galacius/galacius
brew install galacius
```

`brew update` refreshes Homebrew's local tap cache; `brew upgrade` alone may report "already installed" if that cache is stale.

### Manual

```sh
curl -fsSL "https://raw.githubusercontent.com/galacius/galacius/master/scripts/install.sh" | bash
```

To install a specific version instead of latest:

```sh
curl -fsSL "https://raw.githubusercontent.com/galacius/galacius/master/scripts/install.sh" | bash -s -- v1.7.0
```

Or download the binary directly from the [latest release](https://github.com/galacius/galacius/releases/latest) (e.g. `galacius-darwin-arm64.zip` for Apple Silicon).

## Linux

### APT (Debian/Ubuntu)

Add the key once, then pick the `sources.list.d` line for your release:

```sh
curl -fsSL https://galacius.github.io/galacius-apt/keys/galacius-keyring.gpg | sudo gpg --dearmor -o /usr/share/keyrings/galacius-archive-keyring.gpg
```

**Ubuntu 24.04 (noble)**

```sh
echo "deb [signed-by=/usr/share/keyrings/galacius-archive-keyring.gpg] https://galacius.github.io/galacius-apt noble main" | sudo tee /etc/apt/sources.list.d/galacius.list
sudo apt-get update && sudo apt-get install galacius
```

**Ubuntu 22.04 (jammy)**

```sh
echo "deb [signed-by=/usr/share/keyrings/galacius-archive-keyring.gpg] https://galacius.github.io/galacius-apt jammy main" | sudo tee /etc/apt/sources.list.d/galacius.list
sudo apt-get update && sudo apt-get install galacius
```

**Ubuntu 20.04 (focal)**

```sh
echo "deb [signed-by=/usr/share/keyrings/galacius-archive-keyring.gpg] https://galacius.github.io/galacius-apt focal main" | sudo tee /etc/apt/sources.list.d/galacius.list
sudo apt-get update && sudo apt-get install galacius
```

### Manual

```sh
curl -fsSL "https://raw.githubusercontent.com/galacius/galacius/master/scripts/install.sh" | bash
```

To install a specific version instead of latest:

```sh
curl -fsSL "https://raw.githubusercontent.com/galacius/galacius/master/scripts/install.sh" | bash -s -- v1.7.0
```

Or download the binary directly from the [latest release](https://github.com/galacius/galacius/releases/latest) (e.g. `galacius-linux-amd64.tar.gz`).

## Windows

### Manual

#### PowerShell

Run from **Windows PowerShell** or **PowerShell 7+** — `cmd.exe` has no PowerShell interpreter built in, but can shell out to one:

```powershell
irm https://raw.githubusercontent.com/galacius/galacius/master/scripts/install.ps1 | iex
```

```cmd
:: from Command Prompt
powershell -c "irm https://raw.githubusercontent.com/galacius/galacius/master/scripts/install.ps1 | iex"
```

To install a specific version instead of latest (piping to `iex` doesn't let you pass arguments):

```powershell
irm https://raw.githubusercontent.com/galacius/galacius/master/scripts/install.ps1 -OutFile install.ps1
.\install.ps1 v1.7.0
```

[`scripts/install.ps1`](../scripts/install.ps1) installs to `%LOCALAPPDATA%\Programs\Galacius`, adds it to your user `PATH`, and creates a Start Menu shortcut.

#### Git Bash

Same script as Linux/macOS — works as-is in Git Bash, MSYS2, or Cygwin:

```bash
curl -fsSL "https://raw.githubusercontent.com/galacius/galacius/master/scripts/install.sh" | bash
```

This installs to `$HOME/AppData/Local/Programs/Galacius` (the same directory `install.ps1` uses) and adds it to `PATH` for Git Bash sessions only, via `~/.bashrc`. For a system-wide install (Start Menu shortcut + PATH available in PowerShell/cmd too), use `install.ps1` above instead.

## Private repos

Both scripts support a private `galacius/galacius` fork via `GALACIUS_ACCESS_TOKEN` and `APP_VERSION_RELEASES_BASE_URL`:

```sh
export GALACIUS_ACCESS_TOKEN=ghp_xxx
export APP_VERSION_RELEASES_BASE_URL=https://api.github.com/repos/galacius/galacius
```

```powershell
$env:GALACIUS_ACCESS_TOKEN = 'ghp_xxx'
$env:APP_VERSION_RELEASES_BASE_URL = 'https://api.github.com/repos/galacius/galacius'
```
