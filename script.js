// ------------------------------
// STATE
// ------------------------------
const state = {
  currentDate: new Date(),
  selectedDate: new Date(),
  view: "month",
  meals: JSON.parse(localStorage.getItem("meals") || "{}"),
  shoppingList: JSON.parse(localStorage.getItem("shoppingList") || "[]")
};

// ------------------------------
// ELEMENTS
// ------------------------------
const calendarGrid = document.getElementById("calendarGrid");
const currentLabel = document.getElementById("currentLabel");
const selectedDateDisplay = document.getElementById("selectedDateDisplay");
const mealTitleInput = document.getElementById("mealTitle");
const mealNotesInput = document.getElementById("mealNotes");
const mealImageInput = document.getElementById("mealImage");
const mealIngredientsInput = document.getElementById("mealIngredients");
const todayMealsContainer = document.getElementById("todayMeals");
const shoppingListContainer = document.getElementById("shoppingList");

const modal = document.getElementById("mealModal");
const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");
const modalNotes = document.getElementById("modalNotes");
const modalImage = document.getElementById("modalImage");
const modalImageWrapper = document.getElementById("modalImageWrapper");
const modalIngredientsList = document.getElementById("modalIngredientsList");

const panelToggle = document.getElementById("panelToggle");

// ------------------------------
// PANEL TOGGLE
// ------------------------------
panelToggle.addEventListener("click", () => {
  const body = document.body;
  const collapsed = body.classList.toggle("panel-collapsed");

  if (collapsed) {
    body.classList.remove("panel-open");
  } else {
    body.classList.add("panel-open");
  }
});

function openPanel() {
  document.body.classList.remove("panel-collapsed");
  document.body.classList.add("panel-open");
}

// ------------------------------
// HELPERS
// ------------------------------
function setSelectedDate(date) {
  state.selectedDate = new Date(date);
  selectedDateDisplay.value = state.selectedDate.toDateString();
}

function setSelectedMealType(type) {
  document.querySelectorAll(".pill-option").forEach(b => b.classList.remove("active"));
  const btn = document.querySelector(`.pill-option[data-meal-type="${type}"]`);
  if (btn) btn.classList.add("active");
}

function getMealKey(date) {
  return date.toISOString().split("T")[0];
}

function saveToStorage() {
  localStorage.setItem("meals", JSON.stringify(state.meals));
  localStorage.setItem("shoppingList", JSON.stringify(state.shoppingList));
}

function parseIngredients(text) {
  return text
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

function findShoppingItemIndexByName(name) {
  return state.shoppingList.findIndex(item => item.name.toLowerCase() === name.toLowerCase());
}

function rebuildShoppingListFromMeals(preserveChecked = true) {
  const used = new Map(); // name -> {checked, firstIndex}
  state.shoppingList.forEach((item, index) => {
    if (!used.has(item.name)) {
      used.set(item.name, { checked: item.checked, firstIndex: index });
    }
  });

  const namesInOrder = [];
  Object.values(state.meals).forEach(dayMeals => {
    Object.values(dayMeals).forEach(meal => {
      if (meal && Array.isArray(meal.ingredients)) {
        meal.ingredients.forEach(name => {
          if (!namesInOrder.includes(name)) {
            namesInOrder.push(name);
          }
        });
      }
    });
  });

  const newList = [];
  namesInOrder.forEach(name => {
    const existing = used.get(name);
    newList.push({
      id: existing ? `${name}-${existing.firstIndex}` : `${name}-${Date.now()}-${Math.random()}`,
      name,
      checked: preserveChecked && existing ? existing.checked : false
    });
  });

  state.shoppingList = newList;
  saveToStorage();
}

// ------------------------------
// MEAL TYPE TOGGLE (Simple)
// ------------------------------
document.querySelectorAll(".pill-option").forEach(btn => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.mealType;
    setSelectedMealType(type);
  });
});

// ------------------------------
// SAVE / CLEAR MEALS
// ------------------------------
document.getElementById("mealForm").addEventListener("submit", e => {
  e.preventDefault();
  saveMeal();
});

document.getElementById("clearMealBtn").addEventListener("click", () => {
  clearMeal();
});

