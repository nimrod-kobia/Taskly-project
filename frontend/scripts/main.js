document.addEventListener('DOMContentLoaded', function() {
    // View toggle functionality
    const viewSelect = document.getElementById('viewSelect');
    const listView = document.getElementById('listView');
    const kanbanView = document.getElementById('kanbanView');
    const calendarView = document.getElementById('calendarView');
    const profileView = document.getElementById('profileView');
    const profileNav = document.getElementById('profileNav');
    
    // Default view (optional: list view)
    listView.style.display = 'block';
    kanbanView.style.display = 'none';
    calendarView.style.display = 'none';
    profileView.style.display = 'none';

    // Dropdown view selection
    viewSelect.addEventListener('change', function() {
        listView.style.display = 'none';
        kanbanView.style.display = 'none';
        calendarView.style.display = 'none';
        profileView.style.display = 'none';
        
        if (this.value === 'list') {
            listView.style.display = 'block';
        } else if (this.value === 'kanban') {
            kanbanView.style.display = 'flex';
        } else if (this.value === 'calendar') {
            calendarView.style.display = 'block';
        }
    });
    
    // Profile nav click handler
    profileNav.addEventListener('click', function(e) {
        e.preventDefault();
        listView.style.display = 'none';
        kanbanView.style.display = 'none';
        calendarView.style.display = 'none';
        profileView.style.display = 'block';
    });
    
    // Task form handling
    const taskForm = document.getElementById('taskForm');
    taskForm.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Task saved successfully! (This would connect to your backend API)');
        const modal = bootstrap.Modal.getInstance(document.getElementById('taskModal'));
        modal.hide();
    });
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keyup', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('#taskList tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
    
    // TODO:
    // - Replace static task data with dynamic fetching from backend API (e.g., using fetch or axios).
    // - Implement functions to GET, POST, PUT, DELETE tasks via backend endpoints.
    // - Update UI after backend operations.
    // - Handle loading and error states.
    // - For search/filter, either filter client-side or send queries to backend.
    // - For profile view, fetch user activity summary from backend.
});
