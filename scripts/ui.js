// ui.js
// Responsible for rendering UI components, handling DOM interactions, and exposing App.init and App.render

(function(window, $){
  'use strict';

  window.App = window.App || {};

  // internal state
  const state = {
    desks: [],
    history: [],
    historyIndex: -1,
    selectedId: null
  };

  // small constants
  const MIN_DESK_W = 80;
  const MIN_DESK_H = 48;

  // helpers local
  function pushHistory(snapshot){
    // keep history up to current index, then push
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(AppHelpers.deepClone(snapshot));
    state.historyIndex = state.history.length - 1;
    // cap history size
    if(state.history.length > 40){ state.history.shift(); state.historyIndex = state.history.length - 1; }
  }

  function getCanvas(){ return $('#canvas'); }
  function getCanvasWrap(){ return $('#canvasWrap'); }

  // Render a single desk element
  function buildDeskEl(desk){
    const selected = state.selectedId === desk.id ? 'aria-selected="true"' : '';
    const noteDot = desk.note && desk.note.trim().length ? '<span class="note-dot" title="Has note"></span>' : '';

    const html = `
      <div class="desk" tabindex="0" role="button" data-id="${desk.id}" ${selected} aria-label="Desk ${escapeHtml(desk.name)}">
        <div class="name">${escapeHtml(desk.name || 'Unnamed')}</div>
        <div class="meta"><span class="student-id">${escapeHtml(desk.tag || '')}</span>${noteDot}</div>
      </div>
    `;

    return $(html);
  }

  // escape HTML to avoid injection
  function escapeHtml(str){
    if(!str) return '';
    return String(str).replace(/[&<>"']/g, function(s){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[s];
    });
  }

  // place desks into canvas
  function renderDesks(){
    const $canvas = getCanvas();
    $canvas.empty();

    state.desks.forEach(d => {
      if(!AppHelpers.isValidDesk(d)) return;
      const $el = buildDeskEl(d);
      positionDeskEl($el, d);
      bindDeskEvents($el, d);
      $canvas.append($el);
    });
  }

  // position element based on percent coords stored in desk
  function positionDeskEl($el, desk){
    const wrap = getCanvasWrap();
    const w = wrap.width();
    const h = wrap.height();
    const elW = $el.outerWidth();
    const elH = $el.outerHeight();
    const left = Math.round((desk.x / 100) * Math.max(w - elW, 0));
    const top = Math.round((desk.y / 100) * Math.max(h - elH, 0));
    $el.css({ left: left + 'px', top: top + 'px' });
  }

  //Bind events for desk element: pointer drag, keyboard, double click for notes
  function bindDeskEvents($el, desk){
    let dragging = false;
    let pressed = false;
    let start = {px:0, py:0, dx:0, dy:0};
    const DRAG_THRESHOLD = 6;

    $el.on('pointerdown', function(e){
      e.preventDefault();
      const el = this;
      try{ el.setPointerCapture(e.originalEvent.pointerId); }catch(_){ }
      pressed = true;
      start.px = e.clientX;
      start.py = e.clientY;
      start.dx = parseInt($el.css('left'), 10) || 0;
      start.dy = parseInt($el.css('top'), 10) || 0;
    });

    $el.on('pointermove', function(e){
      if(!pressed) return;
      const dx = e.clientX - start.px;
      const dy = e.clientY - start.py;
      // start dragging only after a small threshold to avoid clicks being treated as drags
      if(!dragging){
        if(dx*dx + dy*dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
        dragging = true;
        $el.addClass('dragging');
      }
      const nx = start.dx + dx;
      const ny = start.dy + dy;
      $el.css({ left: nx + 'px', top: ny + 'px' });
    });

    $el.on('pointerup pointercancel', function(e){
      // always release pointer capture if we obtained it
      try{ this.releasePointerCapture(e.originalEvent.pointerId); }catch(_){ }
      if(dragging){
        dragging = false;
        $el.removeClass('dragging');
        // compute new percent and save
        const wrap = getCanvasWrap();
        const w = wrap.width();
        const h = wrap.height();
        const elW = $el.outerWidth();
        const elH = $el.outerHeight();
        let left = parseInt($el.css('left'),10) || 0;
        let top = parseInt($el.css('top'),10) || 0;
        left = AppHelpers.clamp(left, 0, Math.max(w - elW, 0));
        top = AppHelpers.clamp(top, 0, Math.max(h - elH, 0));
        desk.x = Math.round((left / Math.max(w - elW, 1)) * 100);
        desk.y = Math.round((top / Math.max(h - elH, 1)) * 100);
        saveAndRender();
      }
      pressed = false;
    });

    // keyboard support: focus, arrow keys to nudge, Enter to edit notes, Delete to remove
    $el.on('keydown', function(e){
      const key = e.key;
      const step = e.shiftKey ? 5 : 1;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)){
        e.preventDefault();
        const wrap = getCanvasWrap();
        const elW = $el.outerWidth();
        const elH = $el.outerHeight();

        const w = wrap.width();
        const h = wrap.height();

        let left = parseInt($el.css('left'),10) || 0;
        let top = parseInt($el.css('top'),10) || 0;

        if(key === 'ArrowUp') top -= step;
        if(key === 'ArrowDown') top += step;
        if(key === 'ArrowLeft') left -= step;
        if(key === 'ArrowRight') left += step;

        left = AppHelpers.clamp(left, 0, Math.max(w - elW, 0));
        top = AppHelpers.clamp(top, 0, Math.max(h - elH, 0));

        $el.css({ left: left + 'px', top: top + 'px' });
        desk.x = Math.round((left / Math.max(w - elW, 1)) * 100);
        desk.y = Math.round((top / Math.max(h - elH, 1)) * 100);
        saveAndRender();
      } else if(key === 'Enter'){
        e.preventDefault();
        openNotePopoverFor(desk, $el);
      } else if(key === 'Delete' || key === 'Backspace'){
        e.preventDefault();
        removeDesk(desk.id);
      }
    });

    $el.on('click', function(e){
      // do not open editor if user is dragging
      if(dragging) return;

      // select this desk and update visuals
      state.selectedId = desk.id;
      updateSelectedInfo();
      // re-render so selection state is reflected
      renderDesks();

      // find the freshly rendered element and replace the name with an input
      const $fresh = getCanvas().find(`[data-id='${desk.id}']`);
      if($fresh.find('.name-edit').length) return; // already editing
      const $name = $fresh.find('.name');
      const cur = desk.name || '';
      // use the existing .input utility class for consistent styling
      const $input = $('<input type="text" class="name-edit input" aria-label="Edit student name">').val(cur);
      $name.empty().append($input);
      $input.focus().select();

      function commit(){
        const val = ($input.val() || '').trim();
        desk.name = val || 'Student';
        saveAndRender();
      }
      function cancel(){
        // restore rendering without committing
        renderDesks();
        updateSelectedInfo();
      }

      $input.on('keydown', function(ev){
        if(ev.key === 'Enter'){ ev.preventDefault(); commit(); }
        else if(ev.key === 'Escape'){ ev.preventDefault(); cancel(); }
      });

      $input.on('blur', function(){ commit(); });
    });

    $el.on('dblclick', function(e){
      openNotePopoverFor(desk, $el);
    });
  }

  function openNotePopoverFor(desk, $el){
    closePopover();
    const $popover = $(
      `<div class="note-popover" role="dialog" aria-label="Edit note for ${escapeHtml(desk.name)}">
        <div class="text-sm font-medium text-gray-700">${escapeHtml(desk.name)}</div>
        <textarea id="noteText">${escapeHtml(desk.note || '')}</textarea>
        <div class="actions">
          <button id="saveNote" class="btn-primary small">Save</button>
          <button id="cancelNote" class="btn-outline small">Cancel</button>
        </div>
      </div>`
    );

    // position near the desk
    const wrap = getCanvasWrap();
    const wrapOffset = wrap.offset();
    const left = parseInt($el.css('left'),10) || 0;
    const top = parseInt($el.css('top'),10) || 0;

    // append to wrap and position
    wrap.append($popover);
    // place to the right if space, else left
    const wrapW = wrap.width();
    const popW = $popover.outerWidth();
    let px = left + $el.outerWidth() + 12;
    if(px + popW > wrapW){ px = Math.max(8, left - popW - 12); }
    $popover.css({ left: px + 'px', top: Math.max(8, top) + 'px' });

    // focus into textarea
    $popover.find('#noteText').focus();

    // events
    $popover.on('click', function(e){ e.stopPropagation(); });

    $popover.find('#saveNote').on('click', function(){
      const val = $popover.find('#noteText').val() || '';
      desk.note = val.trim();
      saveAndRender();
      closePopover();
    });

    $popover.find('#cancelNote').on('click', function(){ closePopover(); });

    // close clicking outside
    setTimeout(()=>{
      $(document).on('pointerdown.popover', function(ev){
        if($(ev.target).closest('.note-popover').length === 0){ closePopover(); }
      });
    }, 10);
  }

  function closePopover(){
    getCanvasWrap().find('.note-popover').remove();
    $(document).off('pointerdown.popover');
  }

  function addDesk(name, opts){
    const wrap = getCanvasWrap();
    const w = wrap.width();
    const h = wrap.height();

    const id = AppHelpers.generateId('desk');
    const desk = {
      id,
      name: name || 'Student',
      tag: opts && opts.tag ? opts.tag : '',
      note: opts && opts.note ? opts.note : '',
      x: 50, // percent
      y: 50,
      created: AppHelpers.nowISO()
    };
    state.desks.push(desk);
    pushHistory({desks: AppHelpers.deepClone(state.desks)});
    AppHelpers.saveState({desks: state.desks});
    renderDesks();
    state.selectedId = id;
    updateSelectedInfo();
  }

  function removeDesk(id){
    const idx = state.desks.findIndex(d => d.id === id);
    if(idx === -1) return;
    state.desks.splice(idx,1);
    pushHistory({desks: AppHelpers.deepClone(state.desks)});
    AppHelpers.saveState({desks: state.desks});
    state.selectedId = null;
    renderDesks();
    updateSelectedInfo();
  }

  function updateSelectedInfo(){
    const $info = $('#selectedInfo');
    if(!state.selectedId){ $info.text('None'); return; }
    const d = state.desks.find(x => x.id === state.selectedId);
    if(!d){ $info.text('None'); return; }
    $info.html(`${escapeHtml(d.name)} <div class="text-xs text-gray-400">${escapeHtml(d.tag || '')}</div>`);
  }

  function saveAndRender(){
    pushHistory({desks: AppHelpers.deepClone(state.desks)});
    AppHelpers.saveState({desks: state.desks});
    renderDesks();
  }

  function loadFromStorage(){
    const data = AppHelpers.loadState();
    if(data && Array.isArray(data.desks)){
      state.desks = data.desks.filter(AppHelpers.isValidDesk);
    } else {
      // initial example desks
      state.desks = [
        { id: AppHelpers.generateId('desk'), name: 'Alex', tag: 'A1', note: 'Prefers front row', x: 10, y: 8, created: AppHelpers.nowISO() },
        { id: AppHelpers.generateId('desk'), name: 'Bea', tag: 'A2', note: '', x: 40, y: 8, created: AppHelpers.nowISO() },
        { id: AppHelpers.generateId('desk'), name: 'Chris', tag: 'B1', note: '', x: 70, y: 8, created: AppHelpers.nowISO() }
      ];
      AppHelpers.saveState({desks: state.desks});
    }
    pushHistory({desks: AppHelpers.deepClone(state.desks)});
  }

  // Expose API
  App.init = function(){
    // load state
    loadFromStorage();

    // wire UI controls
    $('#addDeskBtn').on('click', function(){
      const name = $('#studentName').val().trim();
      if(!name){ $('#studentName').focus(); return; }
      addDesk(name, {});
      $('#studentName').val('');
    });

    $('#addDeskBlank').on('click', function(){ addDesk('Student', {}); });

    $('#resetBtn').on('click', function(){
      if(!confirm('Reset layout to default and clear saved data?')) return;
      AppHelpers.clearState();
      loadFromStorage();
      renderDesks();
      updateSelectedInfo();
    });

    $('#deleteDeskBtn').on('click', function(){ if(state.selectedId) removeDesk(state.selectedId); });

    $('#focusDeskBtn').on('click', function(){
      if(!state.selectedId) return;
      const d = state.desks.find(x => x.id === state.selectedId);
      if(!d) return;
      centerOnDesk(d);
    });

    $('#exportJson').on('click', function(){
      const data = JSON.stringify({desks: state.desks}, null, 2);
      const blob = new Blob([data], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'seating-chart.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    $('#importJson').on('change', function(e){
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      const reader = new FileReader();
      reader.onload = function(ev){
        try{
          const obj = JSON.parse(ev.target.result);
          if(obj && Array.isArray(obj.desks)){
            state.desks = obj.desks.filter(AppHelpers.isValidDesk);
            saveAndRender();
            updateSelectedInfo();
          } else { alert('Import file appears invalid.'); }
        }catch(err){ alert('Failed to import file.'); }
      };
      reader.readAsText(f);
      // reset input
      $(this).val(null);
    });

    $('#undoBtn').on('click', function(){
      if(state.historyIndex <= 0) return;
      state.historyIndex -= 1;
      const snap = state.history[state.historyIndex];
      if(snap) { state.desks = AppHelpers.deepClone(snap.desks); AppHelpers.saveState({desks: state.desks}); renderDesks(); }
    });

    $('#redoBtn').on('click', function(){
      if(state.historyIndex >= state.history.length - 1) return;
      state.historyIndex += 1;
      const snap = state.history[state.historyIndex];
      if(snap){ state.desks = AppHelpers.deepClone(snap.desks); AppHelpers.saveState({desks: state.desks}); renderDesks(); }
    });

    // close popovers when clicking canvas
    $(document).on('pointerdown', function(ev){
      if($(ev.target).closest('.desk, .note-popover').length === 0){ closePopover(); }
    });

    // window resize => reposition elements using percent values
    $(window).on('resize', function(){
      renderDesks();
    });

    // initial render
    updateSelectedInfo();
  };

  App.render = function(){
    renderDesks();
  };

  // Utility: center canvas on a desk (scroll to center on small screens)
  function centerOnDesk(desk){
    const wrap = getCanvasWrap();
    const $el = getCanvas().find(`[data-id='${desk.id}']`);
    if(!$el.length) return;
    const wrapOffset = wrap.offset();
    const elOffset = $el.offset();
    const centerX = elOffset.left - wrapOffset.left + ($el.outerWidth()/2) - (wrap.width()/2);
    const centerY = elOffset.top - wrapOffset.top + ($el.outerHeight()/2) - (wrap.height()/2);
    // smooth scroll within page
    $('html,body').animate({ scrollTop: Math.max(0, $(window).scrollTop() + centerY) }, 300);
  }

})(window, jQuery);
