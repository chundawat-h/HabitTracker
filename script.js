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

function calculateStreaks() {
    const currentDayIndex = getCurrentDayIndex();
    if (habits.length === 0) {
        return { currentStreak: 0, bestStreak: 0 };
    }

    const totals = calculateProgress().slice(0, currentDayIndex + 1);
    let currentStreak = 0;
    for (let i = currentDayIndex; i >= 0; i--) {
        if (totals[i] === habits.length) {
            currentStreak++;
        } else {
            break;
        }
    }

    let bestStreak = 0;
    let running = 0;
    for (let i = 0; i <= currentDayIndex; i++) {
        if (totals[i] === habits.length) {
            running++;
            bestStreak = Math.max(bestStreak, running);
        } else {
            running = 0;
        }
    }

    return { currentStreak, bestStreak };
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
            backgroundColor: '#f8f9fa',
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
            backgroundColor: '#f8f9fa',
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

    renderSummary();
    renderTodayBanner();
    renderWeeklySummary();
    updateCharts();
    renderHabitCharts();
}

function renderSummary() {
    const currentDayIndex = getCurrentDayIndex();
    const daysElapsed = currentDayIndex + 1;
    const completedToday = habits.filter((h) => h.days[currentDayIndex]).length;
    const todayPercent = habits.length
        ? ((completedToday / habits.length) * 100).toFixed(1)
        : "0.0";
    const todayText = habits.length
        ? `${completedToday} / ${habits.length} (${todayPercent}%)`
        : `0 tasks (${todayPercent}%)`;
    const { currentStreak, bestStreak } = calculateStreaks();
    const summary = `Day ${daysElapsed} / ${DAYS} • Habits: ${habits.length} • Today: ${todayText} • Streak: ${currentStreak} (Best: ${bestStreak})`;
    document.getElementById("progressSummary").innerText = summary;
}

function renderTodayBanner() {
    const currentDayIndex = getCurrentDayIndex();
    const dayNumber = currentDayIndex + 1;
    const totalHabits = habits.length;
    const completedToday = totalHabits
        ? habits.filter((h) => h.days[currentDayIndex]).length
        : 0;
    const banner = document.getElementById("todayBanner");
    if (!banner) return;

    const badge = document.getElementById("todayBadge");
    if (badge) {
        if (totalHabits === 0) {
            badge.innerText = "No habits yet";
            badge.className = "todayBadge";
        } else if (completedToday === totalHabits) {
            badge.innerText = "All done today!";
            badge.className = "todayBadge todayDone";
        } else {
            badge.innerText = `${completedToday}/${totalHabits} done`;
            badge.className = "todayBadge";
        }
    }

    const text = document.getElementById("todayBannerText");
    if (!text) return;

    if (totalHabits === 0) {
        text.innerText = "Add habits to start your progress and build your streak.";
    } else if (completedToday === totalHabits) {
        text.innerText = `Today is Day ${dayNumber}. Great job — all habits completed!`;
    } else {
        text.innerText = `Today is Day ${dayNumber}. Complete more habits to keep your streak going.`;
    }
}

function renderWeeklySummary() {
    const weekly = document.getElementById("weeklySummary");
    if (!weekly) return;

    const currentDayIndex = getCurrentDayIndex();
    const daysElapsed = currentDayIndex + 1;
    const daysToShow = Math.min(daysElapsed, 7);
    const startDay = Math.max(0, currentDayIndex - daysToShow + 1);
    const totals = calculateProgress().slice(startDay, currentDayIndex + 1);

    if (daysToShow === 0 || habits.length === 0) {
        weekly.innerText = "Weekly summary will appear after you add habits and track today.";
        return;
    }

    const totalChecks = totals.reduce((sum, value) => sum + value, 0);
    const averagePercent = ((totalChecks / (habits.length * daysToShow)) * 100).toFixed(0);
    const fullHabitDays = totals.filter((value) => value === habits.length).length;
    const completedWeeklyTasks = weeklyTasks.filter((task) => task.completed).length;
    const totalWeeklyTasks = weeklyTasks.length;

    weekly.innerText = `Last ${daysToShow} day${daysToShow > 1 ? "s" : ""}: ${averagePercent}% average habit completion, ${fullHabitDays} full habit day${fullHabitDays === 1 ? "" : "s"}. Weekly tasks: ${completedWeeklyTasks}/${totalWeeklyTasks}.`;
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
                backgroundColor: '#f8f9fa',
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
    const status = document.getElementById("notesStatus");
    if (status) {
        status.innerText = "Notes saved.";
        setTimeout(() => {
            status.innerText = "";
        }, 2000);
    }
}

function clearCompletedWeeklyTasks() {
    weeklyTasks = weeklyTasks.filter((task) => !task.completed);
    saveWeeklyTasks();
    renderWeeklyTasks();
}

// Theme switching
document.getElementById("themeSelect").addEventListener("change", function() {
    const selectedTheme = this.value;
    document.body.className = selectedTheme === "default" ? "" : selectedTheme + "-theme";
    localStorage.setItem("selectedTheme", selectedTheme);
    updateChartBackgrounds();
});

// Load saved theme
const savedTheme = localStorage.getItem("selectedTheme") || "default";
document.getElementById("themeSelect").value = savedTheme;
document.body.className = savedTheme === "default" ? "" : savedTheme + "-theme";
updateChartBackgrounds();

function updateChartBackgrounds() {
    const canvasBg = getComputedStyle(document.body).getPropertyValue('--canvas-bg').trim();
    if (lineChart) {
        lineChart.options.backgroundColor = canvasBg;
        lineChart.update();
    }
    if (pieChart) {
        pieChart.options.backgroundColor = canvasBg;
        pieChart.update();
    }
    // Update individual charts if needed
    habitCharts.forEach(chart => {
        chart.options.backgroundColor = canvasBg;
        chart.update();
    });
}

// keyboard shortcuts for form inputs
(function setupInputShortcuts() {
    const habitInput = document.getElementById("habitInput");
    const weeklyInput = document.getElementById("weeklyInput");
    const notesArea = document.getElementById("notesArea");

    if (habitInput) {
        habitInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                addHabit();
            }
        });
    }

    if (weeklyInput) {
        weeklyInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                addWeeklyTask();
            }
        });
    }

    if (notesArea) {
        notesArea.addEventListener("keydown", (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                saveNotes();
            }
        });
    }
})();