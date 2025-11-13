(function () {
  const BUTTON_SELECTOR = '[data-install-button]';

  const setButtonsState = (buttons, available) => {
    buttons.forEach((button) => {
      button.classList.toggle('hidden', !available);
      button.disabled = !available;
      if (!available) {
        button.classList.remove('opacity-70', 'cursor-not-allowed');
      }
    });
  };

  const setButtonsLoading = (buttons, isLoading) => {
    buttons.forEach((button) => {
      button.classList.toggle('opacity-70', isLoading);
      button.classList.toggle('cursor-not-allowed', isLoading);
    });
  };

  const initInstallButtons = () => {
    const buttons = Array.from(document.querySelectorAll(BUTTON_SELECTOR));
    if (!buttons.length) return;

    const refreshButtons = () => {
      const available = Boolean(window.deferredPWAInstallPrompt);
      setButtonsState(buttons, available);
    };

    const handleClick = async (event) => {
      event.preventDefault();
      const promptEvent = window.deferredPWAInstallPrompt;
      if (!promptEvent) {
        refreshButtons();
        return;
      }

      setButtonsLoading(buttons, true);
      try {
        promptEvent.prompt();
        await promptEvent.userChoice;
      } catch (error) {
        console.error('Gagal menampilkan prompt install PWA', error);
      } finally {
        window.deferredPWAInstallPrompt = null;
        setButtonsLoading(buttons, false);
        refreshButtons();
      }
    };

    buttons.forEach((button) => {
      button.addEventListener('click', handleClick);
    });

    document.addEventListener('pwa-install-ready', refreshButtons);
    window.addEventListener('appinstalled', () => {
      window.deferredPWAInstallPrompt = null;
      refreshButtons();
    });

    refreshButtons();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInstallButtons);
  } else {
    initInstallButtons();
  }
})();