function saveMeal() {
  const key = getMealKey(state.selectedDate);
  const type = document.querySelector(".pill-option.active").dataset.mealType;

  if (!state.meals[key]) state.meals[key] = {};

  const ingredients = parseIngredients(mealIngredientsInput.value);

  state.meals[key][type] = {
    title: mealTitleInput.value,
    notes: mealNotesInput.value,
    image: mealImageInput.value,
    ingredients
  };

  ingredients.forEach(name => {
    if (findShoppingItemIndexByName(name) === -1) {
      state.shoppingList.push({
        id: `${name}-${Date.now()}-${Math.random()}`,
        name,
        checked: false
      });
    }
  });

  rebuildShoppingListFromMeals(true);
  saveToStorage();
  render();
}

function clearMeal() {
  const key = getMealKey(state.selectedDate);
  const type = document.querySelector(".pill-option.active").dataset.mealType;

  if (state.meals[key] && state.meals[key][type]) {
    delete state.meals[key][type];
  }

  mealTitleInput.value = "";
  mealNotesInput.value = "";
  mealImageInput.value = "";
  mealIngredientsInput.value = "";

  rebuildShoppingListFromMeals(true);
  saveToStorage();
  render();
}

// ------------------------------
// MODAL
// ------------------------------
document.getElementById("closeModalBtn").addEventListener("click", () => {
  modal.classList.add("hidden");
});

document.getElementById("editInFormBtn").addEventListener("click", () => {
  modal.classList.add("hidden");
  openPanel();
  mealTitleInput.focus();
});

document.getElementById("deleteMealBtn").addEventListener("click", () => {
  const key = getMealKey(state.selectedDate);
  const type = document.querySelector(".pill-option.active").dataset.mealType;

  if (state.meals[key] && state.meals[key][type]) {
    delete state.meals[key][type];
  }

  rebuildShoppingListFromMeals(true);
  saveToStorage();
  modal.classList.add("hidden");
  render();
});

function renderModalIngredients(meal) {
  modalIngredientsList.innerHTML = "";

  if (!meal.ingredients || meal.ingredients.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "No ingredients listed.";
    empty.style.fontSize = "12px";
    empty.style.color = "#777";
    modalIngredientsList.appendChild(empty);
    return;
  }

  meal.ingredients.forEach(name => {
    const row = document.createElement("label");
    row.className = "modal-ingredient-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    const idx = findShoppingItemIndexByName(name);
    if (idx !== -1) {
      checkbox.checked = state.shoppingList[idx].checked;
    }

    checkbox.addEventListener("change", () => {
      const index = findShoppingItemIndexByName(name);
      if (index !== -1) {
        state.shoppingList[index].checked = checkbox.checked;
        saveToStorage();
        renderShoppingList();
      }
    });

    const span = document.createElement("span");
    span.textContent = name;

    row.appendChild(checkbox);
    row.appendChild(span);
    modalIngredientsList.appendChild(row);
  });
}

function openMealModal(date, type, meal) {
  modalTitle.textContent = meal.title;
  modalSubtitle.textContent = `${type.toUpperCase()} • ${date.toDateString()}`;
  modalNotes.textContent = meal.notes || "";

  if (meal.image) {
    modalImage.src = meal.image;
    modalImageWrapper.style.display = "block";
  } else {
    modalImageWrapper.style.display = "none";
  }

  setSelectedDate(date);
  setSelectedMealType(type);
  mealTitleInput.value = meal.title || "";
  mealNotesInput.value = meal.notes || "";
  mealImageInput.value = meal.image || "";
  mealIngredientsInput.value = (meal.ingredients || []).join(", ");

  renderModalIngredients(meal);
  modal.classList.remove("hidden");
}

// ------------------------------
// VIEW SWITCHING
// ------------------------------
document.querySelectorAll(".view-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    state.view = btn.dataset.view;
    render();
  });
});

// ------------------------------
// NAVIGATION
// ------------------------------
document.getElementById("prevBtn").addEventListener("click", () => {
  if (state.view === "month") {
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
  } else {
    state.selectedDate.setDate(state.selectedDate.getDate() - 7);
  }
  render();
});

