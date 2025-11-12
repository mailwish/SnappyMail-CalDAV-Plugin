// Mailbux CalDAV Auto - Full Calendar with FullCalendar library
(() => {
'use strict';


let calendar = null;
let calendarEvents = [];

if (window.rl && rl.route) {
	rl.route.on(/^calendar/, () => setTimeout(showCalendar, 100));
	// Hide calendar on any other route
	rl.route.on(/^(?!calendar)/, () => hideCalendar());
}

window.addEventListener('hashchange', () => {
	if (window.location.hash.includes('calendar')) {
		setTimeout(showCalendar, 100);
	} else {
		hideCalendar();
	}
});

setTimeout(() => { if (window.location.hash.includes('calendar')) showCalendar(); }, 1000);

function showCalendar() {
	
	// Hide all main content areas
	document.querySelectorAll('#rl-left, #rl-right, #rl-content').forEach(el => {
		if (el) el.style.display = 'none';
	});
	
	// Find or create calendar in body
	let cal = document.getElementById('mailbux-calendar');
	if (!cal) {
		cal = document.createElement('div');
		cal.id = 'mailbux-calendar';
		cal.style.cssText = 'display: block; position: fixed; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; background: var(--cal-bg-secondary, #f8f9fa); z-index: 10000;';
cal.innerHTML = `
<style>
:root {
	--cal-bg-primary: #ffffff;
	--cal-bg-secondary: #f8f9fa;
	--cal-bg-tertiary: #f5f5f5;
	--cal-text-primary: #1a1a1a;
	--cal-text-secondary: #666666;
	--cal-text-tertiary: #999999;
	--cal-border: #e0e0e0;
	--cal-accent: #00639a;
	--cal-accent-hover: #0082c9;
	--cal-accent-light: rgba(0, 99, 154, 0.1);
	--cal-header-bg: linear-gradient(135deg, #00639a 0%, #0082c9 100%);
	--cal-event-bg: #00639a;
	--cal-event-border: #0082c9;
	--cal-event-text: #ffffff;
	--cal-shadow: rgba(0, 0, 0, 0.08);
	--cal-shadow-hover: rgba(0, 0, 0, 0.12);
	--cal-modal-overlay: rgba(0, 0, 0, 0.5);
	--cal-danger: #e9322d;
	--cal-danger-hover: #ed5a56;
}

@media (prefers-color-scheme: dark) {
	:root {
		--cal-bg-primary: #171717;
		--cal-bg-secondary: #212121;
		--cal-bg-tertiary: #292929;
		--cal-text-primary: #D8D8D8;
		--cal-text-secondary: #a5a5a5;
		--cal-text-tertiary: #8c8c8c;
		--cal-border: #3b3b3b;
		--cal-accent: #0082c9;
		--cal-accent-hover: #3282ae;
		--cal-accent-light: rgba(0, 130, 201, 0.2);
		--cal-header-bg: linear-gradient(135deg, #00639a 0%, #0082c9 100%);
		--cal-event-bg: #0082c9;
		--cal-event-border: #3282ae;
		--cal-event-text: #ffffff;
		--cal-shadow: rgba(0, 0, 0, 0.3);
		--cal-shadow-hover: rgba(0, 0, 0, 0.4);
		--cal-modal-overlay: rgba(0, 0, 0, 0.7);
		--cal-danger: #e9322d;
		--cal-danger-hover: #ed5a56;
	}
}

#mailbux-calendar * { box-sizing: border-box; }
.cal-wrapper { display: flex; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--cal-bg-secondary); }
.cal-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.cal-header { background: var(--cal-header-bg); color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px var(--cal-shadow); }
.cal-header-left { display: flex; align-items: center; gap: 15px; }
.cal-back-btn { background: rgba(255, 255, 255, 0.2); color: white; border: 1px solid rgba(255, 255, 255, 0.3); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 18px; text-decoration: none; transition: all 0.2s; display: flex; align-items: center; }
.cal-back-btn:hover { background: rgba(255, 255, 255, 0.3); transform: translateY(-1px); }
.cal-title { display: flex; align-items: center; gap: 12px; margin: 0; font-size: 24px; font-weight: 300; color: white; }
.cal-add-btn { background: rgba(255, 255, 255, 0.2); color: white; border: 1px solid rgba(255, 255, 255, 0.3); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 500; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
.cal-add-btn:hover { background: rgba(255, 255, 255, 0.3); transform: translateY(-1px); }
.cal-header-right { display: flex; align-items: center; gap: 10px; }
.cal-content { flex: 1; padding: 20px; overflow: auto; background: var(--cal-bg-secondary); }
#fc-calendar { background: var(--cal-bg-primary); border-radius: 12px; box-shadow: 0 2px 8px var(--cal-shadow); height: calc(100% - 20px); }

/* FullCalendar overrides */
.fc { height: 100% !important; color: var(--cal-text-primary) !important; }
.fc-header-toolbar { padding: 15px 20px; background: var(--cal-bg-tertiary) !important; border-bottom: 1px solid var(--cal-border) !important; border-radius: 12px 12px 0 0; }
.fc-button { border-radius: 6px !important; font-weight: 500 !important; text-transform: capitalize !important; background: var(--cal-bg-tertiary) !important; border-color: var(--cal-border) !important; color: var(--cal-text-primary) !important; }
.fc-button:hover { background: var(--cal-accent-light) !important; border-color: var(--cal-accent) !important; }
.fc-button-primary { background: var(--cal-accent) !important; border-color: var(--cal-accent) !important; color: white !important; }
.fc-button-primary:hover { background: var(--cal-accent-hover) !important; border-color: var(--cal-accent-hover) !important; }
.fc-button-active { background: var(--cal-accent) !important; border-color: var(--cal-accent) !important; color: white !important; }
.fc-event { border-radius: 6px; font-size: 13px; border: none !important; }
.fc-event.modern-event { background-color: var(--cal-event-bg) !important; border-color: var(--cal-event-border) !important; color: var(--cal-event-text) !important; }
.fc-daygrid-day-number { padding: 6px; color: var(--cal-text-primary) !important; }
.fc-daygrid-day-top { color: var(--cal-text-primary) !important; }
.fc-timegrid-slot { border-color: var(--cal-border) !important; }
.fc-timegrid-slot-label { color: var(--cal-text-secondary) !important; }
.fc-list-day-cushion { background: var(--cal-bg-tertiary) !important; color: var(--cal-text-primary) !important; }
.fc-list-event { color: var(--cal-text-primary) !important; }
.fc-list-event:hover td { background: var(--cal-bg-tertiary) !important; }
.fc-col-header-cell { background: var(--cal-bg-tertiary) !important; border-color: var(--cal-border) !important; }
.fc-col-header-cell-cushion { color: var(--cal-text-primary) !important; }
.fc-daygrid-day { background: var(--cal-bg-primary) !important; border-color: var(--cal-border) !important; }
.fc-daygrid-day.fc-day-today { background: var(--cal-accent-light) !important; }
.fc-scrollgrid { border-color: var(--cal-border) !important; }
.sidebar-section { margin-bottom: 25px; }
.sidebar-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--cal-text-tertiary); margin-bottom: 12px; letter-spacing: 0.5px; display: flex; justify-content: space-between; align-items: center; }
.sidebar-calendars { list-style: none; padding: 0; margin: 0; }
.sidebar-calendars li { padding: 10px 12px; margin-bottom: 6px; background: var(--cal-bg-primary); border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; border: 1px solid var(--cal-border); transition: all 0.2s; color: var(--cal-text-primary); }
.sidebar-calendars li:hover { background: var(--cal-bg-tertiary); border-color: var(--cal-accent); }
.cal-color { width: 12px; height: 12px; border-radius: 3px; }
.sidebar-btn { width: 100%; padding: 12px; background: var(--cal-header-bg); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; }
.sidebar-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px var(--cal-shadow-hover); }
.sidebar-icon-btn { background: var(--cal-accent); color: white; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; padding: 0; }
.sidebar-icon-btn:hover { background: var(--cal-accent-hover); transform: rotate(180deg); }

/* Responsive */
@media (max-width: 768px) {
	.cal-sidebar { position: fixed; left: 0; top: 0; bottom: 0; z-index: 999; transform: translateX(-100%); box-shadow: 2px 0 8px var(--cal-shadow); }
	.cal-sidebar.open { transform: translateX(0); }
	.cal-sidebar-toggle { display: block; }
	.cal-title span:last-child { display: none; }
}

/* Event Modal */
.event-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: var(--cal-modal-overlay); z-index: 10001; display: none; align-items: center; justify-content: center; }
.event-modal-overlay.show { display: flex; }
.event-modal { background: var(--cal-bg-primary); border-radius: 12px; box-shadow: 0 8px 32px var(--cal-shadow-hover); width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; color: var(--cal-text-primary); }
.event-modal-header { background: var(--cal-header-bg); color: white; padding: 20px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center; }
.event-modal-title { margin: 0; font-size: 20px; font-weight: 600; color: white; }
.event-modal-close { background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s; }
.event-modal-close:hover { background: rgba(255,255,255,0.2); }
.event-modal-body { padding: 20px; background: var(--cal-bg-primary); }
.event-form-group { margin-bottom: 16px; }
.event-form-label { display: block; font-size: 12px; font-weight: 600; color: var(--cal-text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
.event-form-input, .event-form-textarea, .event-form-select { width: 100%; padding: 10px 12px; border: 1px solid var(--cal-border); border-radius: 6px; font-size: 14px; transition: border-color 0.2s; background: var(--cal-bg-primary); color: var(--cal-text-primary); }
.event-form-input:focus, .event-form-textarea:focus, .event-form-select:focus { outline: none; border-color: var(--cal-accent); }
.event-form-textarea { min-height: 80px; resize: vertical; font-family: inherit; }
.event-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.event-form-checkbox { display: flex; align-items: center; gap: 8px; color: var(--cal-text-primary); }
.event-form-checkbox input { width: auto; }
.event-modal-footer { padding: 16px 20px; border-top: 1px solid var(--cal-border); display: flex; gap: 10px; justify-content: flex-end; background: var(--cal-bg-primary); }
.event-modal-btn { padding: 10px 20px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.event-modal-btn-primary { background: var(--cal-header-bg); color: white; }
.event-modal-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px var(--cal-shadow-hover); }
.event-modal-btn-secondary { background: var(--cal-bg-tertiary); color: var(--cal-text-primary); }
.event-modal-btn-secondary:hover { background: var(--cal-bg-secondary); }
.event-modal-btn-danger { background: var(--cal-danger); color: white; margin-right: auto; }
.event-modal-btn-danger:hover { background: var(--cal-danger-hover); }
</style>
<div class="cal-wrapper">
<div class="cal-main">
<div class="cal-header">
<div class="cal-header-left">
<a href="#/mailbox/INBOX" class="cal-back-btn" title="Back to Inbox">← Back</a>
<h1 class="cal-title"><span style="font-size:32px">📅</span><span>Calendar</span></h1>
<button class="cal-add-btn" id="new-event-btn"><span style="font-size:20px">+</span> Add</button>
</div>
<div class="cal-header-right" id="cal-account-switcher"></div>
</div>
<div class="cal-content">
			<div id="fc-calendar"></div>
		</div>
	</div>
</div>

<!-- Event Modal -->
<div class="event-modal-overlay" id="event-modal">
	<div class="event-modal">
		<div class="event-modal-header">
			<h2 class="event-modal-title" id="event-modal-title">New Event</h2>
			<button class="event-modal-close" onclick="document.getElementById('event-modal').classList.remove('show')">×</button>
		</div>
		<div class="event-modal-body">
			<form id="event-form">
				<div class="event-form-group">
					<label class="event-form-label">Event Title *</label>
					<input type="text" class="event-form-input" id="event-title" placeholder="Enter event title" required>
				</div>
				<div class="event-form-row">
					<div class="event-form-group">
						<label class="event-form-label">Start Date *</label>
						<input type="datetime-local" class="event-form-input" id="event-start" required>
					</div>
					<div class="event-form-group">
						<label class="event-form-label">End Date *</label>
						<input type="datetime-local" class="event-form-input" id="event-end" required>
					</div>
				</div>
				<div class="event-form-group">
					<label class="event-form-checkbox">
						<input type="checkbox" id="event-allday">
						<span>All-day event</span>
					</label>
				</div>
				<div class="event-form-group">
					<label class="event-form-label">Location</label>
					<input type="text" class="event-form-input" id="event-location" placeholder="Add location">
				</div>
				<div class="event-form-group">
					<label class="event-form-label">Description</label>
					<textarea class="event-form-textarea" id="event-description" placeholder="Add description"></textarea>
				</div>
				<div class="event-form-group">
					<label class="event-form-label">Email Reminder</label>
					<select class="event-form-select" id="event-reminder">
						<option value="">No reminder</option>
						<option value="0">At time of event</option>
						<option value="5">5 minutes before</option>
						<option value="15">15 minutes before</option>
						<option value="30">30 minutes before</option>
						<option value="60">1 hour before</option>
						<option value="120">2 hours before</option>
						<option value="1440">1 day before</option>
					</select>
				</div>
			</form>
		</div>
		<div class="event-modal-footer">
			<button class="event-modal-btn event-modal-btn-danger" id="event-delete-btn" style="display:none;">Delete</button>
			<button class="event-modal-btn event-modal-btn-secondary" onclick="document.getElementById('event-modal').classList.remove('show')">Cancel</button>
			<button class="event-modal-btn event-modal-btn-primary" id="event-save-btn">Save Event</button>
		</div>
	</div>
</div>
`;
		document.body.appendChild(cal);

	// Move account switcher to calendar (will restore on hide)
	setTimeout(() => {
		const originalDropdown = document.querySelector('#V-SystemDropDown');
		const calHeader = document.querySelector('#mailbux-calendar .cal-header-right');
		
		if (originalDropdown && calHeader) {
			// Store original parent to restore later
			if (!originalDropdown.dataset.originalParent) {
				originalDropdown.dataset.originalParent = 'true';
				originalDropdown.originalParentElement = originalDropdown.parentElement;
			}
			originalDropdown.style.cssText = 'display: inline-block; margin-left: 15px;';
			calHeader.appendChild(originalDropdown);
		}
	}, 100);

	// Add event listeners
	setTimeout(() => {
		const newEventBtn = document.getElementById('new-event-btn');
		if (newEventBtn) newEventBtn.addEventListener('click', () => openEventModal());
		
		// Modal save button
		const saveBtn = document.getElementById('event-save-btn');
		if (saveBtn) saveBtn.addEventListener('click', saveEventFromModal);
		
		// Modal delete button
		const deleteBtn = document.getElementById('event-delete-btn');
		if (deleteBtn) deleteBtn.addEventListener('click', deleteEventFromModal);
		
		// All-day checkbox
		const allDayCheck = document.getElementById('event-allday');
		if (allDayCheck) allDayCheck.addEventListener('change', (e) => {
			toggleTimeInputs(e.target.checked);
		});
	}, 100);

	loadFullCalendar();
} else {
	cal.style.display = 'block';
	if (calendar) calendar.refetchEvents();
	
	// Move account switcher again when showing existing calendar
	setTimeout(() => {
		const originalDropdown = document.querySelector('#V-SystemDropDown');
		const calHeader = document.querySelector('#mailbux-calendar .cal-header-right');
		
		if (originalDropdown && calHeader && !calHeader.contains(originalDropdown)) {
			originalDropdown.style.cssText = 'display: inline-block; margin-left: 15px;';
			calHeader.appendChild(originalDropdown);
		}
	}, 100);
}
}

let currentEditingEvent = null;

function openEventModal(eventData = null, fcEvent = null) {
	const modal = document.getElementById('event-modal');
	const modalTitle = document.getElementById('event-modal-title');
	const deleteBtn = document.getElementById('event-delete-btn');
	
	currentEditingEvent = fcEvent;
	
	if (eventData) {
		// Edit mode
		modalTitle.textContent = 'Edit Event';
		deleteBtn.style.display = 'block';
		const isAllDay = eventData.allDay || false;
		document.getElementById('event-title').value = eventData.title || '';
		document.getElementById('event-allday').checked = isAllDay;
		document.getElementById('event-location').value = eventData.location || '';
		document.getElementById('event-description').value = eventData.description || '';
		document.getElementById('event-reminder').value = eventData.reminder || '';
		
		// Set date/time values based on allDay status
		if (isAllDay) {
			// For all-day events, use date-only format
			const startDate = new Date(eventData.start);
			const endDate = new Date(eventData.end || eventData.start);
			document.getElementById('event-start').value = formatDateOnly(startDate);
			document.getElementById('event-end').value = formatDateOnly(endDate);
		} else {
			// For timed events, use datetime-local format
			document.getElementById('event-start').value = formatDateTimeLocal(eventData.start);
			document.getElementById('event-end').value = formatDateTimeLocal(eventData.end || eventData.start);
		}
		
		// Toggle time inputs based on allDay (this will set the input type correctly)
		toggleTimeInputs(isAllDay);
	} else {
		// New event mode - default to timed event (not all-day) so time picker is visible
		modalTitle.textContent = 'New Event';
		deleteBtn.style.display = 'none';
		document.getElementById('event-form').reset();
		const now = new Date();
		const end = new Date(now.getTime() + 3600000); // 1 hour later
		// Set input type to datetime-local first to ensure time picker is visible
		document.getElementById('event-start').type = 'datetime-local';
		document.getElementById('event-end').type = 'datetime-local';
		document.getElementById('event-start').value = formatDateTimeLocal(now);
		document.getElementById('event-end').value = formatDateTimeLocal(end);
		document.getElementById('event-allday').checked = false;
		// Ensure time inputs are visible (not all-day)
		toggleTimeInputs(false);
	}
	
	modal.classList.add('show');
}

function toggleTimeInputs(isAllDay) {
	const startInput = document.getElementById('event-start');
	const endInput = document.getElementById('event-end');
	
	if (!startInput || !endInput) return;
	
	// Store current values
	const startValue = startInput.value;
	const endValue = endInput.value;
	
	if (isAllDay) {
		// Switch to date-only input (hides time picker)
		startInput.type = 'date';
		endInput.type = 'date';
		// Extract date part if it has time
		if (startValue && startValue.includes('T')) {
			startInput.value = startValue.split('T')[0];
		} else if (startValue) {
			startInput.value = startValue;
		}
		if (endValue && endValue.includes('T')) {
			endInput.value = endValue.split('T')[0];
		} else if (endValue) {
			endInput.value = endValue;
		}
	} else {
		// Switch to datetime-local input (shows time picker)
		startInput.type = 'datetime-local';
		endInput.type = 'datetime-local';
		// Ensure time picker is visible by setting a default time if missing
		if (startValue && !startValue.includes('T')) {
			// If it's just a date, add a default time (9:00 AM)
			startInput.value = startValue + 'T09:00';
		} else if (!startValue) {
			// If no value, set current time
			const now = new Date();
			startInput.value = formatDateTimeLocal(now);
		}
		if (endValue && !endValue.includes('T')) {
			// If it's just a date, add a default time (10:00 AM, 1 hour after start)
			endInput.value = endValue + 'T10:00';
		} else if (!endValue) {
			// If no value, set 1 hour after start
			const startVal = startInput.value || formatDateTimeLocal(new Date());
			const startDate = new Date(startVal);
			const endDate = new Date(startDate.getTime() + 3600000); // 1 hour later
			endInput.value = formatDateTimeLocal(endDate);
		}
	}
}

function formatDateTimeLocal(date) {
	if (!date) return '';
	const d = new Date(date);
	const pad = (n) => n.toString().padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function saveEventFromModal() {
	const title = document.getElementById('event-title').value.trim();
	const start = document.getElementById('event-start').value;
	const end = document.getElementById('event-end').value;
	const allDay = document.getElementById('event-allday').checked;
	const location = document.getElementById('event-location').value.trim();
	let description = document.getElementById('event-description').value.trim();
	const reminder = document.getElementById('event-reminder').value;
	
	if (!title || !start || !end) {
		alert('Please fill in all required fields');
		return;
	}
	
	// Add @email marker for Stalwart email notifications
	if (reminder && description) {
		description += '\n@email';
	} else if (reminder) {
		description = '@email';
	}
	
	// Parse dates correctly based on allDay
	let startDate, endDate;
	if (allDay) {
		// For all-day events, parse date-only string (YYYY-MM-DD) as local date
		// Don't add time, just use the date string directly
		// This prevents timezone shifts that cause "day before" issue
		const startParts = start.split('-');
		const endParts = end.split('-');
		// Create date in local timezone at midnight
		startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
		endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
	} else {
		// For timed events, parse the datetime-local value (already in local timezone)
		startDate = new Date(start);
		endDate = new Date(end);
	}
	
	const eventData = {
		title,
		start: startDate,
		end: endDate,
		allDay,
		location,
		description,
		reminder: parseInt(reminder) || 0
	};
	
	if (currentEditingEvent) {
		// Update existing event
		currentEditingEvent.setProp('title', title);
		currentEditingEvent.setStart(eventData.start);
		currentEditingEvent.setEnd(eventData.end);
		currentEditingEvent.setAllDay(allDay);
		updateEvent(currentEditingEvent);
	} else {
		// Create new event
		createEvent(eventData);
	}
	
	document.getElementById('event-modal').classList.remove('show');
	currentEditingEvent = null;
}

function deleteEventFromModal() {
	if (!currentEditingEvent) return;
	
	if (confirm(`Delete "${currentEditingEvent.title}"?`)) {
		const eventId = currentEditingEvent.id || currentEditingEvent.extendedProps?.uid;
		currentEditingEvent.remove();
		deleteEvent(eventId);
		document.getElementById('event-modal').classList.remove('show');
		currentEditingEvent = null;
	}
}

function hideCalendar() {
	const cal = document.getElementById('mailbux-calendar');
	if (cal) {
		cal.style.display = 'none';
	}
	
	// Restore account switcher to its original location
	const dropdown = document.querySelector('#V-SystemDropDown');
	if (dropdown && dropdown.originalParentElement) {
		dropdown.style.cssText = '';
		dropdown.originalParentElement.appendChild(dropdown);
	}
	
	// Restore main UI
	document.querySelectorAll('#rl-left, #rl-right, #rl-content').forEach(el => {
		if (el) el.style.display = '';
	});
}

function loadFullCalendar() {
	if (window.FullCalendar) { initializeFullCalendar(); return; }
	
	// Load FullCalendar bundle (includes CSS)
	const script = document.createElement('script');
	script.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js';
	script.onload = () => {
		initializeCalendar();
	};
	script.onerror = () => {
		document.getElementById('fc-calendar').innerHTML = '<div style="padding:40px;text-align:center;color:#999;">Failed to load calendar. Please refresh.</div>';
	};
	document.head.appendChild(script);
}

function initializeCalendar() {
const container = document.getElementById('fc-calendar');
if (!container || !window.FullCalendar) return;

calendar = new FullCalendar.Calendar(container, {
initialView: 'dayGridMonth',
headerToolbar: {
left: 'prev,next today',
center: 'title',
right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
},
buttonText: {
today: 'Today',
month: 'Month',
week: 'Week',
day: 'Day',
list: 'List'
},
height: '100%',
editable: true,
selectable: true,
selectMirror: true,
dayMaxEvents: true,
weekends: true,
nowIndicator: true,

events: function(info, successCallback, failureCallback) {
loadEventsFromCalDAV(successCallback, failureCallback);
},

eventClick: function(info) {
	const event = info.event;
	openEventModal({
		title: event.title,
		start: event.start,
		end: event.end || event.start,
		allDay: event.allDay,
		location: event.extendedProps?.location || '',
		description: event.extendedProps?.description || '',
		reminder: event.extendedProps?.reminder || ''
	}, event);
},

select: function(info) {
	openEventModal({
		start: info.start,
		end: info.end,
		allDay: info.allDay
	});
	calendar.unselect();
},

eventDrop: function(info) {
updateEvent(info.event);
},

eventResize: function(info) {
updateEvent(info.event);
}
});

calendar.render();

}

function loadEventsFromCalDAV(successCallback, failureCallback) {

if (!rl.pluginRemoteRequest) {
failureCallback({ message: 'Not available' });
return;
}

rl.pluginRemoteRequest((iError, oData) => {
if (iError || !oData || !oData.Result) {
const statusEl = document.getElementById('sidebar-status');
if (statusEl) {
statusEl.textContent = 'Error';
statusEl.style.color = '#f44336';
}
successCallback([]);
return;
}

	const result = oData.Result;

		const events = (result.events || []).map(event => {
		return {
			id: event.uid || Math.random().toString(36),
			title: event.summary || 'Untitled Event',
			start: new Date(event.dtstart || event.start),
			end: new Date(event.dtend || event.end),
			allDay: event.allDay || false,
			backgroundColor: 'var(--cal-event-bg)',
			borderColor: 'var(--cal-event-border)',
			textColor: 'var(--cal-event-text)',
			classNames: ['modern-event']
		};
	});

	calendarEvents = events;
	
	successCallback(events);
}, 'GetCalendarEvents', {});
}

function createEvent(eventData) {
	
	if (!rl.pluginRemoteRequest) return;
	
	rl.pluginRemoteRequest((iError, oData) => {
		if (iError || !oData || !oData.Result) {
			alert('Failed to create event: ' + (oData?.Result?.message || 'Unknown error'));
			return;
		}
		if (calendar) calendar.refetchEvents();
	}, 'CreateCalendarEvent', {
		Title: eventData.title,
		// For all-day events, format date as YYYY-MM-DD using local timezone
		// For timed events, send ISO string in UTC
		Start: eventData.allDay 
			? formatDateOnly(eventData.start)
			: eventData.start.toISOString(),
		End: eventData.allDay 
			? formatDateOnly(eventData.end)
			: eventData.end.toISOString(),
		AllDay: eventData.allDay || false,
		Description: eventData.description || '',
		Location: eventData.location || ''
	});
}

// Helper to format date as YYYY-MM-DD in local timezone
function formatDateOnly(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function updateEvent(event) {
	
	if (!rl.pluginRemoteRequest) return;
	
	const eventId = event.id || event.extendedProps?.uid;
	if (!eventId) {
		return;
	}
	
	// Format dates correctly based on allDay
	let startFormatted, endFormatted;
	if (event.allDay) {
		// For all-day events, send date-only string (YYYY-MM-DD)
		startFormatted = formatDateOnly(event.start);
		endFormatted = formatDateOnly(event.end || event.start);
	} else {
		// For timed events, send ISO string in UTC
		startFormatted = event.start.toISOString();
		endFormatted = (event.end || event.start).toISOString();
	}
	
	rl.pluginRemoteRequest((iError, oData) => {
		if (iError || !oData || !oData.Result) {
			alert('Failed to update event: ' + (oData?.Result?.message || 'Unknown error'));
			return;
		}
		if (calendar) calendar.refetchEvents();
	}, 'UpdateCalendarEvent', {
		EventId: eventId,
		Title: event.title,
		Start: startFormatted,
		End: endFormatted,
		AllDay: event.allDay || false
	});
}

function deleteEvent(eventId) {
	
	if (!rl.pluginRemoteRequest || !eventId) return;
	
	rl.pluginRemoteRequest((iError, oData) => {
		if (iError || !oData || !oData.Result) {
			alert('Failed to delete event: ' + (oData?.Result?.message || 'Unknown error'));
			return;
		}
		if (calendar) calendar.refetchEvents();
	}, 'DeleteCalendarEvent', {
		EventId: eventId
	});
}

// Calendar link removed - now handled by contacts popover

window.MailbuxCalendar = {
	refresh: () => { if (calendar) calendar.refetchEvents(); },
	show: showCalendar,
	getEvents: () => calendarEvents
};

})();
