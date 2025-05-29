  document.addEventListener('DOMContentLoaded', function () {
    const clickables = document.querySelectorAll('.clickable-row, .clickable-card');

    clickables.forEach(el => {
      el.addEventListener('click', function (event) {
        const isInteractiveElement = event.target.closest('a, button, .send-message, .profileBtn, .listBtn');
        if (isInteractiveElement) return;

        const href = this.getAttribute('data-href');
        if (href) {
          window.location.href = href;
        }
      });
    });
  });