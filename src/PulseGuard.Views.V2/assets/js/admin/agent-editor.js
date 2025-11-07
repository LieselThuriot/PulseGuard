"use strict";

(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'create'; // create or update
  const id = urlParams.get('id'); // for update mode
  const agentType = urlParams.get('agentType'); // for agent update mode

  let isUpdateMode = mode === 'update';
  let pulseConfigurations = [];

  // Constants
  const HEADER_ROW_CLASS = 'agent-header-row';

  // Initialize
  initialize();

  function initialize() {
    if (isUpdateMode && !id) {
      AdminCommon.showErrorMessage('Invalid parameters for update mode', 'error-message', 'error-text', ['loading-spinner', 'agent-form']);
      return;
    }

    updatePageTitle();
    setupEventListeners();

    // Load pulse configurations for parent selection
    loadPulseConfigurations();

    if (isUpdateMode) {
      loadConfigurationForEdit();
    } else {
      AdminCommon.hideLoading('loading-spinner', ['agent-form']);
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
    newRow.className = `input-group mb-2 ${HEADER_ROW_CLASS}`;
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
    document.querySelectorAll(`.${HEADER_ROW_CLASS}`).forEach(row => {
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
    const locationValue = document.getElementById('agent-location').value.trim();
    const appNameValue = document.getElementById('agent-app-name').value.trim();

    // Get agent type - use form value if available (create mode), otherwise use URL param (update mode)
    const agentTypeValue = document.getElementById('agent-type').value || agentType;

    // Validate required fields
    if (!locationValue) {
      AdminCommon.showError('Location is required');
      return;
    }

    // Validate URL format for ApplicationInsights
    if (agentTypeValue === 'ApplicationInsights' && !AdminCommon.validateUrl(locationValue, 'Application Insights Endpoint')) {
      return;
    }

    const data = {
      type: agentTypeValue,
      location: locationValue,
      applicationName: appNameValue || null,
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
          if (response.status === 409) {
            throw new Error('Could not create agent configuration. A conflict occurred - this configuration may already exist.');
          }
          return response.text().then(text => {
            throw new Error(text || 'Failed to create agent configuration');
          });
        }
        AdminCommon.showSuccess('Agent configuration created successfully');
        setTimeout(() => window.location.href = '../#agent', AdminCommon.REDIRECT_DELAY);
      })
      .catch(error => {
        console.error('Error creating agent configuration:', error);
        AdminCommon.showError(error.message);
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
          if (response.status === 409) {
            throw new Error('Could not update agent configuration. A conflict occurred - the configuration may have been modified by another user.');
          }
          return response.text().then(text => {
            throw new Error(text || 'Failed to update agent configuration');
          });
        }
        AdminCommon.showSuccess('Agent configuration updated successfully');
        setTimeout(() => window.location.href = '../#agent', AdminCommon.REDIRECT_DELAY);
      })
      .catch(error => {
        console.error('Error updating agent configuration:', error);
        AdminCommon.showError(error.message);
        showSubmitLoading(false);
      });
  }

  /**
   * Loads pulse configurations to populate parent pulse selector
   */
  async function loadPulseConfigurations() {
    try {
      const response = await fetch('../../api/1.0/admin/configurations');
      if (!response.ok) {
        throw new Error('Failed to load configurations');
      }
      const data = await response.json();
      pulseConfigurations = data.filter(c => c.type === 'Normal'); // Filter for Normal/Pulse type
      populateAgentPulseSelector();
    } catch (error) {
      console.error('Error loading configurations:', error);
      AdminCommon.showError('Failed to load pulse checks. Please refresh the page.');
      
      // Disable form to prevent submission without parent pulse
      const submitBtn = document.querySelector('#agent-form button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
      }
    }
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
    AdminCommon.showLoading('loading-spinner', ['agent-form', 'error-message']);

    fetch(`../../api/1.0/admin/configurations/agent/${id}/${agentType}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Configuration not found');
        }
        return response.json();
      })
      .then(config => {
        populateAgentForm(config, agentType);
        AdminCommon.hideLoading('loading-spinner', ['agent-form']);
      })
      .catch(error => {
        console.error('Error loading configuration:', error);
        AdminCommon.showErrorMessage('Failed to load configuration: ' + error.message, 'error-message', 'error-text', ['loading-spinner', 'agent-form']);
      });
  }

  function populateAgentForm(config, agentType) {
    // Populate all fields from PulseAgentCreationRequest
    // The type comes from URL parameter since API doesn't return it
    document.getElementById('agent-type').value = agentType || '';
    document.getElementById('agent-location').value = config.location || '';
    document.getElementById('agent-app-name').value = config.applicationName || '';
    document.getElementById('agent-enabled').checked = config.enabled;

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
      const newRow = document.createElement('div');
      newRow.className = `input-group mb-2 ${HEADER_ROW_CLASS}`;
      newRow.innerHTML = `
        <input type="text" class="form-control header-name" placeholder="Header name" value="${AdminCommon.escapeHtml(name)}">
        <input type="text" class="form-control header-value" placeholder="Header value" value="${AdminCommon.escapeHtml(value)}">
        <button class="btn btn-outline-danger remove-header" type="button">
          <i class="bi bi-trash"></i>
        </button>
      `;
      container.appendChild(newRow);
    });
  }

  // Use AdminCommon utilities - removed duplicate functions
  function showSubmitLoading(loading) {
    const form = document.getElementById('agent-form');
    
    if (form) {
      const text = isUpdateMode ? 'Update Agent Configuration' : 'Create Agent Configuration';
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

  function handleDeleteConfirm() {
    if (!isUpdateMode || !id) {
      AdminCommon.showError('Cannot delete in create mode');
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

        AdminCommon.showSuccess('Configuration deleted successfully');
        
        // Redirect back to admin list after a short delay
        setTimeout(() => window.location.href = '../#agent', AdminCommon.REDIRECT_DELAY);
      })
      .catch((error) => {
        console.error('Error deleting configuration:', error);
        AdminCommon.showError(error.message);
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
