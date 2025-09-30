/**
 * Shopping Cart Module
 * Handles all cart functionality including:
 * - Adding/removing items
 * - Updating quantities
 * - Calculating totals
 * - Persisting cart state to localStorage
 */

class ShoppingCart {
    constructor() {
        this.cart = [];
        this.isOpen = false;
        this.initialize();
    }

    /**
     * Initialize the shopping cart
     */
    initialize() {
        this.loadCart();
        this.setupEventListeners();
        this.renderCart();
    }

    /**
     * Load cart from localStorage
     */
    loadCart() {
        try {
            const savedCart = localStorage.getItem('shoppingCart');
            this.cart = savedCart ? JSON.parse(savedCart) : [];
            this.updateCartCount();
        } catch (error) {
            console.error('Error loading cart from localStorage:', error);
            this.cart = [];
            this.saveCart();
        }
    }

    /**
     * Save cart to localStorage
     */
    saveCart() {
        try {
            localStorage.setItem('shoppingCart', JSON.stringify(this.cart));
            this.updateCartCount();
        } catch (error) {
            console.error('Error saving cart to localStorage:', error);
        }
    }

    /**
     * Add item to cart or update quantity if already exists
     * @param {Object} item - The item to add
     */
    addItem(item) {
        if (!this.validateItem(item)) {
            console.error('Invalid item format');
            return false;
        }

        const existingItemIndex = this.cart.findIndex(cartItem => 
            cartItem.id === item.id && this.areItemsEqual(cartItem, item)
        );

        if (existingItemIndex > -1) {
            // Update quantity if item exists
            this.cart[existingItemIndex].quantity += item.quantity || 1;
        } else {
            // Add new item
            this.cart.push({
                ...item,
                quantity: item.quantity || 1,
                addedAt: new Date().toISOString()
            });
        }

        this.saveCart();
        this.renderCart();
        this.showNotification('Item added to cart');
        return true;
    }

    /**
     * Remove item from cart
     * @param {string} itemId - The ID of the item to remove
     */
    removeItem(itemId) {
        this.cart = this.cart.filter(item => item.id !== itemId);
        this.saveCart();
        this.renderCart();
        this.showNotification('Item removed from cart');
    }

    /**
     * Update item quantity
     * @param {string} itemId - The ID of the item to update
     * @param {number} quantity - The new quantity
     */
    updateQuantity(itemId, quantity) {
        const quantityNum = parseInt(quantity, 10);
        if (isNaN(quantityNum) || quantityNum < 1) return;

        const item = this.cart.find(item => item.id === itemId);
        if (item) {
            item.quantity = quantityNum;
            this.saveCart();
            this.renderCart();
        }
    }

    /**
     * Calculate cart subtotal
     */
    calculateSubtotal() {
        return this.cart.reduce((total, item) => {
            return total + (parseFloat(item.price) * item.quantity);
        }, 0);
    }

    /**
     * Get total number of items in cart
     */
    getItemCount() {
        return this.cart.reduce((count, item) => count + item.quantity, 0);
    }

