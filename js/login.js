// js/login.js - COMPLETE FIXED VERSION
(function(){
  // Create toast element if it doesn't exist
  let loginToast = document.getElementById('loginToast');
  if (!loginToast) {
    loginToast = document.createElement('div');
    loginToast.className = 'toast';
    loginToast.id = 'loginToast';
    document.body.appendChild(loginToast);
  }

  const form = document.getElementById('loginForm');
  const submitBtn = form.querySelector('button[type="submit"]');
  
  form.addEventListener('submit', function(e){
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('role').value;
    
    // Validate inputs
    if (!username || !password || !role) {
      showToast('Please fill all fields!', 'error');
      return;
    }
    
    // Disable button and show loading
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    
    if (role === "student") {
      // Student login
      authenticateStudent(username, password, submitBtn, originalText);
    } else if (role === "admin") {
      // Admin login
      authenticateAdmin(username, password, submitBtn, originalText);
    }
  });

  // Student authentication
  function authenticateStudent(username, password, submitBtn, originalText) {
    window.UsersRef.orderByChild("username").equalTo(username).once("value")
      .then(snapshot => {
        if (!snapshot.exists()) {
          showToast('Student not found. Please sign up first!', 'error');
          resetButton(submitBtn, originalText);
          return;
        }
        
        let studentFound = false;
        snapshot.forEach(child => {
          const student = child.val();
          if (student.password === password) {
            studentFound = true;
            // Store student data
            localStorage.setItem("studentName", student.fullName);
            localStorage.setItem("studentRoll", student.rollNumber);
            localStorage.setItem("studentYear", student.year);
            localStorage.setItem("studentDivision", student.division.toUpperCase()); // Store as uppercase
            localStorage.setItem("studentId", child.key);
            
            showToast(`Welcome ${student.fullName}!`, 'success');
            setTimeout(() => {
              window.location.href = "student.html";
            }, 1000);
          }
        });
        
        if (!studentFound) {
          showToast('Incorrect password!', 'error');
          resetButton(submitBtn, originalText);
        }
      })
      .catch(error => {
        console.error("Login error:", error);
        showToast('Login failed. Please try again.', 'error');
        resetButton(submitBtn, originalText);
      });
  }

  // Admin authentication
  function authenticateAdmin(username, password, submitBtn, originalText) {
    // Check against admins in database or fixed credentials
    window.AdminsRef.orderByChild("username").equalTo(username).once("value")
      .then(snapshot => {
        if (snapshot.exists()) {
          // Admin exists in database
          let adminFound = false;
          snapshot.forEach(child => {
            const admin = child.val();
            if (admin.password === password) {
              adminFound = true;
              localStorage.setItem("adminUsername", username);
              localStorage.setItem("adminDivision", admin.division || 'all'); // Store division if exists
              showToast('Admin login successful!', 'success');
              setTimeout(() => {
                window.location.href = "admin.html";
              }, 1000);
            }
          });
          
          if (!adminFound) {
            showToast('Invalid admin password!', 'error');
            resetButton(submitBtn, originalText);
          }
        } else {
          // Check default admin credentials (for demo)
          if (password === "admin123") {
            localStorage.setItem("adminUsername", username);
            localStorage.setItem("adminDivision", 'all');
            showToast('Admin login successful!', 'success');
            setTimeout(() => {
              window.location.href = "admin.html";
            }, 1000);
          } else {
            showToast('Invalid admin credentials!', 'error');
            resetButton(submitBtn, originalText);
          }
        }
      })
      .catch(error => {
        console.error("Admin login error:", error);
        showToast('Admin login failed.', 'error');
        resetButton(submitBtn, originalText);
      });
  }

  // Reset button state
  function resetButton(button, originalText) {
    button.textContent = originalText;
    button.disabled = false;
  }

  // Toast notification with types
  function showToast(message, type = 'info') {
    loginToast.textContent = message;
    loginToast.className = 'toast';
    
    // Add type class for different colors
    if (type === 'error') {
      loginToast.style.background = '#ef4444';
      loginToast.style.color = 'white';
    } else if (type === 'success') {
      loginToast.style.background = '#10b981';
      loginToast.style.color = 'white';
    } else {
      loginToast.style.background = '#111827';
      loginToast.style.color = 'white';
    }
    
    loginToast.style.display = 'block';
    
    // Position it fixed to prevent layout shift
    loginToast.style.position = 'fixed';
    loginToast.style.bottom = '20px';
    loginToast.style.right = '20px';
    loginToast.style.zIndex = '1000';
    
    setTimeout(() => {
      loginToast.style.display = 'none';
    }, 3000);
  }

  // Auto-fill username if coming from signup
  document.addEventListener('DOMContentLoaded', function() {
    const lastUsername = sessionStorage.getItem('lastUsername');
    if (lastUsername) {
      document.getElementById('username').value = lastUsername;
      sessionStorage.removeItem('lastUsername');
      
      // Focus on password field
      setTimeout(() => {
        document.getElementById('password').focus();
      }, 100);
    }
  });
})();