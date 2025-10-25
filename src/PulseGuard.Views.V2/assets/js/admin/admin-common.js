"use strict";

/**
 * Common utilities for admin pages
 * Shared functions to reduce code duplication across editor pages
 */
const AdminCommon = (function () {
  // Constants
  const TOAST_DURATION = 3000;
  const REDIRECT_DELAY = 1500;
  const DEBOUNCE_DELAY = 300;

  /**
   * Shows a toast notification
   * @param {string} title - Toast title
   * @param {string} message - Toast message
   * @param {('success'|'danger'|'warning'|'info')} type - Toast type
   */
  function showToast(title, message, type = 'info') {
    if (typeof bootstrap !== 'undefined' && bootstrap.showToast) {
      bootstrap.showToast({
        header: title,
        body: message,
        toastClass: `toast-${type}`
      });
    } else {
      console.warn('Bootstrap toast not available:', { title, message, type });
    }
  }

  /**
   * Shows a success toast notification
   * @param {string} message - Success message
   */
  function showSuccess(message) {
    showToast('Success', message, 'success');
  }

  /**
   * Shows an error toast notification
   * @param {string} message - Error message
   */
  function showError(message) {
    showToast('Error', message, 'danger');
  }

  /**
   * Shows a warning toast notification
   * @param {string} message - Warning message
   */
  function showWarning(message) {
    showToast('Warning', message, 'warning');
  }

  /**
   * Shows a loading spinner and hides form/content
   * @param {string} spinnerId - ID of the spinner element
   * @param {string[]} hideElementIds - Array of element IDs to hide
   */
  function showLoading(spinnerId = 'loading-spinner', hideElementIds = []) {
    const spinner = document.getElementById(spinnerId);
    if (spinner) {
      spinner.classList.remove('d-none');
    }

    hideElementIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.add('d-none');
      }
    });
  }

  /**
   * Hides a loading spinner and shows form/content
   * @param {string} spinnerId - ID of the spinner element
   * @param {string[]} showElementIds - Array of element IDs to show
   */
  function hideLoading(spinnerId = 'loading-spinner', showElementIds = []) {
    const spinner = document.getElementById(spinnerId);
    if (spinner) {
      spinner.classList.add('d-none');
    }

    showElementIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.remove('d-none');
      }
    });
  }

  /**
   * Shows an error message and hides loading/form
   * @param {string} message - Error message to display
   * @param {string} errorId - ID of error message container
   * @param {string} errorTextId - ID of error text element
   * @param {string[]} hideElementIds - Array of element IDs to hide
   */
  function showErrorMessage(message, errorId = 'error-message', errorTextId = 'error-text', hideElementIds = []) {
    hideElementIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.add('d-none');
      }
    });

    const errorDiv = document.getElementById(errorId);
    const errorText = document.getElementById(errorTextId);
    
    if (errorDiv) {
      errorDiv.classList.remove('d-none');
    }
    if (errorText) {
      errorText.textContent = message;
    }
  }

  /**
   * Sets the submit button loading state
   * @param {HTMLFormElement} form - The form element
   * @param {boolean} loading - Loading state
   * @param {string} loadingText - Text to show during loading
   * @param {string} normalText - Text to show when not loading
   */
  function setSubmitLoading(form, loading, loadingText = 'Saving...', normalText = 'Save') {
    if (!form) return;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    submitBtn.disabled = loading;
    if (loading) {
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${loadingText}`;
    } else {
      submitBtn.innerHTML = `<i class="bi bi-save"></i> ${normalText}`;
    }
  }

  /**
   * Shows a Bootstrap modal
   * @param {string} modalId - ID of the modal element
   * @returns {bootstrap.Modal|null} Modal instance or null if not found
   */
  function showModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) {
      console.error(`Modal with ID '${modalId}' not found`);
      return null;
    }
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    return modal;
  }

  /**
   * Hides a Bootstrap modal
   * @param {string} modalId - ID of the modal element
   */
  function hideModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) return;
    
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    }
  }

  /**
   * Initializes Bootstrap tooltips for elements with data-bs-toggle="tooltip"
   * @param {HTMLElement} container - Container element (defaults to document)
   */
  function initializeTooltips(container = document) {
    const tooltipTriggerList = container.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
  }

  /**
   * Escapes HTML to prevent XSS attacks
   * @param {string} text - Text to escape
   * @returns {string} Escaped HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Makes an API call with standardized error handling
   * @param {string} url - API endpoint URL
   * @param {Object} options - Fetch options
   * @param {string} successMessage - Success message to show
   * @param {string} errorPrefix - Error message prefix
   * @returns {Promise<Response>} Fetch response
   */
  async function apiCall(url, options = {}, successMessage = null, errorPrefix = 'Operation failed') {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `${errorPrefix}: ${response.statusText}`);
      }

      if (successMessage) {
        showSuccess(successMessage);
      }

      return response;
    } catch (error) {
      console.error(`${errorPrefix}:`, error);
      showError(`${errorPrefix}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Redirects to a URL after a delay
   * @param {string} url - URL to redirect to
   * @param {number} delay - Delay in milliseconds
   */
  function redirectAfterDelay(url, delay = REDIRECT_DELAY) {
    setTimeout(() => {
      window.location.href = url;
    }, delay);
  }

  /**
   * Debounces a function call
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(func, wait = DEBOUNCE_DELAY) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Validates a URL
   * @param {string} url - URL to validate
   * @param {string} fieldName - Field name for error message
   * @returns {boolean} Validation result
   */
  function validateUrl(url, fieldName = 'URL') {
    try {
      new URL(url);
      return true;
    } catch {
      showError(`${fieldName} must be a valid URL`);
      return false;
    }
  }

  /**
   * Shows a delete button in header for update mode
   * @param {string} buttonId - ID of the delete button
   */
  function showDeleteButton(buttonId = 'header-delete-btn') {
    const deleteBtn = document.getElementById(buttonId);
    if (deleteBtn) {
      deleteBtn.classList.remove('d-none');
      new bootstrap.Tooltip(deleteBtn);
    }
  }

  /**
   * Sets button loading state
   * @param {string} buttonId - ID of the button
   * @param {boolean} loading - Loading state
   * @param {string} loadingText - Text to show during loading
   * @param {string} normalText - Text to show when not loading
   * @param {string} normalIcon - Icon class for normal state
   */
  function setButtonLoading(buttonId, loading, loadingText = 'Loading...', normalText = 'Submit', normalIcon = 'bi-check') {
    const button = document.getElementById(buttonId);
    if (!button) return;

    button.disabled = loading;
    if (loading) {
      button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${loadingText}`;
    } else {
      button.innerHTML = `<i class="bi ${normalIcon}"></i> ${normalText}`;
    }
  }

  /**
   * Compares two values for sorting
   * @param {any} a - First value
   * @param {any} b - Second value
   * @returns {number} Comparison result (-1, 0, 1)
   */
  function compareValues(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  // Public API
  return {
    // Constants
    TOAST_DURATION,
    REDIRECT_DELAY,
    DEBOUNCE_DELAY,

    // Toast functions
    showToast,
    showSuccess,
    showError,
    showWarning,

    // Loading functions
    showLoading,
    hideLoading,
    showErrorMessage,
    setSubmitLoading,

    // Modal functions
    showModal,
    hideModal,
    initializeTooltips,

    // Utility functions
    escapeHtml,
    apiCall,
    redirectAfterDelay,
    debounce,

    // Validation functions
    validateUrl,

    // UI helpers
    showDeleteButton,
    setButtonLoading,
    compareValues
  };
})();
