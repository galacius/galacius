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
