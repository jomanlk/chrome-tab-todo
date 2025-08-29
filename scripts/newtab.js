/**
 * Chrome Todo Tab Extension - New Tab Page JavaScript
 * 
 * This module handles the todo list functionality for the Chrome new tab page.
 * It provides comprehensive todo management including CRUD operations,
 * filtering, persistence, and user interaction handling.
 * 
 * @author Chrome Todo Tab Extension
 * @version 1.0.0
 */

// Constants for configuration and validation
const CONFIG = {
    STORAGE_KEY: 'chrome_todo_tab_todos',
    GROUPS_STORAGE_KEY: 'chrome_todo_tab_groups',
    MAX_TODO_LENGTH: 200,
    MAX_GROUP_NAME_LENGTH: 50,
    ANIMATION_DURATION: 300,
    LOG_PREFIX: '[ChromeTodoTab]'
};

// Logging utility for debugging and monitoring
const Logger = {
    /**
     * Logs informational messages for application flow tracking
     * @param {string} message - The message to log
     * @param {Object} [data] - Optional data to include
     */
    info: function(message, data = null) {
        console.log(`${CONFIG.LOG_PREFIX} INFO: ${message}`, data || '');
    },

    /**
     * Logs warning messages for recoverable issues
     * @param {string} message - The warning message
     * @param {Object} [data] - Optional data to include
     */
    warn: function(message, data = null) {
        console.warn(`${CONFIG.LOG_PREFIX} WARN: ${message}`, data || '');
    },

    /**
     * Logs error messages for debugging failed operations
     * @param {string} message - The error message
     * @param {Error} [error] - Optional error object
     */
    error: function(message, error = null) {
        console.error(`${CONFIG.LOG_PREFIX} ERROR: ${message}`, error || '');
    }
};

// Custom exception classes for different error categories
class TodoValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TodoValidationError';
    }
}

class StorageError extends Error {
    constructor(message) {
        super(message);
        this.name = 'StorageError';
    }
}

class DOMError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DOMError';
    }
}

/**
 * TodoItem class representing a single todo item
 * Implements proper encapsulation and validation
 */
/**
 * TodoGroup class representing a group/column for organizing todos
 * Implements proper encapsulation and validation
 */
