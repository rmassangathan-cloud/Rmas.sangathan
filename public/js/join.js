document.addEventListener('DOMContentLoaded', function(){
    const form = document.getElementById('membershipForm');
    if (!form) return;

    // Fetch small preselect JSON from data attribute (CSP-safe)
    let pre = {};
    try {
        pre = form.dataset.rmasLocation ? JSON.parse(form.dataset.rmasLocation) : {};
    } catch (err) {
        console.warn('Failed to parse preselects on form:', err);
    }

    // Expose for compatibility with older scripts
    window.__RMAS_LOCATION = pre;

    const submitBtn = document.getElementById('submitBtn');
    const agreed = document.getElementById('agreedToTerms');
    const photoInput = document.getElementById('photoInput');
    const photoPreviewImg = document.getElementById('photoPreviewImg');

    // Debug: indicate handler is attached
    console.log('join.js: initialized, preselects=', pre);

    // Re-create modal helper (same as previous inline implementation)
    function showModal(title, message) {
        let modal = document.getElementById('rmasModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'rmasModal';
            modal.style.position = 'fixed';
            modal.style.left = '0';
            modal.style.top = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.background = 'rgba(0,0,0,0.5)';
            modal.style.zIndex = '9999';
            const inner = document.createElement('div');
            inner.style.background = '#fff';
            inner.style.padding = '20px';
            inner.style.borderRadius = '8px';
            inner.style.maxWidth = '600px';
            inner.style.width = '90%';
            inner.id = 'rmasModalInner';
            modal.appendChild(inner);
            document.body.appendChild(modal);
            modal.addEventListener('click', function(e){ if (e.target === modal) modal.style.display = 'none'; });
        }
        const inner = document.getElementById('rmasModalInner');
        inner.innerHTML = `<h3 style="margin-top:0">${title}</h3><pre style="white-space:pre-wrap">${message}</pre><div style="text-align:right;margin-top:12px;"><button id="rmasModalClose" class="btn">Close</button></div>`;
        modal.style.display = 'flex';
        document.getElementById('rmasModalClose').addEventListener('click', function(){ modal.style.display = 'none'; });
    }

    // Submit handling (same logic as previous inline version)
    form.addEventListener('submit', function(e){
        console.log('Join form: submit handler triggered (external)');
        e.preventDefault();

        // Clear previous error highlights
        document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
        const statusEl = document.getElementById('locationStatus');
        if (statusEl) { statusEl.textContent = ''; statusEl.style.color = '#666'; }

        console.log('Join form: starting validation');
        const errors = [];
        const requiredFields = [
            { name: 'fullName', label: 'Full name' },
            { name: 'fatherName', label: 'Father/Husband name' },
            { name: 'dob', label: 'Date of birth' },
            { name: 'gender', label: 'Gender' },
            { name: 'mobile', label: 'Mobile' },
            { name: 'email', label: 'Email' },
            { name: 'state', label: 'State' },
            { name: 'parmandal', label: 'Parm' },
            { name: 'jila', label: 'District' },
            { name: 'block', label: 'Block' },
            { name: 'reason', label: 'Reason' },
            { name: 'agreedToTerms', label: 'Agreement' }
        ];

        requiredFields.forEach(f => {
            const el = form.querySelector(`[name="${f.name}"]`);
            if (!el) return;
            let ok = true;
            if (el.type === 'checkbox') ok = el.checked;
            else if (el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                ok = (el.value && el.value.toString().trim().length > 0);
            }
            if (!ok) {
                errors.push(f.label + ' is required');
                el.classList.add('input-error');
            }
        });

        // Files validation: if inputs exist and required attr present
        const docsInput = document.getElementById('documentsInput');
        if (photoInput && photoInput.required && (!photoInput.files || photoInput.files.length === 0)) {
            errors.push('Passport-size photo is required');
            photoInput.classList.add('input-error');
        }
        if (docsInput && docsInput.required && (!docsInput.files || docsInput.files.length === 0)) {
            errors.push('Documents PDF is required');
            docsInput.classList.add('input-error');
        }

        if (errors.length > 0) {
            // Show a popup with errors and highlight fields
            showModal('Submission failed', errors.join('\n'));
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'आवेदन जमा करें'; }
            return;
        }

        // Build FormData and send via fetch
        console.log('Join form: validation passed, creating FormData');
        const fd = new FormData(form);
        for (const pair of fd.entries()) { console.log('FormData entry', pair[0], pair[1]); }
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'सबमिट किया जा रहा है...'; }
        console.log('Join form: sending fetch to /join');

        fetch('/join', { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'Accept': 'application/json' } })
            .then(async res => {
                console.log('Join form: fetch response status', res.status);
                const contentType = res.headers.get('content-type') || '';
                console.log('Join form: response content-type', contentType);
                if (contentType.includes('application/json')) {
                    const json = await res.json();
                    console.log('Join form: parsed JSON response', json);
                    return json;
                }
                // fallback: if server returns HTML (non-AJAX), assume navigation will happen; show generic message
                return { ok: true, msg: 'Submitted (server returned non-JSON). If you see the form page again, check for errors.' };
            })
            .then(json => {
                if (json.ok) {
                    showModal('Submission successful', json.msg || 'Your application has been submitted successfully.');
                    // Optionally clear form after success
                    form.reset();
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'आवेदन जमा करें'; }
                } else {
                    // Show server-side validation errors
                    const msgs = json.errors ? json.errors.join('\n') : (json.msg || 'Submission failed');
                    showModal('Submission failed', msgs);
                    // Highlight fields indicated by server
                    if (json.fields) {
                        Object.keys(json.fields).forEach(k => {
                            const el = form.querySelector(`[name="${k}"]`);
                            if (el) el.classList.add('input-error');
                        });
                    }
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'आवेदन जमा करें'; }
                }
            })
            .catch(err => {
                console.error('Submission error:', err);
                showModal('Submission error', 'Network or server error occurred. Please try again.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'आवेदन जमा करें'; }
            });
    });

    if (photoInput) {
        photoInput.addEventListener('change', function(){
            const file = this.files && this.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) { alert('Please select an image file'); this.value = ''; return; }
            // client-side size limit 1MB
            if (file.size > 1 * 1024 * 1024) { alert('Image too large. Maximum 1MB allowed.'); this.value = ''; return; }
            const reader = new FileReader();
            reader.onload = function(ev){ if (photoPreviewImg) photoPreviewImg.src = ev.target.result; };
            reader.readAsDataURL(file);
        });
    }

    const documentsInput = document.getElementById('documentsInput');
    if (documentsInput) {
        documentsInput.addEventListener('change', function(){
            const f = this.files && this.files[0];
            if (!f) return;
            if (f.type !== 'application/pdf') { alert('Please upload a PDF containing Aadhaar and Character Certificate.'); this.value = ''; return; }
            if (f.size > 1 * 1024 * 1024) { alert('File too large. Maximum 1MB allowed.'); this.value = ''; return; }
        });
    }

    // mobile input sanitization
    const mobileInput = form.querySelector('input[name="mobile"]');
    if (mobileInput) {
        mobileInput.addEventListener('input', function(){ this.value = this.value.replace(/[^0-9+\s-]/g, ''); });
    }

    // If bihar-locations provides helpers / preselects, they will read window.__RMAS_LOCATION
    // so we keep window.__RMAS_LOCATION assigned above
});