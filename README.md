📊 Habit Tracker

A 365-day spreadsheet-style habit tracker that allows users to log daily habits with a date-based system. The app restricts input to the current day and provides visual insights using charts to track consistency and progress over time. 🚀 Live Demo 👉 (https://habittracker-nine-kappa.vercel.app/)

🚀 Features 365-day habit tracking system Max limit of 40 habits Date-based tracking (current day = today − start date) Click-to-mark ✅ completion Data persistence using LocalStorage Line chart for daily progress trends Pie chart for completion vs missed analysis Scrollable spreadsheet UI

🧠 Core Logic Day index is calculated dynamically based on real-world date Only the current day is editable (prevents backfilling) Progress is computed across all habits per day Charts update automatically on user interaction

🛠️ Tech Stack

HTML CSS JavaScript Chart.js LocalStorage

📈 Future Improvements

Streak tracking system Monthly heatmap (GitHub-style) Backend integration for user accounts Mobile responsive UI Export data (CSV)

⚠️ Limitations

Data stored only in browser (not cross-device) No authentication system Clearing browser data will erase progress