class TodoGroup {
    /**
     * Creates a new TodoGroup instance
     * @param {string} name - The group name
     * @param {number} [position=0] - The position/order of the group
     * @param {string} [id] - Optional unique identifier
     * @throws {TodoValidationError} When name is invalid
     */
    constructor(name, position = 0, id = null) {
        this.validateName(name);
        
        this.id = id || this.generateId();
        this.name = name.trim();
        this.position = Number(position) || 0;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Validates the group name
     * @param {string} name - The name to validate
     * @throws {TodoValidationError} When name is invalid
     */
    validateName(name) {
        if (!name || typeof name !== 'string') {
            throw new TodoValidationError('Group name must be a non-empty string');
        }
        
        const trimmedName = name.trim();
        if (trimmedName.length === 0) {
            throw new TodoValidationError('Group name cannot be empty or whitespace only');
        }
        
        if (trimmedName.length > CONFIG.MAX_GROUP_NAME_LENGTH) {
            throw new TodoValidationError(`Group name cannot exceed ${CONFIG.MAX_GROUP_NAME_LENGTH} characters`);
        }
    }

    /**
     * Generates a unique identifier for the group
     * @returns {string} A unique ID
     */
    generateId() {
        return 'group_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Updates the group name
     * @param {string} newName - The new name
     * @throws {TodoValidationError} When new name is invalid
     */
    updateName(newName) {
        this.validateName(newName);
        this.name = newName.trim();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Updates the group position
     * @param {number} newPosition - The new position
     */
    updatePosition(newPosition) {
        this.position = Number(newPosition) || 0;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Converts the group to a plain object for storage
     * @returns {Object} The group as a plain object
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            position: this.position,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Creates a TodoGroup from a plain object
     * @param {Object} data - The group data object
     * @returns {TodoGroup} A new TodoGroup instance
     * @throws {TodoValidationError} When data is invalid
     */
    static fromJSON(data) {
        if (!data || typeof data !== 'object') {
            throw new TodoValidationError('Invalid group data format');
        }
        
        return new TodoGroup(data.name, data.position, data.id);
    }
}

class TodoItem {
    /**
     * Creates a new TodoItem instance
     * @param {string} text - The todo text content
     * @param {string} groupId - The ID of the group this todo belongs to
     * @param {boolean} [completed=false] - Whether the todo is completed
     * @param {string} [description=''] - Optional description for the todo
     * @param {string} [id] - Optional unique identifier
     * @throws {TodoValidationError} When text or groupId is invalid
     */
    constructor(text, groupId, completed = false, description = '', id = null) {
        this.validateText(text);
        this.validateGroupId(groupId);
        
        this.id = id || this.generateId();
        this.text = text.trim();
        this.groupId = groupId;
        this.completed = Boolean(completed);
        this.description = description || '';
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Validates the todo text content
     * @param {string} text - The text to validate
     * @throws {TodoValidationError} When text is invalid
     */
    validateText(text) {
        if (!text || typeof text !== 'string') {
            throw new TodoValidationError('Todo text must be a non-empty string');
        }
        
        const trimmedText = text.trim();
        if (trimmedText.length === 0) {
            throw new TodoValidationError('Todo text cannot be empty or whitespace only');
        }
        
        if (trimmedText.length > CONFIG.MAX_TODO_LENGTH) {
            throw new TodoValidationError(`Todo text cannot exceed ${CONFIG.MAX_TODO_LENGTH} characters`);
        }
    }

    /**
     * Validates the group ID
     * @param {string} groupId - The group ID to validate
     * @throws {TodoValidationError} When groupId is invalid
     */
    validateGroupId(groupId) {
        if (!groupId || typeof groupId !== 'string') {
            throw new TodoValidationError('Group ID must be a non-empty string');
        }
    }

    /**
     * Generates a unique identifier for the todo item
     * @returns {string} A unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Updates the todo text content
     * @param {string} newText - The new text content
     * @throws {TodoValidationError} When new text is invalid
     */
    updateText(newText) {
        this.validateText(newText);
        this.text = newText.trim();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Toggles the completion status of the todo
     */
    toggleCompletion() {
        this.completed = !this.completed;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Updates the todo text content
     * @param {string} newText - The new text content
     * @throws {TodoValidationError} When new text is invalid
     */
    updateText(newText) {
        this.validateText(newText);
        this.text = newText.trim();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Updates the todo description
     * @param {string} newDescription - The new description
     */
    updateDescription(newDescription) {
        this.description = newDescription || '';
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Converts the todo item to a plain object for storage
     * @returns {Object} The todo item as a plain object
     */
    toJSON() {
        return {
            id: this.id,
            text: this.text,
            groupId: this.groupId,
            completed: this.completed,
            description: this.description,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Creates a TodoItem from a plain object
     * @param {Object} data - The todo data object
     * @returns {TodoItem} A new TodoItem instance
     * @throws {TodoValidationError} When data is invalid
     */
    static fromJSON(data) {
        if (!data || typeof data !== 'object') {
            throw new TodoValidationError('Invalid todo data format');
        }
        
        return new TodoItem(data.text, data.groupId, data.completed, data.description || '', data.id);
    }
}

/**
 * TodoManager class handling todo list operations and persistence
 * Implements comprehensive error handling and logging
 */
class TodoManager {
    constructor() {
        this.todos = [];
        this.groups = [];
        this.currentFilter = 'active';
        this.isInitialized = false;
    }

    /**
     * Initializes the todo manager and loads existing todos and groups
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            Logger.info('Initializing TodoManager');
            await this.loadGroups();
            await this.loadTodos();
            
            // Create default group if no groups exist
            if (this.groups.length === 0) {
                await this.createDefaultGroup();
            }
            
            this.isInitialized = true;
            Logger.info('TodoManager initialized successfully');
        } catch (error) {
            Logger.error('Failed to initialize TodoManager', error);
            throw new StorageError('Failed to initialize todo manager');
        }
    }

    /**
     * Creates a default group for new installations
     * @returns {Promise<TodoGroup>} The created default group
     */
    async createDefaultGroup() {
        try {
            Logger.info('Creating default group');
            const defaultGroup = await this.addGroup('To Do');
            Logger.info('Default group created successfully', { id: defaultGroup.id });
            return defaultGroup;
        } catch (error) {
            Logger.error('Failed to create default group', error);
            throw new StorageError('Failed to create default group');
        }
    }

    /**
     * Adds a new group to the board
     * @param {string} name - The group name
     * @param {number} [position] - Optional position, defaults to end
     * @returns {TodoGroup} The created group
     * @throws {TodoValidationError} When name is invalid
     * @throws {StorageError} When storage operation fails
     */
    async addGroup(name, position = null) {
        try {
            Logger.info('Adding new group', { name });
            
            const newPosition = position !== null ? position : this.groups.length;
            const group = new TodoGroup(name, newPosition);
            this.groups.push(group);
            
            // Sort groups by position
            this.groups.sort((a, b) => a.position - b.position);
            
            await this.saveGroups();
            Logger.info('Group added successfully', { id: group.id, name: group.name });
            
            return group;
        } catch (error) {
            Logger.error('Failed to add group', error);
            if (error instanceof TodoValidationError) {
                throw error;
            }
            throw new StorageError('Failed to add group');
        }
    }

    /**
     * Removes a group and all its todos
     * @param {string} groupId - The group ID
     * @returns {boolean} True if group was removed, false if not found
     * @throws {StorageError} When storage operation fails
     */
    async removeGroup(groupId) {
        try {
            Logger.info('Removing group', { groupId });
            
            const groupIndex = this.groups.findIndex(group => group.id === groupId);
            if (groupIndex === -1) {
                Logger.warn('Group not found for removal', { groupId });
                return false;
            }
            
            // Remove all todos in this group
            this.todos = this.todos.filter(todo => todo.groupId !== groupId);
            
            // Remove the group
            this.groups.splice(groupIndex, 1);
            
            // Reorder remaining groups
            this.groups.forEach((group, index) => {
                group.updatePosition(index);
            });
            
            await Promise.all([this.saveGroups(), this.saveTodos()]);
            
            Logger.info('Group removed successfully', { groupId });
            return true;
        } catch (error) {
            Logger.error('Failed to remove group', error);
            throw new StorageError('Failed to remove group');
        }
    }

    /**
     * Updates a group's name
     * @param {string} groupId - The group ID
     * @param {string} newName - The new name
     * @returns {boolean} True if group was updated, false if not found
     * @throws {TodoValidationError} When new name is invalid
     * @throws {StorageError} When storage operation fails
     */
    async updateGroupName(groupId, newName) {
        try {
            Logger.info('Updating group name', { groupId, newName });
            
            const group = this.groups.find(group => group.id === groupId);
            if (!group) {
                Logger.warn('Group not found for name update', { groupId });
                return false;
            }
            
            group.updateName(newName);
            await this.saveGroups();
            
            Logger.info('Group name updated successfully', { groupId, newName });
            return true;
        } catch (error) {
            Logger.error('Failed to update group name', error);
            if (error instanceof TodoValidationError) {
                throw error;
            }
            throw new StorageError('Failed to update group name');
        }
    }

    /**
     * Adds a new todo item to a specific group
     * @param {string} text - The todo text content
     * @param {string} groupId - The group ID to add the todo to
     * @returns {TodoItem} The created todo item
     * @throws {TodoValidationError} When text or groupId is invalid
     * @throws {StorageError} When storage operation fails
     */
    async addTodo(text, groupId) {
        try {
            Logger.info('Adding new todo', { text: text.substring(0, 50) + '...', groupId });
            
            // Validate that the group exists
            const group = this.groups.find(g => g.id === groupId);
            if (!group) {
                throw new TodoValidationError('Group not found');
            }
            
            const todo = new TodoItem(text, groupId);
            this.todos.push(todo);
            
            await this.saveTodos();
            Logger.info('Todo added successfully', { id: todo.id, groupId });
            
            return todo;
        } catch (error) {
            Logger.error('Failed to add todo', error);
            if (error instanceof TodoValidationError) {
                throw error;
            }
            throw new StorageError('Failed to add todo item');
        }
    }

    /**
     * Removes a todo item from the list
     * @param {string} id - The todo item ID
     * @returns {boolean} True if todo was removed, false if not found
     * @throws {StorageError} When storage operation fails
     */
    async removeTodo(id) {
        try {
            Logger.info('Removing todo', { id });
            
            const index = this.todos.findIndex(todo => todo.id === id);
            if (index === -1) {
                Logger.warn('Todo not found for removal', { id });
                return false;
            }
            
            this.todos.splice(index, 1);
            await this.saveTodos();
            
            Logger.info('Todo removed successfully', { id });
            return true;
        } catch (error) {
            Logger.error('Failed to remove todo', error);
            throw new StorageError('Failed to remove todo item');
        }
    }



    /**
     * Moves a todo item to a different group
     * @param {string} todoId - The todo item ID
     * @param {string} newGroupId - The new group ID
     * @returns {boolean} True if todo was moved, false if not found
     * @throws {StorageError} When storage operation fails
     */
    async moveTodo(todoId, newGroupId) {
        try {
            Logger.info('Moving todo to new group', { todoId, newGroupId });
            
            // Validate that the new group exists
            const newGroup = this.groups.find(g => g.id === newGroupId);
            if (!newGroup) {
                Logger.warn('Target group not found', { newGroupId });
                return false;
            }
            
            const todo = this.todos.find(todo => todo.id === todoId);
            if (!todo) {
                Logger.warn('Todo not found for move', { todoId });
                return false;
            }
            
            // Check if todo is already in the target group
            if (todo.groupId === newGroupId) {
                Logger.info('Todo already in target group', { todoId, newGroupId });
                return true; // Consider this a success
            }
            
            // Update the todo's group
            todo.groupId = newGroupId;
            todo.updatedAt = new Date().toISOString();
            
            await this.saveTodos();
            
            Logger.info('Todo moved successfully', { todoId, oldGroupId: todo.groupId, newGroupId });
            return true;
        } catch (error) {
            Logger.error('Failed to move todo', error);
            throw new StorageError('Failed to move todo to new group');
        }
    }

    /**
     * Updates a todo item's text and description
     * @param {string} id - The todo item ID
     * @param {string} newText - The new text content
     * @param {string} newDescription - The new description
     * @returns {boolean} True if todo was updated, false if not found
     * @throws {TodoValidationError} When new text is invalid
     * @throws {StorageError} When storage operation fails
     */
    async updateTodo(id, newText, newDescription) {
        try {
            Logger.info('Updating todo', { id, newText: newText.substring(0, 50) + '...' });
            
            const todo = this.todos.find(todo => todo.id === id);
            if (!todo) {
                Logger.warn('Todo not found for update', { id });
                return false;
            }
            
            todo.updateText(newText);
            todo.updateDescription(newDescription);
            await this.saveTodos();
            
            Logger.info('Todo updated successfully', { id });
            return true;
        } catch (error) {
            Logger.error('Failed to update todo', error);
            if (error instanceof TodoValidationError) {
                throw error;
            }
            throw new StorageError('Failed to update todo');
        }
    }

    /**
     * Toggles the completion status of a todo item
     * @param {string} id - The todo item ID
     * @returns {boolean} True if todo was updated, false if not found
     * @throws {StorageError} When storage operation fails
     */
    async toggleTodo(id) {
        try {
            Logger.info('Toggling todo completion', { id });
            
            const todo = this.todos.find(todo => todo.id === id);
            if (!todo) {
                Logger.warn('Todo not found for toggle', { id });
                return false;
            }
            
            todo.toggleCompletion();
            await this.saveTodos();
            
            Logger.info('Todo completion toggled successfully', { id, completed: todo.completed });
            return true;
        } catch (error) {
            Logger.error('Failed to toggle todo', error);
            throw new StorageError('Failed to toggle todo completion');
        }
    }

    /**
     * Removes all completed todo items
     * @returns {number} The number of todos removed
     * @throws {StorageError} When storage operation fails
     */
    async clearCompleted() {
        try {
            Logger.info('Clearing completed todos');
            
            const completedCount = this.todos.filter(todo => todo.completed).length;
            this.todos = this.todos.filter(todo => !todo.completed);
            
            await this.saveTodos();
            
            Logger.info('Completed todos cleared successfully', { removedCount: completedCount });
            return completedCount;
        } catch (error) {
            Logger.error('Failed to clear completed todos', error);
            throw new StorageError('Failed to clear completed todos');
        }
    }

    /**
     * Sets the current filter for displaying todos
     * @param {string} filter - The filter type ('all', 'active', 'completed')
     */
    setFilter(filter) {
        if (!['all', 'active', 'completed'].includes(filter)) {
            Logger.warn('Invalid filter type', { filter });
            return;
        }
        
        this.currentFilter = filter;
        Logger.info('Filter updated', { filter });
    }

    /**
     * Gets the filtered list of todos based on current filter
     * @returns {TodoItem[]} The filtered todo list
     */
    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(todo => !todo.completed);
            case 'completed':
                return this.todos.filter(todo => todo.completed);
            default:
                return [...this.todos];
        }
    }

    /**
     * Gets todos for a specific group
     * @param {string} groupId - The group ID
     * @returns {TodoItem[]} The todos in the group
     */
    getTodosForGroup(groupId) {
        return this.todos.filter(todo => todo.groupId === groupId);
    }

    /**
     * Gets all groups sorted by position
     * @returns {TodoGroup[]} The sorted groups
     */
    getGroups() {
        return [...this.groups].sort((a, b) => a.position - b.position);
    }

    /**
     * Gets statistics about the todo list
     * @returns {Object} Statistics object with counts
     */
    getStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(todo => todo.completed).length;
        const active = total - completed;
        
        return { total, active, completed };
    }

    /**
     * Loads groups from Chrome storage
     * @returns {Promise<void>}
     * @throws {StorageError} When storage operation fails
     */
    async loadGroups() {
        try {
            const result = await chrome.storage.sync.get(CONFIG.GROUPS_STORAGE_KEY);
            const storedGroups = result[CONFIG.GROUPS_STORAGE_KEY] || [];
            
            this.groups = storedGroups.map(groupData => {
                try {
                    return TodoGroup.fromJSON(groupData);
                } catch (error) {
                    Logger.warn('Invalid group data found, skipping', { groupData, error: error.message });
                    return null;
                }
            }).filter(group => group !== null);
            
            Logger.info('Groups loaded from storage', { count: this.groups.length });
        } catch (error) {
            Logger.error('Failed to load groups from storage', error);
            throw new StorageError('Failed to load groups from storage');
        }
    }

    /**
     * Loads todos from Chrome storage
     * @returns {Promise<void>}
     * @throws {StorageError} When storage operation fails
     */
    async loadTodos() {
        try {
            const result = await chrome.storage.sync.get(CONFIG.STORAGE_KEY);
            const storedTodos = result[CONFIG.STORAGE_KEY] || [];
            
            this.todos = storedTodos.map(todoData => {
                try {
                    return TodoItem.fromJSON(todoData);
                } catch (error) {
                    Logger.warn('Invalid todo data found, skipping', { todoData, error: error.message });
                    return null;
                }
            }).filter(todo => todo !== null);
            
            Logger.info('Todos loaded from storage', { count: this.todos.length });
        } catch (error) {
            Logger.error('Failed to load todos from storage', error);
            throw new StorageError('Failed to load todos from storage');
        }
    }

    /**
     * Saves groups to Chrome storage
     * @returns {Promise<void>}
     * @throws {StorageError} When storage operation fails
     */
    async saveGroups() {
        try {
            const groupData = this.groups.map(group => group.toJSON());
            await chrome.storage.sync.set({ [CONFIG.GROUPS_STORAGE_KEY]: groupData });
            Logger.info('Groups saved to storage', { count: this.groups.length });
        } catch (error) {
            Logger.error('Failed to save groups to storage', error);
            throw new StorageError('Failed to save groups to storage');
        }
    }

    /**
     * Saves todos to Chrome storage
     * @returns {Promise<void>}
     * @throws {StorageError} When storage operation fails
     */
    async saveTodos() {
        try {
            const todoData = this.todos.map(todo => todo.toJSON());
            await chrome.storage.sync.set({ [CONFIG.STORAGE_KEY]: todoData });
            Logger.info('Todos saved to storage', { count: this.todos.length });
        } catch (error) {
            Logger.error('Failed to save todos to storage', error);
            throw new StorageError('Failed to save todos to storage');
        }
    }
}

/**
 * TodoUI class handling DOM manipulation and user interface
 * Implements proper error handling and event management
 */
class TodoUI {
    constructor(todoManager) {
        this.todoManager = todoManager;
        this.elements = {};
        this.isInitialized = false;
    }

    /**
     * Initializes the UI components and event listeners
     * @returns {Promise<void>}
     * @throws {DOMError} When DOM elements cannot be found
     */
    async initialize() {
        try {
            Logger.info('Initializing TodoUI');
            
            this.initializeElements();
            this.setupEventListeners();
            this.updateDateDisplay();
            
            this.isInitialized = true;
            Logger.info('TodoUI initialized successfully');
        } catch (error) {
            Logger.error('Failed to initialize TodoUI', error);
            throw new DOMError('Failed to initialize user interface');
        }
    }

    /**
     * Initializes DOM element references
     * @throws {DOMError} When required elements cannot be found
     */
    initializeElements() {
        const requiredElements = {
            board: 'board',
            emptyState: 'emptyState',
            todoStats: 'todoStats',
            activeCount: 'activeCount',
            completedCount: 'completedCount',
            clearCompleted: 'clearCompleted',
            dateDisplay: 'dateDisplay',
            addGroupButton: 'addGroupButton',
            addFirstGroupButton: 'addFirstGroupButton',
            todoModal: 'todoModal',
            todoEditForm: 'todoEditForm',
            todoTitle: 'todoTitle',
            todoDescription: 'todoDescription',
            modalClose: 'modalClose',
            modalCancel: 'modalCancel'
        };

        for (const [key, id] of Object.entries(requiredElements)) {
            const element = document.getElementById(id);
            if (!element) {
                throw new DOMError(`Required element not found: ${id}`);
            }
            this.elements[key] = element;
        }

        Logger.info('DOM elements initialized successfully');
    }

    /**
     * Sets up event listeners for user interactions
     */
    setupEventListeners() {
        // Add group buttons
        this.elements.addGroupButton.addEventListener('click', this.handleAddGroup.bind(this));
        this.elements.addFirstGroupButton.addEventListener('click', this.handleAddGroup.bind(this));
        
        // Filter buttons
        document.querySelectorAll('.filter-button').forEach(button => {
            button.addEventListener('click', this.handleFilterClick.bind(this));
        });
        
        // Clear completed button
        this.elements.clearCompleted.addEventListener('click', this.handleClearCompleted.bind(this));
        
        // Modal event listeners
        this.elements.todoEditForm.addEventListener('submit', this.handleTodoEditSubmit.bind(this));
        this.elements.modalClose.addEventListener('click', this.closeModal.bind(this));
        this.elements.modalCancel.addEventListener('click', this.closeModal.bind(this));
        
        // Close modal when clicking outside
        this.elements.todoModal.addEventListener('click', (e) => {
            if (e.target === this.elements.todoModal) {
                this.closeModal();
            }
        });
        
        // Set initial active filter button
        this.updateActiveFilterButton();
        
        Logger.info('Event listeners setup completed');
    }

    /**
     * Handles adding a new group
     * @param {Event} event - The click event
     */
    async handleAddGroup(event) {
        event.preventDefault();
        
        try {
            const groupName = prompt('Enter column name:');
            if (!groupName || groupName.trim() === '') {
                return;
            }
            
            await this.todoManager.addGroup(groupName.trim());
            this.render();
            
        } catch (error) {
            Logger.error('Failed to add group', error);
            this.showError('Failed to add column. Please try again.');
        }
    }

    /**
     * Handles filter button clicks
     * @param {Event} event - The click event
     */
    handleFilterClick(event) {
        try {
            const button = event.target;
            const filter = button.dataset.filter;
            
            this.todoManager.setFilter(filter);
            this.updateActiveFilterButton();
            this.render();
            
        } catch (error) {
            Logger.error('Failed to handle filter click', error);
        }
    }

    /**
     * Updates the active filter button based on current filter
     */
    updateActiveFilterButton() {
        document.querySelectorAll('.filter-button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === this.todoManager.currentFilter) {
                btn.classList.add('active');
            }
        });
    }

    /**
     * Handles clear completed button click
     * @param {Event} event - The click event
     */
    async handleClearCompleted(event) {
        event.preventDefault();
        
        try {
            const removedCount = await this.todoManager.clearCompleted();
            if (removedCount > 0) {
                this.render();
                Logger.info('Completed todos cleared', { count: removedCount });
            }
        } catch (error) {
            Logger.error('Failed to clear completed todos', error);
            this.showError('Failed to clear completed todos. Please try again.');
        }
    }

    /**
     * Handles todo item checkbox click
     * @param {string} todoId - The todo item ID
     */
    async handleTodoToggle(todoId) {
        try {
            const success = await this.todoManager.toggleTodo(todoId);
            if (success) {
                this.render();
            }
        } catch (error) {
            Logger.error('Failed to toggle todo', error);
            this.showError('Failed to update todo. Please try again.');
        }
    }

    /**
     * Handles todo item deletion
     * @param {string} todoId - The todo item ID
     */
    async handleTodoDelete(todoId) {
        try {
            const success = await this.todoManager.removeTodo(todoId);
            if (success) {
                this.render();
            }
        } catch (error) {
            Logger.error('Failed to delete todo', error);
            this.showError('Failed to delete todo. Please try again.');
        }
    }

    /**
     * Renders the complete board interface
     */
    render() {
        try {
            this.renderBoard();
            this.renderStats();
            this.updateEmptyState();
        } catch (error) {
            Logger.error('Failed to render board interface', error);
        }
    }

    /**
     * Renders the board with all groups as columns
     */
    renderBoard() {
        const board = this.elements.board;
        const groups = this.todoManager.getGroups();
        
        board.innerHTML = '';
        
        groups.forEach(group => {
            const groupElement = this.createGroupElement(group);
            board.appendChild(groupElement);
        });
    }

    /**
     * Creates a DOM element for a group/column
     * @param {TodoGroup} group - The group
     * @returns {HTMLElement} The group element
     */
    createGroupElement(group) {
        const div = document.createElement('div');
        div.className = 'group-column';
        div.dataset.groupId = group.id;
        
        const todos = this.todoManager.getTodosForGroup(group.id);
        const filteredTodos = this.getFilteredTodosForGroup(todos);
        
        div.innerHTML = `
            <div class="group-header">
                <span class="group-name editable" data-group-id="${group.id}">${this.escapeHtml(group.name)}</span>
                <div class="group-controls">
                    <button class="group-control-button delete" data-group-id="${group.id}" aria-label="Delete group">×</button>
                </div>
            </div>
            <div class="group-todo-input-section">
                <form class="group-todo-form" data-group-id="${group.id}">
                    <input 
                        type="text" 
                        class="group-todo-input" 
                        placeholder="Add a task..."
                        maxlength="200"
                        required
                    >
                    <button type="submit" class="group-add-button" aria-label="Add todo">+</button>
                </form>
            </div>
            <div class="group-todo-list">
                ${filteredTodos.map(todo => this.createTodoHTML(todo)).join('')}
            </div>
        `;
        
        // Add event listeners
        this.setupGroupEventListeners(div, group);
        
        return div;
    }

    /**
     * Creates HTML for a todo item
     * @param {TodoItem} todo - The todo item
     * @returns {string} The todo HTML
     */
    createTodoHTML(todo) {
        return `
            <div class="todo-item ${todo.completed ? 'completed' : ''}" data-todo-id="${todo.id}" draggable="true">
                <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" data-todo-id="${todo.id}"></div>
                <span class="todo-text" data-todo-id="${todo.id}">${this.escapeHtml(todo.text)}</span>
                <button class="todo-delete" data-todo-id="${todo.id}" aria-label="Delete todo">×</button>
            </div>
        `;
    }

    /**
     * Sets up event listeners for a group element
     * @param {HTMLElement} groupElement - The group DOM element
     * @param {TodoGroup} group - The group object
     */
    setupGroupEventListeners(groupElement, group) {
        // Group name editing
        const groupName = groupElement.querySelector('.group-name');
        groupName.addEventListener('click', () => this.handleGroupNameEdit(group.id, groupName));
        
        // Group deletion
        const deleteBtn = groupElement.querySelector('.group-control-button.delete');
        deleteBtn.addEventListener('click', () => this.handleGroupDelete(group.id));
        
        // Todo form submission
        const form = groupElement.querySelector('.group-todo-form');
        form.addEventListener('submit', (event) => this.handleGroupTodoSubmit(event, group.id));
        
        // Todo interactions
        const todoItems = groupElement.querySelectorAll('.todo-item');
        todoItems.forEach(todoItem => {
            const todoId = todoItem.dataset.todoId;
            const checkbox = todoItem.querySelector('.todo-checkbox');
            const deleteBtn = todoItem.querySelector('.todo-delete');
            
            checkbox.addEventListener('click', () => this.handleTodoToggle(todoId));
            deleteBtn.addEventListener('click', () => this.handleTodoDelete(todoId));
            
            // Add click handler for opening modal (excluding checkbox and delete button)
            todoItem.addEventListener('click', (e) => {
                if (!e.target.closest('.todo-checkbox') && !e.target.closest('.todo-delete')) {
                    this.openTodoModal(todoId);
                }
            });
        });
        
        // Drag and drop functionality for todos
        this.setupDragAndDrop(groupElement, group);
    }

    /**
     * Renders the todo statistics
     */
    renderStats() {
        const stats = this.todoManager.getStats();
        
        this.elements.activeCount.textContent = stats.active;
        this.elements.completedCount.textContent = stats.completed;
        
        // Show/hide clear completed button
        this.elements.clearCompleted.style.display = stats.completed > 0 ? 'inline' : 'none';
    }

    /**
     * Gets filtered todos for a specific group
     * @param {TodoItem[]} todos - The todos in the group
     * @returns {TodoItem[]} The filtered todos
     */
    getFilteredTodosForGroup(todos) {
        switch (this.todoManager.currentFilter) {
            case 'active':
                return todos.filter(todo => !todo.completed);
            case 'completed':
                return todos.filter(todo => todo.completed);
            default:
                return todos;
        }
    }

    /**
     * Handles group name editing
     * @param {string} groupId - The group ID
     * @param {HTMLElement} groupNameElement - The group name element
     */
    async handleGroupNameEdit(groupId, groupNameElement) {
        try {
            const currentName = groupNameElement.textContent;
            const newName = prompt('Enter new column name:', currentName);
            
            if (!newName || newName.trim() === '' || newName.trim() === currentName) {
                return;
            }
            
            const success = await this.todoManager.updateGroupName(groupId, newName.trim());
            if (success) {
                this.render();
            }
        } catch (error) {
            Logger.error('Failed to update group name', error);
            this.showError('Failed to update column name. Please try again.');
        }
    }

    /**
     * Handles group deletion
     * @param {string} groupId - The group ID
     */
    async handleGroupDelete(groupId) {
        try {
            const confirmed = confirm('Are you sure you want to delete this column? All tasks in this column will also be deleted.');
            if (!confirmed) {
                return;
            }
            
            const success = await this.todoManager.removeGroup(groupId);
            if (success) {
                this.render();
            }
        } catch (error) {
            Logger.error('Failed to delete group', error);
            this.showError('Failed to delete column. Please try again.');
        }
    }

    /**
     * Handles todo form submission within a group
     * @param {Event} event - The form submission event
     * @param {string} groupId - The group ID
     */
    async handleGroupTodoSubmit(event, groupId) {
        event.preventDefault();
        
        try {
            const form = event.target;
            const input = form.querySelector('.group-todo-input');
            const text = input.value.trim();
            
            if (!text) {
                Logger.warn('Empty todo text submitted');
                return;
            }
            
            await this.todoManager.addTodo(text, groupId);
            input.value = '';
            this.render();
            
        } catch (error) {
            Logger.error('Failed to handle group todo submission', error);
            this.showError('Failed to add todo. Please try again.');
        }
    }

    /**
     * Sets up drag and drop functionality for a group
     * @param {HTMLElement} groupElement - The group DOM element
     * @param {TodoGroup} group - The group object
     */
    setupDragAndDrop(groupElement, group) {
        const todoList = groupElement.querySelector('.group-todo-list');
        
        // Make the todo list a drop zone
        todoList.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            todoList.classList.add('drag-over');
        });
        
        todoList.addEventListener('dragleave', (e) => {
            e.preventDefault();
            // Only remove class if we're leaving the drop zone entirely
            if (!todoList.contains(e.relatedTarget)) {
                todoList.classList.remove('drag-over');
            }
        });
        
        todoList.addEventListener('drop', (e) => {
            e.preventDefault();
            todoList.classList.remove('drag-over');
            
            const todoId = e.dataTransfer.getData('text/plain');
            if (todoId) {
                this.handleTodoMove(todoId, group.id);
            }
        });
        
        // Setup drag events for todo items
        const todoItems = groupElement.querySelectorAll('.todo-item');
        todoItems.forEach(todoItem => {
            this.setupTodoDragEvents(todoItem);
        });
    }

    /**
     * Sets up drag events for a todo item
     * @param {HTMLElement} todoItem - The todo DOM element
     */
    setupTodoDragEvents(todoItem) {
        todoItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', todoItem.dataset.todoId);
            todoItem.classList.add('dragging');
            
            Logger.info('Started dragging todo', { todoId: todoItem.dataset.todoId });
        });
        
        todoItem.addEventListener('dragend', (e) => {
            todoItem.classList.remove('dragging');
            Logger.info('Finished dragging todo', { todoId: todoItem.dataset.todoId });
        });
    }



    /**
     * Handles moving a todo to a different group
     * @param {string} todoId - The todo ID
     * @param {string} newGroupId - The new group ID
     */
    async handleTodoMove(todoId, newGroupId) {
        try {
            Logger.info('Moving todo to new group', { todoId, newGroupId });
            
            const success = await this.todoManager.moveTodo(todoId, newGroupId);
            if (success) {
                this.render();
                Logger.info('Todo moved successfully', { todoId, newGroupId });
            }
        } catch (error) {
            Logger.error('Failed to move todo', error);
            this.showError('Failed to move todo. Please try again.');
        }
    }

    /**
     * Opens the todo edit modal
     * @param {string} todoId - The todo ID to edit
     */
    openTodoModal(todoId) {
        try {
            const todo = this.todoManager.todos.find(t => t.id === todoId);
            if (!todo) {
                Logger.warn('Todo not found for modal', { todoId });
                return;
            }
            
            // Populate modal fields
            this.elements.todoTitle.value = todo.text;
            this.elements.todoDescription.value = todo.description;
            
            // Store the todo ID for the form submission
            this.elements.todoEditForm.dataset.todoId = todoId;
            
            // Show modal
            this.elements.todoModal.classList.add('show');
            
            // Focus on title input
            this.elements.todoTitle.focus();
            
            Logger.info('Opened todo modal', { todoId });
        } catch (error) {
            Logger.error('Failed to open todo modal', error);
        }
    }

    /**
     * Closes the todo edit modal
     */
    closeModal() {
        this.elements.todoModal.classList.remove('show');
        this.elements.todoEditForm.dataset.todoId = '';
        this.elements.todoTitle.value = '';
        this.elements.todoDescription.value = '';
    }

    /**
     * Handles todo edit form submission
     * @param {Event} event - The form submission event
     */
    async handleTodoEditSubmit(event) {
        event.preventDefault();
        
        try {
            const todoId = this.elements.todoEditForm.dataset.todoId;
            const newTitle = this.elements.todoTitle.value.trim();
            const newDescription = this.elements.todoDescription.value.trim();
            
            if (!todoId || !newTitle) {
                Logger.warn('Invalid todo edit data', { todoId, newTitle });
                return;
            }
            
            const success = await this.todoManager.updateTodo(todoId, newTitle, newDescription);
            if (success) {
                this.closeModal();
                this.render();
                Logger.info('Todo updated successfully', { todoId });
            }
        } catch (error) {
            Logger.error('Failed to update todo', error);
            this.showError('Failed to update todo. Please try again.');
        }
    }

    /**
     * Updates the empty state visibility
     */
    updateEmptyState() {
        const groups = this.todoManager.getGroups();
        const hasGroups = groups.length > 0;
        
        this.elements.board.style.display = hasGroups ? 'flex' : 'none';
        this.elements.emptyState.style.display = hasGroups ? 'none' : 'block';
    }

    /**
     * Updates the date display
     */
    updateDateDisplay() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        this.elements.dateDisplay.textContent = now.toLocaleDateString('en-US', options);
    }

    /**
     * Escapes HTML to prevent XSS attacks
     * @param {string} text - The text to escape
     * @returns {string} The escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Shows an error message to the user
     * @param {string} message - The error message
     */
    showError(message) {
        // Simple error display - could be enhanced with a proper notification system
        console.error('User Error:', message);
        // In a production environment, this would show a user-friendly notification
    }
}

/**
 * Main application class coordinating all components
 * Implements proper initialization and error handling
 */
class TodoApp {
    constructor() {
        this.todoManager = new TodoManager();
        this.todoUI = new TodoUI(this.todoManager);
        this.isInitialized = false;
    }

    /**
     * Initializes the complete application
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            Logger.info('Initializing TodoApp');
            
            await this.todoManager.initialize();
            await this.todoUI.initialize();
            
            this.todoUI.render();
            this.isInitialized = true;
            
            Logger.info('TodoApp initialized successfully');
        } catch (error) {
            Logger.error('Failed to initialize TodoApp', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Handles initialization errors gracefully
     * @param {Error} error - The initialization error
     */
    handleInitializationError(error) {
        // Display user-friendly error message
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: white;">
                    <h2>Something went wrong</h2>
                    <p>Failed to initialize the todo app. Please refresh the page and try again.</p>
                    <p style="font-size: 0.9rem; opacity: 0.8;">Error: ${error.message}</p>
                </div>
            `;
        }
    }
}

// Global error handler for unhandled exceptions
window.addEventListener('error', (event) => {
    Logger.error('Unhandled error occurred', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    Logger.error('Unhandled promise rejection', event.reason);
});

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        Logger.info('DOM loaded, initializing application');
        const app = new TodoApp();
        await app.initialize();
    } catch (error) {
        Logger.error('Failed to initialize application', error);
    }
});
