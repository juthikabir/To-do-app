//DateHelper

class DateHelper {
  static getDate(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toDateString().slice(0, 10);
  }

  static today() {
    return DateHelper.getDate(0);
  }

  static tomorrow() {
    return DateHelper.getDate(1);
  }

  static weekEnd() {
    const d = new Date();
    const diff = d.getDay() === 0 ? 6 : 7 - d.getDay();
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }

  static format(date, time) {
    if (!date) return "";
    let label;
    if (date === DateHelper.today()) {
      label = "Today";
    } else if (date === DateHelper.tomorrow()) {
      label = "Tomorrow";
    } else {
      label = new Date(date + "T00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    if (time) {
      const [h, m] = time.split(":");
      const d = new Date();
      d.setHours(+h, +m);
      label +=
        ", " +
        d.toLocaleTimeString("en-US", {
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

//TaskStore 

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

  toggle(id) {
    const task = this.findById(id);
    if (!task) return null;
    task.completed = !task.completed;
    this.save();
    return task;
  }
}

//OverdueChecker 

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
      !this.searchText ||
      task.title.toLowerCase().includes(this.searchText.toLowerCase());

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
    document.querySelector("#chip-overdue-count").textContent = overdueCount;  //shows the overdue tasks inside the UI badge
  }
}

//TaskRenderer

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
    container.innerHTML = ""; // removes all previous tasks from UI

    const emptyState = document.querySelector("#empty-state");
    if (list.length === 0) {
      emptyState.style.display = "block";
      return;
    }
    emptyState.style.display = "none";

    const template = document.querySelector("#task-template");

    list.forEach((task) => { //create UI element
      const overdue = OverdueChecker.isOverdue(task);
      const dueLabel = DateHelper.format(task.dueDate, task.dueTime); //format date string

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

      //Fill checkbox & title
      item.querySelector(".task-check").checked = task.completed;
      item.querySelector(".task-title-text").textContent = task.title;

      //Sow description
      const descEl = item.querySelector(".task-desc-text");
      if (task.description) {
        descEl.textContent = task.description;
        descEl.style.display = "";
      }

      //show due date chip
      const dueChip = item.querySelector(".due-chip");
      if (dueLabel) {
        dueChip.className = `chip ${chipClass} due-chip`;
        dueChip.querySelector(".due-label").textContent = dueLabel;
        dueChip.style.display = "";
      }

      //show done badge
      if (task.completed) {
        item.querySelector(".done-chip").style.display = "";
      }

      // checkbox toggle
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
      
      //delete button
      item.querySelector(".del").addEventListener("click", () => app.deleteModal.prompt(task.id));

      container.appendChild(item);  //add to UI
    });
  }
}

//TaskModal 

class TaskModal {
  constructor(store, renderer) {
    this.store = store;
    this.renderer = renderer;
    this.modal = new bootstrap.Modal("#taskModal");
    this._bindSave();  //setup modals and connect buttons
  }

  _bindSave() {  //this runs once when modal is created
    document
      .querySelector("#btn-save-task")
      .addEventListener("click", () => this.save());
    document.querySelector("#modal-title").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.save();
    });
  }

  //optional text for title
  openCreate(prefill = "") {
    document.querySelector("#modal-task-id").value = "";
    document.querySelector("#modal-title").value = prefill;
    document.querySelector("#modal-desc").value = "";
    document.querySelector("#modal-due-date").value = "";
    document.querySelector("#modal-due-time").value = "";
    document.querySelector("#modal-heading").textContent = "Add Task";
    document.querySelector("#title-error").style.display = "none";
    this.modal.show();
  }

  openEdit(id) {
    const task = this.store.findById(id);
    document.querySelector("#modal-task-id").value = task.id;
    document.querySelector("#modal-title").value = task.title;
    document.querySelector("#modal-desc").value = task.description || "";
    document.querySelector("#modal-due-date").value = task.dueDate || "";
    document.querySelector("#modal-due-time").value = task.dueTime || "";
    document.querySelector("#modal-heading").textContent = "Edit Task";
    document.querySelector("#title-error").style.display = "none";
    this.modal.show();
  }

  save() {
    const titleInput = document.querySelector("#modal-title");
    const title = titleInput.value.trim();

    if (!title) {
      titleInput.classList.add("field-error-state");
      document.querySelector("#title-error").style.display = "block";
      titleInput.focus();
      return;
    }

    titleInput.classList.remove("field-error-state");
    document.querySelector("#title-error").style.display = "none";

    const id = document.querySelector("#modal-task-id").value;
    const data = {
      title,
      description: document.querySelector("#modal-desc").value.trim(),
      dueDate: document.querySelector("#modal-due-date").value,
      dueTime: document.querySelector("#modal-due-time").value,
    };

    if (id) {
      this.store.update(id, data);
      Toast.show("Task updated");
    } else {
      this.store.add(data);
      Toast.show("Task added");
    }

    this.renderer.render();
    this.modal.hide();
  }
}

