"use strict";

(function () {
  /**
   * @typedef {Object} PulseConfiguration
   * @property {string} id
   * @property {string} type - "Normal" or "Agent"
   * @property {string} subType - PulseCheckType for Normal, AgentCheckType for Agent
   * @property {string} group
   * @property {string} name
   * @property {boolean} enabled
   */

  let configurations = [];
  let filteredConfigurations = [];
  let sortColumn = null; // null means use default sort
  let sortDirection = 'asc';

  // Initialize
  loadConfigurations();

  // Event Listeners
  document.getElementById('search-input')?.addEventListener('input', handleSearch);
  document.getElementById('filter-disabled')?.addEventListener('change', handleFilter);
  document.getElementById('sort-type')?.addEventListener('click', (e) => { e.preventDefault(); handleSort('type'); });
  document.getElementById('sort-group')?.addEventListener('click', (e) => { e.preventDefault(); handleSort('group'); });
  document.getElementById('sort-name')?.addEventListener('click', (e) => { e.preventDefault(); handleSort('name'); });
  document.getElementById('rename-save')?.addEventListener('click', handleRenameSave);
  document.getElementById('delete-confirm')?.addEventListener('click', handleDeleteConfirm);

  /**
   * Loads configurations from the API
   */
  function loadConfigurations() {
    showLoading();

    fetch('../api/1.0/admin/configurations')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
      })
      .then((data) => {
        configurations = data;
        filteredConfigurations = [...configurations];
        hideLoading();
        renderConfigurations();
      })
      .catch((error) => {
        console.error('Error loading configurations:', error);
        showError('Failed to load configurations: ' + error.message);
      });
  }

  /**
   * Renders the configurations table
   */
  function renderConfigurations() {
    const tbody = document.getElementById('configurations-table');
    if (!tbody) {
      console.error('Error getting configurations-table');
      return;
    }

    tbody.innerHTML = '';

    if (filteredConfigurations.length === 0) {
      const row = tbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 6;
      cell.className = 'text-center py-4 text-muted';
      cell.textContent = 'No configurations found';
      return;
    }

    filteredConfigurations.forEach((config) => {
      const row = tbody.insertRow();

      // Type
      const typeCell = row.insertCell();
      const isNormal = config.type === 'Normal' || config.type === 0;
      const typeIcon = isNormal ? 'bi-activity' : 'bi-robot';
      const typeText = isNormal ? 'Normal' : 'Agent';
      const typeBadge = isNormal ? 'bg-primary' : 'bg-info';
      typeCell.innerHTML = `<span class="badge ${typeBadge}"><i class="bi ${typeIcon}"></i> ${typeText}</span>`;

      // Group
      const groupCell = row.insertCell();
      groupCell.textContent = config.group || '(no group)';

      // Name
      const nameCell = row.insertCell();
      nameCell.textContent = config.name;

      // SubType
      const subTypeCell = row.insertCell();
      if (config.subType) {
        // Create badge based on subType value
        let subTypeBadge = 'bg-secondary';
        let subTypeIcon = 'bi-gear';
        
        // Different colors/icons for different check types
        switch (config.subType) {
          case 'HealthApi':
          case 'HealthCheck':
            subTypeBadge = 'bg-success';
            subTypeIcon = 'bi-heart-pulse';
            break;
          case 'StatusCode':
          case 'StatusApi':
            subTypeBadge = 'bg-info';
            subTypeIcon = 'bi-check-circle';
            break;
          case 'Json':
            subTypeBadge = 'bg-warning';
            subTypeIcon = 'bi-braces';
            break;
          case 'Contains':
            subTypeBadge = 'bg-warning';
            subTypeIcon = 'bi-search';
            break;
          case 'ApplicationInsights':
            subTypeBadge = 'bg-primary';
            subTypeIcon = 'bi-graph-up';
            break;
          case 'LogAnalyticsWorkspace':
            subTypeBadge = 'bg-primary';
            subTypeIcon = 'bi-journal-text';
            break;
        }
        
        subTypeCell.innerHTML = `<span class="badge ${subTypeBadge}"><i class="bi ${subTypeIcon}"></i> ${config.subType}</span>`;
      } else {
        subTypeCell.textContent = '';
      }

      // Enabled toggle
      const enabledCell = row.insertCell();
      enabledCell.className = 'text-center';
      const toggle = document.createElement('div');
      toggle.className = 'form-check form-switch d-inline-block';
      toggle.innerHTML = `
        <input class="form-check-input" type="checkbox" role="switch" 
               id="toggle-${config.id}" ${config.enabled ? 'checked' : ''}>
      `;
      enabledCell.appendChild(toggle);

      const checkbox = toggle.querySelector('input');
      checkbox?.addEventListener('change', (e) => handleToggle(config, e.target.checked));

      // Actions
      const actionsCell = row.insertCell();
      actionsCell.className = 'text-center';
      
      const btnGroup = document.createElement('div');
      btnGroup.className = 'btn-group btn-group-sm';
      
      const editBtn = document.createElement('a');
      editBtn.className = 'btn btn-outline-primary';
      editBtn.setAttribute('data-bs-toggle', 'tooltip');
      editBtn.setAttribute('data-bs-title', 'Edit');
      if (isNormal) {
        editBtn.href = `editor?mode=update&type=normal&id=${config.id}`;
      } else {
        editBtn.href = `editor?mode=update&type=agent&id=${config.id}&agentType=${config.subType}`;
      }
      editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
      
      const renameBtn = document.createElement('button');
      renameBtn.className = 'btn btn-outline-secondary';
      renameBtn.setAttribute('data-bs-toggle', 'tooltip');
      renameBtn.setAttribute('data-bs-title', 'Rename');
      renameBtn.innerHTML = '<i class="bi bi-pencil-square"></i>';
      renameBtn.addEventListener('click', () => handleRenameClick(config));
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-outline-danger';
      deleteBtn.setAttribute('data-bs-toggle', 'tooltip');
      deleteBtn.setAttribute('data-bs-title', 'Delete');
      deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
      deleteBtn.addEventListener('click', () => handleDeleteClick(config));
      
      btnGroup.appendChild(editBtn);
      btnGroup.appendChild(renameBtn);
      btnGroup.appendChild(deleteBtn);
      actionsCell.appendChild(btnGroup);
    });

    // Initialize tooltips for the newly created buttons
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
  }

  /**
   * Handles the toggle of enabled/disabled state
   * @param {PulseConfiguration} config
   * @param {boolean} enabled
   */
  function handleToggle(config, enabled) {
    const isNormal = config.type === 'Normal' || config.type === 0;
    const typeText = isNormal ? 'normal' : 'agent';
    const url = isNormal 
      ? `../api/1.0/admin/configurations/${typeText}/${config.id}/${enabled}`
      : `../api/1.0/admin/configurations/${typeText}/${config.id}/${config.subType}/${enabled}`;
    
    fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to update configuration');
        }
        config.enabled = enabled;
        showToast(
          'Success',
          `Configuration ${enabled ? 'enabled' : 'disabled'} successfully`,
          'success'
        );
      })
      .catch((error) => {
        console.error('Error updating configuration:', error);
        showToast('Error', 'Failed to update configuration: ' + error.message, 'danger');
        // Revert checkbox
        const checkbox = document.getElementById(`toggle-${config.id}`);
        if (checkbox) {
          checkbox.checked = !enabled;
        }
      });
  }

  /**
   * Handles the rename button click
   * @param {PulseConfiguration} config
   */
  function handleRenameClick(config) {
    document.getElementById('rename-id').value = config.id;
    document.getElementById('rename-type').value = config.type;
    document.getElementById('rename-enabled').value = config.enabled;
    document.getElementById('rename-group').value = config.group;
    document.getElementById('rename-name').value = config.name;

    const modal = new bootstrap.Modal(document.getElementById('renameModal'));
    modal.show();
  }

  /**
   * Handles saving the rename
   */
  function handleRenameSave() {
    const id = document.getElementById('rename-id').value;
    const type = parseInt(document.getElementById('rename-type').value);
    const group = document.getElementById('rename-group').value.trim();
    const name = document.getElementById('rename-name').value.trim();

    if (!name) {
      showToast('Error', 'Name is required', 'danger');
      return;
    }

    fetch(`../api/1.0/admin/configurations/${id}/name`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        group: group,
        name: name
      })
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to rename configuration');
        }

        // Update local data - update ALL configurations with this ID (both normal and agent)
        configurations.forEach(config => {
          if (config.id === id) {
            config.group = group;
            config.name = name;
          }
        });

        // Update filtered configurations as well
        filteredConfigurations.forEach(config => {
          if (config.id === id) {
            config.group = group;
            config.name = name;
          }
        });

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('renameModal'));
        modal?.hide();

        // Re-sort and re-render (maintains current sort state)
        sortConfigurations();
        renderConfigurations();
        showToast('Success', 'Configuration renamed successfully', 'success');
      })
      .catch((error) => {
        console.error('Error renaming configuration:', error);
        showToast('Error', 'Failed to rename configuration: ' + error.message, 'danger');
      });
  }

  /**
   * Handles the delete button click
   * @param {PulseConfiguration} config
   */
  function handleDeleteClick(config) {
    const isNormal = config.type === 'Normal' || config.type === 0;
    
    // Populate modal with configuration details
    document.getElementById('delete-id').value = config.id;
    document.getElementById('delete-type').value = config.type;
    document.getElementById('delete-subtype').value = config.subType || '';
    
    // Display configuration info
    const typeIcon = isNormal ? 'bi-activity' : 'bi-robot';
    const typeText = isNormal ? 'Normal' : 'Agent';
    const typeBadge = isNormal ? 'bg-primary' : 'bg-info';
    document.getElementById('delete-config-type').innerHTML = `<i class="bi ${typeIcon}"></i> ${typeText}`;
    document.getElementById('delete-config-type').className = `badge ${typeBadge}`;
    
    // Display subtype badge
    const subTypeElement = document.getElementById('delete-config-subtype');
    if (config.subType) {
      let subTypeBadge = 'bg-secondary';
      let subTypeIcon = 'bi-gear';
      
      switch (config.subType) {
        case 'HealthApi':
        case 'HealthCheck':
          subTypeBadge = 'bg-success';
          subTypeIcon = 'bi-heart-pulse';
          break;
        case 'StatusCode':
        case 'StatusApi':
          subTypeBadge = 'bg-info';
          subTypeIcon = 'bi-check-circle';
          break;
        case 'Json':
          subTypeBadge = 'bg-warning';
          subTypeIcon = 'bi-braces';
          break;
        case 'Contains':
          subTypeBadge = 'bg-warning';
          subTypeIcon = 'bi-search';
          break;
        case 'ApplicationInsights':
          subTypeBadge = 'bg-primary';
          subTypeIcon = 'bi-graph-up';
          break;
        case 'LogAnalyticsWorkspace':
          subTypeBadge = 'bg-primary';
          subTypeIcon = 'bi-journal-text';
          break;
      }
      
      subTypeElement.innerHTML = `<i class="bi ${subTypeIcon}"></i> ${config.subType}`;
      subTypeElement.className = `badge ${subTypeBadge} ms-1`;
    } else {
      subTypeElement.innerHTML = '';
      subTypeElement.className = 'badge ms-1 d-none';
    }
    
    document.getElementById('delete-config-name').textContent = config.name;
    const groupText = config.group ? ` (${config.group})` : '';
    document.getElementById('delete-config-group').textContent = groupText;

    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
  }

  /**
   * Handles the delete confirmation
   */
  function handleDeleteConfirm() {
    const id = document.getElementById('delete-id').value;
    const type = document.getElementById('delete-type').value;
    const subType = document.getElementById('delete-subtype').value;
    
    const isNormal = type === 'Normal' || type === '0';
    const typeText = isNormal ? 'normal' : 'agent';
    const url = isNormal 
      ? `../api/1.0/admin/configurations/${typeText}/${id}`
      : `../api/1.0/admin/configurations/${typeText}/${id}/${subType}`;

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

        // Remove from local data
        configurations = configurations.filter(c => !(c.id === id && c.type === type));
        filteredConfigurations = filteredConfigurations.filter(c => !(c.id === id && c.type === type));

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
        modal?.hide();

        // Re-render
        renderConfigurations();
        showToast('Success', 'Configuration deleted successfully', 'success');
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

  /**
   * Handles search input
   */
  function handleSearch() {
    applyFilters();
  }

  /**
   * Handles filter toggle
   */
  function handleFilter() {
    applyFilters();
  }

  /**
   * Applies search and filter
   */
  function applyFilters() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const showDisabledOnly = document.getElementById('filter-disabled')?.checked || false;

    filteredConfigurations = configurations.filter((config) => {
      const isNormal = config.type === 'Normal' || config.type === 0;
      const typeText = isNormal ? 'normal' : 'agent';
      const matchesSearch = !searchTerm ||
        config.group.toLowerCase().includes(searchTerm) ||
        config.name.toLowerCase().includes(searchTerm) ||
        typeText.includes(searchTerm);

      const matchesFilter = !showDisabledOnly || !config.enabled;

      return matchesSearch && matchesFilter;
    });

    sortConfigurations();
    renderConfigurations();
  }

  /**
   * Handles sorting
   * @param {string} column
   */
  function handleSort(column) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }

    updateSortIcons();
    sortConfigurations();
    renderConfigurations();
  }

  /**
   * Updates sort icons
   */
  function updateSortIcons() {
    ['type', 'group', 'name'].forEach((col) => {
      const icon = document.querySelector(`#sort-${col} i`);
      if (icon) {
        if (sortColumn && col === sortColumn) {
          icon.className = sortDirection === 'asc' ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
        } else {
          icon.className = 'bi bi-chevron-expand';
        }
      }
    });
  }

  /**
   * Sorts the filtered configurations
   */
  function sortConfigurations() {
    filteredConfigurations.sort((a, b) => {
      // Primary sort by the selected column
      let result = 0;
      
      switch (sortColumn) {
        case 'type':
          result = compareTypes(a.type, b.type);
          if (result !== 0) return sortDirection === 'asc' ? result : -result;
          // Secondary sort by group, then name
          result = compareValues(a.group.toLowerCase(), b.group.toLowerCase());
          if (result !== 0) return result;
          return compareValues(a.name.toLowerCase(), b.name.toLowerCase());
          
        case 'group':
          result = compareValues(a.group.toLowerCase(), b.group.toLowerCase());
          if (result !== 0) return sortDirection === 'asc' ? result : -result;
          // Secondary sort by type, then name
          result = compareTypes(a.type, b.type);
          if (result !== 0) return result;
          return compareValues(a.name.toLowerCase(), b.name.toLowerCase());
          
        case 'name':
          result = compareValues(a.name.toLowerCase(), b.name.toLowerCase());
          if (result !== 0) return sortDirection === 'asc' ? result : -result;
          // Secondary sort by type, then group
          result = compareTypes(a.type, b.type);
          if (result !== 0) return result;
          return compareValues(a.group.toLowerCase(), b.group.toLowerCase());
          
        default:
          // Default sort: type → group → name (Normal before Agent)
          result = compareTypes(a.type, b.type);
          if (result !== 0) return result;
          result = compareValues(a.group.toLowerCase(), b.group.toLowerCase());
          if (result !== 0) return result;
          return compareValues(a.name.toLowerCase(), b.name.toLowerCase());
      }
    });
  }

  /**
   * Compares two values for sorting
   * @param {any} a
   * @param {any} b
   * @returns {number} -1 if a < b, 1 if a > b, 0 if equal
   */
  function compareValues(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  /**
   * Compares two type values ensuring Normal comes before Agent
   * @param {string} a - Type value ("Normal" or "Agent")
   * @param {string} b - Type value ("Normal" or "Agent")
   * @returns {number} -1 if a < b, 1 if a > b, 0 if equal
   */
  function compareTypes(a, b) {
    const isANormal = a === 'Normal' || a === 0;
    const isBNormal = b === 'Normal' || b === 0;
    
    if (isANormal && !isBNormal) return -1; // Normal before Agent
    if (!isANormal && isBNormal) return 1;  // Agent after Normal
    return 0; // Both same type
  }

  /**
   * Shows loading state
   */
  function showLoading() {
    document.getElementById('loading-spinner')?.classList.remove('d-none');
    document.getElementById('configurations-container')?.classList.add('d-none');
    document.getElementById('error-message')?.classList.add('d-none');
  }

  /**
   * Hides loading state
   */
  function hideLoading() {
    document.getElementById('loading-spinner')?.classList.add('d-none');
    document.getElementById('configurations-container')?.classList.remove('d-none');
  }

  /**
   * Shows error message
   * @param {string} message
   */
  function showError(message) {
    document.getElementById('loading-spinner')?.classList.add('d-none');
    document.getElementById('configurations-container')?.classList.add('d-none');
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
      errorDiv.classList.remove('d-none');
      document.getElementById('error-text').textContent = message;
    }
  }

  /**
   * Shows a toast notification
   * @param {string} title
   * @param {string} message
   * @param {string} type - 'success', 'danger', 'warning', 'info'
   */
  function showToast(title, message, type) {
    if (typeof bootstrap !== 'undefined' && bootstrap.showToast) {
      bootstrap.showToast({
        header: title,
        body: message,
        toastClass: `toast-${type}`
      });
    }
  }
})();