    /**
     * Toggle cart dropdown visibility
     */
    toggleCart() {
        const dropdown = document.getElementById('cart-dropdown');
        const cartToggle = document.getElementById('cart-toggle');
        if (!dropdown || !cartToggle) return;

        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            // Close user dropdown if open
            const userDropdown = document.getElementById('user-dropdown');
            if (userDropdown && !userDropdown.classList.contains('hidden')) {
                userDropdown.classList.add('hidden');
            }
            
            // Show cart dropdown
            dropdown.classList.remove('hidden');
            // Trigger reflow to enable transition
            void dropdown.offsetWidth;
            dropdown.classList.remove('opacity-0', 'translate-y-2');
            dropdown.classList.add('opacity-100', 'translate-y-0');
            
            // Add click outside listener
            this.outsideClickListener = (e) => {
                if (!dropdown.contains(e.target) && !cartToggle.contains(e.target)) {
                    this.hideCart();
                }
            };
            document.addEventListener('click', this.outsideClickListener);
        } else {
            this.hideCart();
        }
    }

    /**
     * Hide cart dropdown
     */
    hideCart() {
        const dropdown = document.getElementById('cart-dropdown');
        if (!dropdown) return;

        dropdown.classList.add('opacity-0', 'translate-y-2');
        dropdown.classList.remove('opacity-100', 'translate-y-0');
        
        // Remove transition class after animation completes
        setTimeout(() => {
            if (dropdown.classList.contains('opacity-0')) {
                dropdown.classList.add('hidden');
            }
        }, 200);

        // Remove outside click listener
        if (this.outsideClickListener) {
            document.removeEventListener('click', this.outsideClickListener);
            this.outsideClickListener = null;
        }
        
        this.isOpen = false;
    }

    /**
     * Update cart count badge
     */
    updateCartCount() {
        const count = this.getItemCount();
        const countElement = document.getElementById('cart-count');
        
        if (countElement) {
            countElement.textContent = count;
            countElement.classList.toggle('hidden', count === 0);
        }
    }

    /**
     * Render cart items and update UI
     */
    renderCart() {
        const itemsContainer = document.getElementById('cart-items');
        const itemCountElement = document.getElementById('cart-item-count');
        const subtotalElement = document.getElementById('cart-subtotal');
        
        if (!itemsContainer || !itemCountElement || !subtotalElement) return;

        // Update item count
        const itemCount = this.getItemCount();
        itemCountElement.textContent = `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
        
        // Update subtotal
        const subtotal = this.calculateSubtotal();
        subtotalElement.textContent = this.formatCurrency(subtotal);
        
        // Render cart items or empty state
        if (this.cart.length === 0) {
            itemsContainer.innerHTML = `
                <div class="p-6 text-center text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p>Your bag is empty</p>
                </div>
            `;
            return;
        }

        // Render cart items
        itemsContainer.innerHTML = this.cart.map(item => this.renderCartItem(item)).join('');
        
        // Add event listeners to quantity controls
        this.cart.forEach(item => {
            const increaseBtn = document.getElementById(`increase-${item.id}`);
            const decreaseBtn = document.getElementById(`decrease-${item.id}`);
            const quantityInput = document.getElementById(`quantity-${item.id}`);
            const removeBtn = document.getElementById(`remove-${item.id}`);
            
            if (increaseBtn) {
                increaseBtn.addEventListener('click', () => this.updateQuantity(item.id, item.quantity + 1));
            }
            
            if (decreaseBtn && item.quantity > 1) {
                decreaseBtn.addEventListener('click', () => this.updateQuantity(item.id, item.quantity - 1));
            }
            
            if (quantityInput) {
                quantityInput.addEventListener('change', (e) => {
                    const newQuantity = parseInt(e.target.value, 10);
                    if (!isNaN(newQuantity) && newQuantity > 0) {
                        this.updateQuantity(item.id, newQuantity);
                    } else {
                        e.target.value = item.quantity; // Revert to current quantity if invalid
                    }
                });
            }
            
            if (removeBtn) {
                removeBtn.addEventListener('click', () => this.removeItem(item.id));
            }
        });
    }

    /**
     * Render a single cart item
     * @param {Object} item - The cart item to render
     */
    renderCartItem(item) {
        const totalPrice = parseFloat(item.price) * item.quantity;
        
        return `
            <div class="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <div class="flex">
                    <!-- Product Image -->
                    <div class="flex-shrink-0 h-20 w-20 rounded-md overflow-hidden border border-gray-200">
                        <img src="${item.image}" alt="${item.name}" class="h-full w-full object-cover">
                    </div>
                    
                    <!-- Product Details -->
                    <div class="ml-4 flex-1">
                        <div class="flex justify-between">
                            <h4 class="text-sm font-medium text-gray-900 line-clamp-2">${item.name}</h4>
                            <button id="remove-${item.id}" class="text-gray-400 hover:text-red-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <p class="mt-1 text-sm text-gray-500">${this.formatCurrency(parseFloat(item.price))}</p>
                        
                        <!-- Quantity Controls -->
                        <div class="mt-2 flex items-center">
                            <div class="flex items-center border border-gray-300 rounded-md">
                                <button id="decrease-${item.id}" type="button" class="h-8 w-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" ${item.quantity <= 1 ? 'disabled' : ''}>
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                                    </svg>
                                </button>
                                <input id="quantity-${item.id}" type="number" min="1" value="${item.quantity}" class="w-12 text-center border-x border-gray-300 h-8 focus:outline-none focus:ring-1 focus:ring-gold">
                                <button id="increase-${item.id}" type="button" class="h-8 w-8 flex items-center justify-center text-gray-600 hover:bg-gray-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </div>
                            <div class="ml-auto font-medium">${this.formatCurrency(totalPrice)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Show notification to user
     * @param {string} message - The message to display
     */
    showNotification(message) {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('cart-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'cart-notification';
            notification.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-6 py-3 rounded-lg shadow-lg z-50 opacity-0 transition-opacity duration-200';
            document.body.appendChild(notification);
        }
        
        // Update and show notification
        notification.textContent = message;
        notification.classList.remove('opacity-0');
        
        // Hide after 3 seconds
        clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            notification.classList.add('opacity-0');
        }, 3000);
    }

    /**
     * Format price as currency
     * @param {number} amount - The amount to format
     */
    formatCurrency(amount) {
        return '₹' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * Validate item before adding to cart
     * @param {Object} item - The item to validate
     */
    validateItem(item) {
        if (!item) return false;
        
        const requiredFields = ['id', 'name', 'price', 'image'];
        return requiredFields.every(field => {
            const isValid = item[field] !== undefined && item[field] !== null && item[field] !== '';
            if (!isValid) {
                console.error(`Missing or invalid field: ${field}`, item);
            }
            return isValid;
        });
    }

    /**
     * Check if two items are equal (for cart comparison)
     * @param {Object} item1 - First item
     * @param {Object} item2 - Second item
     */
    areItemsEqual(item1, item2) {
        // Compare only the relevant properties that make items unique
        const keysToCompare = ['id', 'size', 'color'];
        return keysToCompare.every(key => {
            // If the key exists in both items, compare them
            if (key in item1 && key in item2) {
                return item1[key] === item2[key];
            }
            // If the key is missing from one of the items, they're not equal
            return false;
        });
    }

    /**
     * Set up event listeners for cart functionality
     */
    setupEventListeners() {
        // Toggle cart dropdown
        const cartToggle = document.getElementById('cart-toggle');
        const closeCart = document.getElementById('close-cart');
        
        if (cartToggle) {
            cartToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleCart();
            });
        }
        
        if (closeCart) {
            closeCart.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.hideCart();
            });
        }
        
        // Close cart when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('cart-dropdown');
            const cartToggle = document.getElementById('cart-toggle');
            
            if (dropdown && !dropdown.contains(e.target) && 
                cartToggle && !cartToggle.contains(e.target) && 
                !dropdown.classList.contains('hidden')) {
                this.hideCart();
            }
        });
        
        // Prevent dropdown from closing when clicking inside it
        const dropdown = document.getElementById('cart-dropdown');
        if (dropdown) {
            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Add to cart buttons
        document.addEventListener('click', (e) => {
            const addToCartBtn = e.target.closest('[data-add-to-cart]');
            if (!addToCartBtn) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const productCard = addToCartBtn.closest('.product-card') || addToCartBtn.closest('.product-details');
            if (!productCard) return;
            
            try {
                const item = {
                    id: productCard.dataset.id || 'unknown',
                    name: productCard.dataset.name || 'Unknown Product',
                    price: parseFloat(productCard.dataset.price) || 0,
                    image: productCard.dataset.image || '',
                    quantity: 1 // Default quantity
                };
                
                const added = this.addItem(item);
                if (added) {
                    // Show cart after adding item, but only if not on mobile
                    if (window.innerWidth >= 768) { // 768px is md breakpoint in Tailwind
                        this.showCart();
                    }
                }
            } catch (error) {
                console.error('Error adding item to cart:', error);
                this.showNotification('Error adding item to cart');
            }
        });
    }
}

// Initialize shopping cart when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.shoppingCart = new ShoppingCart();
});
