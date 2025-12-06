// js/student.js - COMPLETE VERSION with Leave Balance
(function(){
  const form = document.getElementById("leaveForm");
  const submitBtn = document.getElementById("submitBtn");
  const storedRoll = localStorage.getItem("studentRoll");
  const storedName = localStorage.getItem("studentName");
  
  // Initialize form with stored data
  if (storedName && document.getElementById("name")) {
    document.getElementById("name").value = storedName;
  }
  if (storedRoll && document.getElementById("roll")) {
    document.getElementById("roll").value = storedRoll;
  }
  
  // Toast Notification
  const showToast = (msg, type = 'info') => {
    let t = document.getElementById("studentToast");
    if(!t){
      t = document.createElement("div");
      t.className = 'toast';
      t.id = 'studentToast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    
    // Set color based on type
    if (type === 'error') {
      t.style.background = '#ef4444';
    } else if (type === 'success') {
      t.style.background = '#10b981';
    } else {
      t.style.background = '#111827';
    }
    
    t.style.display = 'block';
    setTimeout(()=> t.style.display="none", 3000);
  };

  // Calculate days between dates
  function calculateDays(fromDate, toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to - from);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
    return diffDays;
  }

  // Form submission
  form.addEventListener("submit", async function(e){
    e.preventDefault();
    
    const name = document.getElementById("name").value.trim();
    const roll = document.getElementById("roll").value.trim();
    const fromDate = document.getElementById("fromDate").value;
    const toDate = document.getElementById("toDate").value;
    const reason = document.getElementById("reason").value.trim();
    const leaveType = document.getElementById("leaveType").value;
    
    // Validation
    if (!fromDate || !toDate) {
      showToast("Please select both dates!", 'error');
      return;
    }
    
    if (new Date(fromDate) > new Date(toDate)) {
      showToast("From date cannot be after To date!", 'error');
      return;
    }
    
    if (!leaveType) {
      showToast("Please select leave type!", 'error');
      return;
    }
    
    if (!reason) {
      showToast("Please enter reason for leave!", 'error');
      return;
    }
    
    const days = calculateDays(fromDate, toDate);
    
    // Disable submit button
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Checking balance...";
    submitBtn.disabled = true;
    
    try {
      // Check leave balance before submitting
      const balanceCheck = await window.QuotaSystem.checkLeaveBalance(roll, leaveType, days);
      
      if (!balanceCheck.available) {
        showToast(`Cannot submit: ${balanceCheck.message}`, 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }
      
      // Balance available, proceed with submission
      submitBtn.textContent = "Submitting...";
      
      const payload = { 
        name, 
        roll, 
        fromDate, 
        toDate, 
        reason, 
        leaveType,
        days: days,
        status: "Pending", 
        createdAt: Date.now(),
        division: localStorage.getItem("studentDivision"),
        year: localStorage.getItem("studentYear")
      };
      
      await window.LeavesRef.push(payload);
      showToast("Application submitted successfully!", 'success');
      
      // Reset form
      document.getElementById("fromDate").value = "";
      document.getElementById("toDate").value = "";
      document.getElementById("reason").value = "";
      document.getElementById("leaveType").selectedIndex = 0;
      
      // Update leave balance display
      updateStudentLeaveBalance();
      
    } catch (error) {
      console.error("Error submitting:", error);
      showToast("Error submitting application!", 'error');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

  // Load leave applications
  window.LeavesRef.on("value", snap => {
    const container = document.getElementById("historyCards");
    container.innerHTML = "";
    
    let hasApplications = false;
    
    snap.forEach(child => {
      const data = child.val();
      if(data.roll === storedRoll){
        hasApplications = true;
        const card = document.createElement("div");
        card.className = "app-card";
        
        // Calculate days for this application
        const appDays = calculateDays(data.fromDate, data.toDate);
        
        card.innerHTML = `
          <div class="card-header">
            <i class="fas fa-calendar-alt"></i>
            <span class="date-range">
              <strong>From:</strong> ${data.fromDate} 
              <i class="fas fa-arrow-right"></i> 
              <strong>To:</strong> ${data.toDate}
              <span class="days-badge">${appDays} day${appDays > 1 ? 's' : ''}</span>
            </span>
          </div>
          <div class="card-body">
            <p><i class="fas fa-tag"></i> <strong>Type:</strong> ${data.leaveType || 'Sick'} Leave</p>
            <p><i class="fas fa-file-alt"></i> <strong>Reason:</strong> ${data.reason}</p>
          </div>
          <div class="card-footer">
            <span class="badge ${data.status.toLowerCase()}">
              <i class="fas fa-${data.status === 'Pending' ? 'clock' : data.status === 'Approved' ? 'check-circle' : 'times-circle'}"></i>
              ${data.status}
            </span>
         `;
        
        const actionDiv = document.createElement("div");
        actionDiv.className = "card-actions";
        if(data.status === "Pending"){
          const cancelBtn = document.createElement("button");
          cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel Request';
          cancelBtn.className = "btn danger";
          cancelBtn.onclick = () => {
            if (confirm("Are you sure you want to cancel this request?")) {
              child.ref.remove();
              // Update balance after cancellation
              setTimeout(updateStudentLeaveBalance, 1000);
            }
          };
          actionDiv.appendChild(cancelBtn);
        } else {
          actionDiv.innerHTML = "<em>No actions available</em>";
        }
        card.appendChild(actionDiv);
        container.appendChild(card);
      }
    });
    
    if (!hasApplications) {
      container.innerHTML = `
        <div class="empty-apps">
          <i class="fas fa-inbox"></i>
          <p>No applications submitted yet</p>
        </div>
      `;
    }
  });

  // Function to update leave balance display
  window.updateStudentLeaveBalance = function() {
    const balanceCards = document.getElementById('balanceCards');
    const studentRoll = localStorage.getItem("studentRoll");
    
    if (!studentRoll || !balanceCards) return;
    
    balanceCards.innerHTML = `
      <div class="loading-balance">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading your leave balance...</p>
      </div>
    `;
    
    window.QuotaSystem.getAvailableLeaves(studentRoll)
      .then(balance => {
        balanceCards.innerHTML = `
          <div class="balance-card sick">
            <div class="balance-icon sick">
              <i class="fas fa-thermometer-half"></i>
            </div>
            <div class="balance-content">
              <h4>Sick Leaves</h4>
              <div class="balance-count ${getBalanceClass(balance.sick.remaining, balance.sick.quota)}">
                ${balance.sick.remaining}
              </div>
              <p class="balance-total">of ${balance.sick.quota} per year</p>
              <p class="balance-used">Used: ${balance.sick.used}</p>
            </div>
          </div>
          
          <div class="balance-card casual">
            <div class="balance-icon casual">
              <i class="fas fa-umbrella-beach"></i>
            </div>
            <div class="balance-content">
              <h4>Casual Leaves</h4>
              <div class="balance-count ${getBalanceClass(balance.casual.remaining, balance.casual.quota)}">
                ${balance.casual.remaining}
              </div>
              <p class="balance-total">of ${balance.casual.quota} per semester</p>
              <p class="balance-used">Used: ${balance.casual.used}</p>
            </div>
          </div>
          
          <div class="balance-card emergency">
            <div class="balance-icon emergency">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="balance-content">
              <h4>Emergency Leaves</h4>
              <div class="balance-count ${getBalanceClass(balance.emergency.remaining, balance.emergency.quota)}">
                ${balance.emergency.remaining}
              </div>
              <p class="balance-total">of ${balance.emergency.quota} per year</p>
              <p class="balance-used">Used: ${balance.emergency.used}</p>
            </div>
          </div>
        `;
      })
      .catch(error => {
        console.error('Error loading balance:', error);
        balanceCards.innerHTML = `
          <div class="loading-balance">
            <i class="fas fa-exclamation-circle"></i>
            <p>Error loading leave balance</p>
          </div>
        `;
      });
  };

  // Helper function for balance color coding
  function getBalanceClass(remaining, total) {
    if (total === 0) return 'high';
    const percentage = (remaining / total) * 100;
    if (percentage > 50) return 'high';
    if (percentage > 25) return 'medium';
    return 'low';
  }

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('student.html')) {
      // Set today's date as default for fromDate
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('fromDate').min = today;
      document.getElementById('toDate').min = today;
      
      // Update fromDate changes toDate minimum
      document.getElementById('fromDate').addEventListener('change', function() {
        document.getElementById('toDate').min = this.value;
      });
      
      // Load leave balance
      setTimeout(window.updateStudentLeaveBalance, 500);
      
      // Update balance when page becomes visible
      document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
          window.updateStudentLeaveBalance();
        }
      });
    }
  });
})();