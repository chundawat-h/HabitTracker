const STORAGE_HABITS = "habits";
const STORAGE_START_DATE = "startDate";
const STORAGE_WEEKLY_TASKS = "weeklyTasks";
const STORAGE_NOTES = "notes";

let habits = JSON.parse(localStorage.getItem(STORAGE_HABITS)) || [];
let weeklyTasks = JSON.parse(localStorage.getItem(STORAGE_WEEKLY_TASKS)) || [];
let notes = localStorage.getItem(STORAGE_NOTES) || "";

const MAX_HABITS = 40;
const DAYS = 365;

let startDate = loadStartDate();

function truncateToDate(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function loadStartDate() {
    const stored = localStorage.getItem(STORAGE_START_DATE);
    if (stored) {
        const parsed = new Date(stored);
        if (!isNaN(parsed)) {
            return truncateToDate(parsed);
        }
    }

    const today = truncateToDate(new Date());
    localStorage.setItem(STORAGE_START_DATE, today.toISOString());
    return today;
}

function getCurrentDayIndex() {
    const today = truncateToDate(new Date());
    const diffMs = today - startDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 0;
    if (diffDays >= DAYS) return DAYS - 1;
    return diffDays;
}

function save() {
    localStorage.setItem(STORAGE_HABITS, JSON.stringify(habits));
}

function createHeader() {
    const header = document.getElementById("dayHeader");
    const currentDayIndex = getCurrentDayIndex();
    let html = "<tr><th>Habit</th>";

    for (let i = 1; i <= DAYS; i++) {
        const dayIndex = i - 1;
        const isToday = dayIndex === currentDayIndex;
        const isPast = dayIndex < currentDayIndex;
        const isFuture = dayIndex > currentDayIndex;

        let className = "";
        if (isToday) className = "currentDay";
        else if (isPast) className = "past";
        else if (isFuture) className = "future";

        html += `<th${className ? ` class="${className}"` : ""}>${i}</th>`;
    }

    html += "</tr>";
    header.innerHTML = html;
}

createHeader();

// Initialize notes
document.getElementById("notesArea").value = notes;

// Render weekly tasks on load
renderWeeklyTasks();

function addHabit() {
    if (habits.length >= MAX_HABITS) {
        alert("Maximum 40 habits allowed");
        return;
    }

    const input = document.getElementById("habitInput");
    const name = input.value.trim();
    if (name === "") return;

    habits.push({
        name: name,
        days: Array(DAYS).fill(false),
    });

    input.value = "";
    save();
    render();
}

function toggle(habitIndex, dayIndex) {
    const currentDayIndex = getCurrentDayIndex();
    if (dayIndex !== currentDayIndex) {
        alert("You can only update today's entry.");
        return;
    }

    habits[habitIndex].days[dayIndex] =
        !habits[habitIndex].days[dayIndex];
    save();
    render();
}

function calculateProgress() {
    let dailyTotals = Array(DAYS).fill(0);

    habits.forEach((h) => {
        h.days.forEach((d, i) => {
            if (d) dailyTotals[i]++;
        });
    });

    return dailyTotals;
}

let lineChart;
let pieChart;
let habitCharts = []; // store individual habit chart instances

// return number of days that the user has interacted with (highest day index with any check)
function getElapsedDays(totals) {
    let last = 0;
    for (let i = 0; i < totals.length; i++) {
        if (totals[i] > 0) {
            last = i + 1;
        }
    }
    return last; // 0 means no activity yet
}

function editHabit(index) {
    const newName = prompt("Edit habit name:", habits[index].name);
    if (newName && newName.trim()) {
        habits[index].name = newName.trim();
        save();
        render();
    }
}

function deleteHabit(index) {
    if (confirm("Delete habit '" + habits[index].name + "' ?")) {
        habits.splice(index, 1);
        save();
        render();
    }
}

function updateCharts() {
    const totals = calculateProgress();

    // determine elapsed days based on the start date and today's date.
    const currentDayIndex = getCurrentDayIndex();
    const daysElapsed = currentDayIndex + 1;
    const elapsedTotals = totals.slice(0, daysElapsed);

    // Calculate daily completion percentage for each day
    const dailyPercentages = elapsedTotals.map(dayTotal => {
        if (habits.length === 0) return 0;
        return (dayTotal / habits.length * 100).toFixed(1);
    });

    // Overall completion stats
    const completed = elapsedTotals.reduce((a, b) => a + b, 0);
    const maxPossible = habits.length * daysElapsed;
    const missed = maxPossible - completed;

    // calculate percentages for labels
    const percentCompleted = maxPossible
        ? ((completed / maxPossible) * 100).toFixed(1)
        : "0.0";
    const percentMissed = (100 - percentCompleted).toFixed(1);

    if (lineChart) lineChart.destroy();
    if (pieChart) pieChart.destroy();


    lineChart = new Chart(document.getElementById("lineChart"), {
        type: "line",
        data: {
            labels: [...Array(daysElapsed).keys()].map((x) => x + 1),
            datasets: [
                {
                    label: "Daily Completion %",
                    data: dailyPercentages,
                    borderColor: "#0984e3",
                    backgroundColor: "rgba(9, 132, 227, 0.1)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: "#0984e3",
                },
            ],
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: "Completion %"
                    }
                }
            }
        }
    });

    pieChart = new Chart(document.getElementById("pieChart"), {
        type: "pie",
        data: {
            labels: [
                `Completed (${percentCompleted}%)`,
                `Missed (${percentMissed}%)`,
            ],
            datasets: [
                {
                    data: [completed, missed],
                    backgroundColor: ["#00b894", "#d63031"],
                },
            ],
        },
        options: {
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || "";
                            const value = context.parsed;
                            const data = context.dataset.data;
                            const sum = data.reduce((a, b) => a + b, 0);
                            const percent = sum
                                ? ((value / sum) * 100).toFixed(1) + "%"
                                : "";
                            return `${label}: ${value} (${percent})`;
                        },
                    },
                },
            },
        },
    });
}

