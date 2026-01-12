# WhatsCRM - Chrome Extension

This is a Chrome extension for WhatsApp to schedule messages, manage message templates, and auto-respond to first-time contacts.

## How to Install

1.  **Download the code:** Clone this repository or download the source code as a ZIP file and unzip it.
2.  **Install dependencies:** Open a terminal in the project directory and run `npm install`.
3.  **Build the extension:** Run the build script: `npm run build`. This will compile the TypeScript files into JavaScript and place them in the `dist` directory.
4.  **Open Chrome Extensions:** Open Google Chrome, navigate to `chrome://extensions/`.
5.  **Enable Developer Mode:** In the top right corner of the Extensions page, toggle the "Developer mode" switch to on.
6.  **Load the Extension:**
    *   Click the "Load unpacked" button that appears on the top left.
    *   In the file selection dialog, navigate to the project directory.
    *   Select the entire project folder (the one containing `manifest.json`).
7.  **Pin the Extension:** The WhatsCRM icon (a green square) will appear in your Chrome toolbar. It's helpful to click the puzzle piece icon and then the pin icon next to WhatsCRM to keep it visible.

## How to Use

1.  Open and log in to [WhatsApp Web](https://web.whatsapp.com/).
2.  Click the WhatsCRM icon in your Chrome toolbar to open the extension popup.
3.  **Templates:**
    *   Use the "Templates" tab to create and delete message templates.
4.  **Scheduler:**
    *   Go to the "Scheduler" tab.
    *   Click "Refresh Contacts" to load your current chats.
    *   Select a template, one or more contacts/groups, and a future date and time.
    *   Click "Schedule Message". The message will appear in the "Scheduled Messages" list.
5.  **Auto-Responder:**
    *   Go to the "Auto-Responder" tab.
    *   Enter a message you want to automatically send to people who message you for the first time.
    *   Click "Save Bot Message".
    *   The bot will automatically reply to new individual (non-group) chats with an unread message. It will only reply once per contact.

## For Developers

This project is written in TypeScript. The source files are in the `src` directory. After making changes, you need to run `npm run build` to compile the TypeScript files into JavaScript.