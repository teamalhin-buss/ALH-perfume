// Intersection Observer for scroll animations
const animateOnScroll = () => {
    const elements = document.querySelectorAll('.section-transition');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Animate children with staggered delay
                const children = entry.target.querySelectorAll('*');
                children.forEach((child, index) => {
                    child.style.transitionDelay = `${index * 0.05}s`;
                });
                
                // Unobserve after animation
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    elements.forEach(element => {
        observer.observe(element);
    });
};

// Initialize hover effects for cards
const initCardHover = () => {
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
            card.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.1)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        });
    });
};

// Initialize button hover effects
const initButtonHover = () => {
    const buttons = document.querySelectorAll('.btn-hover');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        });
        
        button.addEventListener('mousedown', () => {
            button.style.transform = 'translateY(1px)';
            button.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)';
        });
        
        button.addEventListener('mouseup', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        });
    });
};

// Run animations when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize animations
    animateOnScroll();
    initCardHover();
    initButtonHover();
    
    // Re-run animations on window resize (in case layout changes)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // Re-initialize animations that might be affected by resize
            animateOnScroll();
        }, 250);
    });
});
