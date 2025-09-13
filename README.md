# Le-Git 🎓🖥️

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)  
[![Electron](https://img.shields.io/badge/Electron-v26.0-blue)](https://www.electronjs.org/)  
[![SQLite](https://img.shields.io/badge/SQLite-3.42.0-lightgrey)](https://www.sqlite.org/)  
[![Version](https://img.shields.io/badge/Version-1.0.0-green)](https://github.com/your-username/le-git)  

**Le-Git** = **Lecture + Git** 🎓➕🐙  

Le-Git is your **local desktop lecture tracker** designed **from a student’s perspective**. Students no longer have to navigate YouTube or deal with distracting ads — you can **directly import any playlist** into the app and watch lectures **ad-free**.  

The app helps you **set goals, track progress, and stay motivated**:  
- **Progress stats and graphs** to visualize your learning.  
- **Notifications** to remind you to complete your playlists.  
- **Hotkeys and shortcuts** to resume videos instantly from where you left off.  

Built using **Electron.js** and **SQLite**, Le-Git creates an **engagement-designed environment** that makes learning organized, seamless, and fun.  

---

## 🌟 Features

### Core Features
- 📝 **Create Nodes** for playlists or custom video groups  
- ✅ **Track progress** for each lecture/video with visual graphs  
- ⏯️ **Continue last watched video** from saved timestamp with one click  
- 🎯 **Set goals and get notifications** to complete your playlists  
- 🗒️ **Add notes** to each node (auto-saved)  
- 🗑️ **Delete nodes** you no longer need  
- 🔼🔽 **Reorder nodes** like a git commit list  
- 🌙 **Dark Mode** support for comfortable viewing  
- ⌨️ **Hotkeys/shortcuts** to instantly start a video or playlist from where you left off  

### Advanced / Custom Group Features
- 📂 **Custom Groups**: Group multiple videos in a single node  
- ⏱️ **Individual video timestamps** in custom groups  
- ▶️ **Continue any video** inside a custom group  
- ✔️ **Bulk mark videos** inside a custom node as watched  
- 🔢 **Quickly mark multiple videos** via “Mark up to video #”  

### Upcoming / Optional Add-Ons
- 🖱️ **One-click auto-capture** of currently playing video from browser  
- 📊 **Visual progress bars** for nodes and playlists  
- 📦 **Export/Import data** for backup  
- 💻 **Browser integration** for automatic timestamp detection  
- 🧩 **Additional productivity features**, e.g., tracking other apps or study stats  

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

* Click **“Create Node”** to add a playlist or custom group
* Use **Capture Current Video** to save a video URL + timestamp
* Click **Continue** to open a video in your browser at the saved timestamp
* Add notes in the textarea — auto-saves instantly
* Delete nodes you no longer need with the **Delete** button
* Reorder nodes using **up/down buttons**
* Toggle **Dark Mode** for night-friendly viewing
* Use **Mark up to video #** to quickly update multiple videos at once
* Use **hotkeys/shortcuts** to instantly resume videos or playlists from where you left off
* Track progress with **visual graphs** and stay motivated with **goal notifications**

---

## 📈 Future Enhancements

* Auto-detect currently playing browser video and timestamp
* Visual progress bars for nodes and custom groups
* Export/import node and video data for backup
* Integration with other study tools or apps
* Expand support to platforms like Udemy, Skillshare, etc.
* Currently limited to YouTube only

---

## 📝 License

MIT License © 2025 Free to use, modify, and share

---