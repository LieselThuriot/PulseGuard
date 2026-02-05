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

  /**
   * @typedef {Object} Webhook
   * @property {string} id
   * @property {string} group
   * @property {string} name
   * @property {string} location
   * @property {boolean} enabled
   */

  /**
   * @typedef {Object} User
   * @property {string} id
   * @property {string[]} roles
   */

  let configurations = [];
  let filteredConfigurations = [];
  let webhooks = [];
  let filteredWebhooks = [];
  let users = [];
  let filteredUsers = [];
  let credentials = [];
  let filteredCredentials = [];
  let sortColumn = null; // null means use default sort
  let sortDirection = 'asc';
  let tooltipInstances = []; // Track tooltip instances to prevent memory leaks
  let activeRequests = { configs: null, webhooks: null, users: null, credentials: null }; // Track active fetch requests
  let loadRetryCount = { configs: 0, webhooks: 0, users: 0, credentials: 0 }; // Track retry attempts

  // Initialize
  checkCredentialsRole();
  loadConfigurations();
  loadWebhooks();
  loadUsers();
  initializeTabs();

  // Create debounced search handler (300ms delay)
  const debouncedSearch = debounce(handleSearch, 300);

  // Event Listeners
  document.getElementById('search-input')?.addEventListener('input', debouncedSearch);
  document.getElementById('filter-disabled')?.addEventListener('change', handleFilter);
  document.getElementById('sort-type')?.addEventListener('click', (e) => { e.preventDefault(); handleSort('type'); });
  document.getElementById('sort-group')?.addEventListener('click', (e) => { e.preventDefault(); handleSort('group'); });
  document.getElementById('sort-name')?.addEventListener('click', (e) => { e.preventDefault(); handleSort('name'); });
  document.getElementById('rename-save')?.addEventListener('click', handleRenameSave);
  document.getElementById('rename-user-save')?.addEventListener('click', handleUserRenameSave);
  document.getElementById('delete-confirm')?.addEventListener('click', handleDeleteConfirm);
  document.getElementById('delete-webhook-confirm')?.addEventListener('click', handleWebhookDeleteConfirm);
  document.getElementById('delete-user-confirm')?.addEventListener('click', handleUserDeleteConfirm);
  document.getElementById('delete-credential-confirm')?.addEventListener('click', handleCredentialDeleteConfirm);

  /**
   * Initialize tab state management
   */
  function initializeTabs() {
    // Restore active tab from URL hash
    const hash = window.location.hash;
    if (hash === '#agent-tab' || hash === '#agent') {
      activateTab('agent-tab');
    } else if (hash === '#webhook-tab' || hash === '#webhook') {
      activateTab('webhook-tab');
    } else if (hash === '#user-tab' || hash === '#user') {
      activateTab('user-tab');
    } else if (hash === '#credential-tab' || hash === '#credential') {
      activateTab('credential-tab');
    } else if (hash === '#pulse-tab' || hash === '#pulse' || hash === '#normal-tab' || hash === '#normal') {
      activateTab('pulse-tab');
    }

    // Update create button based on active tab
    updateCreateButton();

    // Save tab state when tabs are clicked
    document.getElementById('pulse-tab')?.addEventListener('shown.bs.tab', () => {
      window.location.hash = 'pulse';
      updateCreateButton();
    });
    document.getElementById('agent-tab')?.addEventListener('shown.bs.tab', () => {
      window.location.hash = 'agent';
      updateCreateButton();
    });
    document.getElementById('webhook-tab')?.addEventListener('shown.bs.tab', () => {
      window.location.hash = 'webhook';
      updateCreateButton();
    });
    document.getElementById('user-tab')?.addEventListener('shown.bs.tab', () => {
      window.location.hash = 'user';
      updateCreateButton();
    });
    document.getElementById('credential-tab')?.addEventListener('shown.bs.tab', () => {
      window.location.hash = 'credential';
      updateCreateButton();
    });
  }

  /**
   * Update the create button based on active tab
   */
  function updateCreateButton() {
    const createBtn = document.getElementById('create-btn');
    if (!createBtn) return;

    // Determine which tab is active
    const pulseTab = document.getElementById('pulse-tab');
    const agentTab = document.getElementById('agent-tab');
    const webhookTab = document.getElementById('webhook-tab');
    const userTab = document.getElementById('user-tab');
    const credentialTab = document.getElementById('credential-tab');

    if (agentTab?.classList.contains('active') || agentTab?.getAttribute('aria-selected') === 'true') {
      createBtn.href = 'agent-editor?mode=create';
    } else if (webhookTab?.classList.contains('active') || webhookTab?.getAttribute('aria-selected') === 'true') {
      createBtn.href = 'webhook-editor?mode=create';
    } else if (userTab?.classList.contains('active') || userTab?.getAttribute('aria-selected') === 'true') {
      createBtn.href = 'user-editor?mode=create';
    } else if (credentialTab?.classList.contains('active') || credentialTab?.getAttribute('aria-selected') === 'true') {
      createBtn.href = 'credential-editor?mode=create';
    } else {
      createBtn.href = 'pulse-editor?mode=create';
    }
  }

  /**
   * Check if user has Credentials role and add credentials tab if needed
   */
  function checkCredentialsRole() {
    fetch('../api/1.0/user')
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        return null;
      })
      .then((userInfo) => {
        const hasCredentialsRole = userInfo && userInfo.roles && userInfo.roles.includes('Credentials');
        
        if (hasCredentialsRole) {
          addCredentialsTab();
          loadCredentials();
        }
      })
      .catch((error) => {
        // Silently fail - don't add credentials tab
        console.debug('Could not check user roles:', error);
      });
  }

  /**
   * Dynamically add the credentials tab and content to the DOM
   */
  function addCredentialsTab() {
    // Add tab navigation button
    const tabList = document.querySelector('#configTabs');
    if (tabList) {
      const credentialTabItem = document.createElement('li');
      credentialTabItem.className = 'nav-item';
      credentialTabItem.setAttribute('role', 'presentation');
      
      credentialTabItem.innerHTML = `
        <button class="nav-link" id="credential-tab" data-bs-toggle="tab" data-bs-target="#credential-pane"
                type="button" role="tab" aria-controls="credential-pane" aria-selected="false">
            <i class="bi bi-key-fill"></i> Credentials <span class="badge bg-secondary ms-1" id="credential-count">0</span>
        </button>
      `;
      
      tabList.appendChild(credentialTabItem);
    }
    
    // Add tab content panel
    const tabContent = document.querySelector('#configTabsContent');
    if (tabContent) {
      const credentialPane = document.createElement('div');
      credentialPane.className = 'tab-pane fade';
      credentialPane.id = 'credential-pane';
      credentialPane.setAttribute('role', 'tabpanel');
      credentialPane.setAttribute('aria-labelledby', 'credential-tab');
      credentialPane.setAttribute('tabindex', '0');
      
      credentialPane.innerHTML = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th scope="col">
                            <a href="#" id="sort-credential-id" class="text-decoration-none text-body" aria-label="Sort by credential ID">
                                Credential ID <i class="bi bi-chevron-expand" aria-hidden="true"></i>
                            </a>
                        </th>
                        <th scope="col">Type</th>
                        <th scope="col">Details</th>
                        <th scope="col" class="text-center" style="width: 200px;">Actions</th>
                    </tr>
                </thead>
                <tbody id="credential-table">
                    <!-- Credentials will be inserted here -->
                </tbody>
            </table>
        </div>
      `;
      
      tabContent.appendChild(credentialPane);
    }
    
    // Add event listener for the new tab
    document.getElementById('credential-tab')?.addEventListener('shown.bs.tab', () => {
      window.location.hash = 'credential';
      updateCreateButton();
    });

    // If the URL hash indicates credential tab should be active, activate it now
    const hash = window.location.hash;
    if (hash === '#credential-tab' || hash === '#credential') {
      activateTab('credential-tab');
    }
  }

  /**
   * Activate a specific tab
   * @param {string} tabId - The ID of the tab button to activate
   */
  function activateTab(tabId) {
    const tabEl = document.getElementById(tabId);
    if (tabEl) {
      const tab = new bootstrap.Tab(tabEl);
      tab.show();
    }
  }

  /**
   * Loads configurations from the API
   */
  async function loadConfigurations() {
    // Cancel previous request if still pending
    if (activeRequests.configs) {
      activeRequests.configs.abort();
    }

    const controller = new AbortController();
    activeRequests.configs = controller;

    showLoading();

    try {
      const response = await fetch('../api/1.0/admin/configurations', { signal: controller.signal });
      
      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }
      
      const data = await response.json();
      configurations = data;
      filteredConfigurations = [...configurations];
      loadRetryCount.configs = 0; // Reset retry count on success
      activeRequests.configs = null;
      hideLoading();
      renderConfigurations();
    } catch (error) {
      activeRequests.configs = null;
      if (error.name === 'AbortError') {
        console.log('Configuration load aborted');
        return;
      }
      console.error('Error loading configurations:', error);
      showError('Failed to load configurations: ' + error.message);
      showRetryButton('configs', loadConfigurations);
    }
  }

  /**
   * Loads webhooks from the API
   */
  async function loadWebhooks() {
    // Cancel previous request if still pending
    if (activeRequests.webhooks) {
      activeRequests.webhooks.abort();
    }

    const controller = new AbortController();
    activeRequests.webhooks = controller;

    try {
      const response = await fetch('../api/1.0/admin/webhooks', { signal: controller.signal });
      
      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }
      
      const data = await response.json();
      webhooks = data;
      filteredWebhooks = [...webhooks];
      loadRetryCount.webhooks = 0; // Reset retry count on success
      activeRequests.webhooks = null;
      renderWebhooks();
    } catch (error) {
      activeRequests.webhooks = null;
      if (error.name === 'AbortError') {
        console.log('Webhook load aborted');
        return;
      }
      console.error('Error loading webhooks:', error);
      showError('Failed to load webhooks: ' + error.message);
    }
  }

  /**
   * Loads users from the API
   */
  async function loadUsers() {
    // Cancel previous request if still pending
    if (activeRequests.users) {
      activeRequests.users.abort();
    }

    const controller = new AbortController();
    activeRequests.users = controller;

    try {
      const response = await fetch('../api/1.0/admin/users', { signal: controller.signal });
      
      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }
      
      const data = await response.json();
      users = data;
      filteredUsers = [...users];
      loadRetryCount.users = 0; // Reset retry count on success
      activeRequests.users = null;
      renderUsers();
    } catch (error) {
      activeRequests.users = null;
      if (error.name === 'AbortError') {
        console.log('User load aborted');
        return;
      }
      console.error('Error loading users:', error);
      showError('Failed to load users: ' + error.message);
    }
  }

  /**
   * Loads credentials from the API
   */
  async function loadCredentials() {
    // Cancel previous request if still pending
    if (activeRequests.credentials) {
      activeRequests.credentials.abort();
    }

    const controller = new AbortController();
    activeRequests.credentials = controller;

    try {
      const response = await fetch('../api/1.0/admin/credentials', { signal: controller.signal });
      
      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }
      
      const data = await response.json();
      credentials = data;
      filteredCredentials = [...credentials];
      loadRetryCount.credentials = 0; // Reset retry count on success
      activeRequests.credentials = null;
      renderCredentials();
    } catch (error) {
      activeRequests.credentials = null;
      if (error.name === 'AbortError') {
        console.log('Credential load aborted');
        return;
      }
      console.error('Error loading credentials:', error);
      showError('Failed to load credentials: ' + error.message);
    }
  }

  /**
   * Renders the configurations table
   */
  function renderConfigurations() {
    const pulseTbody = document.getElementById('pulse-table');
    const agentTbody = document.getElementById('agent-table');
    
    if (!pulseTbody || !agentTbody) {
      console.error('Error getting table elements');
      return;
    }

    // Clear both tables
    pulseTbody.innerHTML = '';
    agentTbody.innerHTML = '';

    // Separate configurations by type
    let pulseConfigs = filteredConfigurations.filter(c => c.type === 'Normal');
    let agentConfigs = filteredConfigurations.filter(c => c.type === 'Agent');

    // Sort each subset appropriately
    const sortSubset = (configs) => {
      return configs.sort((a, b) => {
        let result = 0;
        
        if (sortColumn === 'group') {
          result = compareValues(a.group.toLowerCase(), b.group.toLowerCase());
          if (result !== 0) return sortDirection === 'asc' ? result : -result;
          return compareValues(a.name.toLowerCase(), b.name.toLowerCase());
        } else if (sortColumn === 'name') {
          result = compareValues(a.name.toLowerCase(), b.name.toLowerCase());
          if (result !== 0) return sortDirection === 'asc' ? result : -result;
          return compareValues(a.group.toLowerCase(), b.group.toLowerCase());
        } else {
          // Default: group → name
          result = compareValues(a.group.toLowerCase(), b.group.toLowerCase());
          if (result !== 0) return result;
          return compareValues(a.name.toLowerCase(), b.name.toLowerCase());
        }
      });
    };

    pulseConfigs = sortSubset(pulseConfigs);
    agentConfigs = sortSubset(agentConfigs);

    // Update tab counts
    document.getElementById('pulse-count').textContent = pulseConfigs.length;
    document.getElementById('agent-count').textContent = agentConfigs.length;

    // Render pulse configurations
    if (pulseConfigs.length === 0) {
      const row = pulseTbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 5;
      cell.className = 'text-center py-4 text-muted';
      cell.textContent = 'No pulse checks found';
    } else {
      pulseConfigs.forEach(config => renderConfigRow(pulseTbody, config));
    }

    // Render agent configurations
    if (agentConfigs.length === 0) {
      const row = agentTbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 5;
      cell.className = 'text-center py-4 text-muted';
      cell.textContent = 'No agent checks found';
    } else {
      agentConfigs.forEach(config => renderConfigRow(agentTbody, config));
    }

    // Dispose old tooltips to prevent memory leaks
    tooltipInstances.forEach(tooltip => tooltip.dispose());
    tooltipInstances = [];

    // Initialize tooltips for the newly created buttons
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipInstances = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
  }

  /**
   * Renders a single configuration row
   * @param {HTMLTableSectionElement} tbody
   * @param {PulseConfiguration} config
   */
  function renderConfigRow(tbody, config) {
    const row = tbody.insertRow();
    const isNormal = config.type === 'Normal' || config.type === 0;

    // Group
    const groupCell = row.insertCell();
    groupCell.textContent = (!config.group || config.group === '') ? '(no group)' : config.group;

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
          subTypeBadge = 'bg-info';
          subTypeIcon = 'bi-graph-up';
          break;
        case 'LogAnalyticsWorkspace':
          subTypeBadge = 'bg-primary';
          subTypeIcon = 'bi-journal-text';
          break;
        case 'WebAppDeployment':
          subTypeBadge = 'bg-success';
          subTypeIcon = 'bi-cloud-upload';
          break;
        case 'DevOpsDeployment':
          subTypeBadge = 'bg-warning text-dark';
          subTypeIcon = 'bi-git';
          break;
        case 'DevOpsRelease':
          subTypeBadge = 'bg-secondary';
          subTypeIcon = 'bi-rocket';
          break;
      }
      
      subTypeCell.innerHTML = `<span class="badge ${subTypeBadge}"><i class="bi ${subTypeIcon}"></i> ${escapeHtml(config.subType)}</span>`;
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
             id="toggle-${escapeHtml(config.id)}" ${config.enabled ? 'checked' : ''}>
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
      editBtn.href = `pulse-editor?mode=update&id=${encodeURIComponent(config.id)}`;
    } else {
      editBtn.href = `agent-editor?mode=update&id=${encodeURIComponent(config.id)}&agentType=${encodeURIComponent(config.subType)}`;
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
  }

  /**
   * Renders the webhooks table
   */
  function renderWebhooks() {
    const webhookTbody = document.getElementById('webhook-table');
    
    if (!webhookTbody) {
      console.error('Error getting webhook table element');
      return;
    }

    // Clear table
    webhookTbody.innerHTML = '';

    // Sort webhooks
    const sortedWebhooks = [...filteredWebhooks].sort((a, b) => {
      let result = 0;
      
      if (sortColumn === 'group') {
        result = compareValues(a.group.toLowerCase(), b.group.toLowerCase());
        if (result !== 0) return sortDirection === 'asc' ? result : -result;
        return compareValues(a.name.toLowerCase(), b.name.toLowerCase());
      } else if (sortColumn === 'name') {
        result = compareValues(a.name.toLowerCase(), b.name.toLowerCase());
        if (result !== 0) return sortDirection === 'asc' ? result : -result;
        return compareValues(a.group.toLowerCase(), b.group.toLowerCase());
      } else {
        // Default: group → name
        result = compareValues(a.group.toLowerCase(), b.group.toLowerCase());
        if (result !== 0) return result;
        return compareValues(a.name.toLowerCase(), b.name.toLowerCase());
      }
    });

    // Update tab count
    const webhookCount = document.getElementById('webhook-count');
    if (webhookCount) webhookCount.textContent = sortedWebhooks.length;

    // Render webhooks
    if (sortedWebhooks.length === 0) {
      const row = webhookTbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 6;
      cell.className = 'text-center py-4 text-muted';
      cell.textContent = 'No webhooks found';
    } else {
      sortedWebhooks.forEach(webhook => renderWebhookRow(webhookTbody, webhook));
    }

    // Dispose old tooltips to prevent memory leaks
    tooltipInstances.forEach(tooltip => tooltip.dispose());
    tooltipInstances = [];

    // Initialize tooltips for the newly created buttons
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipInstances = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
  }

  /**
   * Renders a single webhook row
   * @param {HTMLTableSectionElement} tbody
   * @param {Webhook} webhook
   */
  function renderWebhookRow(tbody, webhook) {
    const row = tbody.insertRow();

    // Group
    const groupCell = row.insertCell();
    if (webhook.group === '*') {
      groupCell.textContent = '(all)';
    } else if (!webhook.group || webhook.group === '') {
      groupCell.textContent = '(no group)';
    } else {
      groupCell.textContent = webhook.group;
    }

    // Name
    const nameCell = row.insertCell();
    if (webhook.name === '*') {
      nameCell.textContent = '(all)';
    } else if (!webhook.name || webhook.name === '') {
      nameCell.textContent = '(no name)';
    } else {
      nameCell.textContent = webhook.name;
    }

    // Type with badge
    const typeCell = row.insertCell();
    let typeBadge = 'bg-secondary';
    let typeIcon = 'bi-webhook';
    let typeName = 'All';
    
    // Map webhook type to badge colors and icons
    if (webhook.type === 0 || webhook.type === 'All') {
      typeBadge = 'bg-primary';
      typeIcon = 'bi-broadcast';
      typeName = 'All';
    } else if (webhook.type === 1 || webhook.type === 'StateChange') {
      typeBadge = 'bg-warning text-dark';
      typeIcon = 'bi-arrow-left-right';
      typeName = 'StateChange';
    } else if (webhook.type === 2 || webhook.type === 'ThresholdBreach') {
      typeBadge = 'bg-danger';
      typeIcon = 'bi-exclamation-triangle';
      typeName = 'ThresholdBreach';
    }
    
    typeCell.innerHTML = `<span class="badge ${typeBadge}"><i class="bi ${typeIcon}"></i> ${escapeHtml(typeName)}</span>`;

    // Location
    const locationCell = row.insertCell();
    locationCell.textContent = webhook.location;
    locationCell.className = 'text-truncate';
    locationCell.style.maxWidth = '300px';

    // Enabled toggle
    const enabledCell = row.insertCell();
    enabledCell.className = 'text-center';
    const toggle = document.createElement('div');
    toggle.className = 'form-check form-switch d-inline-block';
    toggle.innerHTML = `
      <input class="form-check-input" type="checkbox" role="switch" 
             id="toggle-webhook-${escapeHtml(webhook.id)}" ${webhook.enabled ? 'checked' : ''}>
    `;
    enabledCell.appendChild(toggle);

    const checkbox = toggle.querySelector('input');
    checkbox?.addEventListener('change', (e) => handleWebhookToggle(webhook, e.target.checked));

    // Actions
    const actionsCell = row.insertCell();
    actionsCell.className = 'text-center';
    
    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group btn-group-sm';
    
    const editBtn = document.createElement('a');
    editBtn.className = 'btn btn-outline-primary';
    editBtn.setAttribute('data-bs-toggle', 'tooltip');
    editBtn.setAttribute('data-bs-title', 'Edit');
    editBtn.href = `webhook-editor?mode=update&id=${encodeURIComponent(webhook.id)}#webhook`;
    editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-outline-danger';
    deleteBtn.setAttribute('data-bs-toggle', 'tooltip');
    deleteBtn.setAttribute('data-bs-title', 'Delete');
    deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
    deleteBtn.addEventListener('click', () => handleWebhookDeleteClick(webhook));
    
    btnGroup.appendChild(editBtn);
    btnGroup.appendChild(deleteBtn);
    actionsCell.appendChild(btnGroup);
  }

  /**
   * Renders the users table
   */
  function renderUsers() {
    const userTbody = document.getElementById('user-table');
    
    if (!userTbody) {
      console.error('Error getting user table element');
      return;
    }

    // Clear table
    userTbody.innerHTML = '';

    // Sort users by ID
    const sortedUsers = [...filteredUsers].sort((a, b) => {
      return compareValues(a.id.toLowerCase(), b.id.toLowerCase());
    });

    // Update tab count
    const userCount = document.getElementById('user-count');
    if (userCount) userCount.textContent = sortedUsers.length;

    // Render users
    if (sortedUsers.length === 0) {
      const row = userTbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 5;
      cell.className = 'text-center py-4 text-muted';
      cell.textContent = 'No users found';
    } else {
      sortedUsers.forEach(user => renderUserRow(userTbody, user));
    }

    // Dispose old tooltips to prevent memory leaks
    tooltipInstances.forEach(tooltip => tooltip.dispose());
    tooltipInstances = [];

    // Initialize tooltips for the newly created buttons
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipInstances = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
  }

  /**
   * Renders a single user row
   * @param {HTMLTableSectionElement} tbody
   * @param {User} user
   */
  function renderUserRow(tbody, user) {
    const row = tbody.insertRow();

    // User ID
    const idCell = row.insertCell();
    idCell.textContent = user.id;

    // Nickname
    const nicknameCell = row.insertCell();
    if (user.nickname) {
      nicknameCell.textContent = user.nickname;
    } else {
      nicknameCell.textContent = '-';
      nicknameCell.className = 'text-muted';
    }

    // Roles
    const rolesCell = row.insertCell();
    if (user.roles && user.roles.length > 0) {
      const badgeContainer = document.createElement('div');
      badgeContainer.className = 'd-flex flex-wrap gap-1';
      user.roles.forEach(role => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-secondary';
        badge.textContent = role;
        badgeContainer.appendChild(badge);
      });
      rolesCell.appendChild(badgeContainer);
    } else {
      rolesCell.textContent = 'No roles';
      rolesCell.className = 'text-muted';
    }

    // Last Visited
    const lastVisitedCell = row.insertCell();
    if (user.lastVisited) {
      const date = new Date(user.lastVisited);
      lastVisitedCell.textContent = date.toLocaleString();
    } else {
      lastVisitedCell.textContent = 'Never';
      lastVisitedCell.className = 'text-muted';
    }

    // Actions
    const actionsCell = row.insertCell();
    actionsCell.className = 'text-center';
    
    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group btn-group-sm';
    
    const editBtn = document.createElement('a');
    editBtn.className = 'btn btn-outline-primary';
    editBtn.href = `user-editor?mode=update&id=${encodeURIComponent(user.id)}`;
    editBtn.setAttribute('data-bs-toggle', 'tooltip');
    editBtn.setAttribute('data-bs-title', 'Edit');
    editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
    
    const renameBtn = document.createElement('button');
    renameBtn.className = 'btn btn-outline-secondary';
    renameBtn.setAttribute('data-bs-toggle', 'tooltip');
    renameBtn.setAttribute('data-bs-title', 'Rename');
    renameBtn.innerHTML = '<i class="bi bi-pencil-square"></i>';
    renameBtn.addEventListener('click', () => handleUserRenameClick(user));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-outline-danger';
    deleteBtn.setAttribute('data-bs-toggle', 'tooltip');
    deleteBtn.setAttribute('data-bs-title', 'Delete');
    deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
    deleteBtn.addEventListener('click', () => handleUserDeleteClick(user));
    
    btnGroup.appendChild(editBtn);
    btnGroup.appendChild(renameBtn);
    btnGroup.appendChild(deleteBtn);
    actionsCell.appendChild(btnGroup);
  }

  /**
   * Renders the credentials table
   */
  function renderCredentials() {
    const credentialTbody = document.getElementById('credential-table');
    
    if (!credentialTbody) {
      console.error('Error getting credential table element');
      return;
    }

    // Clear table
    credentialTbody.innerHTML = '';

    // Sort credentials by ID
    const sortedCredentials = [...filteredCredentials].sort((a, b) => {
      return compareValues(a.id.toLowerCase(), b.id.toLowerCase());
    });

    // Update tab count
    const credentialCount = document.getElementById('credential-count');
    if (credentialCount) credentialCount.textContent = sortedCredentials.length;

    // Render credentials
    if (sortedCredentials.length === 0) {
      const row = credentialTbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 4;
      cell.className = 'text-center py-4 text-muted';
      cell.textContent = 'No credentials found';
    } else {
      sortedCredentials.forEach(credential => renderCredentialRow(credentialTbody, credential));
    }

    // Dispose old tooltips to prevent memory leaks
    tooltipInstances.forEach(tooltip => tooltip.dispose());
    tooltipInstances = [];

    // Initialize tooltips for the newly created buttons
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipInstances = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
  }

  /**
   * Renders a single credential row
   * @param {HTMLTableSectionElement} tbody
   * @param {Object} credential
   */
  function renderCredentialRow(tbody, credential) {
    const row = tbody.insertRow();

    // Credential ID
    const idCell = row.insertCell();
    idCell.textContent = credential.id;

    // Type with badge
    const typeCell = row.insertCell();
    const typeBadge = document.createElement('span');
    typeBadge.className = getCredentialTypeBadgeClass(credential);
    typeBadge.textContent = getCredentialTypeText(credential);
    typeCell.appendChild(typeBadge);

    // Details with partial masking
    const detailsCell = row.insertCell();
    detailsCell.innerHTML = getCredentialDetails(credential);

    // Actions
    const actionsCell = row.insertCell();
    actionsCell.className = 'text-center';
    
    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group btn-group-sm';
    
    const editBtn = document.createElement('a');
    editBtn.className = 'btn btn-outline-primary';
    editBtn.href = `credential-editor?mode=update&id=${encodeURIComponent(credential.id)}`;
    editBtn.setAttribute('data-bs-toggle', 'tooltip');
    editBtn.setAttribute('data-bs-title', 'Edit');
    editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-outline-danger';
    deleteBtn.setAttribute('data-bs-toggle', 'tooltip');
    deleteBtn.setAttribute('data-bs-title', 'Delete');
    deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
    deleteBtn.addEventListener('click', () => handleCredentialDeleteClick(credential));
    
    btnGroup.appendChild(editBtn);
    btnGroup.appendChild(deleteBtn);
    actionsCell.appendChild(btnGroup);
  }

  /**
   * Gets the credential type text
   * @param {Object} credential
   * @returns {string}
   */
  function getCredentialTypeText(credential) {
    if (credential.tokenEndpoint) return 'OAuth2';
    if (credential.header) return 'API Key';
    return 'Basic Auth';
  }

  /**
   * Gets the credential type badge CSS class
   * @param {Object} credential
   * @returns {string}
   */
  function getCredentialTypeBadgeClass(credential) {
    if (credential.tokenEndpoint) return 'badge bg-info';
    if (credential.header) return 'badge bg-warning';
    return 'badge bg-success';
  }

  /**
   * Gets masked credential details for display
   * @param {Object} credential
   * @returns {string}
   */
  function getCredentialDetails(credential) {
    if (credential.tokenEndpoint) {
      // OAuth2
      return `<strong>Client ID:</strong> ${credential.clientId}<br><strong>Endpoint:</strong> ${credential.tokenEndpoint}`;
    } else if (credential.header) {
      // API Key
      const maskedApiKey = maskSecret(credential.apiKey);
      return `<strong>Header:</strong> ${credential.header}<br><strong>Key:</strong> ${maskedApiKey}`;
    } else {
      // Basic Auth
      const maskedPassword = maskSecret(credential.password);
      const username = credential.username ? credential.username : '<em>none</em>';
      return `<strong>Username:</strong> ${username}<br><strong>Password:</strong> ${maskedPassword}`;
    }
  }

  /**
   * Masks a secret value showing first few and last few characters
   * @param {string} secret
   * @returns {string}
   */
  function maskSecret(secret) {
    if (!secret || secret.length < 8) {
      return '••••••••';
    }
    
    const start = secret.slice(0, 3);
    const end = secret.slice(-4);
    return `${start}...${end}`;
  }

  /**
   * Handles credential delete click
   * @param {Object} credential
   */
  function handleCredentialDeleteClick(credential) {
    document.getElementById('delete-credential-id').value = credential.id;
    document.getElementById('delete-credential-display-id').textContent = credential.id;
    document.getElementById('delete-credential-display-type').textContent = getCredentialTypeText(credential);
    
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteCredentialModal'));
    deleteModal.show();
  }

  /**
   * Handles the toggle of enabled/disabled state
   * @param {PulseConfiguration} config
   * @param {boolean} enabled
   */
  async function handleToggle(config, enabled) {
    const isNormal = config.type === 'Normal' || config.type === 0;
    const typeText = isNormal ? 'pulse' : 'agent';
    const url = isNormal 
      ? `../api/1.0/admin/configurations/${typeText}/${config.id}/${enabled}`
      : `../api/1.0/admin/configurations/${typeText}/${config.id}/${config.subType}/${enabled}`;
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }

      config.enabled = enabled;
      showToast(
        'Success',
        `Configuration ${enabled ? 'enabled' : 'disabled'} successfully`,
        'success'
      );
    } catch (error) {
      console.error('Error updating configuration:', error);
      showToast('Error', 'Failed to update configuration: ' + error.message, 'danger');
      // Revert checkbox
      const checkbox = document.getElementById(`toggle-${config.id}`);
      if (checkbox) {
        checkbox.checked = !enabled;
      }
    }
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
  async function handleRenameSave() {
    const id = document.getElementById('rename-id').value;
    const type = parseInt(document.getElementById('rename-type').value);
    const group = document.getElementById('rename-group').value.trim();
    const name = document.getElementById('rename-name').value.trim();

    if (!name) {
      showToast('Error', 'Name is required', 'danger');
      return;
    }

    try {
      const response = await fetch(`../api/1.0/admin/configurations/${id}/name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          group: group,
          name: name
        })
      });

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
    } catch (error) {
      console.error('Error renaming configuration:', error);
      showToast('Error', 'Failed to rename configuration: ' + error.message, 'danger');
    }
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
          subTypeBadge = 'bg-info';
          subTypeIcon = 'bi-journal-text';
          break;
        case 'WebAppDeployment':
          subTypeBadge = 'bg-success';
          subTypeIcon = 'bi-cloud-upload';
          break;
        case 'DevOpsDeployment':
          subTypeBadge = 'bg-warning text-dark';
          subTypeIcon = 'bi-git';
          break;
        case 'DevOpsRelease':
          subTypeBadge = 'bg-secondary';
          subTypeIcon = 'bi-rocket';
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
  async function handleDeleteConfirm() {
    const id = document.getElementById('delete-id').value;
    const type = document.getElementById('delete-type').value;
    const subType = document.getElementById('delete-subtype').value;
    
    const isNormal = type === 'Normal' || type === '0';
    const typeText = isNormal ? 'pulse' : 'agent';
    const url = isNormal 
      ? `../api/1.0/admin/configurations/${typeText}/${id}`
      : `../api/1.0/admin/configurations/${typeText}/${id}/${subType}`;

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

      // Remove from local data
      configurations = configurations.filter(c => !(c.id === id && c.type === type));
      filteredConfigurations = filteredConfigurations.filter(c => !(c.id === id && c.type === type));

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      modal?.hide();

      // Re-render
      renderConfigurations();
      showToast('Success', 'Configuration deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting configuration:', error);
      showToast('Error', error.message, 'danger');
    } finally {
      // Re-enable the delete button
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Delete';
      }
    }
  }

  /**
   * Handles the webhook toggle of enabled/disabled state
   * @param {Webhook} webhook
   * @param {boolean} enabled
   */
  function handleWebhookToggle(webhook, enabled) {
    fetch(`../api/1.0/admin/webhooks/${webhook.id}/${enabled}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to update webhook');
        }
        webhook.enabled = enabled;
        showToast(
          'Success',
          `Webhook ${enabled ? 'enabled' : 'disabled'} successfully`,
          'success'
        );
      })
      .catch((error) => {
        console.error('Error updating webhook:', error);
        showToast('Error', 'Failed to update webhook: ' + error.message, 'danger');
        // Revert checkbox
        const checkbox = document.getElementById(`toggle-webhook-${webhook.id}`);
        if (checkbox) {
          checkbox.checked = !enabled;
        }
      });
  }

  /**
   * Handles the webhook delete button click
   * @param {Webhook} webhook
   */
  function handleWebhookDeleteClick(webhook) {
    // Store webhook ID for deletion
    document.getElementById('delete-webhook-id').value = webhook.id;

    // Format group display
    let groupDisplay;
    if (webhook.group === '*') {
      groupDisplay = '(all)';
    } else if (!webhook.group || webhook.group === '') {
      groupDisplay = '(no group)';
    } else {
      groupDisplay = webhook.group;
    }

    // Format name display
    let nameDisplay;
    if (webhook.name === '*') {
      nameDisplay = '(all)';
    } else if (!webhook.name || webhook.name === '') {
      nameDisplay = '(no name)';
    } else {
      nameDisplay = webhook.name;
    }

    // Populate modal
    document.getElementById('delete-webhook-display-name').textContent = `${groupDisplay} / ${nameDisplay}`;
    document.getElementById('delete-webhook-display-group').textContent = groupDisplay;
    document.getElementById('delete-webhook-display-name-filter').textContent = nameDisplay;
    document.getElementById('delete-webhook-display-location').textContent = webhook.location;

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('deleteWebhookModal'));
    modal.show();
  }

  /**
   * Handles the webhook delete confirmation
   */
  async function handleWebhookDeleteConfirm() {
    const webhookId = document.getElementById('delete-webhook-id').value;

    // Disable the delete button
    const deleteBtn = document.getElementById('delete-webhook-confirm');
    if (deleteBtn) {
      deleteBtn.disabled = true;
      deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';
    }

    try {
      const response = await fetch(`../api/1.0/admin/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to delete webhook');
      }

      // Remove from local data
      webhooks = webhooks.filter(w => w.id !== webhookId);
      filteredWebhooks = filteredWebhooks.filter(w => w.id !== webhookId);

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('deleteWebhookModal'));
      modal?.hide();

      // Re-render
      renderWebhooks();
      showToast('Success', 'Webhook deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting webhook:', error);
      showToast('Error', error.message, 'danger');
    } finally {
      // Re-enable the delete button
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Delete';
      }
    }
  }

  /**
   * Handles the user rename click
   * @param {User} user
   */
  function handleUserRenameClick(user) {
    document.getElementById('rename-user-id').value = user.id;
    document.getElementById('rename-user-nickname').value = user.nickname || '';

    const modal = new bootstrap.Modal(document.getElementById('renameUserModal'));
    modal.show();
  }

  /**
   * Handles saving the user rename
   */
  async function handleUserRenameSave() {
    const id = document.getElementById('rename-user-id').value;
    const nickname = document.getElementById('rename-user-nickname').value.trim();

    try {
      const response = await fetch(`../api/1.0/admin/users/${encodeURIComponent(id)}/name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: nickname || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to rename user');
      }

      // Update local data
      users.forEach(user => {
        if (user.id === id) {
          user.nickname = nickname || null;
        }
      });

      // Update filtered users as well
      filteredUsers.forEach(user => {
        if (user.id === id) {
          user.nickname = nickname || null;
        }
      });

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('renameUserModal'));
      modal?.hide();

      // Re-render
      renderUsers();
      showToast('Success', 'User renamed successfully', 'success');
    } catch (error) {
      console.error('Error renaming user:', error);
      showToast('Error', 'Failed to rename user: ' + error.message, 'danger');
    }
  }

  /**
   * Handles the user delete click
   * @param {User} user
   */
  function handleUserDeleteClick(user) {
    // Store user ID for deletion
    document.getElementById('delete-user-id').value = user.id;

    // Populate modal
    const displayId = user.nickname ? `${user.id} (${user.nickname})` : user.id;
    document.getElementById('delete-user-display-id').textContent = displayId;
    const rolesText = user.roles && user.roles.length > 0 ? user.roles.join(', ') : 'No roles';
    document.getElementById('delete-user-display-roles').textContent = rolesText;

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
    modal.show();
  }

  /**
   * Handles the user delete confirmation
   */
  function handleUserDeleteConfirm() {
    const userId = document.getElementById('delete-user-id').value;

    // Disable the delete button
    const deleteBtn = document.getElementById('delete-user-confirm');
    if (deleteBtn) {
      deleteBtn.disabled = true;
      deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';
    }

    fetch(`../api/1.0/admin/users/${encodeURIComponent(userId)}`, {
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

        // Remove from local data
        users = users.filter(u => u.id !== userId);
        filteredUsers = filteredUsers.filter(u => u.id !== userId);

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteUserModal'));
        modal?.hide();

        // Re-render
        renderUsers();
        showToast('Success', 'User deleted successfully', 'success');
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

  /**
   * Handles the credential delete confirmation
   */
  function handleCredentialDeleteConfirm() {
    const credentialId = document.getElementById('delete-credential-id').value;

    // Disable the delete button
    const deleteBtn = document.getElementById('delete-credential-confirm');
    if (deleteBtn) {
      deleteBtn.disabled = true;
      deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';
    }

    // Find credential to get its type
    const credential = credentials.find(c => c.id === credentialId);
    if (!credential) {
      showToast('Error', 'Credential not found', 'danger');
      return;
    }

    let credentialType;
    if (credential.tokenEndpoint) {
      credentialType = 'oauth2';
    } else if (credential.header) {
      credentialType = 'apikey';
    } else {
      credentialType = 'basic';
    }

    fetch(`../api/1.0/admin/credentials/${credentialType}/${encodeURIComponent(credentialId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((response) => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(text || 'Failed to delete credential');
          });
        }

        // Remove from local data
        credentials = credentials.filter(c => c.id !== credentialId);
        filteredCredentials = filteredCredentials.filter(c => c.id !== credentialId);

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteCredentialModal'));
        modal?.hide();

        // Re-render
        renderCredentials();
        showToast('Success', 'Credential deleted successfully', 'success');
      })
      .catch((error) => {
        console.error('Error deleting credential:', error);
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
   * Applies search and filter globally across configurations, webhooks, users, and credentials
   */
  function applyFilters() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const showDisabledOnly = document.getElementById('filter-disabled')?.checked || false;

    filteredConfigurations = configurations.filter((config) => {
      const matchesSearch = !searchTerm ||
        config.group.toLowerCase().includes(searchTerm) ||
        config.name.toLowerCase().includes(searchTerm);

      const matchesFilter = !showDisabledOnly || !config.enabled;

      return matchesSearch && matchesFilter;
    });

    filteredWebhooks = webhooks.filter((webhook) => {
      const matchesSearch = !searchTerm ||
        webhook.group.toLowerCase().includes(searchTerm) ||
        webhook.name.toLowerCase().includes(searchTerm) ||
        webhook.location.toLowerCase().includes(searchTerm);

      const matchesFilter = !showDisabledOnly || !webhook.enabled;

      return matchesSearch && matchesFilter;
    });

    filteredUsers = users.filter((user) => {
      if (!searchTerm) return true;

      const userIdMatch = user.id.toLowerCase().includes(searchTerm);
      const nicknameMatch = user.nickname && user.nickname.toLowerCase().includes(searchTerm);
      const rolesMatch = user.roles && user.roles.some(role => role.toLowerCase().includes(searchTerm));

      return userIdMatch || nicknameMatch || rolesMatch;
    });

    filteredCredentials = credentials.filter((credential) => {
      if (!searchTerm) return true;

      const idMatch = credential.id.toLowerCase().includes(searchTerm);
      const typeMatch = getCredentialTypeText(credential).toLowerCase().includes(searchTerm);
      
      // Search in credential-specific fields
      let detailMatch = false;
      if (credential.tokenEndpoint) {
        detailMatch = credential.clientId.toLowerCase().includes(searchTerm) ||
                     credential.tokenEndpoint.toLowerCase().includes(searchTerm);
      } else if (credential.header) {
        detailMatch = credential.header.toLowerCase().includes(searchTerm);
      } else if (credential.username) {
        detailMatch = credential.username.toLowerCase().includes(searchTerm);
      }

      return idMatch || typeMatch || detailMatch;
    });

    sortConfigurations();
    renderConfigurations();
    renderWebhooks();
    renderUsers();
    renderCredentials();
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
   * Shows retry button for failed data loads
   * @param {string} type - 'configs', 'webhooks', or 'users'
   * @param {Function} retryCallback - Function to call on retry
   */
  function showRetryButton(type, retryCallback) {
    const errorDiv = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    if (!errorDiv || !errorText) return;

    // Check retry count to prevent infinite retries
    if (loadRetryCount[type] >= 3) {
      errorText.textContent += ' (Maximum retry attempts reached. Please refresh the page.)';
      return;
    }

    // Add retry button if it doesn't exist
    let retryBtn = errorDiv.querySelector('.retry-btn');
    if (!retryBtn) {
      retryBtn = document.createElement('button');
      retryBtn.className = 'btn btn-primary btn-sm ms-3 retry-btn';
      retryBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Retry';
      errorDiv.appendChild(retryBtn);
    }

    retryBtn.onclick = () => {
      loadRetryCount[type]++;
      retryBtn.remove();
      retryCallback();
    };
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

  /**
   * Escape HTML to prevent XSS attacks
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Debounce function to limit function execution rate
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
})();
