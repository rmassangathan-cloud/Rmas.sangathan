/**
 * Admin User Form - Cascading Location Dropdowns
 * Handles role/level selection and populates location dropdowns
 */

(function(){
  // DOM refs
  const assignedLevel = document.getElementById('assignedLevel');
  const stateGroup = document.getElementById('stateGroup');
  const divisionGroup = document.getElementById('divisionGroup');
  const districtGroup = document.getElementById('districtGroup');
  const blockGroup = document.getElementById('blockGroup');

  const stateSelect = document.getElementById('stateSelect');
  const divisionSelect = document.getElementById('divisionSelect');
  const districtSelect = document.getElementById('districtSelect');
  const blockSelect = document.getElementById('blockSelect');

  const roleSelect = document.getElementById('roleSelect');
  const finalRoleInput = document.getElementById('finalRole');
  const form = document.getElementById('userForm');

  // Endpoints to fetch
  const DIVISIONS_URL = '/admin/locations/divisions';
  const COMPLETE_URL = '/admin/locations/complete';
  const BLOCKS_URL = '/admin/locations/blocks';

  // Data caches
  let divisions = [];
  let biharComplete = {};

  // Populate state (Bihar fixed)
  function populateState() {
    stateSelect.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = 'Bihar';
    opt.textContent = 'Bihar';
    stateSelect.appendChild(opt);
  }

  // Fetch divisions list
  async function loadDivisions() {
    try {
      console.log('📍 Fetching divisions from:', DIVISIONS_URL);
      const res = await fetch(DIVISIONS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      divisions = await res.json();
      console.log('✅ Divisions loaded:', divisions);
    } catch (err) {
      console.error('❌ Error loading divisions:', err);
      console.log('⚠️ Using fallback divisions list');
      divisions = ['Patna','Tirhut','Saran','Darbhanga','Kosi','Purnia','Bhagalpur','Munger','Magadh'];
    }
  }

  // Fetch complete bihar data (divisions -> districts mapping)
  async function loadComplete() {
    try {
      console.log('📍 Fetching complete locations from:', COMPLETE_URL);
      const res = await fetch(COMPLETE_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      biharComplete = await res.json();
      console.log('✅ Complete locations loaded, divisions:', Object.keys(biharComplete.divisions || biharComplete).length);
    } catch (err) {
      console.error('❌ Error loading complete locations:', err);
      biharComplete = {};
    }
  }

  // Fetch blocks file
  async function loadBlocks() {
    try {
      console.log('📍 Fetching blocks from:', BLOCKS_URL);
      const res = await fetch(BLOCKS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.error('❌ Error loading blocks:', err);
      return {};
    }
  }

  // Populate divisions dropdown
  function populateDivisions() {
    divisionSelect.innerHTML = '<option value="">-- Select Division --</option>';
    divisions.forEach(d => {
      const o = document.createElement('option');
      o.value = d;
      o.textContent = d;
      divisionSelect.appendChild(o);
    });
  }

  // Populate districts for a division
  function populateDistricts(divisionName) {
    districtSelect.innerHTML = '<option value="">-- Select District --</option>';
    if (!divisionName) return;

    let districts = [];
    
    // biharComplete structure: { "Patna": { "Patna": [...blocks], "Nalanda": [...blocks] }, ... }
    // So biharComplete[divisionName] gives us { "Patna": [...], "Nalanda": [...], ... }
    // The keys of that object are the district names
    try {
      if (biharComplete && biharComplete[divisionName]) {
        // Get all keys (district names) from this division
        districts = Object.keys(biharComplete[divisionName]).sort();
        console.log(`✅ Found ${districts.length} districts in ${divisionName}:`, districts);
      } else {
        console.warn(`⚠️ Division "${divisionName}" not found in biharComplete. Available divisions:`, Object.keys(biharComplete));
      }
    } catch (e) {
      console.error('❌ Error extracting districts:', e);
    }

    if (!districts || districts.length === 0) {
      console.warn('⚠️ No districts found, using fallback');
      districts = ['(No district data available)'];
    }

    districts.forEach(d => {
      const o = document.createElement('option');
      o.value = d;
      o.textContent = d;
      districtSelect.appendChild(o);
    });
  }

  // Populate blocks for a district
  async function populateBlocks(divisionName, districtName) {
    blockSelect.innerHTML = '<option value="">-- Select Block --</option>';
    if (!districtName || !divisionName) return;

    let blocks = [];
    
    // biharComplete structure: { "Patna": { "Patna": ["Block1", "Block2", ...], ... }, ... }
    // So biharComplete[divisionName][districtName] gives us the array of blocks
    try {
      if (biharComplete && biharComplete[divisionName] && Array.isArray(biharComplete[divisionName][districtName])) {
        blocks = biharComplete[divisionName][districtName];
        console.log(`✅ Found ${blocks.length} blocks in ${divisionName}/${districtName}:`, blocks);
      } else {
        console.warn(`⚠️ District "${districtName}" in division "${divisionName}" not found. Available:`, 
          biharComplete[divisionName] ? Object.keys(biharComplete[divisionName]) : 'No division data');
      }
    } catch (e) {
      console.error('❌ Error extracting blocks:', e);
    }

    if (!blocks || blocks.length === 0) {
      console.warn('⚠️ No blocks found, using fallback');
      blocks = ['(No block data available)'];
    }

    blocks.forEach(b => {
      const o = document.createElement('option');
      o.value = b;
      o.textContent = b;
      blockSelect.appendChild(o);
    });
  }

  // UI show/hide based on level
  function showForLevel(level) {
    stateGroup.style.display = 'none';
    divisionGroup.style.display = 'none';
    districtGroup.style.display = 'none';
    blockGroup.style.display = 'none';

    if (!level) return;

    if (level === 'state') {
      stateGroup.style.display = 'block';
    } else if (level === 'division') {
      stateGroup.style.display = 'block';
      divisionGroup.style.display = 'block';
    } else if (level === 'district') {
      stateGroup.style.display = 'block';
      divisionGroup.style.display = 'block';
      districtGroup.style.display = 'block';
    } else if (level === 'block') {
      stateGroup.style.display = 'block';
      divisionGroup.style.display = 'block';
      districtGroup.style.display = 'block';
      blockGroup.style.display = 'block';
    }
  }

  // Compose final role from assignedLevel + roleSelect
  function computeFinalRole() {
    const level = assignedLevel.value;
    const roleFace = roleSelect.value;
    if (!level || !roleFace) return '';
    return `${level}_${roleFace}`;
  }

  // Validation helpers
  function isEmailValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Event handlers
  assignedLevel.addEventListener('change', async function() {
    const level = this.value;
    console.log('🔄 Assigned Level changed to:', level);
    
    showForLevel(level);
    console.log('📊 showForLevel() called, stateGroup display:', stateGroup.style.display, 'divisionGroup display:', divisionGroup.style.display);

    populateState();

    // Load divisions for division/district/block levels
    if (level === 'division' || level === 'district' || level === 'block') {
      console.log('📥 Loading divisions (divisions.length before:', divisions.length, ')');
      if (divisions.length === 0) await loadDivisions();
      console.log('📥 Populating divisions dropdown (divisions.length after load:', divisions.length, ')');
      populateDivisions();
      console.log('✅ Divisions populated, divisionSelect options:', divisionSelect.options.length);
    }

    // Load complete location hierarchy (needed for district/block lookups)
    // We need this for ALL non-state levels so we can show districts when division is selected
    if (level === 'division' || level === 'district' || level === 'block') {
      console.log('📥 Loading complete locations (biharComplete size before:', Object.keys(biharComplete).length, ')');
      if (!biharComplete || Object.keys(biharComplete).length === 0) {
        await loadComplete();
        console.log('📥 Complete locations loaded (biharComplete size after:', Object.keys(biharComplete).length, ')');
      } else {
        console.log('✅ Complete locations already in cache');
      }
    }

    // Reset lower selects
    divisionSelect.value = '';
    districtSelect.value = '';
    blockSelect.value = '';
  });

  divisionSelect.addEventListener('change', function() {
    const divisionName = this.value;
    if (!divisionName) {
      districtSelect.innerHTML = '<option value="">-- Select District --</option>';
      return;
    }

    populateDistricts(divisionName);
    blockSelect.innerHTML = '<option value="">-- Select Block --</option>';
  });

  districtSelect.addEventListener('change', function() {
    const divisionName = divisionSelect.value;
    const districtName = this.value;
    if (!districtName) {
      blockSelect.innerHTML = '<option value="">-- Select Block --</option>';
      return;
    }
    populateBlocks(divisionName, districtName);
  });

  // Form submit: validate and submit
  form.addEventListener('submit', function(e) {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const level = assignedLevel.value;
    const roleFace = roleSelect.value;

    if (!name) {
      alert('Name is required');
      e.preventDefault(); 
      return;
    }
    if (!email || !isEmailValid(email)) {
      alert('Valid email is required');
      e.preventDefault(); 
      return;
    }
    if (!roleFace) {
      alert('Role selection is required');
      e.preventDefault(); 
      return;
    }
    if (!level) {
      alert('Assigned level is required');
      e.preventDefault(); 
      return;
    }

    // Determine the assignedId value based on selected level
    let assignedId = null;
    if (level === 'state') {
      if (!stateSelect.value) { alert('State must be selected'); e.preventDefault(); return; }
      assignedId = stateSelect.value;
    } else if (level === 'division') {
      if (!divisionSelect.value) { alert('Division must be selected'); e.preventDefault(); return; }
      assignedId = divisionSelect.value;
    } else if (level === 'district') {
      if (!divisionSelect.value) { alert('Division must be selected'); e.preventDefault(); return; }
      if (!districtSelect.value) { alert('District must be selected'); e.preventDefault(); return; }
      assignedId = districtSelect.value;
    } else if (level === 'block') {
      if (!divisionSelect.value) { alert('Division must be selected'); e.preventDefault(); return; }
      if (!districtSelect.value) { alert('District must be selected'); e.preventDefault(); return; }
      if (!blockSelect.value) { alert('Block must be selected'); e.preventDefault(); return; }
      assignedId = blockSelect.value;
    }

    if (!assignedId) {
      alert('Unable to determine assigned entity. Please reselect.');
      e.preventDefault(); 
      return;
    }

    const finalRole = computeFinalRole();
    if (!finalRole) {
      alert('Unable to compute role. Please ensure Role and Assigned Level are selected.');
      e.preventDefault(); 
      return;
    }

    // Set hidden fields for submission
    document.getElementById('finalRole').value = finalRole;
    document.getElementById('hiddenAssignedLevel').value = level;
    document.getElementById('hiddenAssignedId').value = assignedId;

    console.log('✅ Form ready to submit:', {
      name,
      email,
      password: password ? '***hidden***' : '(empty - will use default)',
      role: finalRole,
      assignedLevel: level,
      assignedId: assignedId
    });

    // Log the actual form data that will be sent
    const formData = new FormData(form);
    console.log('📤 Form submission data:');
    for (let [key, value] of formData.entries()) {
      if (key === 'password') {
        console.log(`  ${key}: ***hidden***`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
  });

  // Initialize
  (async function init(){
    console.log('🚀 Admin user form initialized');
    populateState();
    if (assignedLevel.value) {
      const ev = new Event('change');
      assignedLevel.dispatchEvent(ev);
    }
  })();

})();
