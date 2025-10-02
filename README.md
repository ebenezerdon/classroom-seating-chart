# Classroom Seating Chart

This project is an interactive classroom seating chart web app built by [Teda.dev](https://teda.dev), the simplest AI app builder for regular people. It provides a modern, accessible interface to position desks, attach notes to students, and persist layouts in the browser.

Features
- Drag and drop desks to arrange seating
- Double click or press Enter on a desk to add or edit a note
- Keyboard accessible: focus desks and use arrow keys to nudge them
- Persist layouts in localStorage so your arrangement survives reloads
- Export and import seating layouts as JSON for sharing or backups
- Undo and redo support for recent changes

Files
- index.html: Main HTML file. Includes Tailwind CSS and jQuery and loads the modular scripts.
- styles/main.css: Custom styles complementing Tailwind utilities for a polished look.
- scripts/helpers.js: Utility functions for id generation, storage, and validation.
- scripts/ui.js: UI rendering and event handling. Exposes App.init and App.render.
- scripts/main.js: App entry point. Initializes the app.

Accessibility and UX
- Semantic HTML and ARIA attributes where appropriate
- Focusable desk widgets with clear focus states
- Respects prefers-reduced-motion for animations
- Touch friendly pointer interactions

How to run
1. Open index.html in a modern browser.
2. Add desks, double click to edit notes, or drag to position.
3. Use export/import to move layouts between devices.

This app is purposely small and self contained. If you want additional features such as seat labels, print-ready exports, or automatic seating rules, tell me and I will extend it.
