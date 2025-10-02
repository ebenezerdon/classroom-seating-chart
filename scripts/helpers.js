// helpers.js
// Small utility module for id generation, storage, deep clones, and validation
// Exposes AppHelpers on window

(function(window, $){
  'use strict';

  const KEY = 'seating_chart_v1';

  function generateId(prefix = 'd'){
    // Simple, collision resistant id
    return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random()*9000)+1000}`;
  }

  function nowISO(){ return new Date().toISOString(); }

  function saveState(obj){
    try{
      localStorage.setItem(KEY, JSON.stringify(obj));
      return true;
    }catch(e){
      console.error('Save failed', e);
      return false;
    }
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(e){
      console.error('Load failed', e);
      return null;
    }
  }

  function clearState(){
    try{ localStorage.removeItem(KEY); }catch(e){ console.error(e); }
  }

  function clamp(val, min, max){ return Math.max(min, Math.min(max, val)); }

  function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }

  // Validate a desk object shape
  function isValidDesk(d){
    return d && typeof d.id === 'string' && typeof d.x === 'number' && typeof d.y === 'number' && typeof d.name === 'string';
  }

  window.AppHelpers = {
    generateId,
    saveState,
    loadState,
    clearState,
    clamp,
    deepClone,
    nowISO,
    isValidDesk
  };

})(window, jQuery);