document.getElementById("nextBtn").addEventListener("click", () => {
  if (state.view === "month") {
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
  } else {
    state.selectedDate.setDate(state.selectedDate.getDate() + 7);
  }
  render();
});

document.getElementById("todayBtn").addEventListener("click", () => {
  const now = new Date();
  state.currentDate = new Date(now);
  state.selectedDate = new Date(now);
  render();
});

// ------------------------------
// RENDER CONTROLLER
// ------------------------------
function render() {
  document.body.classList.remove("view-month", "view-week");
  document.body.classList.add(`view-${state.view}`);

  if (state.view === "month") renderMonth();
  else renderWeek();

  selectedDateDisplay.value = state.selectedDate.toDateString();
  renderTodayMeals();
  renderShoppingList();
}

// ------------------------------
// DAY CELL BUILDER
// ------------------------------
function buildDayCell(date) {
  const cell = document.createElement("div");
  cell.className = "day-cell";

  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  if (isWeekend) cell.classList.add("weekend");

  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  const header = document.createElement("div");
  header.className = "day-cell-header";

  const number = document.createElement("div");
  number.className = "day-number";
  number.textContent = date.getDate();
  if (isToday) number.classList.add("today");

  header.appendChild(number);
  cell.appendChild(header);

  const body = document.createElement("div");
  body.className = "day-cell-body";

  ["lunch", "dinner"].forEach(type => {
    const slot = document.createElement("div");
    slot.className = "meal-slot";

    const key = getMealKey(date);
    const meal = state.meals[key] ? state.meals[key][type] : null;

    if (meal) {
      slot.classList.add("has-meal");

      const img = document.createElement("div");
      img.className = "meal-image";
      img.style.backgroundImage = meal.image ? `url('${meal.image}')` : "none";
      slot.appendChild(img);

      const overlay = document.createElement("div");
      overlay.className = "meal-overlay";

      const tag = document.createElement("div");
      tag.className = `meal-type-tag ${type}`;
      tag.textContent = type;

      const title = document.createElement("div");
      title.className = "meal-title";
      title.textContent = meal.title;

      overlay.appendChild(tag);
      overlay.appendChild(title);
      slot.appendChild(overlay);

      slot.addEventListener("click", e => {
        e.stopPropagation();
        setSelectedDate(date);
        setSelectedMealType(type);
        openMealModal(date, type, meal);
      });

    } else {
      const empty = document.createElement("div");
      empty.className = "meal-empty-label";
      empty.textContent = type === "lunch" ? "Add lunch" : "Add dinner";

      slot.addEventListener("click", e => {
        e.stopPropagation();
        openPanel();
        setSelectedDate(date);
        setSelectedMealType(type);
        mealTitleInput.value = "";
        mealNotesInput.value = "";
        mealImageInput.value = "";
        mealIngredientsInput.value = "";
        mealTitleInput.focus();
      });

      slot.appendChild(empty);
    }

    body.appendChild(slot);
  });

  cell.addEventListener("click", () => {
    setSelectedDate(date);
    render();
  });

  if (date.toDateString() === state.selectedDate.toDateString()) {
    cell.classList.add("selected");
  }

  cell.appendChild(body);
  return cell;
}

// ------------------------------
// MONTH VIEW
// ------------------------------
function renderMonth() {
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();

  currentLabel.textContent = state.currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric"
  });

  calendarGrid.innerHTML = "";

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = startDay;
  const totalCells = prevMonthDays + daysInMonth;

  const rows = Math.ceil(totalCells / 7);
  const totalGridCells = rows * 7;

  let dayCounter = 1;
  let nextMonthDay = 1;

  for (let i = 0; i < totalGridCells; i++) {
    let date;
    let outside = false;

    if (i < prevMonthDays) {
      date = new Date(year, month, -(prevMonthDays - 1 - i));
      outside = true;
    } else if (dayCounter <= daysInMonth) {
      date = new Date(year, month, dayCounter++);
    } else {
      date = new Date(year, month + 1, nextMonthDay++);
      outside = true;
    }

    const cell = buildDayCell(date);
    if (outside) cell.classList.add("outside");

    calendarGrid.appendChild(cell);
  }
}

