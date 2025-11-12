// Mailbux CalDAV Auto - Contacts Button Popover
(() => {
'use strict';

function initContactsPopover() {
	// Wait for contacts button to be available
	const checkButton = setInterval(() => {
		const contactsBtn = document.querySelector('.buttonContacts');
		if (contactsBtn && !contactsBtn.dataset.popoverInit) {
			contactsBtn.dataset.popoverInit = 'true';
			clearInterval(checkButton);
			setupContactsPopover(contactsBtn);
		}
	}, 500);
	
	// Stop checking after 10 seconds
	setTimeout(() => clearInterval(checkButton), 10000);
}

function setupContactsPopover(contactsBtn) {
	// Change the button icon to apps icon (grid of 4 boxes)
	const originalContent = contactsBtn.innerHTML || contactsBtn.textContent;
	if (originalContent.includes('📇') || originalContent.trim() === '📇') {
		// Create SVG grid icon (2x2 boxes)
		contactsBtn.innerHTML = `
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect x="2" y="2" width="6" height="6" rx="1" fill="currentColor"/>
				<rect x="12" y="2" width="6" height="6" rx="1" fill="currentColor"/>
				<rect x="2" y="12" width="6" height="6" rx="1" fill="currentColor"/>
				<rect x="12" y="12" width="6" height="6" rx="1" fill="currentColor"/>
			</svg>
		`;
		contactsBtn.style.display = 'inline-flex';
		contactsBtn.style.alignItems = 'center';
		contactsBtn.style.justifyContent = 'center';
	}
	
	// Track if we should show popover
	let shouldShowPopover = true;
	
	// Create popover container
	const popover = document.createElement('div');
	popover.className = 'contacts-popover';
	popover.innerHTML = `
		<div class="contacts-popover-content">
			<button class="contacts-popover-btn" data-action="contacts" title="Contacts">
				<span class="contacts-popover-icon">📇</span>
				<span class="contacts-popover-label">Contacts</span>
			</button>
			<button class="contacts-popover-btn" data-action="calendar" title="Calendar">
				<span class="contacts-popover-icon">📅</span>
				<span class="contacts-popover-label">Calendar</span>
			</button>
		</div>
	`;
	
	// Add styles
	if (!document.getElementById('contacts-popover-styles')) {
		const style = document.createElement('style');
		style.id = 'contacts-popover-styles';
		style.textContent = `
			.contacts-popover {
				position: absolute;
				background: #ffffff !important;
				border-radius: 12px;
				box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
				padding: 24px 16px;
				z-index: 10000;
				display: none;
				border: none;
				margin-top: 4px;
			}
			.contacts-popover * {
				background: transparent !important;
			}
			.contacts-popover.show {
				display: block;
			}
			.contacts-popover-content {
				display: flex;
				flex-direction: row;
				gap: 16px;
				align-items: flex-start;
			}
			.contacts-popover-btn {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				padding: 16px 20px;
				border: none !important;
				background: transparent !important;
				cursor: pointer;
				border-radius: 12px;
				min-width: 80px;
				color: #333;
				transition: all 0.2s ease;
				position: relative;
				outline: none;
			}
			#rl-app .contacts-popover .contacts-popover-btn,
			#rl-app .contacts-popover button.contacts-popover-btn,
			#rl-app .contacts-popover .btn.contacts-popover-btn {
				border: none !important;
				border-width: 0 !important;
				box-shadow: none !important;
				height: auto !important;
			}
			.contacts-popover-btn:hover {
				background-color: #f5f5f5 !important;
				transform: translateY(-2px);
			}
			.contacts-popover-btn:active {
				transform: translateY(0);
			}
			.contacts-popover-icon {
				font-size: 40px;
				line-height: 1;
				display: block;
				margin-bottom: 8px;
			}
			.contacts-popover-label {
				font-size: 13px;
				font-weight: 500;
				color: #333;
				text-align: center;
				white-space: nowrap;
			}
			.buttonContacts {
				position: relative;
			}
		`;
		document.head.appendChild(style);
	}
	
	// Position popover relative to button
	function positionPopover() {
		const rect = contactsBtn.getBoundingClientRect();
		
		// Position below the button (using fixed positioning relative to viewport)
		popover.style.position = 'fixed';
		popover.style.left = rect.left + 'px';
		popover.style.top = (rect.bottom + 4) + 'px';
		
		// Adjust if popover would go off screen (check after positioning)
		setTimeout(() => {
			const popoverRect = popover.getBoundingClientRect();
			if (popoverRect.right > window.innerWidth) {
				popover.style.left = (window.innerWidth - popoverRect.width - 10) + 'px';
			}
			if (popoverRect.bottom > window.innerHeight) {
				popover.style.top = (rect.top - popoverRect.height - 4) + 'px';
			}
		}, 0);
	}
	
	// Toggle popover visibility
	function togglePopover(e) {
		e.stopPropagation();
		const isVisible = popover.classList.contains('show');
		
		if (isVisible) {
			hidePopover();
		} else {
			showPopover();
		}
	}
	
	function showPopover() {
		positionPopover();
		popover.classList.add('show');
		document.body.appendChild(popover);
		
		// Close on outside click
		setTimeout(() => {
			document.addEventListener('click', hidePopoverOnOutsideClick, true);
		}, 0);
	}
	
	function hidePopover() {
		popover.classList.remove('show');
		if (popover.parentNode) {
			popover.parentNode.removeChild(popover);
		}
		document.removeEventListener('click', hidePopoverOnOutsideClick, true);
	}
	
	function hidePopoverOnOutsideClick(e) {
		if (!popover.contains(e.target) && !contactsBtn.contains(e.target)) {
			hidePopover();
		}
	}
	
	// Handle button clicks
	popover.addEventListener('click', (e) => {
		const btn = e.target.closest('.contacts-popover-btn');
		if (!btn) return;
		
		e.stopPropagation();
		const action = btn.dataset.action;
		shouldShowPopover = false; // Prevent popover from showing again
		hidePopover();
		
		if (action === 'contacts') {
			// Trigger contacts popup - wait a bit for popover to close
			setTimeout(() => {
				// Try multiple methods to trigger contacts
				if (typeof showScreenPopup !== 'undefined' && typeof ContactsPopupView !== 'undefined') {
					showScreenPopup(ContactsPopupView);
				} else {
					// Find the viewModel and call contactsClick
					const findViewModel = () => {
						if (window.rl && window.rl.app) {
							// Try different paths to find contactsClick
							if (window.rl.app.viewModel && typeof window.rl.app.viewModel.contactsClick === 'function') {
								window.rl.app.viewModel.contactsClick();
								return true;
							}
							if (typeof window.rl.app.contactsClick === 'function') {
								window.rl.app.contactsClick();
								return true;
							}
							// Try to find via Knockout context
							if (window.ko && window.ko.dataFor) {
								const context = window.ko.dataFor(contactsBtn);
								if (context && typeof context.contactsClick === 'function') {
									context.contactsClick();
									return true;
								}
								// Try parent context
								if (context && context.$parent && typeof context.$parent.contactsClick === 'function') {
									context.$parent.contactsClick();
									return true;
								}
							}
						}
						return false;
					};
					
					if (!findViewModel()) {
						// Last resort: remove our handler temporarily and trigger click
						const tempHandler = contactsBtn.onclick;
						contactsBtn.onclick = null;
						contactsBtn.click();
						setTimeout(() => {
							contactsBtn.onclick = tempHandler;
						}, 50);
					}
				}
			}, 150);
		} else if (action === 'calendar') {
			// Navigate to calendar using location.hash
			setTimeout(() => {
				if (window.location) {
					window.location.hash = '#/calendar';
				}
			}, 150);
		}
	});
	
	// Attach click handler to contacts button - use capture to intercept before Knockout
	contactsBtn.addEventListener('click', (e) => {
		// Only show popover if it's not already showing and we haven't clicked a popover button
		if (!popover.classList.contains('show') && shouldShowPopover) {
			e.preventDefault();
			e.stopImmediatePropagation();
			e.stopPropagation();
			togglePopover(e);
		}
		shouldShowPopover = true; // Reset for next click
	}, true); // Use capture phase to intercept before Knockout
	
	// Also handle mousedown to catch clicks earlier
	contactsBtn.addEventListener('mousedown', (e) => {
		if (!popover.classList.contains('show')) {
			shouldShowPopover = true;
		}
	}, true);
	
	// Handle window resize
	window.addEventListener('resize', () => {
		if (popover.classList.contains('show')) {
			positionPopover();
		}
	});
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initContactsPopover);
} else {
	initContactsPopover();
}

// Also try to initialize after a delay (in case button is added dynamically)
setTimeout(initContactsPopover, 1000);
setTimeout(initContactsPopover, 3000);

})();

