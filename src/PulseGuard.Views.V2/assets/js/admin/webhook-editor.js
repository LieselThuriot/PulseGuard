"use strict";

(function () {
  // Get URL parameters
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode'); // 'create' or 'update'
  const webhookId = params.get('id');

  let currentWebhook = null;
  let configurations = [];

  // Initialize
  init();

  function init() {
    // Load configurations to populate select boxes
    loadConfigurations().then(() => {
      if (mode === 'create') {
        initCreateMode();
      } else if (mode === 'update' && webhookId) {
        initUpdateMode();
      } else {
        AdminCommon.showErrorMessage('Invalid mode or missing webhook ID', 'error-message', 'error-text', ['loading-spinner', 'webhook-form']);
      }
    });

    // Event listeners
    document.getElementById('webhook-form')?.addEventListener('submit', handleSubmit);
    document.getElementById('header-delete-btn')?.addEventListener('click', showDeleteModal);
    document.getElementById('delete-confirm')?.addEventListener('click', handleDelete);
    document.getElementById('webhook-group')?.addEventListener('change', handleGroupChange);
  }

  /**
   * Load configurations to get unique groups and names
   */
  async function loadConfigurations() {
    try {
      const response = await fetch('../../api/1.0/admin/configurations');
      
      if (!response.ok) {
        throw new Error('Failed to load configurations');
      }
      
      const data = await response.json();
      configurations = data;
      populateGroupAndNameSelects();
    } catch (error) {
      console.error('Error loading configurations:', error);
      // Don't fail the whole page if configurations can't be loaded
    }
  }

  /**
   * Populate group and name select boxes with unique values from configurations
   */
  function populateGroupAndNameSelects() {
    // Get unique groups and names
    const uniqueGroups = [...new Set(configurations.map(c => c.group).filter(g => g))];
    const uniqueNames = [...new Set(configurations.map(c => c.name).filter(n => n))];

    // Sort alphabetically
    uniqueGroups.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    uniqueNames.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    // Populate group select
    const groupSelect = document.getElementById('webhook-group');
    groupSelect.innerHTML = `
      <option value="">(no group)</option>
      <option value="*">(all)</option>
      ${uniqueGroups.map(group => `<option value="${AdminCommon.escapeHtml(group)}">${AdminCommon.escapeHtml(group)}</option>`).join('')}
    `;

    // Populate name select with all names initially
    populateNameSelect(null);
  }

  /**
   * Populate name select based on selected group
   * @param {string|null} selectedGroup - The selected group, or null for all
   */
  function populateNameSelect(selectedGroup) {
    const nameSelect = document.getElementById('webhook-name');
    const currentValue = nameSelect.value; // Preserve current selection if possible

    let availableNames;
    
    if (!selectedGroup || selectedGroup === '' || selectedGroup === '*') {
      // Show all names if no group or "all" is selected
      availableNames = [...new Set(configurations.map(c => c.name).filter(n => n))];
    } else {
      // Filter names by selected group
      availableNames = [...new Set(
        configurations
          .filter(c => c.group === selectedGroup)
          .map(c => c.name)
          .filter(n => n)
      )];
    }

    // Sort alphabetically
    availableNames.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    // Populate name select
    nameSelect.innerHTML = `
      <option value="">(no name)</option>
      <option value="*">(all)</option>
      ${availableNames.map(name => `<option value="${AdminCommon.escapeHtml(name)}">${AdminCommon.escapeHtml(name)}</option>`).join('')}
    `;

    // Restore previous selection if it's still available
    if (currentValue && (currentValue === '' || currentValue === '*' || availableNames.includes(currentValue))) {
      nameSelect.value = currentValue;
    }
  }

  /**
   * Handle group selection change
   */
  function handleGroupChange() {
    const selectedGroup = document.getElementById('webhook-group').value;
    populateNameSelect(selectedGroup);
  }

  // Use AdminCommon utilities - removed duplicate functions:
  // escapeHtml, showLoading, hideLoading, showError, showToast

  /**
   * Initialize create mode
   */
  function initCreateMode() {
    document.getElementById('page-title').textContent = 'Create Webhook';
    document.getElementById('submit-text').textContent = 'Create Webhook';
    AdminCommon.hideLoading('loading-spinner', ['webhook-form']);
    showForm();
  }

  /**
   * Initialize update mode
   */
  function initUpdateMode() {
    document.getElementById('page-title').textContent = 'Update Webhook';
    document.getElementById('submit-text').textContent = 'Update Webhook';
    
    // Show delete button in header
    showDeleteButton();
    
    // Hide secret field in update mode
    document.getElementById('secret-container').classList.add('d-none');
    document.getElementById('webhook-secret').removeAttribute('required');

    loadWebhook();
  }

  /**
   * Load webhook data for update mode
   */
  async function loadWebhook() {
    AdminCommon.showLoading('loading-spinner', ['webhook-form', 'error-message']);

    try {
      const response = await fetch(`../../api/1.0/admin/webhooks/${webhookId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load webhook');
      }
      
      const data = await response.json();
      currentWebhook = data;
      populateForm(data);
      AdminCommon.hideLoading('loading-spinner', ['webhook-form']);
      showForm();
    } catch (error) {
      console.error('Error loading webhook:', error);
      AdminCommon.showErrorMessage('Failed to load webhook: ' + error.message, 'error-message', 'error-text', ['loading-spinner', 'webhook-form']);
    }
  }

  /**
   * Populate form with webhook data
   */
  function populateForm(webhook) {
    // Set group first
    document.getElementById('webhook-group').value = webhook.group || '';
    
    // Update name options based on selected group
    populateNameSelect(webhook.group);
    
    // Then set name
    document.getElementById('webhook-name').value = webhook.name || '';
    document.getElementById('webhook-location').value = webhook.location;
    document.getElementById('webhook-enabled').checked = webhook.enabled;
  }

  /**
   * Handle form submission
   */
  function handleSubmit(e) {
    e.preventDefault();

    const group = document.getElementById('webhook-group').value;
    const name = document.getElementById('webhook-name').value;
    const location = document.getElementById('webhook-location').value.trim();
    const enabled = document.getElementById('webhook-enabled').checked;

    // Validate webhook URL
    if (!location) {
      AdminCommon.showError('Webhook URL is required');
      return;
    }

    if (!AdminCommon.validateUrl(location, 'Webhook URL')) {
      return;
    }

    // Use the selected values as-is (empty string, *, or specific value)
    if (mode === 'create') {
      createWebhook(group, name, location, enabled);
    } else if (mode === 'update') {
      updateWebhook(group, name, location, enabled);
    }
  }

  /**
   * Create a new webhook
   */
  async function createWebhook(group, name, location, enabled) {
    const secret = document.getElementById('webhook-secret').value.trim();

    // Validate secret
    if (!secret) {
      AdminCommon.showError('Secret is required');
      return;
    }

    const submitBtn = document.querySelector('#webhook-form button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';

    try {
      const response = await fetch('../../api/1.0/admin/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          secret: secret,
          group: group,
          name: name,
          location: location,
          enabled: enabled
        })
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('Could not create webhook. A conflict occurred - this webhook may already exist.');
        }
        const text = await response.text();
        throw new Error(text || 'Failed to create webhook');
      }

      AdminCommon.showSuccess('Webhook created successfully');
      setTimeout(() => {
        window.location.href = '../#webhook';
      }, AdminCommon.REDIRECT_DELAY);
    } catch (error) {
      console.error('Error creating webhook:', error);
      AdminCommon.showError(error.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Create';
    }
  }

  /**
   * Update an existing webhook
   */
  async function updateWebhook(group, name, location, enabled) {
    const submitBtn = document.querySelector('#webhook-form button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

    try {
      const response = await fetch(`../../api/1.0/admin/webhooks/${webhookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          group: group,
          name: name,
          location: location,
          enabled: enabled
        })
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('Could not update webhook. A conflict occurred - the webhook may have been modified by another user.');
        }
        const text = await response.text();
        throw new Error(text || 'Failed to update webhook');
      }

      AdminCommon.showSuccess('Webhook updated successfully');
      setTimeout(() => {
        window.location.href = '../#webhook';
      }, AdminCommon.REDIRECT_DELAY);
    } catch (error) {
      console.error('Error updating webhook:', error);
      AdminCommon.showError(error.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Update';
    }
  }

  /**
   * Show delete button
   */
  function showDeleteButton() {
    AdminCommon.showDeleteButton('header-delete-btn');
  }

  /**
   * Show delete modal
   */
  function showDeleteModal() {
    if (!currentWebhook) return;

    // Display group
    if (currentWebhook.group === '*') {
      document.getElementById('delete-webhook-group').textContent = '(all)';
    } else if (!currentWebhook.group || currentWebhook.group === '') {
      document.getElementById('delete-webhook-group').textContent = '(no group)';
    } else {
      document.getElementById('delete-webhook-group').textContent = currentWebhook.group;
    }

    // Display name
    if (currentWebhook.name === '*') {
      document.getElementById('delete-webhook-name').textContent = '(all)';
    } else if (!currentWebhook.name || currentWebhook.name === '') {
      document.getElementById('delete-webhook-name').textContent = '(no name)';
    } else {
      document.getElementById('delete-webhook-name').textContent = currentWebhook.name;
    }

    document.getElementById('delete-webhook-location').textContent = currentWebhook.location;

    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
  }

  /**
   * Handle webhook deletion
   */
  async function handleDelete() {
    const deleteBtn = document.getElementById('delete-confirm');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';

    try {
      const response = await fetch(`../../api/1.0/admin/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to delete webhook');
      }

      const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      modal?.hide();

      AdminCommon.showSuccess('Webhook deleted successfully');
      setTimeout(() => {
        window.location.href = '../#webhook';
      }, AdminCommon.REDIRECT_DELAY);
    } catch (error) {
      console.error('Error deleting webhook:', error);
      AdminCommon.showError(error.message);
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Delete';
    }
  }

  /**
   * Show loading state
   */
  /**
   * Show form
   */
  function showForm() {
    document.getElementById('webhook-form')?.classList.remove('d-none');
  }
})();
