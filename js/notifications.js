// Toast notification system
export class Notifications {
    constructor() {
        this.notificationContainer = null;
        this.init();
    }

    init() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            this.notificationContainer = document.createElement('div');
            this.notificationContainer.id = 'notification-container';
            this.notificationContainer.className = 'fixed top-4 right-4 z-[1000] space-y-2';
            document.body.appendChild(this.notificationContainer);
        } else {
            this.notificationContainer = document.getElementById('notification-container');
        }
    }

    show(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `px-6 py-4 rounded-lg shadow-lg text-white font-medium transform transition-all duration-300 ease-in-out ${this.getTypeClasses(type)}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        
        // Add icon based on type
        const icon = this.getIconForType(type);
        notification.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    ${icon}
                </div>
                <div class="ml-3 w-0 flex-1 pt-0.5">
                    <p class="text-sm font-medium">${message}</p>
                </div>
                <div class="ml-4 flex-shrink-0 flex">
                    <button class="inline-flex text-white focus:outline-none focus:text-gray-300">
                        <span class="sr-only">Close</span>
                        <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        // Add to container
        this.notificationContainer.appendChild(notification);
        
        // Trigger reflow to enable animation
        void notification.offsetWidth;
        
        // Animate in
        notification.classList.remove('opacity-0', 'translate-x-full');
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }
        
        // Add click to dismiss
        const closeButton = notification.querySelector('button');
        if (closeButton) {
            closeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.remove(notification);
            });
        }
        
        notification.addEventListener('click', () => this.remove(notification));
        
        return notification;
    }
    
    remove(notification) {
        if (!notification) return;
        
        notification.classList.add('opacity-0', 'translate-x-full');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (notification.parentNode === this.notificationContainer) {
                this.notificationContainer.removeChild(notification);
            }
        }, 300);
    }
    
    getTypeClasses(type) {
        const types = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500',
            default: 'bg-gray-800'
        };
        
        return `${types[type] || types.default} opacity-0 translate-x-full`;
    }
    
    getIconForType(type) {
        const icons = {
            success: `
                <svg class="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            `,
            error: `
                <svg class="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            `,
            warning: `
                <svg class="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            `,
            info: `
                <svg class="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            `,
            default: `
                <svg class="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
            `
        };
        
        return icons[type] || icons.default;
    }
}

// Create a global instance
export const notifications = new Notifications();

// Add some helper methods
export const showSuccess = (message, duration = 3000) => {
    return notifications.show(message, 'success', duration);
};

export const showError = (message, duration = 5000) => {
    return notifications.show(message, 'error', duration);
};

export const showInfo = (message, duration = 3000) => {
    return notifications.show(message, 'info', duration);
};

export const showWarning = (message, duration = 4000) => {
    return notifications.show(message, 'warning', duration);
};
