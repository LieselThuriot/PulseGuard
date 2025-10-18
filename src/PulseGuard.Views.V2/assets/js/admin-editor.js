"use strict";

(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'create'; // create or update
  const type = urlParams.get('type'); // normal or agent
  const id = urlParams.get('id'); // for update mode

  let isUpdateMode = mode === 'update';
  let currentType = type || 'normal';
  let normalConfigurations = [];

  // Initialize
  initialize();

  function initialize() {
    if (isUpdateMode && (!type || !id)) {
      showError('Invalid parameters for update mode');
      return;
    }

    updatePageTitle();
    setupEventListeners();

    if (isUpdateMode) {
      hideTypeSelector();
      loadConfigurationForEdit();
    } else {
      hideLoading();
      showTypeSelector();
      loadNormalConfigurations(); // For agent parent selection
      showForm(currentType);
    }
  }

  function updatePageTitle() {
    const title = isUpdateMode ? 'Update Configuration' : 'Create Configuration';
    document.getElementById('page-title').textContent = title;
    document.title = `PulseGuard - ${title}`;
  }

  function setupEventListeners() {
    // Type selector (create mode only)
    document.querySelectorAll('input[name="config-type"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        currentType = e.target.value;
        showForm(currentType);
      });
    });

    // Normal form
    document.getElementById('normal-form')?.addEventListener('submit', handleNormalSubmit);
    document.getElementById('normal-type')?.addEventListener('change', handleNormalTypeChange);
    document.getElementById('add-normal-header')?.addEventListener('click', () => addHeaderRow('normal'));

    // Agent form
    document.getElementById('agent-form')?.addEventListener('submit', handleAgentSubmit);
    document.getElementById('agent-type')?.addEventListener('change', handleAgentTypeChange);
    document.getElementById('add-agent-header')?.addEventListener('click', () => addHeaderRow('agent'));

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

  function showTypeSelector() {
    document.getElementById('type-selector')?.classList.remove('d-none');
  }

  function hideTypeSelector() {
    document.getElementById('type-selector')?.classList.add('d-none');
  }

  function showForm(formType) {
    document.getElementById('normal-form')?.classList.add('d-none');
    document.getElementById('agent-form')?.classList.add('d-none');

    if (formType === 'normal') {
      document.getElementById('normal-form')?.classList.remove('d-none');
    } else {
      document.getElementById('agent-form')?.classList.remove('d-none');
    }
  }

  function handleNormalTypeChange(e) {
    const checkType = e.target.value;
    const comparisonGroup = document.getElementById('normal-comparison-group');
    const comparisonInput = document.getElementById('normal-comparison');

    if (checkType === 'Json' || checkType === 'Contains') {
      comparisonGroup?.classList.remove('d-none');
      comparisonInput.required = true;
    } else {
      comparisonGroup?.classList.add('d-none');
      comparisonInput.required = false;
      comparisonInput.value = '';
    }
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

  function addHeaderRow(formType) {
    const container = document.getElementById(`${formType}-headers-container`);
    const newRow = document.createElement('div');
    newRow.className = `input-group mb-2 ${formType}-header-row`;
    newRow.innerHTML = `
      <input type="text" class="form-control header-name" placeholder="Header name">
      <input type="text" class="form-control header-value" placeholder="Header value">
      <button class="btn btn-outline-danger remove-header" type="button">
        <i class="bi bi-trash"></i>
      </button>
    `;
    container.appendChild(newRow);
  }

  function collectHeaders(formType) {
    const headers = {};
    document.querySelectorAll(`.${formType}-header-row`).forEach(row => {
      const name = row.querySelector('.header-name')?.value.trim();
      const value = row.querySelector('.header-value')?.value.trim();
      if (name && value) {
        headers[name] = value;
      }
    });
    return Object.keys(headers).length > 0 ? headers : null;
  }

  function handleNormalSubmit(e) {
    e.preventDefault();

    const groupValue = document.getElementById('normal-group').value.trim();
    const nameValue = document.getElementById('normal-name').value.trim();

    // Validate required fields
    if (!nameValue) {
      showToast('Error', 'Name is required', 'danger');
      return;
    }

    const data = {
      type: document.getElementById('normal-type').value,
      group: groupValue, // Can be empty string, but not null
      name: nameValue,
      location: document.getElementById('normal-location').value.trim(),
      timeout: parseInt(document.getElementById('normal-timeout').value),
      degrationTimeout: document.getElementById('normal-degration-timeout').value 
        ? parseInt(document.getElementById('normal-degration-timeout').value) 
        : null,
      enabled: document.getElementById('normal-enabled').checked,
      ignoreSslErrors: document.getElementById('normal-ignore-ssl').checked,
      comparisonValue: document.getElementById('normal-comparison').value.trim() || null,
      headers: collectHeaders('normal')
    };

    if (isUpdateMode) {
      updateNormalConfiguration(id, data);
    } else {
      createNormalConfiguration(data);
    }
  }

  function handleAgentSubmit(e) {
    e.preventDefault();

    const pulseId = document.getElementById('agent-pulse-id').value;
    const data = {
      type: document.getElementById('agent-type').value,
      location: document.getElementById('agent-location').value.trim(),
      applicationName: document.getElementById('agent-app-name').value.trim() || null,
      enabled: document.getElementById('agent-enabled').checked,
      headers: collectHeaders('agent')
    };

    if (isUpdateMode) {
      updateAgentConfiguration(id, data);
    } else {
      createAgentConfiguration(pulseId, data);
    }
  }

  function createNormalConfiguration(data) {
    showSubmitLoading('normal', true);

    fetch('../../api/1.0/admin/configurations/normal', {
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
        setTimeout(() => window.location.href = '../', 1500);
      })
      .catch(error => {
        console.error('Error creating configuration:', error);
        showToast('Error', 'Failed to create configuration: ' + error.message, 'danger');
        showSubmitLoading('normal', false);
      });
  }

  function updateNormalConfiguration(configId, data) {
    showSubmitLoading('normal', true);

    fetch(`../../api/1.0/admin/configurations/normal/${configId}`, {
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
        setTimeout(() => window.location.href = '../', 1500);
      })
      .catch(error => {
        console.error('Error updating configuration:', error);
        showToast('Error', 'Failed to update configuration: ' + error.message, 'danger');
        showSubmitLoading('normal', false);
      });
  }

  function createAgentConfiguration(pulseId, data) {
    showSubmitLoading('agent', true);

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
        setTimeout(() => window.location.href = '../', 1500);
      })
      .catch(error => {
        console.error('Error creating agent configuration:', error);
        showToast('Error', 'Failed to create agent configuration: ' + error.message, 'danger');
        showSubmitLoading('agent', false);
      });
  }

  function updateAgentConfiguration(configId, data) {
    showSubmitLoading('agent', true);

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
        setTimeout(() => window.location.href = '../', 1500);
      })
      .catch(error => {
        console.error('Error updating agent configuration:', error);
        showToast('Error', 'Failed to update agent configuration: ' + error.message, 'danger');
        showSubmitLoading('agent', false);
      });
  }

  function loadNormalConfigurations() {
    fetch('../../api/1.0/admin/configurations')
      .then(response => response.ok ? response.json() : Promise.reject('Failed to load configurations'))
      .then(data => {
        normalConfigurations = data.filter(c => c.type === 'Normal' || c.type === 0); // Normal type
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
    normalConfigurations.forEach(config => {
      const option = document.createElement('option');
      option.value = config.id;
      option.textContent = `${config.group} > ${config.name}`;
      select.appendChild(option);
    });
  }

  function loadConfigurationForEdit() {
    showLoading();

    const agentType = urlParams.get('agentType'); // Get agent type from URL params
    const endpoint = type === 'normal' 
      ? `../../api/1.0/admin/configurations/normal/${id}`
      : `../../api/1.0/admin/configurations/agent/${id}/${agentType}`;

    // Load normal configurations for agent parent selector
    loadNormalConfigurations();

    fetch(endpoint)
      .then(response => {
        if (!response.ok) {
          throw new Error('Configuration not found');
        }
        return response.json();
      })
      .then(config => {
        if (type === 'normal') {
          populateNormalForm(config);
          showForm('normal');
        } else {
          populateAgentForm(config, agentType); // Pass agentType to the function
          showForm('agent');
        }

        hideLoading();
      })
      .catch(error => {
        console.error('Error loading configuration:', error);
        showError('Failed to load configuration: ' + error.message);
      });
  }

  function populateNormalForm(config) {
    // Populate all fields from PulseCreationRequest
    document.getElementById('normal-group').value = config.group || '';
    document.getElementById('normal-name').value = config.name || '';
    document.getElementById('normal-type').value = config.type || '';
    document.getElementById('normal-location').value = config.location || '';
    document.getElementById('normal-timeout').value = config.timeout || 30;
    document.getElementById('normal-degration-timeout').value = config.degrationTimeout || '';
    document.getElementById('normal-enabled').checked = config.enabled ?? true;
    document.getElementById('normal-ignore-ssl').checked = config.ignoreSslErrors ?? false;
    document.getElementById('normal-comparison').value = config.comparisonValue || '';

    // Trigger the type change to show/hide comparison value field
    handleNormalTypeChange({ target: { value: config.type } });

    // Populate headers
    populateHeaders('normal', config.headers);

    // Hide group and name fields in update mode (they can't be changed)
    const groupNameRow = document.getElementById('normal-group')?.closest('.row');
    if (groupNameRow) {
      groupNameRow.classList.add('d-none');
    }

    // Show delete button in header for update mode
    showDeleteButton();

    document.getElementById('normal-submit-text').textContent = 'Update Configuration';
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
    populateHeaders('agent', config.headers);

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

    document.getElementById('agent-submit-text').textContent = 'Update Configuration';
  }

  function populateHeaders(formType, headers) {
    const container = document.getElementById(`${formType}-headers-container`);
    // Always clear existing header rows first
    container.innerHTML = '';

    // If no headers, leave it empty
    if (!headers || Object.keys(headers).length === 0) {
      return;
    }

    // Add a row for each header
    Object.entries(headers).forEach(([name, value]) => {
      const row = document.createElement('div');
      row.className = `input-group mb-2 ${formType}-header-row`;
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

  function showSubmitLoading(formType, loading) {
    const form = document.getElementById(`${formType}-form`);
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
    document.getElementById('normal-form')?.classList.add('d-none');
    document.getElementById('agent-form')?.classList.add('d-none');
    document.getElementById('type-selector')?.classList.add('d-none');
    document.getElementById('error-message')?.classList.add('d-none');
  }

  function hideLoading() {
    document.getElementById('loading-spinner')?.classList.add('d-none');
  }

  function showError(message) {
    document.getElementById('loading-spinner')?.classList.add('d-none');
    document.getElementById('normal-form')?.classList.add('d-none');
    document.getElementById('agent-form')?.classList.add('d-none');
    document.getElementById('type-selector')?.classList.add('d-none');
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
    if (!isUpdateMode || !type || !id) {
      showToast('Error', 'Cannot delete in create mode', 'danger');
      return;
    }

    const isNormal = type === 'normal';
    const agentType = urlParams.get('agentType');
    
    const url = isNormal 
      ? `../../api/1.0/admin/configurations/normal/${id}`
      : `../../api/1.0/admin/configurations/agent/${id}/${agentType}`;

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
        setTimeout(() => window.location.href = '../', 1500);
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
