export function showFatalError(ui, message, error) {
  ui.errorMessage.textContent = message;
  ui.errorDetails.textContent = error?.stack || error?.message || String(error || '');
  ui.errorOverlay.classList.add('visible');
}

export function clearFatalError(ui) {
  ui.errorOverlay.classList.remove('visible');
  ui.errorMessage.textContent = '';
  ui.errorDetails.textContent = '';
}
