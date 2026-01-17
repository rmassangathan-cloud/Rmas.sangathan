document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('resend-joining-btn');
  if (!btn) return;

  const formId = btn.getAttribute('data-form-id');
  const email = btn.getAttribute('data-email');

  btn.addEventListener('click', async function () {
    if (!confirm(`Are you sure you want to resend the joining letter to ${email || 'the applicant'}?`)) return;
    btn.disabled = true; btn.innerText = 'Sending...';
    try {
      const res = await fetch(`/admin/forms/${formId}/resend-joining-letter`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert(data.msg || 'Joining letter resent successfully');
        window.location.reload();
      } else {
        alert('Failed: ' + (data.msg || res.statusText));
      }
    } catch (e) {
      alert('Error sending email: ' + e.message);
    } finally {
      btn.disabled = false; btn.innerText = '📨 Resend Joining Letter';
    }
  });
});