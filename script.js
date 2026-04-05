let tasks = JSON.parse(localStorage.getItem("task")) || [];
let activeFilter = "all";
let activeSort = "create-desc";
let searchText = "";
let deleteId = null;

const taskModal = new bootstrap.Modal("#taskModal");
const deleteModal = new bootstrap.Modal("#deleteModal");

//Date Helpers

class DateHelper {
  static getDate(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toDateString().slice(0, 10);
  }

  static weekEnd() {
    const d = new Date();
    const diff = d.getDay() == 0 ? 6 : 7 - d.getDay();
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }

  static format(date, time) {
    if (!date) return "";
    let label;
    if (date === DateHelper.getDate()) {
      label = "Today";
    } else if (date === DateHelper.getDate(1)) {
      label = "Tomorrow";
    } else {
      label = new Date(date + "T00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "number",
        year: "numeric",
      });
    }
    if (time) {
      const [h, m] = time.split(":");
      const d = new Date();
      d.setHours(+h, +m);
      label +=
        "," +
        d.toLocaleDateString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
    }
    return label;
  }
}

//Toast
class Toast {
  static show(msg) {
    const toast = document.createElement("div");
    toast.className = "toast-msg";
    toast.textContent = msg;
    document.querySelector("#toast-wrap").appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
  }
}
//Task Store
class TaskStore {
  constructor() {
    this.tasks = JSON.parse(localStorage.getItem("task")) || [];
  }

  save() {
    localStorage.setItem("task", JSON.stringify(this.tasks));
  }

  makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  getAll() {
    return this.tasks;
  }

  findById(id) {
    return this.tasks.find((t) => t.id === id);
  }

  findIndexById(id) {
    return this.tasks.findIndex((t) => t.id === id);
  }

  add(data) {
    const task = {
      id: this.makeId(),
      ...data,
      completed: false,
      createdAt: Date.now(),
    };
    this.tasks.unshift(task);
    this.save();
    return task;
  }

  update(id, data) {
    const i = this.findIndexById(id);
    if (i === -1) return null;
    this.tasks[i] = { ...this.tasks[i], ...data };
    this.save();
    return this.tasks[i];
  }

  remove(id) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.save();
  }

  duplicate(id) {
    const orig = this.findById(id);
    const idx = this.findIndexById(id);
    if (!orig) return null;
    const copy = {
      ...orig,
      id: this.makeId(),
      title: orig.title + " (Copy)",
      completed: false,
      createdAt: Date.now(),
    };
    this.tasks.splice(idx + 1, 0, copy);
    this.save();
    return copy;
  }

  toggle(id) {  //complete/undo task
    const task = this.findById(id);
    if (!task) return null;
    task.completed = !task.completed;
    this.save();
    return task;
  }
}

//Overdue check
class OverdueChecker {
  static isOverdue(task) {
    if (!task.dueDate || task.completed) return false;
    if (!task.dueTime) return task.dueDate < DateHelper.today();
    return new Date(task.dueDate + "T" + task.dueTime) < new Date();
  }
}

//TaskFilter
class TaskFilter {
  constructor() {
    this.activeFilter = "all";
    this.searchText = "";
  }

  setFilter(filter) {
    this.activeFilter = filter;
  }

  setSearch(text) {
    this.searchText = text;
  }

  matches(task) {
    const t = DateHelper.today();
    const tom = DateHelper.tomorrow();
    const wk = DateHelper.weekEnd();

    let passesFilter = true;
    if (this.activeFilter === "today") passesFilter = task.dueDate === t;
    else if (this.activeFilter === "incomplete") passesFilter = !task.completed;
    else if (this.activeFilter === "completed") passesFilter = task.completed;
    else if (this.activeFilter === "tomorrow")
      passesFilter = task.dueDate === tom;
    else if (this.activeFilter === "thisweek")
      passesFilter = task.dueDate >= t && task.dueDate <= wk;
    else if (this.activeFilter === "overdue")
      passesFilter = OverdueChecker.isOverdue(task);

    const passesSearch =
      !this.searchText || task.title.toLowerCase().includes(this.searchText.toLowerCase());
    return passesFilter && passesSearch;
  }

  getTitle() {
    const titles = {
      all: "All Tasks",
      today: "My Day",
      incomplete: "Incomplete",
      completed: "Completed",
      tomorrow: "Tomorrow",
      thisweek: "This Week",
      overdue: "Overdue",
    };
    return titles[this.activeFilter] || "All Tasks";
  }
}

//TaskSorter
class TaskSorter {
  constructor() {
    this.activeSort = "created-desc";
  }

  setSort(sort) {
    this.activeSort = sort;
  }

