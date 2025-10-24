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
      loadUserForEdit();
    } else {
      hideLoading();
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
          showToast('Error', 'At least one role is required', 'danger');
        }
      }
    });
  }

  function addRoleField(value = '') {
    const container = document.getElementById('roles-container');
    const newField = document.createElement('div');
    newField.className = 'input-group mb-2';
    newField.innerHTML = `
      <input type="text" class="form-control role-field" placeholder="Role name" value="${escapeHtml(value)}" required>
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

    // Validate required fields
    if (!userId) {
      showToast('Error', 'User ID is required', 'danger');
      return;
    }

    if (roles.length === 0) {
      showToast('Error', 'At least one role is required', 'danger');
      return;
    }

    // Check for empty strings in roles
    if (roles.some(role => role === '')) {
      showToast('Error', 'Roles cannot be empty strings', 'danger');
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

  function createUser(data) {
    showSubmitLoading(true);

    fetch('../../api/1.0/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(text || 'Failed to create user');
          });
        }
        showToast('Success', 'User created successfully', 'success');
        setTimeout(() => window.location.href = '../#user', 1500);
      })
      .catch(error => {
        console.error('Error creating user:', error);
        showToast('Error', 'Failed to create user: ' + error.message, 'danger');
        showSubmitLoading(false);
      });
  }

  function updateUser(userId, data) {
    showSubmitLoading(true);

    fetch(`../../api/1.0/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(text || 'Failed to update user');
          });
        }
        showToast('Success', 'User updated successfully', 'success');
        setTimeout(() => window.location.href = '../#user', 1500);
      })
      .catch(error => {
        console.error('Error updating user:', error);
        showToast('Error', 'Failed to update user: ' + error.message, 'danger');
        showSubmitLoading(false);
      });
  }

  function loadUserForEdit() {
    showLoading();

    fetch(`../../api/1.0/admin/users/${id}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('User not found');
        }
        return response.json();
      })
      .then(user => {
        populateForm(user);
        hideLoading();
      })
      .catch(error => {
        console.error('Error loading user:', error);
        showError('Failed to load user: ' + error.message);
      });
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

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showSubmitLoading(loading) {
    const form = document.getElementById('user-form');
    const submitBtn = form?.querySelector('button[type="submit"]');
    
    if (submitBtn) {
      submitBtn.disabled = loading;
      if (loading) {
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
      } else {
        const text = isUpdateMode ? 'Update User' : 'Create User';
        submitBtn.innerHTML = `<i class="bi bi-save"></i> ${text}`;
      }
    }
  }

  function showLoading() {
    document.getElementById('loading-spinner')?.classList.remove('d-none');
    document.getElementById('user-form')?.classList.add('d-none');
    document.getElementById('error-message')?.classList.add('d-none');
  }

  function hideLoading() {
    document.getElementById('loading-spinner')?.classList.add('d-none');
    document.getElementById('user-form')?.classList.remove('d-none');
  }

  function showError(message) {
    document.getElementById('loading-spinner')?.classList.add('d-none');
    document.getElementById('user-form')?.classList.add('d-none');
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

    const url = `../../api/1.0/admin/users/${id}`;

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
            throw new Error(text || 'Failed to delete user');
          });
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
        modal?.hide();

        showToast('Success', 'User deleted successfully', 'success');
        
        // Redirect back to admin list after a short delay
        setTimeout(() => window.location.href = '../#user', 1500);
      })
      .catch((error) => {
        console.error('Error deleting user:', error);
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