// ------------------------------
// WEEK VIEW (Monday start)
// ------------------------------
function renderWeek() {
  calendarGrid.innerHTML = "";

  const selected = new Date(state.selectedDate);
  const day = selected.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const weekStart = new Date(selected);
  weekStart.setDate(selected.getDate() + diff);

  currentLabel.textContent = `Week of ${weekStart.toDateString()}`;

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);

    const cell = buildDayCell(date);
    calendarGrid.appendChild(cell);
  }
}

// ------------------------------
// TODAY MEALS
// ------------------------------
function renderTodayMeals() {
  todayMealsContainer.innerHTML = "";
  const key = getMealKey(new Date());
  const meals = state.meals[key];

  if (!meals) return;

  Object.entries(meals).forEach(([type, meal]) => {
    const div = document.createElement("div");
    div.textContent = `${type.toUpperCase()}: ${meal.title}`;
    div.style.cursor = "pointer";

    div.addEventListener("click", () => {
      setSelectedDate(new Date());
      setSelectedMealType(type);
      openMealModal(new Date(), type, meal);
    });

    todayMealsContainer.appendChild(div);
  });
}

// ------------------------------
// SHOPPING LIST RENDER + LOGIC
// ------------------------------
let dragSourceIndex = null;

function renderShoppingList() {
  shoppingListContainer.innerHTML = "";

  if (!state.shoppingList.length) return;

  state.shoppingList.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "shopping-item";
    if (item.checked) row.classList.add("checked");
    row.draggable = true;
    row.dataset.index = index;

    row.addEventListener("dragstart", e => {
      dragSourceIndex = Number(e.currentTarget.dataset.index);
      e.dataTransfer.effectAllowed = "move";
    });

    row.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    row.addEventListener("drop", e => {
      e.preventDefault();
      const targetIndex = Number(e.currentTarget.dataset.index);
      if (dragSourceIndex === null || dragSourceIndex === targetIndex) return;

      const [moved] = state.shoppingList.splice(dragSourceIndex, 1);
      state.shoppingList.splice(targetIndex, 0, moved);
      dragSourceIndex = null;
      saveToStorage();
      renderShoppingList();
    });

    row.addEventListener("dragend", () => {
      dragSourceIndex = null;
    });

    const label = document.createElement("label");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.checked;

    checkbox.addEventListener("change", () => {
      item.checked = checkbox.checked;
      saveToStorage();
      renderShoppingList();
    });

    const nameSpan = document.createElement("span");
    nameSpan.className = "shopping-item-name";
    nameSpan.textContent = item.name;

    label.appendChild(checkbox);
    label.appendChild(nameSpan);

    const actions = document.createElement("div");
    actions.className = "shopping-actions";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-item-btn";
    deleteBtn.textContent = "✕";
    deleteBtn.addEventListener("click", () => {
      state.shoppingList.splice(index, 1);
      saveToStorage();
      renderShoppingList();
    });

    const handle = document.createElement("div");
    handle.className = "drag-handle";
    handle.textContent = "⋮⋮";

    actions.appendChild(deleteBtn);
    actions.appendChild(handle);

    row.appendChild(label);
    row.appendChild(actions);

    shoppingListContainer.appendChild(row);
  });
}

// ------------------------------
// AUTO-ADVANCE AT MIDNIGHT
// ------------------------------
let lastDateCheck = new Date().toDateString();

setInterval(() => {
  const now = new Date();
  const todayString = now.toDateString();

  if (todayString !== lastDateCheck) {
    lastDateCheck = todayString;

    const day = now.getDay();
    const date = now.getDate();

    state.selectedDate = new Date(now);
    state.currentDate = new Date(now);

    if (state.view === "week" && day === 0) {
      state.selectedDate.setDate(state.selectedDate.getDate() + 1);
    }

    if (state.view === "month" && date === 1) {
      // currentDate already set to today
    }

    render();
  }
}, 60000);

// ------------------------------
// INIT
// ------------------------------
document.body.classList.add("panel-open");
rebuildShoppingListFromMeals(true);
render();