  sort(list) {
    const copy = [...list];
    if (this.activeSort === "created-asc")
      return copy.sort((a, b) => a.createdAt - b.createdAt);
    if (this.activeSort === "created-desc")
      return copy.sort((a, b) => b.createdAt - a.createdAt);
    if (this.activeSort === "status")
      return copy.sort((a, b) => Number(a.completed) - Number(b.completed));
    if (this.activeSort === "due-asc" || this.activeSort === "due-desc") {
      return copy.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        const da = a.dueDate + (a.dueTime || "00:00");
        const db = b.dueDate + (b.dueTime || "00:00");
        return this.activeSort === "due-asc"
          ? da < db
            ? -1
            : 1
          : da > db
            ? -1
            : 1;
      });
    }
    return copy;
  }
}

//CounterUpdater
class CounterUpdater {
  update(tasks) {
    const t = DateHelper.today();
    const tom = DateHelper.tomorrow();
    const wk = DateHelper.weekEnd();

    document.querySelector("#count-all").textContent = tasks.length || "";
    document.querySelector("#count-today").textContent =
      tasks.filter((x) => x.dueDate === t).length || "";
    document.querySelector("#count-incomplete").textContent =
      tasks.filter((x) => !x.completed).length || "";
    document.querySelector("#count-completed").textContent =
      tasks.filter((x) => x.completed).length || "";
    document.querySelector("#count-tomorrow").textContent =
      tasks.filter((x) => x.dueDate === tom).length || "";
    document.querySelector("#count-thisweek").textContent =
      tasks.filter((x) => x.dueDate >= t && x.dueDate <= wk).length || "";
    document.querySelector("#count-overdue").textContent =
      tasks.filter((x) => OverdueChecker.isOverdue(x)).length || "";

    const overdueCount = tasks.filter((x) =>
      OverdueChecker.isOverdue(x),
    ).length;
    const pill = document.querySelector("#overdue-pill");
    pill.style.display = overdueCount > 0 ? "inline-flex" : "none";
    document.querySelector("#chip-overdue-count").textContent = overdueCount;
  }
}
 
// Taskrender
class TaskRenderer {
  constructor(store, filter, sorter, counter) {
    this.store = store;
    this.filter = filter;
    this.sorter = sorter;
    this.counter = counter;
  }

  render() {
    const tasks = this.store.getAll();
    this.counter.update(tasks);

    document.querySelector("#page-title").textContent = this.filter.getTitle();

    const list = this.sorter.sort(tasks.filter((t) => this.filter.matches(t)));

    const container = document.querySelector("#task-list");
    container.innerHTML = "";

    const emptyState = document.querySelector("#empty-state");
    if (list.length === 0) {
      emptyState.style.display = "block";
      return;
    }
    emptyState.style.display = "none";

    const template = document.querySelector("#task-template");

    list.forEach((task) => {
      const overdue = OverdueChecker.isOverdue(task);
      const dueLabel = DateHelper.format(task.dueDate, task.dueTime);

      const chipClass = task.completed
        ? "chip-done"
        : overdue
          ? "chip-overdue"
          : task.dueDate === DateHelper.today()
            ? "chip-today"
            : "chip-due";

      const clone = template.content.cloneNode(true);
      const item = clone.querySelector(".task-item");

      item.classList.toggle("is-completed", task.completed);
      item.dataset.id = task.id;

      item.querySelector(".task-check").checked = task.completed;
      item.querySelector(".task-title-text").textContent = task.title;

      const descEl = item.querySelector(".task-desc-text");
      if (task.description) {
        descEl.textContent = task.description;
        descEl.style.display = "";
      }

      const dueChip = item.querySelector(".due-chip");
      if (dueLabel) {
        dueChip.className = `chip ${chipClass} due-chip`;
        dueChip.querySelector(".due-label").textContent = dueLabel;
        dueChip.style.display = "";
      }

      if (task.completed) {
        item.querySelector(".done-chip").style.display = "";
      }

      // Events — bound here, trigger app-level actions via callbacks
      item.querySelector(".task-check").addEventListener("change", function () {
        const updated = app.store.toggle(task.id);
        app.renderer.render();
        Toast.show(updated.completed ? "Task completed" : "Marked incomplete");
      });

      item
        .querySelector(".edit")
        .addEventListener("click", () => app.taskModal.openEdit(task.id));
      item.querySelector(".dupe").addEventListener("click", () => {
        app.store.duplicate(task.id);
        app.renderer.render();
        Toast.show("Task duplicated");
      });
      item
        .querySelector(".del")
        .addEventListener("click", () => app.deleteModal.prompt(task.id));

      container.appendChild(item);
    });
  }
}