/**
 * Product Page Interactions
 * Handles product-specific functionality like quantity updates and adding to cart
 */

document.addEventListener('DOMContentLoaded', function() {
    // Quantity controls
    const quantityDisplay = document.querySelector('.quantity');
    const decreaseBtn = document.querySelector('[data-action="decrease"]');
    const increaseBtn = document.querySelector('[data-action="increase"]');
    const addToBagBtn = document.querySelector('[data-add-to-cart]');
    
    // Initialize quantity
    let quantity = 1;
    
    // Update quantity display
    function updateQuantity() {
        quantityDisplay.textContent = quantity;
        
        // Disable decrease button when quantity is 1
        if (decreaseBtn) {
            decreaseBtn.disabled = quantity <= 1;
            decreaseBtn.classList.toggle('opacity-50', quantity <= 1);
            decreaseBtn.classList.toggle('cursor-not-allowed', quantity <= 1);
        }
    }
    
    // Decrease quantity
    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', function() {
            if (quantity > 1) {
                quantity--;
                updateQuantity();
            }
        });
    }
    
    // Increase quantity
    if (increaseBtn) {
        increaseBtn.addEventListener('click', function() {
            quantity++;
            updateQuantity();
        });
    }
    
    // Add to bag functionality
    if (addToBagBtn) {
        addToBagBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get product data from data attributes
            const product = {
                id: addToBagBtn.getAttribute('data-id'),
                name: addToBagBtn.getAttribute('data-name'),
                price: parseFloat(addToBagBtn.getAttribute('data-price')),
                image: addToBagBtn.getAttribute('data-image'),
                quantity: quantity
            };
            
            // Check if shopping cart is initialized
            if (window.shoppingCart) {
                // Add item to cart
                window.shoppingCart.addItem(product);
                
                // Show success message
                showNotification('Added to bag');
                
                // Reset quantity
                quantity = 1;
                updateQuantity();
            } else {
                console.error('Shopping cart not initialized');
            }
        });
    }
    
    // Show notification function
    function showNotification(message) {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'fixed bottom-4 right-4 bg-black text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-y-4 opacity-0 transition-all duration-300';
            document.body.appendChild(notification);
        }
        
        // Update and show notification
        notification.textContent = message;
        notification.classList.remove('opacity-0', 'translate-y-4');
        notification.classList.add('opacity-100', 'translate-y-0');
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('opacity-100', 'translate-y-0');
            notification.classList.add('opacity-0', 'translate-y-4');
        }, 3000);
    }
    
    // Initialize quantity display
    updateQuantity();
    
    // Image zoom functionality
    const productImage = document.getElementById('productImage');
    const viewLargerBtn = document.getElementById('viewLargerBtn');
    
    if (productImage && viewLargerBtn) {
        viewLargerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Toggle fullscreen mode
            if (!document.fullscreenElement) {
                if (productImage.requestFullscreen) {
                    productImage.requestFullscreen();
                } else if (productImage.webkitRequestFullscreen) { /* Safari */
                    productImage.webkitRequestFullscreen();
                } else if (productImage.msRequestFullscreen) { /* IE11 */
                    productImage.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) { /* Safari */
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) { /* IE11 */
                    document.msExitFullscreen();
                }
            }
        });
    }
});
