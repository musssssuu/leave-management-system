// js/signup.js - COMPLETE VERSION with Quota Integration
(function(){
  // Create toast element
  let signupToast = document.getElementById('signupToast');
  if (!signupToast) {
    signupToast = document.createElement('div');
    signupToast.className = 'toast';
    signupToast.id = 'signupToast';
    document.body.appendChild(signupToast);
  }

  const form = document.getElementById('signupForm');
  const submitBtn = form.querySelector('button[type="submit"]');
  const rollPreview = document.getElementById('rollPreview');
  const rollNumberInput = document.getElementById('rollNumberInput');
  const yearSelect = document.getElementById('year');
  const divisionSelect = document.getElementById('division');
  
  // Update roll number preview
  function updateRollPreview() {
    const year = yearSelect.value;
    const division = divisionSelect.value;
    const rollInput = rollNumberInput.value.trim();
    
    if (year && division && rollInput) {
      // Pad roll number with leading zero if single digit
      let paddedRoll = rollInput;
      if (/^\d+$/.test(rollInput)) { // If it's only numbers
        paddedRoll = rollInput.padStart(2, '0'); // Pad to 2 digits
      }
      
      // Format: CS-1A05, CS-2B15, etc.
      const fullRoll = `CS-${year}${division.toUpperCase()}${paddedRoll}`;
      rollPreview.textContent = fullRoll;
    } else {
      rollPreview.textContent = 'CS-?';
    }
  }
  
  // Listen for changes
  yearSelect.addEventListener('change', updateRollPreview);
  divisionSelect.addEventListener('change', updateRollPreview);
  rollNumberInput.addEventListener('input', updateRollPreview);
  
  form.addEventListener('submit', function(e){
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const year = yearSelect.value;
    const division = divisionSelect.value.toUpperCase(); // Convert to uppercase
    const rollInput = rollNumberInput.value.trim();
    
    // Validation
    if (!fullName || !username || !password || !year || !division || !rollInput) {
      showToast('Please fill all fields!', 'error');
      return;
    }
    
    if (password.length < 6) {
      showToast('Password must be at least 6 characters!', 'error');
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      showToast('Username can only contain letters, numbers and underscore!', 'error');
      return;
    }
    
    // Validate roll number input
    if (!/^[0-9]+$/.test(rollInput)) {
      showToast('Roll number must contain only numbers!', 'error');
      return;
    }
    
    if (rollInput.length > 3) {
      showToast('Roll number should be 1-3 digits!', 'error');
      return;
    }
    
    // Disable button and show loading
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.disabled = true;
    
    // Generate full roll number with padding
    const paddedRoll = rollInput.padStart(2, '0');
    const fullRollNumber = `CS-${year}${division}${paddedRoll}`;
    
    // Check for ALL types of duplicates
    Promise.all([
      window.UsersRef.orderByChild("username").equalTo(username).once("value"),
      window.UsersRef.orderByChild("rollNumber").equalTo(fullRollNumber).once("value")
    ])
    .then(([usernameSnapshot, rollSnapshot]) => {
      const errors = [];
      
      if (usernameSnapshot.exists()) {
        errors.push('Username already exists!');
      }
      
      if (rollSnapshot.exists()) {
        errors.push('Roll number already registered!');
      }
      
      // Check for same name in same year+division
      return window.UsersRef.once("value")
        .then(allStudentsSnapshot => {
          let duplicateFound = false;
          
          allStudentsSnapshot.forEach(child => {
            const existingStudent = child.val();
            if (existingStudent.fullName.toLowerCase() === fullName.toLowerCase() &&
                existingStudent.year === year &&
                existingStudent.division.toUpperCase() === division) {
              duplicateFound = true;
              errors.push('Student with same name already exists in this division!');
            }
          });
          
          if (errors.length > 0) {
            showToast(errors.join(' '), 'error');
            resetButton(submitBtn, originalText);
            throw new Error('Duplicate found');
          }
          
          // Create student record
          const studentData = {
            fullName: fullName,
            username: username,
            password: password,
            year: year,
            division: division, // Store as uppercase
            rollNumber: fullRollNumber,
            rollNumberSimple: paddedRoll,
            createdAt: Date.now()
          };
          
          // Save to Firebase and get the student ID
          const newStudentRef = window.UsersRef.push(studentData);
          const studentId = newStudentRef.key;
          
          // Apply default leave quotas to the new student
          // Try to get current default quotas from QuotaSystem
          let defaultQuotas = {
            sick: 12,
            casual: 8,
            emergency: 4
          };
          
          // Try to get from localStorage first
          const savedQuotas = localStorage.getItem('defaultLeaveQuotas');
          if (savedQuotas) {
            try {
              const parsed = JSON.parse(savedQuotas);
              defaultQuotas = {
                sick: parsed.sick || 12,
                casual: parsed.casual || 8,
                emergency: parsed.emergency || 4
              };
            } catch (e) {
              console.log('Using default quotas');
            }
          }
          
          // Apply quotas to the new student
          const quotaData = {
            quota: defaultQuotas,
            usage: {
              sick: 0,
              casual: 0,
              emergency: 0,
              lastReset: new Date().getFullYear()
            }
          };
          
          return window.UsersRef.child(studentId).update(quotaData)
            .then(() => {
              return { studentId: studentId, studentData: studentData };
            });
        });
    })
    .then((result) => {
      showToast('Account created successfully!', 'success');
      
      // Store for auto-fill
      sessionStorage.setItem('lastUsername', username);
      sessionStorage.setItem('studentRoll', fullRollNumber);
      sessionStorage.setItem('studentName', fullName);
      
      // Show success message with details
      setTimeout(() => {
        showToast(`Welcome ${fullName}! Your roll number is ${fullRollNumber}`, 'success');
      }, 100);
      
      setTimeout(() => {
        window.location.href = "indexs.html";
      }, 2000);
    })
    .catch(error => {
      if (error.message !== 'Duplicate found') {
        console.error("Signup error:", error);
        showToast('Error creating account. Please try again.', 'error');
        resetButton(submitBtn, originalText);
      }
    });
  });

  // Reset button
  function resetButton(button, originalText) {
    button.textContent = originalText;
    button.disabled = false;
  }

  // Toast notification
  function showToast(message, type = 'info') {
    signupToast.textContent = message;
    signupToast.className = 'toast';
    
    if (type === 'error') {
      signupToast.style.background = '#ef4444';
      signupToast.style.color = 'white';
    } else if (type === 'success') {
      signupToast.style.background = '#10b981';
      signupToast.style.color = 'white';
    } else {
      signupToast.style.background = '#111827';
      signupToast.style.color = 'white';
    }
    
    signupToast.style.display = 'block';
    signupToast.style.position = 'fixed';
    signupToast.style.bottom = '20px';
    signupToast.style.right = '20px';
    signupToast.style.zIndex = '1000';
    
    setTimeout(() => {
      signupToast.style.display = 'none';
    }, 3000);
  }

  // Initialize roll preview
  updateRollPreview();
})();