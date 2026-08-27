document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', () => {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn && !form.classList.contains('no-loading')) {
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Carregando...';
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }, 5000);
      }
    });
  });

  const inputs = document.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    input.addEventListener('invalid', (e) => {
      e.target.setCustomValidity('');
      if (!e.target.validity.valid) {
        let message = 'Campo inválido';
        if (e.target.validity.valueMissing) message = 'Este campo é obrigatório';
        else if (e.target.validity.typeMismatch) message = 'Formato inválido';
        else if (e.target.validity.tooShort) message = `Mínimo ${e.target.minLength} caracteres`;
        else if (e.target.validity.patternMismatch) message = 'Formato inválido (ex: CTF{...})';
        e.target.setCustomValidity(message);
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-copy]')) {
      const text = e.target.dataset.copy;
      navigator.clipboard.writeText(text).then(() => {
        const original = e.target.textContent;
        e.target.textContent = 'Copiado!';
        setTimeout(() => e.target.textContent = original, 2000);
      });
    }
  });

  const observeElements = document.querySelectorAll('.fade-in');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  observeElements.forEach(el => observer.observe(el));
});

window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
});