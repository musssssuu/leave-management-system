// js/quota.js - COMPLETE VERSION with dynamic default quotas
(function(){
  // Default quotas - will be updated from admin settings
  let DEFAULT_QUOTAS = {
    sick: 12,    // Sick leaves per year
    casual: 8,   // Casual leaves per semester
    emergency: 4 // Emergency leaves per year
  };

  // Store updated defaults
  let currentDefaultQuotas = { ...DEFAULT_QUOTAS };

  // DOM Elements (Admin Panel)
  let sickQuotaInput, casualQuotaInput, emergencyQuotaInput;
  let applyQuotasBtn, studentForQuota, loadStudentQuotaBtn;
  let individualQuotaForm, totalStudentsQuota, quotasSetCount, lowBalanceCount;

  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Load saved default quotas from localStorage
    loadSavedDefaultQuotas();

    // Only initialize on admin page
    if (!window.location.pathname.includes('admin.html')) {
      return;
    }

    // Get DOM elements
    sickQuotaInput = document.getElementById('sickQuota');
    casualQuotaInput = document.getElementById('casualQuota');
    emergencyQuotaInput = document.getElementById('emergencyQuota');
    applyQuotasBtn = document.getElementById('applyQuotasBtn');
    studentForQuota = document.getElementById('studentForQuota');
    loadStudentQuotaBtn = document.getElementById('loadStudentQuota');
    individualQuotaForm = document.getElementById('individualQuotaForm');
    totalStudentsQuota = document.getElementById('totalStudentsQuota');
    quotasSetCount = document.getElementById('quotasSetCount');
    lowBalanceCount = document.getElementById('lowBalanceCount');

    // Initialize if elements exist
    if (sickQuotaInput && applyQuotasBtn) {
      initializeQuotaSystem();
    }
  });

  // Load saved default quotas from localStorage
  function loadSavedDefaultQuotas() {
    const savedQuotas = localStorage.getItem('defaultLeaveQuotas');
    if (savedQuotas) {
      try {
        const parsed = JSON.parse(savedQuotas);
        currentDefaultQuotas = {
          sick: parsed.sick || DEFAULT_QUOTAS.sick,
          casual: parsed.casual || DEFAULT_QUOTAS.casual,
          emergency: parsed.emergency || DEFAULT_QUOTAS.emergency
        };
      } catch (e) {
        console.error('Error parsing saved quotas:', e);
      }
    }
  }

  // Save default quotas to localStorage
  function saveDefaultQuotas(quotas) {
    currentDefaultQuotas = { ...quotas };
    localStorage.setItem('defaultLeaveQuotas', JSON.stringify(quotas));
  }

  function initializeQuotaSystem() {
    // Load saved default values into input fields
    sickQuotaInput.value = currentDefaultQuotas.sick;
    casualQuotaInput.value = currentDefaultQuotas.casual;
    emergencyQuotaInput.value = currentDefaultQuotas.emergency;

    // Event Listeners
    applyQuotasBtn.addEventListener('click', applyDefaultQuotas);
    if (loadStudentQuotaBtn) {
      loadStudentQuotaBtn.addEventListener('click', loadIndividualQuota);
    }

    // Save default quotas when inputs change
    sickQuotaInput.addEventListener('change', saveQuotaInputs);
    casualQuotaInput.addEventListener('change', saveQuotaInputs);
    emergencyQuotaInput.addEventListener('change', saveQuotaInputs);

    // Load students when quota panel button is clicked
    const quotaManagementBtn = document.getElementById('quotaManagementBtn');
    if (quotaManagementBtn) {
      quotaManagementBtn.addEventListener('click', function() {
        // Small delay to ensure panel is visible
        setTimeout(() => {
          loadStudentsForQuota();
          updateQuotaStats();
        }, 100);
      });
    }

    // Also load if panel is already open
    const quotaPanel = document.getElementById('quotaManagementPanel');
    if (quotaPanel && quotaPanel.style.display !== 'none') {
      setTimeout(() => {
        loadStudentsForQuota();
        updateQuotaStats();
      }, 500);
    }

    // Auto-reset quotas on admin panel load
    checkAndResetAnnualQuotas();
  }

  // Save quota inputs to localStorage
  function saveQuotaInputs() {
    const newDefaults = {
      sick: parseInt(sickQuotaInput.value) || DEFAULT_QUOTAS.sick,
      casual: parseInt(casualQuotaInput.value) || DEFAULT_QUOTAS.casual,
      emergency: parseInt(emergencyQuotaInput.value) || DEFAULT_QUOTAS.emergency
    };
    saveDefaultQuotas(newDefaults);
  }

  // Load students for dropdown
  function loadStudentsForQuota() {
    if (!studentForQuota) return;
    
    window.UsersRef.once('value').then(snapshot => {
      studentForQuota.innerHTML = '<option value="">Select Student</option>';
      
      if (snapshot.exists()) {
        let studentCount = 0;
        snapshot.forEach(child => {
          const student = child.val();
          const option = document.createElement('option');
          option.value = child.key;
          option.textContent = `${student.fullName} (${student.rollNumber})`;
          studentForQuota.appendChild(option);
          studentCount++;
        });
        if (totalStudentsQuota) {
          totalStudentsQuota.textContent = studentCount;
        }
      }
    }).catch(error => {
      console.error('Error loading students for quota:', error);
    });
  }

  // Apply default quotas to all students
  function applyDefaultQuotas() {
    const quotas = {
      sick: parseInt(sickQuotaInput.value) || currentDefaultQuotas.sick,
      casual: parseInt(casualQuotaInput.value) || currentDefaultQuotas.casual,
      emergency: parseInt(emergencyQuotaInput.value) || currentDefaultQuotas.emergency,
      updatedAt: Date.now()
    };

    // Save as new default
    saveDefaultQuotas(quotas);

    // Show loading
    const originalText = applyQuotasBtn.textContent;
    applyQuotasBtn.textContent = "Applying...";
    applyQuotasBtn.disabled = true;

    // Get all students
    window.UsersRef.once('value').then(usersSnapshot => {
      const updates = {};
      let studentCount = 0;
      
      usersSnapshot.forEach(userChild => {
        const studentId = userChild.key;
        studentCount++;
        
        // Set quota for this student
        updates[`${studentId}/quota`] = quotas;
        
        // Initialize usage if not exists
        const studentData = userChild.val();
        if (!studentData.usage) {
          updates[`${studentId}/usage`] = {
            sick: 0,
            casual: 0,
            emergency: 0,
            lastReset: new Date().getFullYear()
          };
        }
      });

      // Apply all updates
      return window.UsersRef.update(updates);
    })
    .then(() => {
      showToast('Quotas applied to all students successfully!', 'success');
      updateQuotaStats();
    })
    .catch(error => {
      console.error('Error applying quotas:', error);
      showToast('Error applying quotas', 'error');
    })
    .finally(() => {
      applyQuotasBtn.textContent = originalText;
      applyQuotasBtn.disabled = false;
    });
  }

  // Load individual student quota
  function loadIndividualQuota() {
    const studentId = studentForQuota.value;
    if (!studentId) {
      showToast('Please select a student', 'error');
      return;
    }

    // Show loading
    loadStudentQuotaBtn.textContent = "Loading...";
    loadStudentQuotaBtn.disabled = true;

    window.UsersRef.child(studentId).once('value').then(snapshot => {
      const student = snapshot.val();
      
      const formHTML = `
        <div class="individual-quota-form">
          <h5>${student.fullName} - ${student.rollNumber}</h5>
          <div class="quota-type">
            <label><i class="fas fa-thermometer-half"></i> Sick Leaves</label>
            <input type="number" id="indSickQuota" value="${student.quota?.sick || currentDefaultQuotas.sick}" min="0">
          </div>
          <div class="quota-type">
            <label><i class="fas fa-umbrella-beach"></i> Casual Leaves</label>
            <input type="number" id="indCasualQuota" value="${student.quota?.casual || currentDefaultQuotas.casual}" min="0">
          </div>
          <div class="quota-type">
            <label><i class="fas fa-exclamation-triangle"></i> Emergency Leaves</label>
            <input type="number" id="indEmergencyQuota" value="${student.quota?.emergency || currentDefaultQuotas.emergency}" min="0">
          </div>
          <button id="updateIndividualQuota" class="update-individual-btn" data-student-id="${studentId}">
            <i class="fas fa-save"></i> Update Quota
          </button>
        </div>
      `;

      individualQuotaForm.innerHTML = formHTML;
      individualQuotaForm.style.display = 'block';

      // Add event listener to update button
      document.getElementById('updateIndividualQuota').addEventListener('click', updateIndividualQuota);
    })
    .catch(error => {
      console.error('Error loading student quota:', error);
      showToast('Error loading student quota', 'error');
    })
    .finally(() => {
      loadStudentQuotaBtn.textContent = "Load";
      loadStudentQuotaBtn.disabled = false;
    });
  }

  // Update individual student quota
  function updateIndividualQuota(e) {
    const studentId = e.target.dataset.studentId;
    
    const quotas = {
      quota: {
        sick: parseInt(document.getElementById('indSickQuota').value) || 0,
        casual: parseInt(document.getElementById('indCasualQuota').value) || 0,
        emergency: parseInt(document.getElementById('indEmergencyQuota').value) || 0,
        updatedAt: Date.now()
      }
    };

    // Show loading
    const updateBtn = e.target;
    const originalText = updateBtn.textContent;
    updateBtn.textContent = "Updating...";
    updateBtn.disabled = true;

    window.UsersRef.child(studentId).update(quotas)
      .then(() => {
        showToast('Quota updated successfully!', 'success');
        updateQuotaStats();
      })
      .catch(error => {
        console.error('Error updating quota:', error);
        showToast('Error updating quota', 'error');
      })
      .finally(() => {
        updateBtn.textContent = originalText;
        updateBtn.disabled = false;
      });
  }

  // Update quota statistics
  function updateQuotaStats() {
    if (!quotasSetCount || !lowBalanceCount) return;
    
    window.UsersRef.once('value').then(snapshot => {
      let quotasSet = 0;
      let lowBalance = 0;
      let totalStudents = 0;

      snapshot.forEach(child => {
        totalStudents++;
        const student = child.val();
        
        if (student.quota) {
          quotasSet++;
          
          // Check if any quota is low (less than 25% remaining)
          if (student.usage) {
            const sickRemaining = student.quota.sick - (student.usage.sick || 0);
            const casualRemaining = student.quota.casual - (student.usage.casual || 0);
            const emergencyRemaining = student.quota.emergency - (student.usage.emergency || 0);
            
            const sickPercent = student.quota.sick > 0 ? (sickRemaining / student.quota.sick) * 100 : 100;
            const casualPercent = student.quota.casual > 0 ? (casualRemaining / student.quota.casual) * 100 : 100;
            const emergencyPercent = student.quota.emergency > 0 ? (emergencyRemaining / student.quota.emergency) * 100 : 100;
            
            if (sickPercent < 25 || casualPercent < 25 || emergencyPercent < 25) {
              lowBalance++;
            }
          }
        }
      });

      quotasSetCount.textContent = quotasSet;
      lowBalanceCount.textContent = lowBalance;
      if (totalStudentsQuota) {
        totalStudentsQuota.textContent = totalStudents;
      }
    })
    .catch(error => {
      console.error('Error updating quota stats:', error);
    });
  }

  // Auto-reset quotas annually
  function checkAndResetAnnualQuotas() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0 = January
    
    window.UsersRef.once('value').then(snapshot => {
      const updates = {};
      
      snapshot.forEach(child => {
        const studentId = child.key;
        const student = child.val();
        
        if (student.usage) {
          // Reset annual quotas (sick and emergency) if new year
          if (student.usage.lastReset < currentYear) {
            updates[`${studentId}/usage/sick`] = 0;
            updates[`${studentId}/usage/emergency`] = 0;
            updates[`${studentId}/usage/lastReset`] = currentYear;
          }
          
          // Reset casual every 6 months (January and July)
          if (currentMonth === 0 || currentMonth === 6) {
            updates[`${studentId}/usage/casual`] = 0;
          }
        } else {
          // Initialize usage if doesn't exist
          updates[`${studentId}/usage`] = {
            sick: 0,
            casual: 0,
            emergency: 0,
            lastReset: currentYear
          };
        }
      });

      if (Object.keys(updates).length > 0) {
        window.UsersRef.update(updates)
          .then(() => {
            console.log('Annual quota reset completed');
          })
          .catch(error => {
            console.error('Error resetting quotas:', error);
          });
      }
    });
  }

  // Toast notification
  function showToast(message, type = 'info') {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#ef4444' : 
                            type === 'success' ? '#10b981' : '#111827';
    toast.style.color = 'white';
    toast.style.display = 'block';
    
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }

  // ========== CORE QUOTA FUNCTIONS ==========

  // Function to check if student has available leaves
  function checkLeaveBalance(studentRoll, leaveType = 'sick', days = 1) {
    return new Promise((resolve, reject) => {
      window.UsersRef.orderByChild('rollNumber').equalTo(studentRoll).once('value')
        .then(snapshot => {
          if (!snapshot.exists()) {
            resolve({ 
              available: false, 
              message: 'Student not found',
              quota: currentDefaultQuotas[leaveType],
              used: 0,
              remaining: currentDefaultQuotas[leaveType]
            });
            return;
          }

          snapshot.forEach(child => {
            const student = child.val();
            const quota = student.quota || currentDefaultQuotas;
            const usage = student.usage || { sick: 0, casual: 0, emergency: 0 };
            
            const available = quota[leaveType] - (usage[leaveType] || 0);
            const canTakeLeave = available >= days;
            
            resolve({
              available: canTakeLeave,
              remaining: available,
              quota: quota[leaveType],
              used: usage[leaveType] || 0,
              message: canTakeLeave ? 
                `You have ${available} ${leaveType} leaves remaining` :
                `Insufficient ${leaveType} leaves. Available: ${available}, Requested: ${days}`
            });
          });
        })
        .catch(reject);
    });
  }

  // Function to update leave usage when approved
  function updateLeaveUsage(studentRoll, leaveType, days = 1) {
    return new Promise((resolve, reject) => {
      window.UsersRef.orderByChild('rollNumber').equalTo(studentRoll).once('value')
        .then(snapshot => {
          if (!snapshot.exists()) {
            reject('Student not found');
            return;
          }

          snapshot.forEach(child => {
            const studentId = child.key;
            const student = child.val();
            const currentUsage = student.usage || { sick: 0, casual: 0, emergency: 0 };
            
            // If student doesn't have quota, set it from current defaults
            if (!student.quota) {
              const quotaUpdates = {};
              quotaUpdates[`${studentId}/quota`] = currentDefaultQuotas;
              window.UsersRef.update(quotaUpdates);
            }
            
            // Update usage
            const updates = {};
            updates[`${studentId}/usage/${leaveType}`] = (currentUsage[leaveType] || 0) + days;
            
            // Ensure lastReset exists
            if (!currentUsage.lastReset) {
              updates[`${studentId}/usage/lastReset`] = new Date().getFullYear();
            }
            
            window.UsersRef.update(updates)
              .then(() => resolve({ 
                success: true, 
                newUsage: (currentUsage[leaveType] || 0) + days,
                studentId: studentId 
              }))
              .catch(reject);
          });
        })
        .catch(reject);
    });
  }

  // Function to get available leaves for a student
  function getAvailableLeaves(studentRoll) {
    return new Promise((resolve, reject) => {
      window.UsersRef.orderByChild('rollNumber').equalTo(studentRoll).once('value')
        .then(snapshot => {
          if (!snapshot.exists()) {
            // Return current default quotas if student not found
            resolve({
              sick: {
                quota: currentDefaultQuotas.sick,
                used: 0,
                remaining: currentDefaultQuotas.sick
              },
              casual: {
                quota: currentDefaultQuotas.casual,
                used: 0,
                remaining: currentDefaultQuotas.casual
              },
              emergency: {
                quota: currentDefaultQuotas.emergency,
                used: 0,
                remaining: currentDefaultQuotas.emergency
              }
            });
            return;
          }

          snapshot.forEach(child => {
            const student = child.val();
            const quota = student.quota || currentDefaultQuotas;
            const usage = student.usage || { sick: 0, casual: 0, emergency: 0 };
            
            resolve({
              sick: {
                quota: quota.sick,
                used: usage.sick || 0,
                remaining: quota.sick - (usage.sick || 0)
              },
              casual: {
                quota: quota.casual,
                used: usage.casual || 0,
                remaining: quota.casual - (usage.casual || 0)
              },
              emergency: {
                quota: quota.emergency,
                used: usage.emergency || 0,
                remaining: quota.emergency - (usage.emergency || 0)
              }
            });
          });
        })
        .catch(reject);
    });
  }

  // Function to reduce leave usage when application is cancelled
  function reduceLeaveUsage(studentRoll, leaveType, days = 1) {
    return new Promise((resolve, reject) => {
      window.UsersRef.orderByChild('rollNumber').equalTo(studentRoll).once('value')
        .then(snapshot => {
          if (!snapshot.exists()) {
            reject('Student not found');
            return;
          }

          snapshot.forEach(child => {
            const studentId = child.key;
            const student = child.val();
            const currentUsage = student.usage || { sick: 0, casual: 0, emergency: 0 };
            
            // Reduce usage (but not below 0)
            const newUsage = Math.max(0, (currentUsage[leaveType] || 0) - days);
            
            const updates = {};
            updates[`${studentId}/usage/${leaveType}`] = newUsage;
            
            window.UsersRef.update(updates)
              .then(() => resolve({ 
                success: true, 
                newUsage: newUsage,
                studentId: studentId 
              }))
              .catch(reject);
          });
        })
        .catch(reject);
    });
  }

  // Function to get current default quotas
  function getCurrentDefaultQuotas() {
    return { ...currentDefaultQuotas };
  }

  // Function to set default quotas (for signup)
  function setDefaultQuotasForNewStudent(studentId) {
    return window.UsersRef.child(studentId).update({
      quota: currentDefaultQuotas,
      usage: {
        sick: 0,
        casual: 0,
        emergency: 0,
        lastReset: new Date().getFullYear()
      }
    });
  }

  // ========== UPDATE SIGNUP.JS INTEGRATION ==========

  // This function should be called from signup.js when a new student registers
  window.applyDefaultQuotasToNewStudent = function(studentId) {
    return setDefaultQuotasForNewStudent(studentId);
  };

  // ========== EXPORT FUNCTIONS ==========

  // Expose functions to global scope
  window.QuotaSystem = {
    checkLeaveBalance: checkLeaveBalance,
    updateLeaveUsage: updateLeaveUsage,
    reduceLeaveUsage: reduceLeaveUsage,
    getAvailableLeaves: getAvailableLeaves,
    updateQuotaStats: updateQuotaStats,
    loadStudentsForQuota: loadStudentsForQuota,
    getCurrentDefaultQuotas: getCurrentDefaultQuotas,
    setDefaultQuotasForNewStudent: setDefaultQuotasForNewStudent,
    DEFAULT_QUOTAS: currentDefaultQuotas
  };

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // Auto-init for admin panel
      if (window.location.pathname.includes('admin.html')) {
        // Check if quota panel is open on load
        setTimeout(() => {
          const quotaPanel = document.getElementById('quotaManagementPanel');
          if (quotaPanel && quotaPanel.style.display !== 'none') {
            loadStudentsForQuota();
            updateQuotaStats();
          }
        }, 1000);
      }
    });
  }
})();