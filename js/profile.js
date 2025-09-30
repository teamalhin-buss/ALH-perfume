import { auth, db, storage } from './firebase-init.js';
import { 
    onAuthStateChanged, 
    signOut, 
    updateProfile, 
    updateEmail, 
    updatePassword, 
    EmailAuthProvider, 
    reauthenticateWithCredential,
    updatePhoneNumber,
    getDownloadURL,
    ref,
    uploadBytes
} from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js';
import { 
    doc, 
    getDoc, 
    updateDoc, 
    serverTimestamp, 
    collection, 
    query, 
    where, 
    getDocs,
    setDoc
} from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js';

// DOM Elements
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profileAvatar = document.getElementById('profile-avatar');
const sidebarName = document.getElementById('sidebar-name');
const sidebarEmail = document.getElementById('sidebar-email');
const sidebarAvatar = document.getElementById('sidebar-avatar');
const welcomeName = document.getElementById('welcome-name');
const fullNameInput = document.getElementById('full-name');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const birthdateInput = document.getElementById('birthdate');
const currentPasswordInput = document.getElementById('current-password');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const saveChangesBtn = document.getElementById('save-changes');
const updatePasswordBtn = document.getElementById('update-password');
const signOutBtn = document.getElementById('sign-out');
const sidebarSignOutBtn = document.getElementById('sidebar-signout');
const avatarUploadInput = document.getElementById('avatar-upload');
const editProfileBtn = document.getElementById('edit-profile-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const profileViewState = document.getElementById('profile-view-state');
const profileEditState = document.getElementById('profile-edit-state');

const viewFullName = document.getElementById('view-full-name');
const viewEmail = document.getElementById('view-email');
const viewPhone = document.getElementById('view-phone');
const viewBirthdate = document.getElementById('view-birthdate');

// Notification function
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `px-6 py-3 rounded-lg shadow-lg text-white ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} animate__animated animate__fadeInRight`;
    notification.textContent = message;
    
    const container = document.getElementById('notification-container');
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('animate__fadeOutRight');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Format date to YYYY-MM-DD
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

// Load user profile data
async function loadUserProfile(user) {
    try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        // If user document doesn't exist, create it
        if (!userDoc.exists()) {
            await setDoc(userRef, {
                displayName: user.displayName || '',
                email: user.email || '',
                photoURL: user.photoURL || '',
                phoneNumber: '',
                birthdate: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }
        
        const userData = userDoc.data() || {};
        
        // Update UI with user data
        const displayName = user.displayName || userData.displayName || 'User';
        const email = user.email || userData.email || '';
        
        // Update profile section
        if (profileName) profileName.textContent = displayName;
        if (profileEmail) profileEmail.textContent = email;
        if (sidebarName) sidebarName.textContent = displayName;
        if (sidebarEmail) sidebarEmail.textContent = email;
        if (welcomeName) welcomeName.textContent = displayName;
        
        // Update avatars
        const avatarUrl = user.photoURL || userData.photoURL || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
            
        if (profileAvatar) {
            profileAvatar.src = avatarUrl;
            profileAvatar.onerror = function() {
                this.src = 'https://ui-avatars.com/api/?name=User&background=random';
            };
        }
        
        if (sidebarAvatar) {
            sidebarAvatar.src = avatarUrl;
            sidebarAvatar.onerror = function() {
                this.src = 'https://ui-avatars.com/api/?name=User&background=random';
            };
        }
        
        // Fill form fields
        if (fullNameInput) fullNameInput.value = displayName;
        if (emailInput) emailInput.value = email;
        if (phoneInput) phoneInput.value = userData.phoneNumber || '';
        if (birthdateInput) birthdateInput.value = formatDate(userData.birthdate?.toDate());

        // Update view state
        if(viewFullName) viewFullName.textContent = displayName;
        if(viewEmail) viewEmail.textContent = email;
        if(viewPhone) viewPhone.textContent = userData.phoneNumber || 'Not provided';
        if(viewBirthdate) viewBirthdate.textContent = userData.birthdate ? formatDate(userData.birthdate.toDate()) : 'Not provided';
        
    } catch (error) {
        console.error('Error loading user profile:', error);
        showNotification('Failed to load profile data', 'error');
    }
}

// Save profile changes
async function saveProfileChanges() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const updates = {};
        let hasChanges = false;
        
        // Update display name if changed
        const newName = fullNameInput ? fullNameInput.value.trim() : '';
        if (newName && newName !== user.displayName) {
            await updateProfile(user, { displayName: newName });
            updates.displayName = newName;
            hasChanges = true;
        }
        
        // Update email if changed
        const newEmail = emailInput ? emailInput.value.trim() : '';
        if (newEmail && newEmail !== user.email) {
            await updateEmail(user, newEmail);
            updates.email = newEmail;
            hasChanges = true;
        }
        
        // Update user data in Firestore
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data() || {};
        
        // Check for other field changes
        if (phoneInput && phoneInput.value !== userData.phoneNumber) {
            updates.phoneNumber = phoneInput.value.trim() || null;
            hasChanges = true;
        }
        
        if (birthdateInput && birthdateInput.value !== formatDate(userData.birthdate?.toDate())) {
            updates.birthdate = birthdateInput.value ? new Date(birthdateInput.value) : null;
            hasChanges = true;
        }
        
        // Only update if there are changes
        if (hasChanges) {
            updates.updatedAt = serverTimestamp();
            await updateDoc(userRef, updates);
            
            // Reload profile to show updated data
            await loadUserProfile(user);
            showNotification('Profile updated successfully!');
            toggleProfileEdit(false); // Switch back to view state
        } else {
            showNotification('No changes to save.', 'info');
            toggleProfileEdit(false); // Switch back to view state
        }
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Failed to update profile: ' + error.message, 'error');
    }
}

