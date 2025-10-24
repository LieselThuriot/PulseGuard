"use strict";

(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'create'; // create or update
  const id = urlParams.get('id'); // for update mode
  const agentType = urlParams.get('agentType'); // for agent update mode

  let isUpdateMode = mode === 'update';
  let pulseConfigurations = [];

  // Initialize
  initialize();

  function initialize() {
    if (isUpdateMode && !id) {
      showError('Invalid parameters for update mode');
      return;
    }

    updatePageTitle();
    setupEventListeners();

    // Load pulse configurations for parent selection
    loadPulseConfigurations();

    if (isUpdateMode) {
      loadConfigurationForEdit();
    } else {
      hideLoading();
    }
  }

  function updatePageTitle() {
    const title = isUpdateMode ? 'Update Agent Configuration' : 'Create Agent Configuration';
    document.getElementById('page-title').textContent = title;
    document.title = `PulseGuard - ${title}`;
  }

  function setupEventListeners() {
    document.getElementById('agent-form')?.addEventListener('submit', handleAgentSubmit);
    document.getElementById('agent-type')?.addEventListener('change', handleAgentTypeChange);
    document.getElementById('add-agent-header')?.addEventListener('click', addHeaderRow);

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

  function handleAgentTypeChange(e) {
    const agentType = e.target.value;
    const appNameGroup = document.getElementById('agent-app-name-group');
    const appNameInput = document.getElementById('agent-app-name');

    if (agentType === 'LogAnalyticsWorkspace') {
      appNameGroup?.classList.remove('d-none');
      appNameInput.required = true;
    } else {
      appNameGroup?.classList.add('d-none');
      appNameInput.required = false;
      appNameInput.value = '';
    }
  }

  function addHeaderRow() {
    const container = document.getElementById('agent-headers-container');
    const newRow = document.createElement('div');
    newRow.className = 'input-group mb-2 agent-header-row';
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
    document.querySelectorAll('.agent-header-row').forEach(row => {
      const name = row.querySelector('.header-name')?.value.trim();
      const value = row.querySelector('.header-value')?.value.trim();
      if (name && value) {
        headers[name] = value;
      }
    });
    return Object.keys(headers).length > 0 ? headers : null;
  }

  function handleAgentSubmit(e) {
    e.preventDefault();

    const pulseId = document.getElementById('agent-pulse-id').value;
    const data = {
      type: document.getElementById('agent-type').value,
      location: document.getElementById('agent-location').value.trim(),
      applicationName: document.getElementById('agent-app-name').value.trim() || null,
      enabled: document.getElementById('agent-enabled').checked,
      headers: collectHeaders()
    };

    if (isUpdateMode) {
      updateAgentConfiguration(id, data);
    } else {
      createAgentConfiguration(pulseId, data);
    }
  }

  function createAgentConfiguration(pulseId, data) {
    showSubmitLoading(true);

    const agentType = data.type; // Use the type from the form data
    fetch(`../../api/1.0/admin/configurations/agent/${pulseId}/${agentType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(text || 'Failed to create agent configuration');
          });
        }
        showToast('Success', 'Agent configuration created successfully', 'success');
        setTimeout(() => window.location.href = '../#agent', 1500);
      })
      .catch(error => {
        console.error('Error creating agent configuration:', error);
        showToast('Error', 'Failed to create agent configuration: ' + error.message, 'danger');
        showSubmitLoading(false);
      });
  }

  function updateAgentConfiguration(configId, data) {
    showSubmitLoading(true);

    const agentType = data.type; // Use the type from the form data
    fetch(`../../api/1.0/admin/configurations/agent/${configId}/${agentType}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(text || 'Failed to update agent configuration');
          });
        }
        showToast('Success', 'Agent configuration updated successfully', 'success');
        setTimeout(() => window.location.href = '../#agent', 1500);
      })
      .catch(error => {
        console.error('Error updating agent configuration:', error);
        showToast('Error', 'Failed to update agent configuration: ' + error.message, 'danger');
        showSubmitLoading(false);
      });
  }

  function loadPulseConfigurations() {
    fetch('../../api/1.0/admin/configurations')
      .then(response => response.ok ? response.json() : Promise.reject('Failed to load configurations'))
      .then(data => {
        pulseConfigurations = data.filter(c => c.type === 'Normal' || c.type === 0); // Pulse type
        populateAgentPulseSelector();
      })
      .catch(error => {
        console.error('Error loading configurations:', error);
      });
  }

  function populateAgentPulseSelector() {
    const select = document.getElementById('agent-pulse-id');
    if (!select) return;

    select.innerHTML = '<option value="">-- Select Pulse Check --</option>';
    pulseConfigurations.forEach(config => {
      const option = document.createElement('option');
      option.value = config.id;
      option.textContent = `${config.group} > ${config.name}`;
      select.appendChild(option);
    });
  }

  function loadConfigurationForEdit() {
    showLoading();

    fetch(`../../api/1.0/admin/configurations/agent/${id}/${agentType}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Configuration not found');
        }
        return response.json();
      })
      .then(config => {
        populateAgentForm(config, agentType);
        hideLoading();
      })
      .catch(error => {
        console.error('Error loading configuration:', error);
        showError('Failed to load configuration: ' + error.message);
      });
  }

  function populateAgentForm(config, agentType) {
    // Populate all fields from PulseAgentCreationRequest
    // The type comes from URL parameter since API doesn't return it
    document.getElementById('agent-type').value = agentType || '';
    document.getElementById('agent-location').value = config.location || '';
    document.getElementById('agent-app-name').value = config.applicationName || '';
    document.getElementById('agent-enabled').checked = config.enabled ?? true;

    // Trigger the type change to show/hide application name field
    handleAgentTypeChange({ target: { value: agentType } });

    // Populate headers
    populateHeaders(config.headers);

    // Hide pulse selector in update mode and set the value
    const pulseIdSelect = document.getElementById('agent-pulse-id');
    if (pulseIdSelect) {
      pulseIdSelect.value = id;
      pulseIdSelect.required = false; // Remove required attribute to prevent validation error
    }
    document.getElementById('agent-pulse-selector')?.classList.add('d-none');

    // Make agent type readonly in update mode
    const agentTypeSelect = document.getElementById('agent-type');
    if (agentTypeSelect) {
      agentTypeSelect.disabled = true;
    }

    // Show delete button in header for update mode
    showDeleteButton();

    document.getElementById('agent-submit-text').textContent = 'Update Agent Configuration';
  }

  function populateHeaders(headers) {
    const container = document.getElementById('agent-headers-container');
    // Always clear existing header rows first
    container.innerHTML = '';

    // If no headers, leave it empty
    if (!headers || Object.keys(headers).length === 0) {
      return;
    }

    // Add a row for each header
    Object.entries(headers).forEach(([name, value]) => {
      const row = document.createElement('div');
      row.className = 'input-group mb-2 agent-header-row';
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
    const form = document.getElementById('agent-form');
    const submitBtn = form?.querySelector('button[type="submit"]');
    
    if (submitBtn) {
      submitBtn.disabled = loading;
      if (loading) {
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
      } else {
        const text = isUpdateMode ? 'Update Agent Configuration' : 'Create Agent Configuration';
        submitBtn.innerHTML = `<i class="bi bi-save"></i> ${text}`;
      }
    }
  }

  function showLoading() {
    document.getElementById('loading-spinner')?.classList.remove('d-none');
    document.getElementById('agent-form')?.classList.add('d-none');
    document.getElementById('error-message')?.classList.add('d-none');
  }

  function hideLoading() {
    document.getElementById('loading-spinner')?.classList.add('d-none');
    document.getElementById('agent-form')?.classList.remove('d-none');
  }

  function showError(message) {
    document.getElementById('loading-spinner')?.classList.add('d-none');
    document.getElementById('agent-form')?.classList.add('d-none');
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

    const url = `../../api/1.0/admin/configurations/agent/${id}/${agentType}`;

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
        setTimeout(() => window.location.href = '../#agent', 1500);
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
