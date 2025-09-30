// Import Firebase auth
import { auth } from './firebase-init.js';
import { showSuccess, showError, showInfo } from './notifications.js';

// Import Firebase auth functions
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

// Auth UI State Management
const authUI = {
    // DOM Elements
    elements: {
        // Modals
        loginModal: document.getElementById('login-modal'),
        registerModal: document.getElementById('register-modal'),
        
        // Buttons
        loginButton: document.getElementById('login-btn'),
        registerButton: document.getElementById('register-btn'),
        logoutButton: document.getElementById('logout-btn'),
        closeLoginModal: document.getElementById('close-login-modal'),
        closeRegisterModal: document.getElementById('close-register-modal'),
        showRegister: document.getElementById('show-register'),
        showLogin: document.getElementById('show-login'),
        googleLogin: document.getElementById('google-login'),
        
        // Forms
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        
        // Auth State Containers
        authButtons: document.getElementById('auth-buttons'),
        userMenu: document.getElementById('user-menu')
    },
    
    // Initialize auth UI
    init() {
        try {
            // Set up auth state observer
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    // User is signed in
                    this.updateAuthUI(user);
                    this.hideModal('login');
                    this.hideModal('register');
                } else {
                    // User is signed out
                    this.updateAuthUI(null);
                }
            });
            
            // Set up event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Error initializing auth UI:', error);
            showError('Failed to initialize authentication. Please refresh the page.');
        }
    },
    
    // Set up event listeners
    setupEventListeners() {
        // Login button
        if (this.elements.loginButton) {
            this.elements.loginButton.addEventListener('click', () => this.showModal('login'));
        }
        
        // Register button
        if (this.elements.registerButton) {
            this.elements.registerButton.addEventListener('click', () => this.showModal('register'));
        }
        
        // Show register link
        if (this.elements.showRegister) {
            this.elements.showRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal('login');
                this.showModal('register');
            });
        }
        
        // Show login link
        if (this.elements.showLogin) {
            this.elements.showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal('register');
                this.showModal('login');
            });
        }
        
        // Close modals
        if (this.elements.closeLoginModal) {
            this.elements.closeLoginModal.addEventListener('click', () => this.hideModal('login'));
        }
        
        if (this.elements.closeRegisterModal) {
            this.elements.closeRegisterModal.addEventListener('click', () => this.hideModal('register'));
        }
        
        // Form submissions
        if (this.elements.loginForm) {
            this.elements.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (this.elements.registerForm) {
            this.elements.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
        
        // Google login
        if (this.elements.googleLogin) {
            this.elements.googleLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleGoogleLogin();
            });
        }
        
        // Logout
        if (this.elements.logoutButton) {
            this.elements.logoutButton.addEventListener('click', (e) => this.handleLogout(e));
        }
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (this.elements.loginModal && !this.elements.loginModal.contains(e.target) && 
                this.elements.loginButton && !this.elements.loginButton.contains(e.target)) {
                this.hideModal('login');
            }
            
            if (this.elements.registerModal && !this.elements.registerModal.contains(e.target) &&
                this.elements.registerButton && !this.elements.registerButton.contains(e.target)) {
                this.hideModal('register');
            }
        });
    },
    
    // Show modal
    showModal(modalType) {
        const modal = this.elements[`${modalType}Modal`];
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    },
    
    // Hide modal
    hideModal(modalType) {
        const modal = this.elements[`${modalType}Modal`];
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    },
    
    // Update UI based on auth state
    updateAuthUI(user = null) {
        const authButtons = this.elements.authButtons;
        const userMenu = this.elements.userMenu;
        const guestMenu = document.getElementById('guest-menu');
        const userMenuContent = document.getElementById('user-menu-content');
        
        if (user) {
            // User is signed in
            if (authButtons) authButtons.classList.add('hidden');
            if (userMenu) userMenu.classList.remove('hidden');
            if (guestMenu) guestMenu.classList.add('hidden');
            if (userMenuContent) userMenuContent.classList.remove('hidden');
            
            // Update user info in the dropdown
            const userEmail = document.getElementById('user-email');
            if (userEmail) {
                userEmail.textContent = user.email || 'User';
            }
            
            const userName = document.getElementById('user-name');
            if (userName) {
                const displayName = user.displayName || user.email?.split('@')[0] || 'User';
                userName.textContent = displayName;
            }
        } else {
            // User is signed out
            if (authButtons) authButtons.classList.remove('hidden');
            if (userMenu) userMenu.classList.add('hidden');
            if (guestMenu) guestMenu.classList.remove('hidden');
            if (userMenuContent) userMenuContent.classList.add('hidden');
        }
    },
    
    // Handle login form submission
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        // Simple validation
        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }
        
        // Show loading state
        const loginBtn = document.getElementById('login-btn');
        const originalText = loginBtn.innerHTML;
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="loading">Signing in...</span>';
        
        try {
            // Sign in with email and password
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            showSuccess(`Welcome back, ${user.email || 'User'}!`);
            this.hideModal('login');
        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = this.getAuthErrorMessage(error.code) || 'Failed to sign in. Please try again.';
            showError(errorMessage);
        } finally {
            // Reset button state
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalText;
        }
    },
    
    // Handle registration form submission
    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }
        
        // Show loading state
        const registerBtn = document.getElementById('register-btn');
        const originalText = registerBtn.innerHTML;
        registerBtn.disabled = true;
        registerBtn.innerHTML = '<span class="loading">Creating account...</span>';
        
        try {
            // Create user with email and password
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Update user profile with display name
            await updateProfile(user, {
                displayName: name
            });
            
            showSuccess('Account created successfully! Welcome to ALH Perfumes!');
            this.hideModal('register');
            
        } catch (error) {
            console.error('Registration error:', error);
            const errorMessage = this.getAuthErrorMessage(error.code) || 'Failed to create account. Please try again.';
            showError(errorMessage);
        } finally {
            // Reset button state
            registerBtn.disabled = false;
            registerBtn.innerHTML = originalText;
        }
    },
    
    // Handle Google Sign-In
    async handleGoogleLogin() {
        const provider = new GoogleAuthProvider();
        
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            showSuccess(`Welcome back, ${user.displayName || user.email}!`);
            this.hideModal('login');
        } catch (error) {
            console.error('Google sign-in error:', error);
            // Don't show error if user closed the popup
            if (error.code !== 'auth/cancelled-popup-request' && 
                error.code !== 'auth/popup-closed-by-user') {
                const errorMessage = this.getAuthErrorMessage(error.code) || 'Failed to sign in with Google. Please try again.';
                showError(errorMessage);
            }
        }
    },
    
    // Handle user logout
    async handleLogout(e) {
        if (e) e.preventDefault();
        
        try {
            await signOut(auth);
            showInfo('You have been signed out. See you soon!');
        } catch (error) {
            console.error('Sign out error:', error);
            showError('Failed to sign out. Please try again.');
        }
    },
    
    // Get user-friendly error messages
    getAuthErrorMessage(errorCode) {
        const messages = {
            'auth/email-already-in-use': 'This email is already in use.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/operation-not-allowed': 'This operation is not allowed.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/user-not-found': 'No user found with this email.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/popup-closed-by-user': 'Sign in was cancelled.',
            'auth/cancelled-popup-request': 'Sign in was cancelled.',
            'auth/popup-blocked': 'Popup was blocked. Please allow popups for this site.'
        };
        
        return messages[errorCode] || 'An error occurred. Please try again.';
    },
    
    // Initialize account dropdown
    initAccountDropdown() {
        const accountButton = document.getElementById('account-button');
        const accountMenu = document.getElementById('account-menu');
        
        if (!accountButton || !accountMenu) {
            console.error('Account button or menu element not found');
            return;
        }

        let isOpen = false;
        let clickOutsideHandler = null;

        const showDropdown = () => {
            if (isOpen) return;
            
            // Remove any existing click handlers to prevent duplicates
            if (clickOutsideHandler) {
                document.removeEventListener('click', clickOutsideHandler);
            }
            
            // Show menu with animation
            accountMenu.classList.remove('hidden');
            void accountMenu.offsetWidth; // Force reflow
            accountMenu.classList.remove('opacity-0', 'scale-95');
            accountMenu.classList.add('opacity-100', 'scale-100');
            accountButton.setAttribute('aria-expanded', 'true');
            isOpen = true;
            
            // Add click outside handler
            clickOutsideHandler = (e) => {
                if (!accountMenu.contains(e.target) && !accountButton.contains(e.target)) {
                    hideDropdown();
                }
            };
            
            // Use capture phase to ensure we catch the event before potential stop propagation
            document.addEventListener('click', clickOutsideHandler, { capture: true });
            
            // Focus the first interactive element for better keyboard navigation
            const firstInteractive = accountMenu.querySelector('a, button, [tabindex]');
            if (firstInteractive) {
                setTimeout(() => firstInteractive.focus(), 0);
            }
        };

        const hideDropdown = () => {
            if (!isOpen) return;
            
            // Start hide animation
            accountMenu.classList.remove('opacity-100', 'scale-100');
            accountMenu.classList.add('opacity-0', 'scale-95');
            accountButton.setAttribute('aria-expanded', 'false');
            isOpen = false;
            
            // Remove click outside handler
            if (clickOutsideHandler) {
                document.removeEventListener('click', clickOutsideHandler, { capture: true });
                clickOutsideHandler = null;
            }
            
            // Hide menu after animation completes
            setTimeout(() => {
                if (!isOpen) { // Check again in case it was toggled back open
                    accountMenu.classList.add('hidden');
                }
            }, 150);
            
            // Return focus to the account button
            accountButton.focus();
        };

        const toggleDropdown = (force = null) => {
            if (force !== null) {
                force ? showDropdown() : hideDropdown();
            } else {
                isOpen ? hideDropdown() : showDropdown();
            }
        };

        // Toggle on button click
        accountButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            toggleDropdown();
        });
        
        // Handle keyboard navigation
        accountButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                toggleDropdown();
            } else if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                hideDropdown();
            }
        });

        // Close on Escape key anywhere in the document
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                hideDropdown();
            }
        });

        // Handle clicks on menu items to close the menu
        accountMenu.addEventListener('click', (e) => {
            const target = e.target.closest('a, button');
            if (target && !target.matches('#logout-btn')) {
                hideDropdown();
            }
        });
    }
};

// Initialize auth UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    authUI.init();
    authUI.initAccountDropdown();
});