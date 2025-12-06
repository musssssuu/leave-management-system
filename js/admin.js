// js/admin.js - COMPLETE VERSION WITH QUOTA PANEL
(function(){
  // DOM Elements
  const totalCountEl = document.getElementById('totalCount');
  const pendingCountEl = document.getElementById('pendingCount');
  const approvedCountEl = document.getElementById('approvedCount');
  const rejectedCountEl = document.getElementById('rejectedCount');
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const studentList = document.getElementById('studentList');
  const emptyState = document.getElementById('emptyState');
  const logoutBtn = document.getElementById('logoutBtn');
  const exportBtn = document.getElementById('exportBtn');
  const adminToast = document.getElementById('adminToast');
  
  // Menu elements
  const studentsListBtn = document.getElementById('studentsListBtn');
  const quotaManagementBtn = document.getElementById('quotaManagementBtn');
  const divisionFilterBtn = document.getElementById('divisionFilterBtn');
  const divisionFilterPanel = document.getElementById('divisionFilterPanel');
  const studentsListPanel = document.getElementById('studentsListPanel');
  const quotaManagementPanel = document.getElementById('quotaManagementPanel');
  const studentsGrid = document.getElementById('studentsGrid');
  const closeStudentsPanel = document.getElementById('closeStudentsPanel');
  const closeQuotaPanel = document.getElementById('closeQuotaPanel');
  const studentDivisionFilter = document.getElementById('studentDivisionFilter');

  // State
  let allApplications = [];
  let filteredApplications = [];
  let currentDivisionFilter = 'all';
  let allStudents = [];

  // Toast Notification
  const showToast = (message) => {
    adminToast.textContent = message;
    adminToast.style.display = 'block';
    setTimeout(() => {
      adminToast.style.display = 'none';
    }, 2000);
  };

  // ========== MENU FUNCTIONALITY ==========

  // Toggle Students List Panel
  studentsListBtn.addEventListener('click', () => {
    if (studentsListPanel.style.display === 'none' || studentsListPanel.style.display === '') {
      // Show students panel, hide others
      studentsListPanel.style.display = 'block';
      quotaManagementPanel.style.display = 'none';
      divisionFilterPanel.style.display = 'none';
      
      // Load students data
      loadAllStudents();
      
      // Update active states
      studentsListBtn.classList.add('active');
      quotaManagementBtn.classList.remove('active');
      divisionFilterBtn.classList.remove('active');
    } else {
      // Hide students panel
      studentsListPanel.style.display = 'none';
      studentsListBtn.classList.remove('active');
    }
  });

  // Toggle Quota Management Panel
  quotaManagementBtn.addEventListener('click', () => {
    if (quotaManagementPanel.style.display === 'none' || quotaManagementPanel.style.display === '') {
      // Show quota panel, hide others
      quotaManagementPanel.style.display = 'flex';
      studentsListPanel.style.display = 'none';
      divisionFilterPanel.style.display = 'none';
      
      // Update active states
      quotaManagementBtn.classList.add('active');
      studentsListBtn.classList.remove('active');
      divisionFilterBtn.classList.remove('active');
    } else {
      // Hide quota panel
      quotaManagementPanel.style.display = 'none';
      quotaManagementBtn.classList.remove('active');
    }
  });

  // Toggle Division Filter Panel
  divisionFilterBtn.addEventListener('click', () => {
    if (divisionFilterPanel.style.display === 'none' || divisionFilterPanel.style.display === '') {
      // Show division panel, hide others
      divisionFilterPanel.style.display = 'block';
      studentsListPanel.style.display = 'none';
      quotaManagementPanel.style.display = 'none';
      
      // Update active states
      divisionFilterBtn.classList.add('active');
      studentsListBtn.classList.remove('active');
      quotaManagementBtn.classList.remove('active');
    } else {
      // Hide division panel
      divisionFilterPanel.style.display = 'none';
      divisionFilterBtn.classList.remove('active');
    }
  });

  // Close Students Panel
  closeStudentsPanel.addEventListener('click', () => {
    studentsListPanel.style.display = 'none';
    studentsListBtn.classList.remove('active');
  });

  // Close Quota Panel
  closeQuotaPanel.addEventListener('click', () => {
    quotaManagementPanel.style.display = 'none';
    quotaManagementBtn.classList.remove('active');
  });

  // Division Filter for Students List
  studentDivisionFilter.addEventListener('change', () => {
    loadAllStudents();
  });

  // Division Filter Buttons
  document.querySelectorAll('.division-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      // Update active button
      document.querySelectorAll('.division-btn').forEach(b => {
        b.classList.remove('active');
      });
      this.classList.add('active');
      
      // Set filter
      currentDivisionFilter = this.dataset.division;
      applyFilters();
      
      // Show toast
      if (currentDivisionFilter === 'all') {
        showToast('Showing all divisions');
      } else {
        showToast(`Showing Division ${currentDivisionFilter} only`);
      }
    });
  });

  // ========== CORE FUNCTIONALITY ==========

  // Logout
  logoutBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // Export CSV
  exportBtn.addEventListener('click', () => {
    const data = filteredApplications.length > 0 ? filteredApplications : allApplications;
    
    if (data.length === 0) {
      showToast('No data to export');
      return;
    }

    const headers = ['ID', 'Name', 'Roll', 'From Date', 'To Date', 'Reason', 'Status', 'Created At'];
    const csvRows = [
      headers.join(','),
      ...data.map(item => [
        `"${item.id}"`,
        `"${item.name}"`,
        `"${item.roll}"`,
        `"${item.fromDate}"`,
        `"${item.toDate}"`,
        `"${item.reason.replace(/"/g, '""')}"`,
        `"${item.status}"`,
        `"${new Date(item.createdAt).toISOString()}"`
      ].join(','))
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave_applications_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showToast(`Exported ${data.length} applications`);
  });

  // Fetch applications from Firebase
  const fetchApplications = () => {
    window.LeavesRef.on('value', (snapshot) => {
      allApplications = [];
      
      snapshot.forEach((child) => {
        const data = child.val();
        // Correct ID handling: use child.key, not data.id
        allApplications.push({
          ...data,
          id: child.key
        });
      });

      applyFilters();
    });
  };

  // Filter applications - FIXED DIVISION FILTER
  const applyFilters = () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const statusValue = statusFilter.value;
    
    filteredApplications = allApplications.filter(app => {
      // === SEARCH FUNCTION ===
      let matchesSearch = true;
      
      if (searchTerm) {
        matchesSearch = false;
        
        // 1. Check name
        if (app.name && app.name.toLowerCase().includes(searchTerm)) {
          matchesSearch = true;
        }
        
        // 2. Check roll number
        if (app.roll) {
          const rollLower = app.roll.toLowerCase();
          
          // a) Exact match of full roll number
          if (rollLower.includes(searchTerm)) {
            matchesSearch = true;
          }
          
          // b) Extract just the number part
          const numberMatch = rollLower.match(/\d+/g);
          if (numberMatch) {
            for (const num of numberMatch) {
              const numWithoutZero = num.replace(/^0+/, '');
              if (num.includes(searchTerm) || numWithoutZero.includes(searchTerm)) {
                matchesSearch = true;
                break;
              }
            }
          }
        }
      }
      
      // Status filter
      const matchesStatus = statusValue === 'all' || app.status === statusValue;
      
      // === FIXED DIVISION FILTER ===
      let matchesDivision = true;
      if (currentDivisionFilter !== 'all' && app.roll) {
        // Extract division from roll number format: CS-3A01
        const rollUpper = app.roll.toUpperCase();
        
        if (rollUpper.length >= 5) {
          // Expected format: CS-3A01
          // Division is at position 4 (0-based index)
          const divisionChar = rollUpper.charAt(4);
          matchesDivision = divisionChar === currentDivisionFilter;
        } else {
          matchesDivision = false;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDivision;
    });

    updateSummary();
    renderApplications();
  };

  // Update summary cards
  const updateSummary = () => {
    const total = filteredApplications.length;
    const pending = filteredApplications.filter(app => app.status === 'Pending').length;
    const approved = filteredApplications.filter(app => app.status === 'Approved').length;
    const rejected = filteredApplications.filter(app => app.status === 'Rejected').length;

    totalCountEl.textContent = total;
    pendingCountEl.textContent = pending;
    approvedCountEl.textContent = approved;
    rejectedCountEl.textContent = rejected;
  };

  // Group applications by student
  const groupByStudent = () => {
    const groups = {};
    
    filteredApplications.forEach(app => {
      const groupKey = app.roll || app.name;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          name: app.name,
          roll: app.roll,
          applications: []
        };
      }
      
      groups[groupKey].applications.push(app);
    });
    
    return groups;
  };

  // Render applications
  const renderApplications = () => {
    const studentGroups = groupByStudent();
    const students = Object.values(studentGroups);
    
    if (students.length === 0) {
      emptyState.style.display = 'block';
      studentList.innerHTML = '';
      return;
    }
    
    emptyState.style.display = 'none';
    
    let html = '';
    students.forEach((student, index) => {
      const stats = {
        pending: student.applications.filter(app => app.status === 'Pending').length,
        approved: student.applications.filter(app => app.status === 'Approved').length,
        rejected: student.applications.filter(app => app.status === 'Rejected').length
      };
      
      html += `
        <div class="student-section">
          <div class="student-header" onclick="toggleStudent(${index})">
            <div class="student-info">
              <h4>${student.name}</h4>
              <p>${student.roll || 'No Roll Number'}</p>
            </div>
            <div class="student-stats">
              ${stats.pending > 0 ? `<span class="student-stat pending">${stats.pending} Pending</span>` : ''}
              ${stats.approved > 0 ? `<span class="student-stat approved">${stats.approved} Approved</span>` : ''}
              ${stats.rejected > 0 ? `<span class="student-stat rejected">${stats.rejected} Rejected</span>` : ''}
            </div>
          </div>
          <div class="applications-grid" id="student-apps-${index}">
            ${student.applications.map(app => `
              <div class="admin-app-card">
                <div class="card-dates">
                  <i class="fas fa-calendar-day"></i>
                  <span class="date-range">
                    <strong>From:</strong> ${app.fromDate} 
                    <i class="fas fa-arrow-right"></i> 
                    <strong>To:</strong> ${app.toDate}
                  </span>
                </div>
                <div class="card-reason">${app.reason}</div>
                <div class="card-footer">
                  <span class="badge ${app.status.toLowerCase()}">${app.status}</span>
                  <div class="card-actions">
                    ${app.status !== 'Approved' ? `
                      <button class="action-btn approve-btn" onclick="updateStatus('${app.id}', 'Approved')">
                        <i class="fas fa-check"></i> Approve
                      </button>
                    ` : ''}
                    ${app.status !== 'Rejected' ? `
                      <button class="action-btn reject-btn" onclick="updateStatus('${app.id}', 'Rejected')">
                        <i class="fas fa-times"></i> Reject
                      </button>
                    ` : ''}
                    <button class="action-btn delete-btn" onclick="deleteApplication('${app.id}')">
                      <i class="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });
    
    studentList.innerHTML = html;
  };

  // ========== STUDENTS LIST FUNCTIONALITY ==========

  // Load all students from database
  const loadAllStudents = () => {
    studentsGrid.innerHTML = '<div class="empty-state"><p>Loading students...</p></div>';
    
    window.UsersRef.once('value')
      .then(snapshot => {
        allStudents = [];
        
        if (!snapshot.exists()) {
          studentsGrid.innerHTML = `
            <div class="no-students">
              <i class="fas fa-user-slash"></i>
              <p>No students registered yet</p>
            </div>
          `;
          return;
        }
        
        const selectedDivision = studentDivisionFilter.value;
        
        snapshot.forEach(child => {
          const student = child.val();
          student.id = child.key;
          
          // Filter by division if selected
          if (selectedDivision === 'all' || student.division === selectedDivision) {
            allStudents.push(student);
          }
        });
        
        renderStudentsList();
      })
      .catch(error => {
        console.error('Error loading students:', error);
        studentsGrid.innerHTML = '<div class="empty-state"><p>Error loading students</p></div>';
      });
  };

  // Render students list - IMPROVED VERSION
  const renderStudentsList = () => {
    if (allStudents.length === 0) {
      studentsGrid.innerHTML = `
        <div class="no-students">
          <i class="fas fa-user-slash"></i>
          <p>No students found for this division</p>
        </div>
      `;
      return;
    }
    
    // Sort students by name
    const sortedStudents = [...allStudents].sort((a, b) => 
      a.fullName.localeCompare(b.fullName)
    );
    
    let html = '';
    sortedStudents.forEach((student, index) => {
      // Get student's applications count
      const studentApplications = allApplications.filter(app => 
        app.roll === student.rollNumber
      );
      
      const pendingCount = studentApplications.filter(app => app.status === 'Pending').length;
      const approvedCount = studentApplications.filter(app => app.status === 'Approved').length;
      
      // Get first letter for avatar
      const firstLetter = student.fullName.charAt(0).toUpperCase();
      
      // Determine year color
      const yearColors = {
        '1': '#3b82f6', // Blue
        '2': '#10b981', // Green
        '3': '#f59e0b', // Orange
        '4': '#8b5cf6'  // Purple
      };
      const yearColor = yearColors[student.year] || '#6b7280';
      
      html += `
        <div class="student-profile-card" data-index="${index}">
          <div class="student-avatar" style="background: linear-gradient(135deg, ${yearColor}, #ACB6E5)">
            ${firstLetter}
          </div>
          <div class="student-details">
            <h4>${student.fullName}</h4>
            <p><strong>${student.rollNumber}</strong></p>
            <p>Year ${student.year} • Division ${student.division}</p>
            <div class="student-stats-small">
              <div class="stat-small">
                <span>${studentApplications.length}</span>
                <span>Total</span>
              </div>
              <div class="stat-small">
                <span>${pendingCount}</span>
                <span>Pending</span>
              </div>
              <div class="stat-small">
                <span>${approvedCount}</span>
                <span>Approved</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    
    studentsGrid.innerHTML = html;
    
    // Add click event to student cards
    document.querySelectorAll('.student-profile-card').forEach(card => {
      card.addEventListener('click', function() {
        const index = this.dataset.index;
        showStudentDetails(sortedStudents[index]);
      });
    });
  };

  // Show student details
  const showStudentDetails = (student) => {
    // Get all applications for this student
    const studentApplications = allApplications.filter(app => 
      app.roll === student.rollNumber
    );
    
    let detailsHtml = `
      <h3>Student Details</h3>
      <div class="student-details-modal">
        <div class="detail-row">
          <strong>Full Name:</strong> ${student.fullName}
        </div>
        <div class="detail-row">
          <strong>Username:</strong> ${student.username}
        </div>
        <div class="detail-row">
          <strong>Roll Number:</strong> ${student.rollNumber}
        </div>
        <div class="detail-row">
          <strong>Year:</strong> ${student.year}
        </div>
        <div class="detail-row">
          <strong>Division:</strong> ${student.division}
        </div>
        <div class="detail-row">
          <strong>Total Applications:</strong> ${studentApplications.length}
        </div>
        <div class="detail-row">
          <strong>Pending:</strong> ${studentApplications.filter(app => app.status === 'Pending').length}
        </div>
        <div class="detail-row">
          <strong>Approved:</strong> ${studentApplications.filter(app => app.status === 'Approved').length}
        </div>
        <div class="detail-row">
          <strong>Rejected:</strong> ${studentApplications.filter(app => app.status === 'Rejected').length}
        </div>
      </div>
    `;
    
    // Create a simple modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Student Information</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          ${detailsHtml}
        </div>
        <div class="modal-footer">
          <button class="modal-ok-btn">OK</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal events
    modal.querySelector('.modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.querySelector('.modal-ok-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  };

  // ========== GLOBAL FUNCTIONS ==========

  // Toggle student section
  window.toggleStudent = (index) => {
    const appsGrid = document.getElementById(`student-apps-${index}`);
    if (appsGrid.style.display === 'none') {
      appsGrid.style.display = 'grid';
    } else {
      appsGrid.style.display = 'none';
    }
  };

  // Update application status (with quota tracking)
  window.updateStatus = (id, newStatus) => {
    // First get the application details
    window.LeavesRef.child(id).once('value')
      .then(snapshot => {
        const application = snapshot.val();
        
        // If approving, update leave usage
        if (newStatus === 'Approved') {
          // Calculate number of days
          const fromDate = new Date(application.fromDate);
          const toDate = new Date(application.toDate);
          const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
          
          // Default to sick leave if no type specified
          const leaveType = application.leaveType || 'sick';
          
          // Update leave usage using QuotaSystem
          if (window.QuotaSystem && window.QuotaSystem.updateLeaveUsage) {
            return window.QuotaSystem.updateLeaveUsage(application.roll, leaveType, days)
              .then(() => {
                // Then update status
                return window.LeavesRef.child(id).update({ status: newStatus });
              });
          } else {
            // Quota system not loaded, just update status
            return window.LeavesRef.child(id).update({ status: newStatus });
          }
        } else {
          // Just update status for reject or other changes
          return window.LeavesRef.child(id).update({ status: newStatus });
        }
      })
      .then(() => {
        showToast(`Application ${newStatus.toLowerCase()} successfully`);
      })
      .catch((error) => {
        console.error('Error updating status:', error);
        showToast('Error updating application');
      });
  };

  // Delete application
  window.deleteApplication = (id) => {
    if (confirm('Are you sure you want to delete this application?')) {
      window.LeavesRef.child(id).remove()
        .then(() => {
          showToast('Application deleted successfully');
        })
        .catch((error) => {
          console.error('Error deleting application:', error);
          showToast('Error deleting application');
        });
    }
  };

  // ========== EVENT LISTENERS ==========
  searchInput.addEventListener('input', applyFilters);
  statusFilter.addEventListener('change', applyFilters);

  // ========== INITIALIZE ==========
  fetchApplications();
  showToast('Admin dashboard loaded');
})();