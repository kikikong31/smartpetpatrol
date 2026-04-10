# SmartPet Warden - Park Management System

A Progressive Web App (PWA) built with React and Vite, designed to help park rangers efficiently report, track, and manage facility issues. This application features an offline-first architecture, ensuring seamless operation even in areas with poor network connectivity.

## 🌟 Key Features

* **Offline-First & Auto-Sync**: Utilizes **Dexie.js (IndexedDB)** for persistent local storage. Tickets created offline are saved locally and automatically synced to the main database once the network is restored.
* **Interactive Maps**: Integrates **OpenStreetMap (OSM)** via `react-leaflet`. Users can fetch their current GPS location and manually drag the marker to fine-tune the exact coordinates (Update operation).
* **Hardware APIs Integration**: 
    * **Geolocation API**: Accurately fetches the user's current coordinates.
    * **Camera/File API**: Allows users to attach photographic evidence.
    * **Web Share API**: Dispatches reports directly to relevant departments using native device sharing capabilities.
* **Installable PWA**: Fully configured manifest and service workers allow the app to be installed on mobile devices (Add to Home Screen) for a native-like experience.
* **Data Export**: Provides a one-click solution to export all audit logs as a timestamped JSON file.

---

## 🚀 Installation Instructions

To run this project locally on your machine, please follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/kikikong31/smartpetpatrol.git](https://github.com/kikikong31/smartpetpatrol.git)
    cd smartpetpatrol
    ```

2.  **Install dependencies:**
    *Note: This project uses React 19. To ensure smooth installation with `react-leaflet`, please use the `--legacy-peer-deps` flag to bypass peer dependency conflicts.*
    ```bash
    npm install --legacy-peer-deps
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```

4.  **View the app:**
    Open your browser and navigate to the local URL provided in your terminal (usually `http://localhost:5173`).

---

## 📖 Usage Guidelines

### 1. Reporting an Issue (Online/Offline)
* Navigate to the **REPORT** tab.
* Select the issue category from the dropdown menu and provide a brief description.
* Click **Attach GPS Location** to fetch your coordinates and render the OSM map. You can drag the marker to adjust the location if needed.
* Click **Choose Evidence Photo** to upload an image.
* Click **Submit Report**. If you are offline, it will be saved locally with a "Pending Sync" status.

### 2. Managing Audit Logs (History Tab)
* Navigate to the **HISTORY** tab to view all submitted reports.
* **Resolve/Reopen**: Toggle the fix status of a ticket.
* **Dispatch**: Use the native Web Share API to forward the report details to the respective department.
* **Delete**: Remove a record permanently (prompts a confirmation dialog to prevent accidental deletion).

### 3. Exporting Data
* In the **HISTORY** tab, click the **Export JSON** button at the top right to download a complete backup of all reports.

---

## ⚙️ Additional Setup Notes

* **HTTPS Requirement for APIs**: To fully test the Geolocation and PWA installation features, the application must be served over HTTPS. 
* **Live Deployment**: This project is automatically deployed via **Vercel**. You can access the live, fully functional version (with HTTPS enabled) here: 
    👉 **https://smartpetpatrol.vercel.app/**
* **Testing Offline Capabilities**: To test the offline features on the live site, turn on "Airplane Mode" or disable Wi-Fi/Cellular data on your device, submit a report, and observe the "Pending Sync" status. Re-enable the connection to witness the auto-sync behavior.