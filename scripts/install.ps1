#Requires -Version 5.1
<#
  Windows counterpart to scripts/install.sh. That script is bash-only (uname,
  shasum, chmod, sudo, .desktop entries) and explicitly refuses to run on
  Windows -- this is the native PowerShell equivalent for a manual (non-winget)
  install. Mirrors its behavior: resolve a release tag, fetch manifest.json
  (the single source of truth for artifact filename + SHA256, shared with
  internal/updater's unauthenticated path), download, verify, install.

  Usage:
    irm https://raw.githubusercontent.com/galacius/galacius/main/scripts/install.ps1 | iex
    .\install.ps1 [version]

  For private repos, set GALACIUS_ACCESS_TOKEN and point
  APP_VERSION_RELEASES_BASE_URL at the API host (mirrors install.sh):
    $env:GALACIUS_ACCESS_TOKEN = 'ghp_xxx'
    $env:APP_VERSION_RELEASES_BASE_URL = 'https://api.github.com/repos/galacius/galacius'
#>

param(
    [Parameter(Position = 0)]
    [string]$Version
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$Repo = 'galacius/galacius'
$BinName = 'galacius.exe'
$InstallDir = Join-Path $env:LOCALAPPDATA 'Programs\Galacius'
$ExePath = Join-Path $InstallDir $BinName

$ReleasesBaseUrl = if ($env:APP_VERSION_RELEASES_BASE_URL) { $env:APP_VERSION_RELEASES_BASE_URL } else { "https://github.com/$Repo" }
$Token = $env:GALACIUS_ACCESS_TOKEN
if (-not $Version) { $Version = $env:VERSION }

function Write-Info    { param([string]$Message) Write-Host "-> $Message" -ForegroundColor Green }
function Write-Warn    { param([string]$Message) Write-Host "!  $Message" -ForegroundColor Yellow }
function Write-Success { param([string]$Message) Write-Host "v $Message" -ForegroundColor Green }
function Write-ErrorAndExit { param([string]$Message) throw $Message }

# amd64 is the only platform currently in the build matrix (see
# .github/workflows/job-build.yml's build-windows job) -- fail closed on
# anything else instead of hitting the network for a platform that was never
# published, mirroring install.sh's per-OS arch case statement.
$ProcessorArch = $env:PROCESSOR_ARCHITECTURE
$PlatformArch = switch ($ProcessorArch) {
    'AMD64' { 'amd64' }
    default { Write-ErrorAndExit "Unsupported Windows architecture: $ProcessorArch (only amd64 is currently published)" }
}

# Resolves the final redirect target of a URL without downloading its full
# body into memory, mirroring `curl -w '%{url_effective}'` in install.sh --
# used to read the resolved tag off the releases/latest redirect without an
# API call (and its rate limit).
function Get-EffectiveUrl {
    param([string]$Url)
    $request = [System.Net.HttpWebRequest]::Create($Url)
    $request.AllowAutoRedirect = $true
    $request.Method = 'GET'
    $request.UserAgent = 'galacius-install.ps1'
    try {
        $response = $request.GetResponse()
        $effective = $response.ResponseUri.AbsoluteUri
        $response.Close()
        return $effective
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) {
            $effective = $_.Exception.Response.ResponseUri.AbsoluteUri
            $_.Exception.Response.Close()
            return $effective
        }
        Write-ErrorAndExit "Could not reach $Url"
    }
}

# Wraps GitHub requests (JSON or octet-stream) with the same 401/403/404
# messaging as install.sh's gh_curl, since a 401/403 there can mean an
# invalid/expired token, missing scopes, rate limiting, or an org policy --
# each needing a different fix from the user.
function Invoke-GhRequest {
    param(
        [Parameter(Mandatory)][string]$Uri,
        [string]$Accept,
        [string]$OutFile
    )
    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    if ($Accept) { $headers['Accept'] = $Accept }

    try {
        if ($OutFile) {
            Invoke-WebRequest -Uri $Uri -Headers $headers -UseBasicParsing -OutFile $OutFile -ErrorAction Stop
            return $null
        }
        return Invoke-WebRequest -Uri $Uri -Headers $headers -UseBasicParsing -ErrorAction Stop
    } catch {
        $webResponse = $_.Exception.Response
        if (-not $webResponse) { throw }

        $code = [int]$webResponse.StatusCode
        $body = ''
        try {
            $reader = New-Object System.IO.StreamReader($webResponse.GetResponseStream())
            $body = $reader.ReadToEnd()
        } catch {}

        if ($code -eq 401 -or $code -eq 403) {
            $ghMessage = $null
            if ($body -match '"message"\s*:\s*"([^"]*)"') { $ghMessage = $Matches[1] }
            if ($ghMessage) {
                Write-ErrorAndExit "GitHub API returned ${code}: $ghMessage"
            } else {
                Write-ErrorAndExit "GitHub API returned $code -- token is invalid or missing required permissions."
            }
        } elseif ($code -eq 404) {
            if (-not $Token) {
                Write-ErrorAndExit "GitHub API returned 404 -- check the repo name or that the release/tag exists.`nIf this is a private repo, set a token and the API base URL, then re-run:`n  `$env:GALACIUS_ACCESS_TOKEN = 'ghp_xxx'`n  `$env:APP_VERSION_RELEASES_BASE_URL = 'https://api.github.com/repos/$Repo'"
            }
            Write-ErrorAndExit "GitHub API returned 404 -- check the repo name or that the release/tag exists."
        } else {
            Write-ErrorAndExit "GitHub API request failed with HTTP $code"
        }
    }
}

$TmpDir = Join-Path $env:TEMP "galacius-install-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $TmpDir -Force | Out-Null

# manifest.json is cached in ~/.galacius (same location internal/updater
# persists it to, and the same dir storage.Dir() resolves to) rather than
# TmpDir, so it survives this run for inspection/debugging.
$GalaciusDir = Join-Path $env:USERPROFILE '.galacius'
New-Item -ItemType Directory -Path $GalaciusDir -Force | Out-Null
$ManifestPath = Join-Path $GalaciusDir 'manifest.json'

$HaveBackup = $false
$BackupPath = Join-Path $TmpDir "backup.$BinName"

function Restore-Backup {
    if (-not $HaveBackup) { return }
    Write-Warn 'Restoring previous installation...'
    Copy-Item -Path $BackupPath -Destination $ExePath -Force
    Write-Warn 'Previous installation restored'
}

try {
    # -- resolve version -----------------------------------------------------
    # Priority: positional arg > VERSION env var > latest release.
    if ($Version) {
        $Tag = $Version
        Write-Info "Installing version: $Tag"
    } elseif ($Token) {
        Write-Info 'Fetching latest release...'
        $latestResp = Invoke-GhRequest -Uri "$ReleasesBaseUrl/releases/latest"
        $Tag = ($latestResp.Content | ConvertFrom-Json).tag_name
        if (-not $Tag) { Write-ErrorAndExit 'Could not resolve latest release.' }
        Write-Info "Latest version: $Tag"
    } else {
        # Public repo, no token: resolve the latest tag via the releases page
        # redirect instead of the GitHub API, which caps unauthenticated
        # requests at 60/hour per source IP (shared by everyone behind the
        # same NAT/office network) -- the releases page redirect isn't rate-limited.
        Write-Info 'Fetching latest release...'
        $finalUrl = Get-EffectiveUrl "$ReleasesBaseUrl/releases/latest"
        if ($finalUrl -match '/tag/([^/]+)$') { $Tag = $Matches[1] }
        if (-not $Tag) { Write-ErrorAndExit "Could not resolve latest release for $Repo." }
        Write-Info "Latest version: $Tag"
    }

    # -- resolve release metadata + manifest ----------------------------------
    $Release = $null
    if ($Token) {
        Write-Info 'Resolving release...'
        $releaseResp = Invoke-GhRequest -Uri "$ReleasesBaseUrl/releases/tags/$Tag"
        $Release = $releaseResp.Content | ConvertFrom-Json

        $manifestAsset = $Release.assets | Where-Object { $_.name -eq 'manifest.json' }
        if (-not $manifestAsset) { Write-ErrorAndExit "manifest.json not found in release $Tag. Check the tag name and repo." }

        Invoke-GhRequest -Uri "$ReleasesBaseUrl/releases/assets/$($manifestAsset.id)" -Accept 'application/octet-stream' -OutFile $ManifestPath | Out-Null
    } else {
        Write-Info 'Resolving asset from manifest...'
        try {
            Invoke-WebRequest -Uri "$ReleasesBaseUrl/releases/download/$Tag/manifest.json" -UseBasicParsing -OutFile $ManifestPath -ErrorAction Stop
        } catch {
            Write-ErrorAndExit "Could not download manifest for release $Tag."
        }
    }

    $Manifest = Get-Content -Path $ManifestPath -Raw | ConvertFrom-Json
    $Artifact = $Manifest.artifacts | Where-Object { $_.os -eq 'windows' -and $_.arch -eq $PlatformArch }
    if (-not $Artifact) { Write-ErrorAndExit "Platform windows/$PlatformArch not found in release manifest for $Tag." }
    if (-not $Artifact.sha256) { Write-ErrorAndExit "No SHA256 checksum in release manifest for windows/$PlatformArch; refusing to install an unverified binary." }

    # -- backup current installation ------------------------------------------
    # Snapshot whatever's currently installed before touching anything, so a
    # failed/corrupt download leaves the user with a working app instead of a
    # half-installed one. Restored on any download/checksum failure below;
    # discarded once the new artifact is verified good.
    if (Test-Path $ExePath) {
        Write-Info 'Backing up current installation...'
        Copy-Item -Path $ExePath -Destination $BackupPath -Force
        $HaveBackup = $true
    }

    # -- download ---------------------------------------------------------------
    Write-Info "Downloading $($Artifact.filename)..."
    $ArtifactPath = Join-Path $TmpDir $Artifact.filename
    $DownloadOk = $true
    try {
        if ($Token) {
            $binAsset = $Release.assets | Where-Object { $_.name -eq $Artifact.filename }
            if (-not $binAsset) { throw "Asset '$($Artifact.filename)' not found in release $Tag." }
            Invoke-GhRequest -Uri "$ReleasesBaseUrl/releases/assets/$($binAsset.id)" -Accept 'application/octet-stream' -OutFile $ArtifactPath | Out-Null
        } else {
            Invoke-WebRequest -Uri "$ReleasesBaseUrl/releases/download/$Tag/$($Artifact.filename)" -UseBasicParsing -OutFile $ArtifactPath -ErrorAction Stop
        }
    } catch {
        $DownloadOk = $false
    }
    if (-not $DownloadOk) {
        Restore-Backup
        Write-ErrorAndExit "Could not download $($Artifact.filename) for release $Tag. Check the tag name and repo."
    }

    # -- verify checksum ----------------------------------------------------------
    Write-Info 'Verifying checksum...'
    $ActualSha256 = (Get-FileHash -Algorithm SHA256 -Path $ArtifactPath).Hash.ToLowerInvariant()
    $ExpectedSha256 = $Artifact.sha256.ToLowerInvariant()
    if ($ExpectedSha256 -ne $ActualSha256) {
        Restore-Backup
        Write-ErrorAndExit "Checksum mismatch for $($Artifact.filename): expected $ExpectedSha256, got $ActualSha256"
    }
    Write-Success 'Checksum verified'

    if ($HaveBackup -and (Test-Path $BackupPath)) { Remove-Item -Path $BackupPath -Force -ErrorAction SilentlyContinue }

    # -- install binary -----------------------------------------------------------
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Write-Info "Installing to $ExePath..."

    # Stage then rename into place, same rationale as install.sh: avoids
    # writing a truncated binary directly over the destination if the copy is
    # interrupted. Unlike Linux/macOS, Windows can't replace a running exe's
    # inode out from under it at all -- Move-Item fails outright if Galacius
    # is currently running, which the catch below surfaces clearly.
    $Staged = Join-Path $InstallDir ".$BinName.new"
    Copy-Item -Path $ArtifactPath -Destination $Staged -Force
    try {
        Move-Item -Path $Staged -Destination $ExePath -Force -ErrorAction Stop
    } catch {
        Remove-Item -Path $Staged -Force -ErrorAction SilentlyContinue
        Restore-Backup
        Write-ErrorAndExit "Could not install to $ExePath -- is Galacius currently running? Close it and re-run this script. ($($_.Exception.Message))"
    }

    # -- PATH ------------------------------------------------------------------
    $UserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if (-not $UserPath -or ($UserPath -split ';' -notcontains $InstallDir)) {
        Write-Info "Adding $InstallDir to your user PATH..."
        $NewPath = if ($UserPath) { "$UserPath;$InstallDir" } else { $InstallDir }
        [Environment]::SetEnvironmentVariable('Path', $NewPath, 'User')
        $env:Path = "$env:Path;$InstallDir"
        Write-Warn "PATH updated -- open a new terminal for the 'galacius' command to be available there."
    }

    # -- Start Menu shortcut -----------------------------------------------------
    try {
        $StartMenuDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
        $Shell = New-Object -ComObject WScript.Shell
        $Shortcut = $Shell.CreateShortcut((Join-Path $StartMenuDir 'Galacius.lnk'))
        $Shortcut.TargetPath = $ExePath
        $Shortcut.WorkingDirectory = $InstallDir
        $Shortcut.Save()
    } catch {
        Write-Warn "Could not create Start Menu shortcut: $($_.Exception.Message)"
    }

    Write-Success "Galacius $Tag installed to $ExePath"
    Write-Host '  Run from a new terminal: galacius'
    Write-Host '  Or find it in the Start Menu'
} catch {
    Write-Host "x $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    if (Test-Path $TmpDir) { Remove-Item -Path $TmpDir -Recurse -Force -ErrorAction SilentlyContinue }
}
