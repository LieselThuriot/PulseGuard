"use strict";

(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'create'; // create or update
  const id = urlParams.get('id'); // for update mode

  let isUpdateMode = mode === 'update';

  // Initialize
  initialize();

  async function initialize() {
    if (isUpdateMode && !id) {
      AdminCommon.showErrorMessage('Invalid parameters for update mode', 'error-message', 'error-text', ['loading-spinner', 'credential-form']);
      return;
    }

    updatePageTitle();
    setupEventListeners();

    if (isUpdateMode) {
      loadCredentialForEdit();
    } else {
      AdminCommon.hideLoading('loading-spinner', ['credential-form']);
    }
  }

  function updatePageTitle() {
    const title = isUpdateMode ? 'Update Credential' : 'Create Credential';
    document.getElementById('page-title').textContent = title;
    document.title = `PulseGuard - ${title}`;

    // Update submit button text
    document.getElementById('credential-submit-text').textContent = isUpdateMode ? 'Update Credential' : 'Create Credential';

    // Show delete button in update mode
    if (isUpdateMode) {
      document.getElementById('header-delete-btn')?.classList.remove('d-none');
    }
  }

  function setupEventListeners() {
    document.getElementById('credential-form')?.addEventListener('submit', handleCredentialSubmit);
    document.getElementById('credential-type')?.addEventListener('change', handleCredentialTypeChange);
    document.getElementById('header-delete-btn')?.addEventListener('click', handleDeleteClick);
    document.getElementById('delete-confirm')?.addEventListener('click', handleDeleteConfirm);

    // Alphanumeric and space validation for ID field
    document.getElementById('credential-id')?.addEventListener('input', function (e) {
      e.target.value = e.target.value.replace(/[^a-zA-Z0-9 ]/g, '');
    });
  }

  function handleCredentialTypeChange(e) {
    const selectedType = e.target.value;
    
    // Hide all credential type fields
    document.querySelectorAll('.credential-type-fields').forEach(field => {
      field.classList.add('d-none');
    });

    // Show fields for selected type
    if (selectedType) {
      const fieldsContainer = document.getElementById(`${selectedType.toLowerCase()}-fields`);
      fieldsContainer?.classList.remove('d-none');
      
      // Set required attributes
      updateRequiredFields(selectedType);
    }
  }

  function updateRequiredFields(credentialType) {
    // Remove all required attributes first
    document.querySelectorAll('.credential-type-fields input').forEach(input => {
      input.removeAttribute('required');
    });

    // Add required attributes based on type
    switch (credentialType) {
      case 'OAuth2':
        document.getElementById('oauth2-token-endpoint').required = true;
        document.getElementById('oauth2-client-id').required = true;
        document.getElementById('oauth2-client-secret').required = true;
        break;
      case 'Basic':
        document.getElementById('basic-password').required = true;
        break;
      case 'ApiKey':
        document.getElementById('apikey-header').required = true;
        document.getElementById('apikey-value').required = true;
        break;
    }
  }

  async function handleCredentialSubmit(e) {
    e.preventDefault();
    
    const credentialType = document.getElementById('credential-type').value;
    const credentialId = document.getElementById('credential-id').value;

    if (!credentialType || !credentialId) {
      AdminCommon.showErrorMessage('Credential type and ID are required', 'error-message', 'error-text');
      return;
    }

    // Validate alphanumeric and space ID
    if (!/^[a-zA-Z0-9 ]+$/.test(credentialId)) {
      AdminCommon.showErrorMessage('Credential ID must contain only letters, numbers, and spaces', 'error-message', 'error-text');
      return;
    }

    const credentialData = buildCredentialData(credentialType);
    if (!credentialData) return;

    try {
      let url, method;
      if (isUpdateMode) {
        url = `../../api/1.0/admin/credentials/${credentialType.toLowerCase()}/${credentialId}`;
        method = 'PUT';
      } else {
        url = `../../api/1.0/admin/credentials/${credentialType.toLowerCase()}/${credentialId}`;
        method = 'POST';
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentialData)
      });

      if (response.ok) {
        const action = isUpdateMode ? 'updated' : 'created';
        AdminCommon.showToast(`Credential ${action} successfully`, 'success');
        // Redirect to admin page with credential tab active
        window.location.href = '../#credential';
      } else {
        const error = await response.text();
        AdminCommon.showErrorMessage(`Failed to save credential: ${error}`, 'error-message', 'error-text');
      }
    } catch (error) {
      AdminCommon.showErrorMessage(`Network error: ${error.message}`, 'error-message', 'error-text');
    }
  }

  function buildCredentialData(credentialType) {
    switch (credentialType) {
      case 'OAuth2':
        const tokenEndpoint = document.getElementById('oauth2-token-endpoint').value;
        const clientId = document.getElementById('oauth2-client-id').value;
        const clientSecret = document.getElementById('oauth2-client-secret').value;
        const scopes = document.getElementById('oauth2-scopes').value || null;

        if (!tokenEndpoint || !clientId || !clientSecret) {
          AdminCommon.showErrorMessage('All OAuth2 required fields must be filled', 'error-message', 'error-text');
          return null;
        }

        return {
          tokenEndpoint: tokenEndpoint,
          clientId: clientId,
          clientSecret: clientSecret,
          scopes: scopes
        };

      case 'Basic':
        const username = document.getElementById('basic-username').value || null;
        const password = document.getElementById('basic-password').value;

        if (!password) {
          AdminCommon.showErrorMessage('Password is required for Basic authentication', 'error-message', 'error-text');
          return null;
        }

        return {
          username: username,
          password: password
        };

      case 'ApiKey':
        const header = document.getElementById('apikey-header').value;
        const apiKey = document.getElementById('apikey-value').value;

        if (!header || !apiKey) {
          AdminCommon.showErrorMessage('Header and API Key are required', 'error-message', 'error-text');
          return null;
        }

        return {
          header: header,
          apiKey: apiKey
        };

      default:
        AdminCommon.showErrorMessage('Invalid credential type', 'error-message', 'error-text');
        return null;
    }
  }

  async function loadCredentialForEdit() {
    if (!id) return;

    try {
      // First try to load from all credentials to find the type
      const response = await fetch('../../api/1.0/admin/credentials');
      if (!response.ok) {
        throw new Error('Failed to load credentials');
      }

      const credentials = await response.json();
      const credential = credentials.find(c => c.id === id);

      if (!credential) {
        AdminCommon.showErrorMessage('Credential not found', 'error-message', 'error-text', ['loading-spinner', 'credential-form']);
        return;
      }

      populateForm(credential);
      AdminCommon.hideLoading('loading-spinner', ['credential-form']);

    } catch (error) {
      AdminCommon.showErrorMessage(`Failed to load credential: ${error.message}`, 'error-message', 'error-text', ['loading-spinner', 'credential-form']);
    }
  }

  function populateForm(credential) {
    document.getElementById('credential-id').value = credential.id;
    document.getElementById('credential-id').disabled = true; // Don't allow changing ID in update mode

    // Determine credential type from the credential object
    let credentialType;
    if (credential.tokenEndpoint) {
      credentialType = 'OAuth2';
    } else if (credential.header) {
      credentialType = 'ApiKey';
    } else {
      credentialType = 'Basic';
    }

    document.getElementById('credential-type').value = credentialType;
    handleCredentialTypeChange({ target: { value: credentialType } });

    // Populate fields based on type
    switch (credentialType) {
      case 'OAuth2':
        document.getElementById('oauth2-token-endpoint').value = credential.tokenEndpoint || '';
        document.getElementById('oauth2-client-id').value = credential.clientId || '';
        document.getElementById('oauth2-client-secret').value = credential.clientSecret || '';
        document.getElementById('oauth2-scopes').value = credential.scopes || '';
        break;
      case 'Basic':
        document.getElementById('basic-username').value = credential.username || '';
        document.getElementById('basic-password').value = credential.password || '';
        break;
      case 'ApiKey':
        document.getElementById('apikey-header').value = credential.header || '';
        document.getElementById('apikey-value').value = credential.apiKey || '';
        break;
    }
  }

  function handleDeleteClick() {
    if (isUpdateMode && id) {
      const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
      deleteModal.show();
    }
  }

  async function handleDeleteConfirm() {
    if (!isUpdateMode || !id) return;

    try {
      // Get credential type from form
      const credentialType = document.getElementById('credential-type').value.toLowerCase();
      
      const response = await fetch(`../../api/1.0/admin/credentials/${credentialType}/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        AdminCommon.showToast('Credential deleted successfully', 'success');
        window.location.href = '../#credential';
      } else {
        const error = await response.text();
        AdminCommon.showErrorMessage(`Failed to delete credential: ${error}`, 'error-message', 'error-text');
      }
    } catch (error) {
      AdminCommon.showErrorMessage(`Network error: ${error.message}`, 'error-message', 'error-text');
    }

    // Hide modal
    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
    deleteModal?.hide();
  }
})();