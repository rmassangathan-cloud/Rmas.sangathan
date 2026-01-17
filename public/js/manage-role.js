document.addEventListener('DOMContentLoaded', function() {
  const categorySelect = document.getElementById('categorySelect');
  const roleSelect = document.getElementById('roleSelect');
  const teamSection = document.getElementById('teamSection');
  const teamSelect = document.getElementById('teamSelect');
  const levelSelect = document.getElementById('levelSelect');

  // Get location section elements
  const stateSection = document.getElementById('stateSection');
  const divisionSection = document.getElementById('divisionSection');
  const districtSection = document.getElementById('districtSection');
  const blockSection = document.getElementById('blockSection');
  const stateSelect = document.getElementById('stateSelect');
  const divisionSelect = document.getElementById('divisionSelect');
  const districtSelect = document.getElementById('districtSelect');
  const blockSelect = document.getElementById('blockSelect');

  // Load roles when category changes
  if (categorySelect) {
    categorySelect.addEventListener('change', function() {
      const category = this.value;
      console.log('Category changed to:', category);

      if (!category) {
        roleSelect.innerHTML = '<option value="">-- Select Category First --</option>';
        teamSection.style.display = 'none';
        return;
      }

      console.log('Fetching roles for category:', category);
      fetch(`/admin/roles?category=${encodeURIComponent(category)}`, { credentials: 'same-origin' })
        .then(async response => {
          console.log('Response status:', response.status);
          if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`Bad response ${response.status}: ${text}`);
          }
          return response.json();
        })
        .then(roles => {
          console.log('Received roles:', roles);
          roleSelect.innerHTML = '<option value="">-- Select Role --</option>';
          if (!Array.isArray(roles) || roles.length === 0) {
            roleSelect.innerHTML = '<option value="">-- No roles available for this category --</option>';
            teamSection.style.display = 'none';
            return;
          }

          roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.code;
            option.textContent = role.name;
            roleSelect.appendChild(option);
          });

          // If there is a currently assigned role, select it
          const selectedRole = roleSelect.dataset ? roleSelect.dataset.selectedRole : null;
          if (selectedRole) {
            roleSelect.value = selectedRole;
            // show team section if role exists
            if (selectedRole) teamSection.style.display = 'block';
          }

          console.log('Role options populated');
        })
        .catch(err => {
          console.error('Error loading roles:', err);
          roleSelect.innerHTML = '<option value="">-- Error loading roles --</option>';
          teamSection.style.display = 'none';
        });
    });
  }

  // Show team section when role changes
  if (roleSelect) {
    roleSelect.addEventListener('change', function() {
      const role = this.value;
      if (!role) {
        teamSection.style.display = 'none';
        return;
      }

      // Some roles may be media-only or not allow assignment; leave visibility decision to server-side later
      teamSection.style.display = 'block';
    });
  }

  // Progressive location cascading based on level
  if (levelSelect) {
    levelSelect.addEventListener('change', function() {
      const level = this.value;

      // Hide all location sections first
      if (stateSection) stateSection.style.display = 'none';
      if (divisionSection) divisionSection.style.display = 'none';
      if (districtSection) districtSection.style.display = 'none';
      if (blockSection) blockSection.style.display = 'none';

      if (!level) return;

      // Show sections based on level
      if (level === 'state') {
        if (stateSection) stateSection.style.display = 'block';
      } else if (level === 'division') {
        if (stateSection) stateSection.style.display = 'block';
        if (divisionSection) divisionSection.style.display = 'block';
        loadDivisions();
      } else if (level === 'district') {
        if (stateSection) stateSection.style.display = 'block';
        if (divisionSection) divisionSection.style.display = 'block';
        if (districtSection) districtSection.style.display = 'block';
        loadDivisions();
      } else if (level === 'block') {
        if (stateSection) stateSection.style.display = 'block';
        if (divisionSection) divisionSection.style.display = 'block';
        if (districtSection) districtSection.style.display = 'block';
        if (blockSection) blockSection.style.display = 'block';
        loadDivisions();
      }
    });
  }

  // Load divisions when state changes
  if (stateSelect) {
    stateSelect.addEventListener('change', function() {
      if (divisionSection && divisionSection.style.display !== 'none') {
        loadDivisions();
      }
    });
  }

  // Load districts when division changes
  if (divisionSelect) {
    divisionSelect.addEventListener('change', function() {
      if (districtSection && districtSection.style.display !== 'none') {
        loadDistricts();
      }
    });
  }

  // Load blocks when district changes
  if (districtSelect) {
    districtSelect.addEventListener('change', function() {
      if (blockSection && blockSection.style.display !== 'none') {
        loadBlocks();
      }
    });
  }

  function loadDivisions() {
    fetch('/admin/locations?level=division', { credentials: 'same-origin' })
      .then(response => response.json())
      .then(divisions => {
        if (!divisionSelect) return;
        divisionSelect.innerHTML = '<option value="">-- Select Division --</option>';
        divisions.forEach(division => {
          const option = document.createElement('option');
          option.value = division;
          option.textContent = division;
          divisionSelect.appendChild(option);
        });
      })
      .catch(err => {
        console.error('Error loading divisions:', err);
        if (divisionSelect) divisionSelect.innerHTML = '<option value="">-- Error loading divisions --</option>';
      });
  }

  function loadDistricts() {
    const division = divisionSelect ? divisionSelect.value : null;
    if (!division) {
      if (districtSelect) districtSelect.innerHTML = '<option value="">-- Select Division First --</option>';
      return;
    }

    fetch(`/admin/locations?level=district&division=${encodeURIComponent(division)}`, { credentials: 'same-origin' })
      .then(response => response.json())
      .then(districts => {
        if (!districtSelect) return;
        districtSelect.innerHTML = '<option value="">-- Select District --</option>';
        districts.forEach(district => {
          const option = document.createElement('option');
          option.value = district;
          option.textContent = district;
          districtSelect.appendChild(option);
        });
      })
      .catch(err => {
        console.error('Error loading districts:', err);
        if (districtSelect) districtSelect.innerHTML = '<option value="">-- Error loading districts --</option>';
      });
  }

  function loadBlocks() {
    const district = districtSelect ? districtSelect.value : null;
    if (!district) {
      if (blockSelect) blockSelect.innerHTML = '<option value="">-- Select District First --</option>';
      return;
    }

    fetch(`/admin/locations?level=block&district=${encodeURIComponent(district)}`, { credentials: 'same-origin' })
      .then(response => response.json())
      .then(blocks => {
        if (!blockSelect) return;
        blockSelect.innerHTML = '<option value="">-- Select Block --</option>';
        blocks.forEach(block => {
          const option = document.createElement('option');
          option.value = block;
          option.textContent = block;
          blockSelect.appendChild(option);
        });
      })
      .catch(err => {
        console.error('Error loading blocks:', err);
        if (blockSelect) blockSelect.innerHTML = '<option value="">-- Error loading blocks --</option>';
      });
  }

  // Form submission
  const roleForm = document.getElementById('roleForm');
  if (roleForm) {
    roleForm.addEventListener('submit', function(e) {
      const submitBtn = this.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Assigning...';
      }
    });
  }
});