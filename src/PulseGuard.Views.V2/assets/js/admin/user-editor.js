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
      AdminCommon.showErrorMessage('Invalid parameters for update mode', 'error-message', 'error-text', ['loading-spinner', 'user-form']);
      return;
    }

    updatePageTitle();
    setupEventListeners();

    if (isUpdateMode) {
      loadUserForEdit();
    } else {
      AdminCommon.hideLoading('loading-spinner', ['user-form']);
      // Add one empty role field for create mode
      addRoleField();
    }
  }

  function updatePageTitle() {
    const title = isUpdateMode ? 'Update User' : 'Create User';
    document.getElementById('page-title').textContent = title;
    document.title = `PulseGuard - ${title}`;
  }

  function setupEventListeners() {
    document.getElementById('user-form')?.addEventListener('submit', handleSubmit);
    document.getElementById('add-role')?.addEventListener('click', () => addRoleField());

    // Delete button in header
    document.getElementById('header-delete-btn')?.addEventListener('click', handleDeleteClick);

    // Delete confirmation
    document.getElementById('delete-confirm')?.addEventListener('click', handleDeleteConfirm);

    // Role removal (delegated)
    document.addEventListener('click', (e) => {
      if (e.target.closest('.remove-role')) {
        const container = document.getElementById('roles-container');
        const roleFields = container.querySelectorAll('.role-field');
        
        // Only allow removal if there's more than one role field
        if (roleFields.length > 1) {
          e.target.closest('.input-group').remove();
        } else {
          AdminCommon.showError('At least one role is required');
        }
      }
    });
  }

  function addRoleField(value = '') {
    const container = document.getElementById('roles-container');
    const newField = document.createElement('div');
    newField.className = 'input-group mb-2';
    newField.innerHTML = `
      <input type="text" class="form-control role-field" placeholder="Role name" value="${AdminCommon.escapeHtml(value)}" required>
      <button class="btn btn-outline-danger remove-role" type="button">
        <i class="bi bi-trash"></i>
      </button>
    `;
    container.appendChild(newField);
  }

  function collectRoles() {
    const roles = [];
    document.querySelectorAll('.role-field').forEach(field => {
      const value = field.value.trim();
      if (value) {
        roles.push(value);
      }
    });
    return roles;
  }

  function handleSubmit(e) {
    e.preventDefault();

    const userId = document.getElementById('user-id').value.trim();
    const roles = collectRoles();

    // Validate user ID
    if (!userId) {
      AdminCommon.showError('User ID is required');
      return;
    }

    // Validate roles array
    if (roles.length === 0) {
      AdminCommon.showError('At least one role is required');
      return;
    }

    const data = {
      id: userId,
      roles: roles
    };

    if (isUpdateMode) {
      updateUser(id, data);
    } else {
      createUser(data);
    }
  }

  async function createUser(data) {
    showSubmitLoading(true);

    try {
      const response = await fetch('../../api/1.0/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to create user');
      }

      AdminCommon.showSuccess('User created successfully');
      setTimeout(() => window.location.href = '../#user', AdminCommon.REDIRECT_DELAY);
    } catch (error) {
      console.error('Error creating user:', error);
      AdminCommon.showError('Failed to create user: ' + error.message);
      showSubmitLoading(false);
    }
  }

  async function updateUser(userId, data) {
    showSubmitLoading(true);

    try {
      const response = await fetch(`../../api/1.0/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to update user');
      }

      AdminCommon.showSuccess('User updated successfully');
      setTimeout(() => window.location.href = '../#user', AdminCommon.REDIRECT_DELAY);
    } catch (error) {
      console.error('Error updating user:', error);
      AdminCommon.showError('Failed to update user: ' + error.message);
      showSubmitLoading(false);
    }
  }

  async function loadUserForEdit() {
    AdminCommon.showLoading('loading-spinner', ['user-form', 'error-message']);

    try {
      const response = await fetch(`../../api/1.0/admin/users/${id}`);
      
      if (!response.ok) {
        throw new Error('User not found');
      }

      const user = await response.json();
      populateForm(user);
      AdminCommon.hideLoading('loading-spinner', ['user-form']);
    } catch (error) {
      console.error('Error loading user:', error);
      AdminCommon.showErrorMessage('Failed to load user: ' + error.message, 'error-message', 'error-text', ['loading-spinner', 'user-form']);
    }
  }

  function populateForm(user) {
    document.getElementById('user-id').value = user.id || '';
    document.getElementById('user-id').disabled = true; // Can't change user ID in update mode

    // Populate roles
    const container = document.getElementById('roles-container');
    container.innerHTML = ''; // Clear existing

    if (user.roles && user.roles.length > 0) {
      user.roles.forEach(role => addRoleField(role));
    } else {
      addRoleField(); // Add one empty field if no roles
    }

    // Show delete button in header for update mode
    showDeleteButton();

    document.getElementById('submit-text').textContent = 'Update User';
  }

  // Use AdminCommon utilities - removed duplicate functions:
  // escapeHtml, showLoading, hideLoading, showError, showToast

  function showSubmitLoading(loading) {
    const form = document.getElementById('user-form');
    const text = isUpdateMode ? 'Update User' : 'Create User';
    
    if (form) {
      AdminCommon.setSubmitLoading(form, loading, loading ? 'Saving...' : text);
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
      AdminCommon.showError('Cannot delete in create mode');
      return;
    }

    const url = `../../api/1.0/admin/users/${id}`;

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
        throw new Error(text || 'Failed to delete user');
      }

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      modal?.hide();

      AdminCommon.showSuccess('User deleted successfully');
      
      // Redirect back to admin list after a short delay
      setTimeout(() => window.location.href = '../#user', AdminCommon.REDIRECT_DELAY);
    } catch (error) {
      console.error('Error deleting user:', error);
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