function render() {
    const body = document.getElementById("habitBody");
    body.innerHTML = "";

    // refresh header highlight in case the day has advanced
    createHeader();

    const currentDayIndex = getCurrentDayIndex();

    habits.forEach((habit, hIndex) => {
        let row = `<tr>`;
        row += `<td class="habitName">
                    ${habit.name}
                    <button class="smallBtn" onclick="editHabit(${hIndex})">✏️</button>
                    <button class="smallBtn" onclick="deleteHabit(${hIndex})">🗑️</button>
                </td>`;

        habit.days.forEach((d, dayIndex) => {
            const isToday = dayIndex === currentDayIndex;
            const isPast = dayIndex < currentDayIndex;
            const isFuture = dayIndex > currentDayIndex;

            const classes = [d ? "checked" : ""];
            if (isToday) classes.push("today");
            else if (isPast) classes.push("past");
            else if (isFuture) classes.push("future");

            row += `
                <td
                    class="${classes.join(" ")}"${
                        isToday ? ` onclick="toggle(${hIndex},${dayIndex})"` : ""
                    }
                >
                    ${d ? "✅" : ""}
                </td>
            `;
        });

        row += "</tr>";
        body.innerHTML += row;
    });

    document.getElementById("counter").innerText =
        habits.length + " / 40 habits";

    updateCharts();
    renderHabitCharts();
}

// build small per-habit charts in the right-hand panel
function renderHabitCharts() {
    const container = document.getElementById("individualCharts");
    if (!container) return;
    container.innerHTML = "";

    // destroy previous charts
    habitCharts.forEach((c) => c.destroy());
    habitCharts = [];

    const totals = calculateProgress();
    const daysElapsed = getCurrentDayIndex() + 1;

    habits.forEach((habit, hIndex) => {
        const wrapper = document.createElement("div");
        wrapper.className = "habit-chart-wrapper";
        const title = document.createElement("div");
        title.innerText = habit.name;
        title.className = "habit-chart-title";
        const canvas = document.createElement("canvas");
        canvas.id = `habitChart-${hIndex}`;
        wrapper.appendChild(title);
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);

        const data = habit.days.slice(0, daysElapsed).map((d) => (d ? 1 : 0));
        const chart = new Chart(canvas.getContext("2d"), {
            type: "line",
            data: {
                labels: [...Array(daysElapsed).keys()].map((x) => x + 1),
                datasets: [
                    {
                        label: habit.name,
                        data: data,
                        borderColor: "#0984e3",
                        fill: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                    },
                },
            },
        });
        habitCharts.push(chart);
    });
}

function restart() {
    if (!confirm("Restart? This will clear all tracked data and reset to day 1.")) return;

    // Clear the day data but keep habit names
    habits.forEach(habit => {
        habit.days = Array(DAYS).fill(false);
    });
    save();

    startDate = truncateToDate(new Date());
    localStorage.setItem(STORAGE_START_DATE, startDate.toISOString());

    createHeader();
    render();
}

render();

// Weekly Tasks Functions
function addWeeklyTask() {
    const input = document.getElementById("weeklyInput");
    const task = input.value.trim();
    if (task === "") return;

    weeklyTasks.push({
        id: Date.now(),
        task: task,
        completed: false
    });

    input.value = "";
    saveWeeklyTasks();
    renderWeeklyTasks();
}

function saveWeeklyTasks() {
    localStorage.setItem(STORAGE_WEEKLY_TASKS, JSON.stringify(weeklyTasks));
}

function renderWeeklyTasks() {
    const list = document.getElementById("weeklyTaskList");
    list.innerHTML = "";

    weeklyTasks.forEach((item, index) => {
        const li = document.createElement("li");
        li.className = item.completed ? "completed" : "";
        li.innerHTML = `
            <input type="checkbox" ${item.completed ? "checked" : ""} onchange="toggleWeeklyTask(${index})">
            <span>${item.task}</span>
            <button onclick="deleteWeeklyTask(${index})" class="deleteBtn">Delete</button>
        `;
        list.appendChild(li);
    });
}

function toggleWeeklyTask(index) {
    weeklyTasks[index].completed = !weeklyTasks[index].completed;
    saveWeeklyTasks();
    renderWeeklyTasks();
}

function deleteWeeklyTask(index) {
    weeklyTasks.splice(index, 1);
    saveWeeklyTasks();
    renderWeeklyTasks();
}

// Notes Functions
function saveNotes() {
    notes = document.getElementById("notesArea").value;
    localStorage.setItem(STORAGE_NOTES, notes);
    alert("Notes saved!");
}