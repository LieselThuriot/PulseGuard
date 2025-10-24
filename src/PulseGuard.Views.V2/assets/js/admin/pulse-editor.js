"use strict";

(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'create'; // create or update
  const id = urlParams.get('id'); // for update mode

  let isUpdateMode = mode === 'update';

  // Initialize
  initialize();

  function initialize() {
    if (isUpdateMode && !id) {
      showError('Invalid parameters for update mode');
      return;
    }

    updatePageTitle();
    setupEventListeners();

    if (isUpdateMode) {
      loadConfigurationForEdit();
    } else {
      hideLoading();
    }
  }

  function updatePageTitle() {
    const title = isUpdateMode ? 'Update Pulse Configuration' : 'Create Pulse Configuration';
    document.getElementById('page-title').textContent = title;
    document.title = `PulseGuard - ${title}`;
  }

  function setupEventListeners() {
    document.getElementById('pulse-form')?.addEventListener('submit', handlePulseSubmit);
    document.getElementById('pulse-type')?.addEventListener('change', handlePulseTypeChange);
    document.getElementById('add-pulse-header')?.addEventListener('click', addHeaderRow);

    // Delete button in header
    document.getElementById('header-delete-btn')?.addEventListener('click', handleDeleteClick);

    // Delete confirmation
    document.getElementById('delete-confirm')?.addEventListener('click', handleDeleteConfirm);

    // Header removal (delegated)
    document.addEventListener('click', (e) => {
      if (e.target.closest('.remove-header')) {
        e.target.closest('.input-group').remove();
      }
    });
  }

  function handlePulseTypeChange(e) {
    const checkType = e.target.value;
    const comparisonGroup = document.getElementById('pulse-comparison-group');
    const comparisonInput = document.getElementById('pulse-comparison');

    if (checkType === 'Json' || checkType === 'Contains') {
      comparisonGroup?.classList.remove('d-none');
      comparisonInput.required = true;
    } else {
      comparisonGroup?.classList.add('d-none');
      comparisonInput.required = false;
      comparisonInput.value = '';
    }
  }

  function addHeaderRow() {
    const container = document.getElementById('pulse-headers-container');
    const newRow = document.createElement('div');
    newRow.className = 'input-group mb-2 pulse-header-row';
    newRow.innerHTML = `
      <input type="text" class="form-control header-name" placeholder="Header name">
      <input type="text" class="form-control header-value" placeholder="Header value">
      <button class="btn btn-outline-danger remove-header" type="button">
        <i class="bi bi-trash"></i>
      </button>
    `;
    container.appendChild(newRow);
  }

  function collectHeaders() {
    const headers = {};
    document.querySelectorAll('.pulse-header-row').forEach(row => {
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

    // Validate required fields
    if (!nameValue) {
      showToast('Error', 'Name is required', 'danger');
      return;
    }

    const data = {
      type: document.getElementById('pulse-type').value,
      group: groupValue, // Can be empty string, but not null
      name: nameValue,
      location: document.getElementById('pulse-location').value.trim(),
      timeout: parseInt(document.getElementById('pulse-timeout').value),
      degrationTimeout: document.getElementById('pulse-degration-timeout').value 
        ? parseInt(document.getElementById('pulse-degration-timeout').value) 
        : null,
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

  function createPulseConfiguration(data) {
    showSubmitLoading(true);

    fetch('../../api/1.0/admin/configurations/pulse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(text || 'Failed to create configuration');
          });
        }
        showToast('Success', 'Configuration created successfully', 'success');
        setTimeout(() => window.location.href = '../#pulse', 1500);
      })
      .catch(error => {
        console.error('Error creating configuration:', error);
        showToast('Error', 'Failed to create configuration: ' + error.message, 'danger');
        showSubmitLoading(false);
      });
  }

  function updatePulseConfiguration(configId, data) {
    showSubmitLoading(true);

    fetch(`../../api/1.0/admin/configurations/pulse/${configId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(text || 'Failed to update configuration');
          });
        }
        showToast('Success', 'Configuration updated successfully', 'success');
        setTimeout(() => window.location.href = '../#pulse', 1500);
      })
      .catch(error => {
        console.error('Error updating configuration:', error);
        showToast('Error', 'Failed to update configuration: ' + error.message, 'danger');
        showSubmitLoading(false);
      });
  }

  function loadConfigurationForEdit() {
    showLoading();

    fetch(`../../api/1.0/admin/configurations/pulse/${id}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Configuration not found');
        }
        return response.json();
      })
      .then(config => {
        populatePulseForm(config);
        hideLoading();
      })
      .catch(error => {
        console.error('Error loading configuration:', error);
        showError('Failed to load configuration: ' + error.message);
      });
  }

  function populatePulseForm(config) {
    // Populate all fields from PulseCreationRequest
    document.getElementById('pulse-group').value = config.group || '';
    document.getElementById('pulse-name').value = config.name || '';
    document.getElementById('pulse-type').value = config.type || '';
    document.getElementById('pulse-location').value = config.location || '';
    document.getElementById('pulse-timeout').value = config.timeout || 30;
    document.getElementById('pulse-degration-timeout').value = config.degrationTimeout || '';
    document.getElementById('pulse-enabled').checked = config.enabled ?? true;
    document.getElementById('pulse-ignore-ssl').checked = config.ignoreSslErrors ?? false;
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

    document.getElementById('pulse-submit-text').textContent = 'Update Configuration';
  }

  function populateHeaders(headers) {
    const container = document.getElementById('pulse-headers-container');
    // Always clear existing header rows first
    container.innerHTML = '';

    // If no headers, leave it empty
    if (!headers || Object.keys(headers).length === 0) {
      return;
    }

    // Add a row for each header
    Object.entries(headers).forEach(([name, value]) => {
      const row = document.createElement('div');
      row.className = 'input-group mb-2 pulse-header-row';
      row.innerHTML = `
        <input type="text" class="form-control header-name" placeholder="Header name" value="${escapeHtml(name)}">
        <input type="text" class="form-control header-value" placeholder="Header value" value="${escapeHtml(value)}">
        <button class="btn btn-outline-danger remove-header" type="button">
          <i class="bi bi-trash"></i>
        </button>
      `;
      container.appendChild(row);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showSubmitLoading(loading) {
    const form = document.getElementById('pulse-form');
    const submitBtn = form?.querySelector('button[type="submit"]');
    
    if (submitBtn) {
      submitBtn.disabled = loading;
      if (loading) {
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
      } else {
        const text = isUpdateMode ? 'Update Configuration' : 'Save Configuration';
        submitBtn.innerHTML = `<i class="bi bi-save"></i> ${text}`;
      }
    }
  }

  function showLoading() {
    document.getElementById('loading-spinner')?.classList.remove('d-none');
    document.getElementById('pulse-form')?.classList.add('d-none');
    document.getElementById('error-message')?.classList.add('d-none');
  }

  function hideLoading() {
    document.getElementById('loading-spinner')?.classList.add('d-none');
    document.getElementById('pulse-form')?.classList.remove('d-none');
  }

  function showError(message) {
    document.getElementById('loading-spinner')?.classList.add('d-none');
    document.getElementById('pulse-form')?.classList.add('d-none');
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
      errorDiv.classList.remove('d-none');
      document.getElementById('error-text').textContent = message;
    }
  }

  function showToast(title, message, type) {
    if (typeof bootstrap !== 'undefined' && bootstrap.showToast) {
      bootstrap.showToast({
        header: title,
        body: message,
        toastClass: `toast-${type}`
      });
    }
  }

  function showDeleteButton() {
    const deleteBtn = document.getElementById('header-delete-btn');
    if (deleteBtn) {
      deleteBtn.classList.remove('d-none');
      // Initialize tooltip
      new bootstrap.Tooltip(deleteBtn);
    }
  }

  function handleDeleteClick() {
    // Show confirmation modal
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
  }

  function handleDeleteConfirm() {
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

    fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((response) => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(text || 'Failed to delete configuration');
          });
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
        modal?.hide();

        showToast('Success', 'Configuration deleted successfully', 'success');
        
        // Redirect back to admin list after a short delay
        setTimeout(() => window.location.href = '../#pulse', 1500);
      })
      .catch((error) => {
        console.error('Error deleting configuration:', error);
        showToast('Error', error.message, 'danger');
      })
      .finally(() => {
        // Re-enable the delete button
        if (deleteBtn) {
          deleteBtn.disabled = false;
          deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Delete';
        }
      });
  }
})();
