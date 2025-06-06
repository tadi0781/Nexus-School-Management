
/**
 * Initializes a modern, unified assignee picker using TomSelect.
 * This picker searches for users, roles, and classes via a single API endpoint.
 *
 * @param {object} options - Configuration options.
 * @param {string} options.pickerId - The ID of the <select> element.
 * @param {string} options.hiddenInputId - The ID of the hidden <input> to store data.
 * @param {string} options.searchUrl - The URL of the API endpoint for searching assignees.
 */
function initializeModernAssigneePicker(options) {
    const pickerElement = document.getElementById(options.pickerId);
    const hiddenInputElement = document.getElementById(options.hiddenInputId);

    if (!pickerElement || !hiddenInputElement) {
        console.error('Assignee picker or hidden input element not found.');
        return;
    }

    new TomSelect(pickerElement, {
        valueField: 'id',
        labelField: 'text',
        searchField: 'text',
        optgroupField: 'group', // Group results by 'Users', 'Roles', 'Classes'
        lockOptgroupColumns: true,
        plugins: ['remove_button', 'optgroup_columns'],
        
        // Custom rendering to show icons and subtitles
        render: {
            option: function(data, escape) {
                let icon = '';
                if (data.type === 'user') {
                    icon = '<i class="bi bi-person-fill text-primary me-2"></i>';
                } else if (data.type === 'role') {
                    icon = '<i class="bi bi-people-fill text-info me-2"></i>';
                } else if (data.type === 'grade_section') {
                    icon = '<i class="bi bi-easel2-fill text-success me-2"></i>';
                }
                return `<div class="d-flex align-items-center">
                            ${icon}
                            <div>
                                <div class="text-dark">${escape(data.text)}</div>
                                <div class="text-muted small">${escape(data.subtext)}</div>
                            </div>
                        </div>`;
            },
            item: function(data, escape) {
                let icon = '';
                 if (data.type === 'user') {
                    icon = '<i class="bi bi-person-fill text-primary me-2"></i>';
                } else if (data.type === 'role') {
                    icon = '<i class="bi bi-people-fill text-info me-2"></i>';
                } else if (data.type === 'grade_section') {
                    icon = '<i class="bi bi-easel2-fill text-success me-2"></i>';
                }
                return `<div class="d-flex align-items-center" title="${escape(data.subtext)}">
                            ${icon}
                            <span>${escape(data.text)}</span>
                        </div>`;
            }
        },

        // Fetch data from our new API
        load: function(query, callback) {
            if (!query.length || query.length < 2) return callback();
            fetch(`${options.searchUrl}?q=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(json => {
                    callback(json);
                }).catch(() => {
                    callback();
                });
        },

        // When selection changes, update the hidden input
        onChange: function(value) {
            const selectedItems = this.items.map(itemId => {
                const itemData = this.options[itemId];
                // Store as a structured string: "type:id"
                return `${itemData.type}:${itemData.id}`;
            });
            hiddenInputElement.value = selectedItems.join(',');
            console.log('Hidden input updated:', hiddenInputElement.value);
        },
    });
}