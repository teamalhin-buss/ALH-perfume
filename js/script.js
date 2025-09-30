// Main JavaScript for ALH Perfume Website

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initMobileMenu();
    initSmoothScrolling();
    initNavHighlighting();
    initProductInteractions();
    initScrollAnimations();
});

// Mobile menu functionality
function initMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (!mobileMenuButton || !mobileMenu) return;
    
    const menuIcons = mobileMenuButton.querySelectorAll('svg');
    
    mobileMenuButton.addEventListener('click', function() {
        const isExpanded = this.getAttribute('aria-expanded') === 'true' || false;
        this.setAttribute('aria-expanded', !isExpanded);
        
        // Toggle menu visibility
        mobileMenu.classList.toggle('hidden');
        
        // Toggle menu icons
        menuIcons[0].classList.toggle('hidden');
        menuIcons[1].classList.toggle('hidden');
        
        // Toggle body scroll
        document.body.style.overflow = isExpanded ? '' : 'hidden';
    });
    
    // Close menu when clicking on a link
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            menuIcons[0].classList.remove('hidden');
            menuIcons[1].classList.add('hidden');
            mobileMenuButton.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        });
    });
}

// Smooth scrolling for anchor links
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                const mobileMenu = document.getElementById('mobile-menu');
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    const mobileMenuButton = document.getElementById('mobile-menu-button');
                    if (mobileMenuButton) {
                        mobileMenuButton.setAttribute('aria-expanded', 'false');
                        mobileMenu.classList.add('hidden');
                        document.querySelectorAll('#mobile-menu-button svg').forEach((icon, index) => {
                            icon.classList.toggle('hidden', index !== 0);
                        });
                        document.body.style.overflow = '';
                    }
                }
            }
        });
    });
}

// Navigation highlighting on scroll
function initNavHighlighting() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    function highlightNav() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            
            if (pageYOffset >= sectionTop && pageYOffset < sectionTop + sectionHeight) {
                current = '#' + section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.toggle('text-gold', link.getAttribute('href') === current);
        });
    }
    
    window.addEventListener('scroll', highlightNav);
    highlightNav(); // Call once on load
}

