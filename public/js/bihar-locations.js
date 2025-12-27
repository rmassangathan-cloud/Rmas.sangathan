(function(){
  console.log('📌 bihar-locations.js loaded');

  const stateSelect = document.getElementById('stateSelect');
  const parmandalSelect = document.getElementById('parmandalSelect');
  const jilaSelect = document.getElementById('jilaSelect');
  const blockSelect = document.getElementById('blockSelect');
  const locationStatus = document.getElementById('locationStatus');

  if (!stateSelect || !parmandalSelect || !jilaSelect || !blockSelect) {
    console.warn('⚠️ One or more Bihar location selects not found; aborting bihar-locations.js');
    return;
  }

  let divisionsData = null; // parmandal -> [districts]
  let blocksData = null;    // district -> [blocks]
  let loaded = false;

  function populateSelect(selectEl, options) {
    selectEl.innerHTML = '<option value="">-- चुनें / Select --</option>';
    options.forEach(optValue => {
      const opt = document.createElement('option');
      opt.value = optValue;
      opt.textContent = optValue;
      selectEl.appendChild(opt);
    });
  }

  function clearSelect(selectEl) {
    selectEl.innerHTML = '<option value="">-- चुनें / Select --</option>';
  }

  function clearDependent(from) {
    // chains: state -> parmandal -> jila -> block
    if (from === 'state') {
      clearSelect(parmandalSelect);
      clearSelect(jilaSelect);
      clearSelect(blockSelect);
    } else if (from === 'parmandal') {
      clearSelect(jilaSelect);
      clearSelect(blockSelect);
    } else if (from === 'jila') {
      clearSelect(blockSelect);
    }
  }

  async function loadData() {
    if (loaded) return;
    try {
      console.log('🔁 Loading Bihar divisions & blocks JSONs');
      const [divRes, blkRes] = await Promise.all([
        fetch('/locations/bihar_divisions.json'),
        fetch('/locations/bihar_blocks.json')
      ]);

      if (!divRes.ok) throw new Error('/locations/bihar_divisions.json fetch failed');
      if (!blkRes.ok) throw new Error('/locations/bihar_blocks.json fetch failed');

      divisionsData = await divRes.json();
      blocksData = await blkRes.json();

      // If blocksData nested under Bihar key, normalize
      if (blocksData && blocksData.Bihar && typeof blocksData.Bihar === 'object') {
        console.log('ℹ️ Normalizing blocksData.Bihar -> blocksData');
        blocksData = blocksData.Bihar;
      }

      loaded = true;
      console.log('✅ Bihar location data loaded', { divisions: Object.keys(divisionsData).length, blocks: Object.keys(blocksData).length });
    } catch (err) {
      console.error('❌ Failed to load Bihar JSONs', err);
      locationStatus.textContent = 'Failed to load Bihar location data.';
      throw err;
    }
  }

  stateSelect.addEventListener('change', async function(){
    const val = this.value;
    console.log('stateSelect changed ->', val);
    if (val === 'Bihar') {
      try {
        await loadData();
        populateSelect(parmandalSelect, Object.keys(divisionsData));
        clearSelect(jilaSelect);
        clearSelect(blockSelect);
        locationStatus.textContent = '';
      } catch (err) {
        console.warn('Could not populate parmandals', err);
      }
    } else {
      clearDependent('state');
      locationStatus.textContent = 'Only Bihar locations supported';
      console.log('Non-Bihar state selected; cleared Bihar-specific selects');
    }
  });

  parmandalSelect.addEventListener('change', function(){
    const par = this.value;
    console.log('parmandalSelect changed ->', par);
    if (par && divisionsData && divisionsData[par]) {
      populateSelect(jilaSelect, divisionsData[par]);
      clearSelect(blockSelect);
      locationStatus.textContent = '';
    } else {
      clearDependent('parmandal');
      locationStatus.textContent = '';
    }
  });

  jilaSelect.addEventListener('change', function(){
    const jila = this.value;
    console.log('jilaSelect changed ->', jila);
    if (jila && blocksData && blocksData[jila] && blocksData[jila].length > 0) {
      populateSelect(blockSelect, blocksData[jila]);
      locationStatus.textContent = `Found ${blocksData[jila].length} blocks for ${jila}`;
    } else {
      clearDependent('jila');
      locationStatus.textContent = 'No blocks available for the selected district.';
    }
  });

  // Preselect if server provided values
  async function applyPreselects() {
    // Wait for data only if state is Bihar or preselect has parmandal/jila
    const pre = window.__NHRA_LOCATION || {};
    const preState = stateSelect.value;
    const p = pre.parmandal || '';
    const j = pre.jila || '';
    const b = pre.block || '';

    if (preState === 'Bihar' || p || j || b) {
      try {
        await loadData();
        // If state is already Bihar, ensure parmandals exist
        if (stateSelect.value === 'Bihar') {
          populateSelect(parmandalSelect, Object.keys(divisionsData));
        }
        if (p && divisionsData[p]) {
          parmandalSelect.value = p;
          parmandalSelect.dispatchEvent(new Event('change'));
        }
        if (j) {
          jilaSelect.value = j;
          jilaSelect.dispatchEvent(new Event('change'));
        }
        if (b) {
          blockSelect.value = b;
        }

        console.log('ℹ️ Applied server preselects', { p, j, b });
      } catch (err) {
        console.warn('⚠️ Preselect application failed', err);
      }
    }
  }

  // On page load, if Bihar is preselected, populate parmandals
  document.addEventListener('DOMContentLoaded', function(){
    if (stateSelect.value === 'Bihar') {
      console.log('DOMContentLoaded: Bihar already selected; populating parmandals');
      loadData().then(() => {
        populateSelect(parmandalSelect, Object.keys(divisionsData));
      }).catch(() => {});
    }

    // Apply server-side preselects if any
    applyPreselects();
  });

})();
