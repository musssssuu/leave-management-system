// firebase.js - COMPLETE VERSION
const firebaseConfig = {
  apiKey: "AIzaSyB9T9TaN0G85VZuEaq8w6ooIP7xO8h8goI",
  authDomain: "leave-app-mustafa.firebaseapp.com",
  databaseURL: "https://leave-app-mustafa-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "leave-app-mustafa",
  storageBucket: "leave-app-mustafa.firebasestorage.app",
  messagingSenderId: "11544220470",
  appId: "1:11544220470:web:6e3f4f4c158807a13bd997"
};

// Initialize Firebase (compat)
firebase.initializeApp(firebaseConfig);
window.db = firebase.database();
window.LeavesRef = window.db.ref("leaveApplications");
window.UsersRef = window.db.ref("users");
window.AdminsRef = window.db.ref("admins");
window.LeaveQuotasRef = window.db.ref("leaveQuotas");
window.LeaveUsageRef = window.db.ref("leaveUsage");

// Initialize admin accounts if they don't exist
window.AdminsRef.once('value').then(snapshot => {
  if (!snapshot.exists()) {
    // Create default admin accounts
    const defaultAdmins = {
      admin1: {
        username: "admin",
        password: "admin123",
        role: "superadmin",
        division: "all",
        createdAt: Date.now()
      },
      teacherA: {
        username: "teacher_a",
        password: "teacherA123",
        role: "teacher",
        division: "A",
        createdAt: Date.now()
      },
      teacherB: {
        username: "teacher_b",
        password: "teacherB123",
        role: "teacher",
        division: "B",
        createdAt: Date.now()
      },
      teacherC: {
        username: "teacher_c",
        password: "teacherC123",
        role: "teacher",
        division: "C",
        createdAt: Date.now()
      },
      teacherD: {
        username: "teacher_d",
        password: "teacherD123",
        role: "teacher",
        division: "D",
        createdAt: Date.now()
      }
    };
    
    window.AdminsRef.update(defaultAdmins)
      .then(() => console.log("Default admin accounts created"))
      .catch(error => console.error("Error creating admin accounts:", error));
  }
});