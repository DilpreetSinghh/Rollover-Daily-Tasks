# Rollover Daily Tasks

An Obsidian plugin that intelligently rolls over uncompleted tasks from your previous daily note to today’s — with **time-prefix filtering**, **chronological sorting**, and **omit patterns** for template boilerplate.

---

## Features

### ✅ Rollover uncompleted tasks
Only tasks marked `- [ ]` (uncompleted) are rolled over. Completed tasks (`- [x]`) stay in the past note.

### ⏱️ Filter: timed tasks only
Enable **“Only rollover timed tasks”** to restrict rollover to tasks that have a time prefix. Supported formats:

| Format | Example |
|---|---|
| `HHmm-HHmm` | `0100-0130 Task name` |
| `HH:mm-HH:mm` | `01:00-01:30 Task name` |
| `HHmm - HHmm` | `0100 - 0130 Task name` |
| `HH:mm - HH:mm` | `01:00 - 01:30 Task name` |

### 🔢 Sort by time
Tasks are automatically sorted in ascending chronological order after rollover:

**Before:**
```
- [ ] 0100-0130 Task 1
- [ ] 0500-0600 Task 3
- [ ] 0200-0300 Task 2
```

**After rollover (sorted):**
```
- [ ] 0100-0130 Task 1
- [ ] 0200-0300 Task 2
- [ ] 0500-0600 Task 3
```

### 🚫 Omit patterns (template task exclusion)
Add regex patterns to exclude template boilerplate tasks from being rolled over.

**Example patterns:**
```
Morning Routine
Daily Review
^- \[ \] Water plants
```

Any task matching one of these patterns will **not** be rolled over, even if uncompleted.

### 🗑️ Delete on rollover
Optionally remove the rolled-over tasks from the previous day’s note after transfer.

### 🚀 Auto-rollover on startup
Enable rollover to happen automatically when Obsidian opens.

---

## Installation

### Manual installation
1. Download `main.js` and `manifest.json` from the [latest release](../../releases/latest).
2. Create a folder: `<vault>/.obsidian/plugins/rollover-daily-tasks/`
3. Copy both files into the folder.
4. Enable the plugin in **Settings → Community Plugins**.

### Building from source
```bash
git clone https://github.com/DilpreetSinghh/Rollover-Daily-Tasks
cd Rollover-Daily-Tasks
npm install
npm run build
```

---

## Usage

1. Open the command palette (`Ctrl/Cmd + P`)
2. Run: **Rollover Daily Tasks: Rollover uncompleted tasks to today**

Or enable **“Rollover on startup”** in settings.

---

## Settings

| Setting | Description |
|---|---|
| Rollover on startup | Auto-run when Obsidian opens |
| Only rollover timed tasks | Filter to tasks with time prefix only |
| Sort tasks by time | Sort rolled-over tasks chronologically |
| Delete after rollover | Remove tasks from previous note |
| Omit patterns | Regex list; matching tasks are excluded |

---

## Compatibility

- Works with **core Daily Notes** and **Periodic Notes** plugin.
- Requires Obsidian v1.0.0+.

---

## License

MIT © [DilpreetSinghh](https://github.com/DilpreetSinghh)