// Initialize product interactions
function initProductInteractions() {
    // Add to cart buttons
    document.addEventListener('click', function(e) {
        // Handle add to cart button
        const addToCartBtn = e.target.closest('.add-to-cart');
        if (addToCartBtn) {
            e.preventDefault();
            
            // Find the closest product container
            const productCard = addToCartBtn.closest('.bg-white.rounded-2xl');
            if (!productCard) {
                console.error('Could not find product card');
                return;
            }
            
            // Get product details
            const productDetails = productCard.querySelector('.product-details');
            if (!productDetails) {
                console.error('Could not find product details');
                return;
            }
            
            // Get product image
            const productImage = productCard.querySelector('img');
            
            // Get product price (handle the price with currency symbol)
            const priceElement = productCard.querySelector('.product-price');
            const priceText = priceElement ? priceElement.textContent.trim() : '0';
            const cleanPrice = priceText.replace(/[^0-9.]/g, '');
            
            // Get quantity
            const quantityElement = productCard.querySelector('.quantity');
            const quantity = quantityElement ? parseInt(quantityElement.textContent) : 1;
            
            // Create product object
            const product = {
                id: productDetails.getAttribute('data-id') || 'product-' + Math.random().toString(36).substr(2, 9),
                name: productDetails.querySelector('h3')?.textContent.trim() || 'Ramzaan Perfume',
                price: parseFloat(cleanPrice) || 10999, // Default price if not found
                image: productImage?.src || 'images/products/ramzaan-perfume-bottle-side.png',
                quantity: quantity
            };
            
            console.log('Adding to cart:', product);
            
            if (window.ShoppingCart) {
                window.ShoppingCart.addItem(product);
                
                // Show added to cart feedback
                const originalText = addToCartBtn.innerHTML;
                const originalBg = addToCartBtn.className;
                
                addToCartBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Added to Cart!
                `;
                addToCartBtn.className = originalBg.replace('bg-gold', 'bg-green-500 hover:bg-green-600');
                
                setTimeout(() => {
                    addToCartBtn.innerHTML = originalText;
                    addToCartBtn.className = originalBg;
                }, 2000);
            }
            return;
        }
        
        // Handle quantity buttons in product cards
        const quantityBtn = e.target.closest('.quantity-btn');
        if (quantityBtn && !quantityBtn.closest('#cartDropdown')) {
            e.preventDefault();
            
            const action = quantityBtn.getAttribute('data-action');
            const quantityElement = quantityBtn.closest('.flex').querySelector('.quantity');
            let quantity = parseInt(quantityElement.textContent);
            
            if (action === 'increase') {
                quantity += 1;
            } else if (action === 'decrease' && quantity > 1) {
                quantity -= 1;
            }
            
            quantityElement.textContent = quantity;
            return;
        }
        
        // Handle wishlist button
        const wishlistBtn = e.target.closest('.wishlist-btn');
        if (wishlistBtn) {
            e.preventDefault();
            
            const wishlistText = wishlistBtn.querySelector('.wishlist-text');
            const isWishlisted = wishlistBtn.classList.toggle('wishlisted');
            
            if (isWishlisted) {
                wishlistText.textContent = 'Wishlisted';
                wishlistBtn.classList.add('border-gold', 'text-gold', 'bg-gold-50');
                wishlistBtn.querySelector('svg').classList.add('text-red-500', 'fill-current');
                
                // Show wishlist notification
                showNotification('Added to wishlist');
            } else {
                wishlistText.textContent = 'Add to Wishlist';
                wishlistBtn.classList.remove('border-gold', 'text-gold', 'bg-gold-50');
                wishlistBtn.querySelector('svg').classList.remove('text-red-500', 'fill-current');
            }
            return;
        }
    });
    
    // Initialize image zoom
    initImageZoom();
}

// Cart functionality has been removed

// Initialize scroll animations (currently disabled)
function initScrollAnimations() {
    // Scroll animations have been removed as requested
    // This function is kept to maintain compatibility
}

// Initialize image zoom functionality
function initImageZoom() {
    const productImage = document.querySelector('.product-image-zoom');
    const viewLargerBtn = document.querySelector('.view-larger-btn');
    
    if (productImage && viewLargerBtn) {
        let isZoomed = false;
        
        viewLargerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isZoomed = !isZoomed;
            
            if (isZoomed) {
                productImage.classList.add('cursor-zoom-out');
                productImage.style.transform = 'scale(2)';
                viewLargerBtn.innerHTML = `
                    <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    Close Zoom
                `;
            } else {
                productImage.classList.remove('cursor-zoom-out');
                productImage.style.transform = 'scale(1)';
                viewLargerBtn.innerHTML = `
                    <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m0 0h6m-6 0H7"></path>
                    </svg>
                    View Larger
                `;
            }
        });
        
        // Reset zoom when clicking outside
        document.addEventListener('click', (e) => {
            if (isZoomed && !productImage.contains(e.target) && !viewLargerBtn.contains(e.target)) {
                isZoomed = false;
                productImage.classList.remove('cursor-zoom-out');
                productImage.style.transform = 'scale(1)';
                viewLargerBtn.innerHTML = `
                    <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m0 0h6m-6 0H7"></path>
                    </svg>
                    View Larger
                `;
            }
        });
    }
}

// Show notification function
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } transition-all duration-300 transform translate-x-full`;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Trigger reflow
    notification.offsetHeight;
    
    // Slide in
    notification.classList.remove('translate-x-full');
    notification.classList.add('translate-x-0');
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('translate-x-0');
        notification.classList.add('translate-x-full');
        
        // Remove from DOM after animation
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}
