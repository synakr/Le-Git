# Le-Git 🎓🖥️

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-v26.0-blue)](https://www.electronjs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3.42.0-lightgrey)](https://www.sqlite.org/)
[![Version](https://img.shields.io/badge/Version-1.0.0-green)](https://github.com/your-username/le-git)

**Le-Git** = **Lecture + Git** 🎓➕🐙  

Le-Git is your **local desktop lecture tracker** for students at NIT and beyond. Keep track of all your playlists, custom video groups, and lecture progress — all **offline, no cloud required**!  

Built using **Electron.js** and **SQLite**, Le-Git makes learning organized, seamless, and fun.  

---

## 🌟 Features

### Core Features
- 📝 **Create Nodes** for playlists or custom video groups.  
- ✅ **Track progress** for each lecture/video.  
- ⏯️ **Continue last watched video** from saved timestamp with one click.  
- 🎯 **Capture new videos** with URL + timestamp for easy resuming.  
- 🗒️ **Add notes** to each node (auto-saved).  
- 🗑️ **Delete nodes** you no longer need.  
- 🔼🔽 **Reorder nodes** like a git commit list.  
- 🌙 **Dark Mode** support for comfortable viewing.  

### Advanced / Custom Group Features
- 📂 **Custom Groups**: Group multiple videos in a single node.  
- ⏱️ **Individual video timestamps** in custom groups.  
- ▶️ **Continue any video** inside a custom group.  
- ✔️ **Bulk mark videos** inside a custom node as watched.  
- 🔢 **Quickly mark multiple videos** via “Mark up to video #”.  

### Upcoming / Optional Add-Ons
- 🖱️ **One-click auto-capture** of currently playing video from browser.  
- 📊 **Visual progress bars** for nodes and playlists.  
- 📦 **Export/Import data** for backup.  
- 💻 **Browser integration** for automatic timestamp detection.  
- 🧩 **Additional productivity features**, e.g., tracking other apps or study stats.  

---

## 💻 Tech Stack

- **Electron.js** – Desktop application framework  
- **SQLite3** – Local database for storing nodes, videos, and progress  
- **HTML / CSS / JS** – Frontend UI  

---

## 🚀 Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/le-git.git
cd le-git
````

2. Install dependencies:

```bash
npm install
```

3. Run the app:

```bash
npm start
```

---

## 📂 Folder Structure

```
le-git/
├─ main.js              # Electron main process
├─ index.html           # Main HTML UI
├─ styles/
│  └─ style.css         # Styling for UI
├─ src/
│  └─ db.js             # SQLite database handler
├─ package.json
└─ README.md
```

---

## 🎮 Usage

* Click **“Create Node”** to add a playlist or custom group.
* Use **Capture Current Video** to save a video URL + timestamp.
* Click **Continue** to open a video in your browser at the saved timestamp.
* Add notes in the textarea — auto-saves instantly.
* Delete nodes you no longer need with the **Delete** button.
* Reorder nodes using **up/down buttons**.
* Toggle **Dark Mode** for night-friendly viewing.
* Use **Mark up to video #** to quickly update multiple videos at once.

---

## 📈 Future Enhancements

* Auto-detect currently playing browser video and timestamp.
* Visual progress bars for nodes and custom groups.
* Export/import node and video data for backup.
* Integration with other study tools or apps.
* Future venture to add other platforms like udemy, skillshare etc.
* Currently limited to YouTube only

---

## 📝 License

MIT License
