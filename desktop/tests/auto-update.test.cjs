'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const program=fs.readFileSync(path.join(root,'src','FoamLensDesktop','Program.cs'),'utf8');
const updater=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v19-auto-update.js'),'utf8');
const workflow=fs.readFileSync(path.join(root,'..','.github','workflows','build-foamlens-desktop.yml'),'utf8');

assert(program.includes('https://api.github.com/repos/realmichelduarte/FoamLens/releases/latest'),
  'Desktop updater must query the official FoamLens latest-release endpoint.');
assert(program.includes('_ = CheckForUpdatesAsync(userInitiated: false);'),
  'Desktop must perform a non-blocking automatic update check on normal startup.');
assert(program.includes('case "checkForUpdates"'),
  'Native bridge must expose a manual update-check request.');
assert(program.includes('SHA256.HashDataAsync(installerStream)'),
  'Installer must be verified with SHA-256 before launch.');
assert(program.includes('installer SHA-256 does not match'),
  'Checksum mismatch must fail closed.');
assert(program.includes('Interlocked.Exchange(ref _updateCheckInProgress, 1)'),
  'Updater must suppress overlapping automatic/manual checks.');
assert(program.includes('Arguments = "/SP-"'),
  'Verified installer handoff must preserve the existing installation context.');
assert(program.includes('BeginInvoke(new Action(Close))'),
  'FoamLens must close after handing off to the verified installer.');

assert(updater.includes("flRaCheckUpdates"),'Ribbon update action is missing.');
assert(updater.includes("window.chrome.webview.postMessage({type:'checkForUpdates'})"),
  'Ribbon update action is not connected to the native updater.');
assert(updater.includes('FoamLensAutoUpdate'),
  'Updater frontend API is missing.');

assert(workflow.includes('FoamLens-Setup-v$v.exe.sha256'),
  'CI must create and publish an installer checksum.');
assert((workflow.match(/node desktop\/tests\/auto-update\.test\.cjs/g)||[]).length===1,
  'Auto-update regression must run exactly once in CI.');

assert(!workflow.includes("github.ref == 'refs/heads/main'"),
  'Main pushes must validate without implicitly publishing a GitHub Release.');
assert(workflow.includes("github.event_name == 'workflow_dispatch' && inputs.publish == true"),
  'Manual GitHub Release publication must require workflow_dispatch with publish=true.');
assert(workflow.includes("startsWith(github.ref, 'refs/tags/')"),
  'Tagged builds must retain the explicit release-publication path.');

console.log('Automatic update path passed: release discovery, manual check, SHA-256 verification and installer handoff are wired.');