//DeleteModal 

class DeleteModal {
  constructor(store, renderer) {
    this.store = store;
    this.renderer = renderer;
    this.modal = new bootstrap.Modal("#deleteModal");
    this.deleteId = null;
    this._bindConfirm();
  }

  _bindConfirm() {
    document
      .querySelector("#btn-confirm-delete")
      .addEventListener("click", () => {
        if (!this.deleteId) return;
        this.store.remove(this.deleteId);
        this.deleteId = null;
        this.renderer.render();
        Toast.show("Task deleted");
        this.modal.hide();
      });
  }

  prompt(id) {
    this.deleteId = id;
    this.modal.show();
  }
}

//SidebarController 

class SidebarController {
  constructor(renderer, filter) {
    this.renderer = renderer;
    this.filter = filter;
    this._bindEvents();
  }

  _bindEvents() {
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".nav-item")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.filter.setFilter(btn.dataset.filter);
        this.renderer.render();
        if (window.innerWidth < 992) this._close();
      });
    });

    document.querySelector("#sidebar-toggle").addEventListener("click", () => {
      document.querySelector("#sidebar").classList.toggle("open");
      document.querySelector("#sidebar-backdrop").classList.toggle("open");
    });

    document
      .querySelector("#sidebar-backdrop")
      .addEventListener("click", () => this._close());
  }

  _close() {
    document.querySelector("#sidebar").classList.remove("open");
    document.querySelector("#sidebar-backdrop").classList.remove("open");
  }
}

//SearchController 

class SearchController {
  constructor(renderer, filter) {
    this.renderer = renderer;
    this.filter = filter;
    this._bindEvents();
  }

  _bindEvents() {
    document
      .querySelector("#btn-search-toggle")
      .addEventListener("click", () => {
        const wrap = document.querySelector("#search-wrap");
        const isHidden = wrap.style.display === "none";
        wrap.style.display = isHidden ? "block" : "none";
        if (isHidden) {
          document.querySelector("#search-input").focus();
        } else {
          this.filter.setSearch("");
          document.querySelector("#search-input").value = "";
          this.renderer.render();
        }
      });

    document.querySelector("#search-input").addEventListener("input", (e) => {
      this.filter.setSearch(e.target.value);
      this.renderer.render();
    });
  }
}

//SortController 

class SortController {
  constructor(renderer, sorter) {
    this.renderer = renderer;
    this.sorter = sorter;
    this._bindEvents();
  }

  _bindEvents() {
    document.querySelector("#sort-select").addEventListener("change", (e) => {
      this.sorter.setSort(e.target.value);
      this.renderer.render();
    });
  }
}

//QuickAddController 

class QuickAddController {
  constructor(taskModal) {
    this.taskModal = taskModal;
    this._bindEvents();
  }

  _bindEvents() {
    document.querySelector("#btn-open-modal").addEventListener("click", () => {
      const input = document.querySelector("#quick-add-input");
      this.taskModal.openCreate(input.value.trim());
      input.value = "";
    });

    document
      .querySelector("#quick-add-input")
      .addEventListener("keydown", function (e) {
        if (e.key === "Enter" && this.value.trim()) {
          app.taskModal.openCreate(this.value.trim());
          this.value = "";
        }
      });
  }
}

//App 

class App {
  constructor() {
    this.store = new TaskStore();
    this.filter = new TaskFilter();
    this.sorter = new TaskSorter();
    this.counter = new CounterUpdater();
    this.renderer = new TaskRenderer(
      this.store,
      this.filter,
      this.sorter,
      this.counter,
    );
    this.taskModal = new TaskModal(this.store, this.renderer);
    this.deleteModal = new DeleteModal(this.store, this.renderer);

    new SidebarController(this.renderer, this.filter);
    new SearchController(this.renderer, this.filter);
    new SortController(this.renderer, this.sorter);
    new QuickAddController(this.taskModal);

    this.renderer.render();
  }
}

//Init 

const app = new App();
