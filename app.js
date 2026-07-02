const todayKey = () => new Date().toISOString().slice(0, 10);

const STORAGE_KEY = "squatTrackerData";

const defaultData = {
  goals: {
    daily: 50,
    weekly: 350,
    monthly: 1500
  },
  days: {}
};

const quickAdds = [5, 10, 15, 20, 25, 50];

const exerciseOptions = [
  "Planks",
  "Glute bridges",
  "Deadlifts",
  "Lunges",
  "Push-ups",
  "Resistance bands",
  "Dumbbells",
  "Core work",
  "Other"
];

let data = loadData();

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : structuredClone(defaultData);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getDay(date = todayKey()) {
  if (!data.days[date]) {
    data.days[date] = {
      squats: [],
      otherStrength: false,
      exercises: [],
      notes: ""
    };
  }
  return data.days[date];
}

function totalForDay(date) {
  return (data.days[date]?.squats || []).reduce((a, b) => a + b, 0);
}

function addSquats(count) {
  getDay().squats.push(count);
  saveData();
  render();
}

function undoLastEntry() {
  const day = getDay();
  day.squats.pop();
  saveData();
  render();
}

function formatDate(dateKey) {
  return new Date(dateKey + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function getRecentDates(daysBack) {
  const dates = [];
  const now = new Date();

  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  return dates;
}

function sumForDates(dates) {
  return dates.reduce((sum, date) => sum + totalForDay(date), 0);
}

function calculateStreak() {
  let streak = 0;
  const d = new Date();

  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (totalForDay(key) > 0) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function getBestDay() {
  const totals = Object.keys(data.days).map(totalForDay);
  return totals.length ? Math.max(...totals) : 0;
}

function renderQuickButtons() {
  const container = document.getElementById("quickButtons");
  container.innerHTML = "";

  quickAdds.forEach(num => {
    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = `+${num}`;
    btn.onclick = () => addSquats(num);
    container.appendChild(btn);
  });
}

function renderCustomPicker() {
  const select = document.getElementById("customSelect");
  select.innerHTML = "";

  for (let i = 1; i <= 100; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${i} squats`;
    select.appendChild(option);
  }
}

function renderExerciseChips() {
  const container = document.getElementById("exerciseChips");
  const day = getDay();
  container.innerHTML = "";

  exerciseOptions.forEach(exercise => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = exercise;

    if (day.exercises.includes(exercise)) {
      chip.classList.add("selected");
    }

    chip.onclick = () => {
      if (day.exercises.includes(exercise)) {
        day.exercises = day.exercises.filter(item => item !== exercise);
      } else {
        day.exercises.push(exercise);
      }

      day.otherStrength = day.exercises.length > 0 || day.notes.trim().length > 0;
      saveData();
      render();
    };

    container.appendChild(chip);
  });
}

function renderOtherStrength() {
  const day = getDay();

  const yesBtn = document.getElementById("otherYesBtn");
  const noBtn = document.getElementById("otherNoBtn");
  const details = document.getElementById("otherExerciseDetails");
  const notes = document.getElementById("exerciseNotes");
  const summary = document.getElementById("otherExerciseSummary");

  yesBtn.classList.toggle("active", day.otherStrength);
  noBtn.classList.toggle("active", !day.otherStrength);
  details.classList.toggle("hidden", !day.otherStrength);

  notes.value = day.notes || "";

  if (day.otherStrength) {
    const selected = day.exercises.length ? day.exercises.join(", ") : "No exercises selected";
    summary.textContent = `Other strength logged: ${selected}`;
  } else {
    summary.textContent = "No other strength training logged today.";
  }

  renderExerciseChips();
}

function renderStats() {
  const today = todayKey();
  const todayTotal = totalForDay(today);
  const weekDates = getRecentDates(7);
  const monthDates = getRecentDates(30);

  document.getElementById("todayDate").textContent = formatDate(today);
  document.getElementById("todayTotal").textContent = todayTotal;

  const dailyGoal = data.goals.daily;
  const percent = Math.min((todayTotal / dailyGoal) * 100, 100);

  document.getElementById("dailyGoalLabel").textContent = `${todayTotal}/${dailyGoal}`;
  document.getElementById("dailyProgress").style.width = `${percent}%`;

  document.getElementById("streak").textContent = calculateStreak();
  document.getElementById("weekTotal").textContent = sumForDates(weekDates);
  document.getElementById("monthTotal").textContent = sumForDates(monthDates);
  document.getElementById("bestDay").textContent = getBestDay();

  document.getElementById("dailyGoalInput").value = data.goals.daily;
  document.getElementById("weeklyGoalInput").value = data.goals.weekly;
  document.getElementById("monthlyGoalInput").value = data.goals.monthly;
}

function renderChart() {
  const chart = document.getElementById("dailyChart");
  const dates = getRecentDates(14);
  const max = Math.max(...dates.map(totalForDay), data.goals.daily, 1);

  chart.innerHTML = "";

  dates.forEach(date => {
    const total = totalForDay(date);
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.style.height = `${Math.max((total / max) * 100, 3)}%`;
    bar.title = `${formatDate(date)}: ${total}`;
    chart.appendChild(bar);
  });
}

function renderHistory() {
  const list = document.getElementById("historyList");

  const dates = Object.keys(data.days)
    .filter(date => {
      const day = data.days[date];
      return totalForDay(date) > 0 || day.otherStrength || day.notes;
    })
    .sort()
    .reverse();

  list.innerHTML = "";

  if (dates.length === 0) {
    list.innerHTML = `<p class="muted">No history yet. Your logged days will appear here.</p>`;
    return;
  }

  dates.forEach(date => {
    const day = data.days[date];
    const total = totalForDay(date);

    const item = document.createElement("div");
    item.className = "history-item";

    const exercises = day?.otherStrength
      ? `Other strength: ${day.exercises?.join(", ") || "Yes"}`
      : "Other strength: No";

    item.innerHTML = `
      <div class="history-date">${formatDate(date)}</div>
      <div class="history-details">${total} squats</div>
      <div class="history-details">${exercises}</div>
      ${day?.notes ? `<div class="history-details">Notes: ${day.notes}</div>` : ""}
    `;

    list.appendChild(item);
  });
}

function render() {
  renderStats();
  renderOtherStrength();
  renderChart();
  renderHistory();
}

function setupEvents() {
  document.getElementById("customBtn").onclick = () => {
    document.getElementById("customDialog").showModal();
  };

  document.getElementById("cancelCustomBtn").onclick = () => {
    document.getElementById("customDialog").close();
  };

  document.getElementById("addCustomBtn").onclick = () => {
    const value = Number(document.getElementById("customSelect").value);
    addSquats(value);
    document.getElementById("customDialog").close();
  };

  document.getElementById("repeatBtn").onclick = () => {
    const day = getDay();
    const last = day.squats[day.squats.length - 1];
    if (last) addSquats(last);
  };

  document.getElementById("undoBtn").onclick = undoLastEntry;

  document.getElementById("otherYesBtn").onclick = () => {
    const day = getDay();
    day.otherStrength = true;
    saveData();
    render();
  };

  document.getElementById("otherNoBtn").onclick = () => {
    const day = getDay();
    day.otherStrength = false;
    day.exercises = [];
    day.notes = "";
    saveData();
    render();
  };

  document.getElementById("saveExercisesBtn").onclick = () => {
    const day = getDay();
    day.notes = document.getElementById("exerciseNotes").value;
    day.otherStrength = true;
    saveData();
    render();
  };

  document.getElementById("exerciseNotes").oninput = e => {
    const day = getDay();
    day.notes = e.target.value;
    day.otherStrength = true;
    saveData();
  };

  document.getElementById("saveGoalsBtn").onclick = () => {
    data.goals.daily = Number(document.getElementById("dailyGoalInput").value) || 50;
    data.goals.weekly = Number(document.getElementById("weeklyGoalInput").value) || 350;
    data.goals.monthly = Number(document.getElementById("monthlyGoalInput").value) || 1500;
    saveData();
    render();
  };
}

renderQuickButtons();
renderCustomPicker();
setupEvents();
render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
