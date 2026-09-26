# Uninstallation

### Homebrew (macOS)

```sh
brew uninstall galacius
```

### APT (Debian/Ubuntu)

```sh
sudo apt remove galacius
```

This preserves `~/.galacius` (settings, installed plugins). To wipe it too:

```sh
sudo apt remove --purge galacius
```

### Manual (Linux + MacOS)

```sh
curl -fsSL "https://raw.githubusercontent.com/galacius/galacius/main/scripts/uninstall.sh" | bash
```

This preserves `~/.galacius` (settings, installed plugins). To wipe it too:

```sh
curl -fsSL "https://raw.githubusercontent.com/galacius/galacius/main/scripts/uninstall.sh" | bash -s -- cleanup
```

### Manual (Windows)

Installed via [`scripts/install.ps1`](../scripts/install.ps1)? Remove the binary, its Start Menu shortcut, and the PATH entry it added:

```powershell
Remove-Item -Path "$env:LOCALAPPDATA\Programs\Galacius" -Recurse -Force
Remove-Item -Path "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Galacius.lnk" -Force -ErrorAction SilentlyContinue

$installDir = "$env:LOCALAPPDATA\Programs\Galacius"
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$newPath = ($userPath -split ';' | Where-Object { $_ -and $_ -ne $installDir }) -join ';'
[Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
```

This preserves `%USERPROFILE%\.galacius` (settings, installed plugins). To wipe it too:

```powershell
Remove-Item -Path "$env:USERPROFILE\.galacius" -Recurse -Force
```
