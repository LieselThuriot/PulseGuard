"use strict";

(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'create'; // create or update
  const id = urlParams.get('id'); // for update mode

  let isUpdateMode = mode === 'update';

  // Constants
  const HEADER_ROW_CLASS = 'pulse-header-row';

  // Cache DOM elements
  const elements = {
    pageTitle: document.getElementById('page-title'),
    pulseForm: document.getElementById('pulse-form'),
    pulseType: document.getElementById('pulse-type'),
    pulseGroup: document.getElementById('pulse-group'),
    pulseName: document.getElementById('pulse-name'),
    pulseLocation: document.getElementById('pulse-location'),
    pulseTimeout: document.getElementById('pulse-timeout'),
    pulseDegrationTimeout: document.getElementById('pulse-degration-timeout'),
    pulseComparison: document.getElementById('pulse-comparison'),
    pulseComparisonGroup: document.getElementById('pulse-comparison-group'),
    pulseEnabled: document.getElementById('pulse-enabled'),
    pulseFlakyDetection: document.getElementById('pulse-flaky-detection'),
    pulseHeadersContainer: document.getElementById('pulse-headers-container'),
    addPulseHeaderBtn: document.getElementById('add-pulse-header'),
    headerDeleteBtn: document.getElementById('header-delete-btn'),
    deleteConfirmBtn: document.getElementById('delete-confirm'),
    submitBtn: document.getElementById('submit-btn'),
    loadingSpinner: document.getElementById('loading-spinner'),
    errorMessage: document.getElementById('error-message'),
    errorText: document.getElementById('error-text')
  };

  // Initialize
  initialize();

  function initialize() {
    if (isUpdateMode && !id) {
      AdminCommon.showErrorMessage('Invalid parameters for update mode', 'error-message', 'error-text', ['loading-spinner', 'pulse-form']);
      return;
    }

    updatePageTitle();
    setupEventListeners();

    if (isUpdateMode) {
      loadConfigurationForEdit();
    } else {
      AdminCommon.hideLoading('loading-spinner', ['pulse-form']);
    }
  }

  function updatePageTitle() {
    const title = isUpdateMode ? 'Update Pulse Configuration' : 'Create Pulse Configuration';
    if (elements.pageTitle) elements.pageTitle.textContent = title;
    document.title = `PulseGuard - ${title}`;
  }

  function setupEventListeners() {
    elements.pulseForm?.addEventListener('submit', handlePulseSubmit);
    elements.pulseType?.addEventListener('change', handlePulseTypeChange);
    elements.addPulseHeaderBtn?.addEventListener('click', addHeaderRow);
    elements.headerDeleteBtn?.addEventListener('click', handleDeleteClick);
    elements.deleteConfirmBtn?.addEventListener('click', handleDeleteConfirm);

    // Header removal (delegated)
    document.addEventListener('click', (e) => {
      if (e.target.closest('.remove-header')) {
        e.target.closest('.input-group').remove();
      }
    });
  }

  function handlePulseTypeChange(e) {
    const checkType = e.target.value;

    if (checkType === 'Json' || checkType === 'Contains') {
      elements.pulseComparisonGroup?.classList.remove('d-none');
      if (elements.pulseComparison) elements.pulseComparison.required = true;
    } else {
      elements.pulseComparisonGroup?.classList.add('d-none');
      if (elements.pulseComparison) {
        elements.pulseComparison.required = false;
        elements.pulseComparison.value = '';
      }
    }
  }

  function addHeaderRow() {
    if (!elements.pulseHeadersContainer) return;
    
    const newRow = document.createElement('div');
    newRow.className = `input-group mb-2 ${HEADER_ROW_CLASS}`;
    newRow.innerHTML = `
      <input type="text" class="form-control header-name" placeholder="Header name">
      <input type="text" class="form-control header-value" placeholder="Header value">
      <button class="btn btn-outline-danger remove-header" type="button">
        <i class="bi bi-trash"></i>
      </button>
    `;
    elements.pulseHeadersContainer.appendChild(newRow);
  }

  function collectHeaders() {
    const headers = {};
    document.querySelectorAll(`.${HEADER_ROW_CLASS}`).forEach(row => {
      const name = row.querySelector('.header-name')?.value.trim();
      const value = row.querySelector('.header-value')?.value.trim();
      if (name && value) {
        headers[name] = value;
      }
    });
    return Object.keys(headers).length > 0 ? headers : null;
  }

  function handlePulseSubmit(e) {
    e.preventDefault();

    const groupValue = document.getElementById('pulse-group').value.trim();
    const nameValue = document.getElementById('pulse-name').value.trim();
    const locationValue = document.getElementById('pulse-location').value.trim();
    const timeoutValue = parseInt(document.getElementById('pulse-timeout').value);
    const degrationTimeoutValue = document.getElementById('pulse-degration-timeout').value;

    // Validate required fields
    if (!nameValue) {
      AdminCommon.showError('Name is required');
      return;
    }

    if (!locationValue) {
      AdminCommon.showError('Location is required');
      return;
    }

    // Validate URL format
    if (!AdminCommon.validateUrl(locationValue, 'Location')) {
      return;
    }

    // Validate degradation timeout if provided
    if (degrationTimeoutValue && degrationTimeoutValue !== '') {
      const degrationTimeout = parseInt(degrationTimeoutValue);
      if (degrationTimeout >= timeoutValue) {
        AdminCommon.showError('Degradation Timeout must be less than Timeout');
        return;
      }
    }

    const data = {
      type: document.getElementById('pulse-type').value,
      group: groupValue,
      name: nameValue,
      location: locationValue,
      timeout: timeoutValue,
      degrationTimeout: degrationTimeoutValue ? parseInt(degrationTimeoutValue) : null,
      enabled: document.getElementById('pulse-enabled').checked,
      ignoreSslErrors: document.getElementById('pulse-ignore-ssl').checked,
      comparisonValue: document.getElementById('pulse-comparison').value.trim() || null,
      headers: collectHeaders()
    };

    if (isUpdateMode) {
      updatePulseConfiguration(id, data);
    } else {
      createPulseConfiguration(data);
    }
  }

  async function createPulseConfiguration(data) {
    showSubmitLoading(true);

    try {
      const response = await fetch('../../api/1.0/admin/configurations/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('Could not create configuration. A conflict occurred - this configuration may already exist.');
        }
        const text = await response.text();
        throw new Error(text || 'Failed to create configuration');
      }

      AdminCommon.showSuccess('Configuration created successfully');
      setTimeout(() => window.location.href = '../#pulse', AdminCommon.REDIRECT_DELAY);
    } catch (error) {
      console.error('Error creating configuration:', error);
      AdminCommon.showError(error.message);
      showSubmitLoading(false);
    }
  }

  async function updatePulseConfiguration(configId, data) {
    showSubmitLoading(true);

    try {
      const response = await fetch(`../../api/1.0/admin/configurations/pulse/${configId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('Could not update configuration. A conflict occurred - the configuration may have been modified by another user.');
        }
        const text = await response.text();
        throw new Error(text || 'Failed to update configuration');
      }

      AdminCommon.showSuccess('Configuration updated successfully');
      setTimeout(() => window.location.href = '../#pulse', AdminCommon.REDIRECT_DELAY);
    } catch (error) {
      console.error('Error updating configuration:', error);
      AdminCommon.showError(error.message);
      showSubmitLoading(false);
    }
  }

  async function loadConfigurationForEdit() {
    AdminCommon.showLoading('loading-spinner', ['pulse-form', 'error-message']);

    try {
      const response = await fetch(`../../api/1.0/admin/configurations/pulse/${id}`);
      
      if (!response.ok) {
        throw new Error('Configuration not found');
      }
      
      const config = await response.json();
      populatePulseForm(config);
      AdminCommon.hideLoading('loading-spinner', ['pulse-form']);
    } catch (error) {
      console.error('Error loading configuration:', error);
      AdminCommon.showErrorMessage('Failed to load configuration: ' + error.message, 'error-message', 'error-text', ['loading-spinner', 'pulse-form']);
    }
  }

  function populatePulseForm(config) {
    // Populate all fields from PulseCreationRequest
    document.getElementById('pulse-group').value = config.group || '';
    document.getElementById('pulse-name').value = config.name || '';
    document.getElementById('pulse-type').value = config.type || '';
    document.getElementById('pulse-location').value = config.location || '';
    document.getElementById('pulse-timeout').value = config.timeout || 30;
    document.getElementById('pulse-degration-timeout').value = config.degrationTimeout || '';
    document.getElementById('pulse-enabled').checked = config.enabled;
    document.getElementById('pulse-ignore-ssl').checked = config.ignoreSslErrors;
    document.getElementById('pulse-comparison').value = config.comparisonValue || '';

    // Trigger the type change to show/hide comparison value field
    handlePulseTypeChange({ target: { value: config.type } });

    // Populate headers
    populateHeaders(config.headers);

    // Hide group and name fields in update mode (they can't be changed)
    const groupNameRow = document.getElementById('pulse-group')?.closest('.row');
    if (groupNameRow) {
      groupNameRow.classList.add('d-none');
    }

    // Show delete button in header for update mode
    showDeleteButton();

    document.getElementById('pulse-submit-text').textContent = 'Update Pulse Configuration';
  }

  function populateHeaders(headers) {
    const container = elements.pulseHeadersContainer;
    if (!container) return;
    
    // Always clear existing header rows first
    container.innerHTML = '';

    // If no headers, leave it empty
    if (!headers || Object.keys(headers).length === 0) {
      return;
    }

    // Add a row for each header
    Object.entries(headers).forEach(([name, value]) => {
      const row = document.createElement('div');
      row.className = `input-group mb-2 ${HEADER_ROW_CLASS}`;
      row.innerHTML = `
        <input type="text" class="form-control header-name" placeholder="Header name" value="${AdminCommon.escapeHtml(name)}">
        <input type="text" class="form-control header-value" placeholder="Header value" value="${AdminCommon.escapeHtml(value)}">
        <button class="btn btn-outline-danger remove-header" type="button">
          <i class="bi bi-trash"></i>
        </button>
      `;
      container.appendChild(row);
    });
  }

  // Use AdminCommon utilities - removed duplicate functions:
  // - escapeHtml -> AdminCommon.escapeHtml
  // - showLoading/hideLoading -> AdminCommon.showLoading/hideLoading
  // - showError -> AdminCommon.showErrorMessage
  // - showToast -> AdminCommon.showSuccess/showError/showWarning
  // - showDeleteButton -> AdminCommon.showDeleteButton

  function showSubmitLoading(loading) {
    const form = elements.pulseForm;
    
    if (form) {
      const text = isUpdateMode ? 'Update Pulse Configuration' : 'Create Pulse Configuration';
      AdminCommon.setSubmitLoading(form, loading, text);
    }
  }

  function showDeleteButton() {
    AdminCommon.showDeleteButton('header-delete-btn');
  }

  function handleDeleteClick() {
    // Show confirmation modal
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
  }

  async function handleDeleteConfirm() {
    if (!isUpdateMode || !id) {
      showToast('Error', 'Cannot delete in create mode', 'danger');
      return;
    }

    const url = `../../api/1.0/admin/configurations/pulse/${id}`;

    // Disable the delete button
    const deleteBtn = document.getElementById('delete-confirm');
    if (deleteBtn) {
      deleteBtn.disabled = true;
      deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';
    }

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to delete configuration');
      }

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      modal?.hide();

      AdminCommon.showSuccess('Configuration deleted successfully');
      
      // Redirect back to admin list after a short delay
      setTimeout(() => window.location.href = '../#pulse', AdminCommon.REDIRECT_DELAY);
    } catch (error) {
      console.error('Error deleting configuration:', error);
      AdminCommon.showError(error.message);
    } finally {
      // Re-enable the delete button
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Delete';
      }
    }
  }
})();
