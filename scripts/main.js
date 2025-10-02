// main.js
// Entry point: initializes the App defined in scripts/ui.js

$(function(){
  try {
    if (!window.App || typeof App.init !== 'function' || typeof App.render !== 'function') {
      console.error('[Contract] Missing App.init/App.render');
      return;
    }
    App.init();
    App.render();
  } catch (e) {
    console.error('Initialization failed', e);
  }
});
