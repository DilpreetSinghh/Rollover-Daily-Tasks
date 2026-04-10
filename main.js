"use strict";

const obsidian = require("obsidian");

const DEFAULT_SETTINGS = {
  templateHeading: "## Tasks",
  templateOmitPatterns: [],
  filterTimedTasksOnly: false,
  sortByTime: true,
  deleteOnRollover: false,
  rolloverOnStartup: false,
  timeFormats: ["HHmm-HHmm", "HH:mm-HH:mm", "HH:mm - HH:mm", "HHmm - HHmm"],
};

const TIME_PATTERNS = [
  /^\d{4}-\d{4}/,
  /^\d{2}:\d{2}-\d{2}:\d{2}/,
  /^\d{2}:\d{2} - \d{2}:\d{2}/,
  /^\d{4} - \d{4}/,
];

function extractStartMinutes(taskText) {
  let m = taskText.match(/^(\d{2})(\d{2})[\s-]/);
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
  m = taskText.match(/^(\d{2}):(\d{2})/);
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
  return Infinity;
}

function hasTimePattern(taskText) {
  return TIME_PATTERNS.some((p) => p.test(taskText.trimStart()));
}

function parseTaskContent(line) {
  const m = line.match(/^(\s*-\s*\[[^\]]*\]\s*)(.*)/);
  return m ? m[2] : line;
}

function isUncompletedTask(line) {
  return /^\s*-\s*\[\s\]/.test(line);
}

class RolloverDailyTasksPlugin extends obsidian.Plugin {
  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: "rollover-daily-tasks",
      name: "Rollover uncompleted tasks to today",
      callback: () => this.rolloverTasks(),
    });

    this.addSettingTab(new RolloverSettingsTab(this.app, this));

    if (this.settings.rolloverOnStartup) {
      this.app.workspace.onLayoutReady(() => {
        this.rolloverTasks(true);
      });
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  getDailyNoteFile(date) {
    const dailyNotePlugin = this.app.internalPlugins?.plugins?.["daily-notes"];
    const periodicPlugin = this.app.plugins?.plugins?.["periodic-notes"];

    let format = "YYYY-MM-DD";
    let folder = "";

    if (periodicPlugin?.settings?.daily?.format) {
      format = periodicPlugin.settings.daily.format;
      folder = periodicPlugin.settings.daily.folder || "";
    } else if (dailyNotePlugin?.instance?.options) {
      format = dailyNotePlugin.instance.options.format || format;
      folder = dailyNotePlugin.instance.options.folder || folder;
    }

    const filename = date.format(format) + ".md";
    const path = folder ? `${folder}/${filename}` : filename;
    return this.app.vault.getAbstractFileByPath(path);
  }

  async rolloverTasks(silent = false) {
    const today = obsidian.moment();
    const yesterday = obsidian.moment().subtract(1, "day");

    const todayFile = this.getDailyNoteFile(today);
    const yesterdayFile = this.getDailyNoteFile(yesterday);

    if (!yesterdayFile) {
      if (!silent) new obsidian.Notice("Rollover Daily Tasks: No previous daily note found.", 4000);
      return;
    }
    if (!todayFile) {
      if (!silent) new obsidian.Notice("Rollover Daily Tasks: Today's daily note does not exist yet.", 4000);
      return;
    }

    const yesterdayContent = await this.app.vault.read(yesterdayFile);
    const todayContent = await this.app.vault.read(todayFile);

    let filteredTasks = this.extractUncompletedTasks(yesterdayContent);

    if (filteredTasks.length === 0) {
      if (!silent) new obsidian.Notice("No uncompleted tasks to roll over.", 3000);
      return;
    }

    if (this.settings.filterTimedTasksOnly) {
      filteredTasks = filteredTasks.filter((line) => hasTimePattern(parseTaskContent(line)));
    }

    if (this.settings.sortByTime) {
      filteredTasks = filteredTasks.sort((a, b) => {
        return extractStartMinutes(parseTaskContent(a)) - extractStartMinutes(parseTaskContent(b));
      });
    }

    if (filteredTasks.length === 0) {
      if (!silent) new obsidian.Notice("No matching tasks to roll over.", 3000);
      return;
    }

    const newTodayContent = todayContent.trimEnd() + "\n\n" + filteredTasks.join("\n") + "\n";
    await this.app.vault.modify(todayFile, newTodayContent);

    if (this.settings.deleteOnRollover) {
      const newYesterdayContent = this.removeTaskLines(yesterdayContent, filteredTasks);
      await this.app.vault.modify(yesterdayFile, newYesterdayContent);
    }

    if (!silent) new obsidian.Notice(`Rolled over ${filteredTasks.length} task(s) to today's note.`, 4000);
  }

  extractUncompletedTasks(content) {
    const lines = content.split("\n");
    const omitPatterns = this.settings.templateOmitPatterns
      .filter((p) => p.trim().length > 0)
      .map((p) => new RegExp(p));
    return lines.filter((line) => {
      if (!isUncompletedTask(line)) return false;
      if (omitPatterns.some((p) => p.test(line))) return false;
      return true;
    });
  }

  removeTaskLines(content, linesToRemove) {
    const lineSet = new Set(linesToRemove);
    return content.split("\n").filter((l) => !lineSet.has(l)).join("\n");
  }
}

class RolloverSettingsTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Rollover Daily Tasks" });

    new obsidian.Setting(containerEl)
      .setName("Rollover on startup")
      .setDesc("Automatically rollover tasks when Obsidian opens.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.rolloverOnStartup).onChange(async (v) => {
          this.plugin.settings.rolloverOnStartup = v;
          await this.plugin.saveSettings();
        })
      );

    new obsidian.Setting(containerEl)
      .setName("Only rollover timed tasks")
      .setDesc("If enabled, only tasks with a time prefix (e.g. 0100-0130, 09:00-10:00) will be rolled over.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.filterTimedTasksOnly).onChange(async (v) => {
          this.plugin.settings.filterTimedTasksOnly = v;
          await this.plugin.saveSettings();
        })
      );

    new obsidian.Setting(containerEl)
      .setName("Sort tasks by time")
      .setDesc("Automatically sort rolled-over tasks by their time prefix in ascending order.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.sortByTime).onChange(async (v) => {
          this.plugin.settings.sortByTime = v;
          await this.plugin.saveSettings();
        })
      );

    new obsidian.Setting(containerEl)
      .setName("Delete rolled-over tasks from previous note")
      .setDesc("Remove the tasks from yesterday's note after rolling them over.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.deleteOnRollover).onChange(async (v) => {
          this.plugin.settings.deleteOnRollover = v;
          await this.plugin.saveSettings();
        })
      );

    new obsidian.Setting(containerEl)
      .setName("Omit patterns (one per line)")
      .setDesc("Regex patterns. Tasks matching any of these will NOT be rolled over.")
      .addTextArea((ta) => {
        ta.setPlaceholder("e.g. Morning Routine\nDaily Review")
          .setValue(this.plugin.settings.templateOmitPatterns.join("\n"))
          .onChange(async (v) => {
            this.plugin.settings.templateOmitPatterns = v.split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
            await this.plugin.saveSettings();
          });
        ta.inputEl.rows = 5;
        ta.inputEl.style.width = "100%";
      });

    containerEl.createEl("h3", { text: "Supported time formats" });
    const desc = containerEl.createEl("p", { text: "Tasks starting with any of these patterns are treated as timed tasks:" });
    desc.style.color = "var(--text-muted)";
    const ul = containerEl.createEl("ul");
    ["HHmm-HHmm  (e.g. 0100-0130)", "HH:mm-HH:mm  (e.g. 01:00-01:30)", "HHmm - HHmm  (e.g. 0100 - 0130)", "HH:mm - HH:mm  (e.g. 01:00 - 01:30)"].forEach((f) => {
      ul.createEl("li", { text: f });
    });
  }
}

module.exports = RolloverDailyTasksPlugin;