// Update password
async function updateUserPassword() {
    const user = auth.currentUser;
    if (!user) return;
    
    const currentPassword = currentPasswordInput ? currentPasswordInput.value : '';
    const newPassword = newPasswordInput ? newPasswordInput.value : '';
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
    
    // Validate inputs
    if (!currentPassword) {
        showNotification('Please enter your current password', 'error');
        return;
    }
    
    if (!newPassword || newPassword.length < 6) {
        showNotification('New password must be at least 6 characters', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }
    
    try {
        // Reauthenticate user
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        // Update password
        await updatePassword(user, newPassword);
        
        // Clear password fields
        if (currentPasswordInput) currentPasswordInput.value = '';
        if (newPasswordInput) newPasswordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
        
        showNotification('Password updated successfully!');
        
    } catch (error) {
        console.error('Error updating password:', error);
        
        let errorMessage = 'Failed to update password';
        switch (error.code) {
            case 'auth/wrong-password':
                errorMessage = 'Current password is incorrect';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak';
                break;
            case 'auth/requires-recent-login':
                errorMessage = 'Please sign in again to update your password';
                break;
            default:
                errorMessage = error.message || errorMessage;
        }
        
        showNotification(errorMessage, 'error');
    }
}

// Sign out
// Handle avatar upload
async function handleAvatarUpload(e) {
    const user = auth.currentUser;
    if (!user) return;

    const file = e.target.files[0];
    if (!file) return;

    try {
        // Show loading state if you have one
        showNotification('Uploading avatar...', 'info');

        const storageRef = ref(storage, `avatars/${user.uid}/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const photoURL = await getDownloadURL(snapshot.ref);

        // Update user profile in Auth and Firestore
        await updateProfile(user, { photoURL });
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { photoURL });

        // Reload profile to show new avatar
        await loadUserProfile(user);
        showNotification('Avatar updated successfully!');

    } catch (error) {
        console.error('Error uploading avatar:', error);
        showNotification('Failed to upload avatar: ' + error.message, 'error');
    }
}

// Sign out
async function handleSignOut() {
    try {
        await signOut(auth);
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Error signing out:', error);
        showNotification('Failed to sign out', 'error');
    }
}

// Initialize profile page
function initProfilePage() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            await loadUserProfile(user);
            
            // Load additional user data (orders, wishlist, etc.)
            // loadUserOrders(user);
            // loadUserWishlist(user);
            // loadUserAddresses(user);
            
        } else {
            // User is signed out, redirect to login
            window.location.href = '/login.html';
        }
    });
}

// Initialize phone input formatting
// Toggle between profile view and edit states
function toggleProfileEdit(isEditing) {
    if (isEditing) {
        profileViewState.classList.add('hidden');
        profileEditState.classList.remove('hidden');
    } else {
        profileViewState.classList.remove('hidden');
        profileEditState.classList.add('hidden');
    }
}

function initPhoneInput() {
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
            e.target.value = !x[2] ? x[1] : `(${x[1]}) ${x[2]}${x[3] ? `-${x[3]}` : ''}`;
        });
    }
}

// Initialize event listeners
function initEventListeners() {
    // Save changes button
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', saveProfileChanges);
    }
    
    // Update password button
    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', updateUserPassword);
    }
    
    // Sign out buttons
    if (signOutBtn) {
        signOutBtn.addEventListener('click', handleSignOut);
    }
    
    if (sidebarSignOutBtn) {
        sidebarSignOutBtn.addEventListener('click', handleSignOut);
    }

    // Edit and Cancel buttons
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => toggleProfileEdit(true));
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => toggleProfileEdit(false));
    }

    // Avatar upload
    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', handleAvatarUpload);
    }
    
    // Allow form submission with Enter key
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const submitButton = form.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.click();
                }
            }
        });
    });
}

// Initialize the profile page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initProfilePage();
    initEventListeners();
    initPhoneInput();
    
    // Initialize the page based on URL hash
    initFromUrl();
});

// Make functions available globally for HTML onclick handlers
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.remove('active');
        section.classList.add('hidden');
    });
    
    // Show the selected section
    const selectedSection = document.getElementById(`${sectionId}-section`);
    if (selectedSection) {
        selectedSection.classList.remove('hidden');
        selectedSection.classList.add('active');
        
        // Lazy load content for specific sections
        if (sectionId === 'orders') {
            loadOrders();
        } else if (sectionId === 'wishlist') {
            loadWishlist();
        } else if (sectionId === 'wallet') {
            loadWallet();
        } else if (sectionId === 'coupons') {
            loadCoupons();
        } else if (sectionId === 'reviews') {
            loadReviews();
        } else if (sectionId === 'recently-viewed') {
            loadRecentlyViewed();
        }
    }
    
    // Update active state in sidebar
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeSidebarItem = document.querySelector(`[onclick*="${sectionId}"]`);
    if (activeSidebarItem) {
        activeSidebarItem.classList.add('active');
    }
};
