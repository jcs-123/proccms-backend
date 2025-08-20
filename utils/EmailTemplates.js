// utils/EmailTemplates.js
export class EmailTemplates {
  // Base template with consistent styling
  static baseTemplate(subject, title, content) {
    return {
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #2c3e50;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              padding: 25px;
              background-color: #f9f9f9;
              border: 1px solid #ddd;
              border-top: none;
            }
            .footer {
              padding: 15px;
              text-align: center;
              font-size: 12px;
              color: #7f8c8d;
              background-color: #ecf0f1;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 10px 20px;
              background-color: #3498db;
              color: white;
              text-decoration: none;
              border-radius: 3px;
              margin: 15px 0;
            }
            .details {
              background-color: #fff;
              border-left: 4px solid #3498db;
              padding: 15px;
              margin: 15px 0;
            }
            .label {
              font-weight: bold;
              color: #2c3e50;
            }
            .status-pending { color: #f39c12; }
            .status-inprogress { color: #3498db; }
            .status-completed { color: #27ae60; }
            .status-verified { color: #2ecc71; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PROCCMS</h1>
            <h2>${title}</h2>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>This is an automated email from PROCCMS (Project and Computer Center Management System).</p>
            <p>Please do not reply to this email.</p>
          </div>
        </body>
        </html>
      `
    };
  }

  // New repair request created
  static newRequest(request) {
    const subject = "📋 New Repair Request Created";
    const title = "New Repair Request";
    const content = `
      <p>A new repair request has been created.</p>
      
      <div class="details">
        <p><span class="label">Request ID:</span> ${request._id}</p>
        <p><span class="label">Requested By:</span> ${request.username}</p>
        <p><span class="label">Department:</span> ${request.department}</p>
        <p><span class="label">Description:</span> ${request.description}</p>
        <p><span class="label">Type:</span> ${request.isNewRequirement ? "New Requirement" : "Repair Request"}</p>
        <p><span class="label status-pending">Status:</span> Pending</p>
        <p><span class="label">Date:</span> ${new Date().toLocaleString()}</p>
      </div>
      
      <p>Please review the request in the PROCCMS admin panel.</p>
    `;

    return this.baseTemplate(subject, title, content);
  }

  // Request assigned to staff
  static assignedToStaff(request, staff) {
    const subject = "📌 Repair Request Assigned to You";
    const title = "Repair Request Assigned";
    const content = `
      <p>Hello <b>${staff.name}</b>,</p>
      <p>A repair request has been assigned to you.</p>
      
      <div class="details">
        <p><span class="label">Request ID:</span> ${request._id}</p>
        <p><span class="label">Requested By:</span> ${request.username}</p>
        <p><span class="label">Department:</span> ${request.department}</p>
        <p><span class="label">Description:</span> ${request.description}</p>
        <p><span class="label">Status:</span> <span class="status-${request.status.toLowerCase()}">${request.status}</span></p>
      </div>
      
      <p>Please log in to the system to take action.</p>
      <a href="#" class="button">View Request</a>
    `;

    return this.baseTemplate(subject, title, content);
  }

  // Notification to project about assignment
  static assignmentNotification(request, staff) {
    const subject = "👤 Repair Request Assigned";
    const title = "Repair Request Assigned";
    const content = `
      <p>A repair request has been assigned to a staff member.</p>
      
      <div class="details">
        <p><span class="label">Request ID:</span> ${request._id}</p>
        <p><span class="label">Assigned To:</span> ${staff.name}</p>
        <p><span class="label">Requested By:</span> ${request.username}</p>
        <p><span class="label">Department:</span> ${request.department}</p>
        <p><span class="label">Description:</span> ${request.description}</p>
        <p><span class="label">Status:</span> <span class="status-${request.status.toLowerCase()}">${request.status}</span></p>
      </div>
    `;

    return this.baseTemplate(subject, title, content);
  }

  // Notification to requester about assignment
  static requesterAssignmentNotification(request, staff) {
    const subject = "🔄 Your Repair Request Has Been Assigned";
    const title = "Request Assigned";
    const content = `
      <p>Hello <b>${request.username}</b>,</p>
      <p>Your repair request has been assigned to a staff member.</p>
      
      <div class="details">
        <p><span class="label">Request ID:</span> ${request._id}</p>
        <p><span class="label">Assigned To:</span> ${staff.name}</p>
        <p><span class="label">Description:</span> ${request.description}</p>
        <p><span class="label">Status:</span> <span class="status-${request.status.toLowerCase()}">${request.status}</span></p>
      </div>
      
      <p>You will be notified when the request is completed.</p>
    `;

    return this.baseTemplate(subject, title, content);
  }

  // Request completed notification to requester
  static completionToRequester(request) {
    const subject = "✅ Your Repair Request Has Been Completed";
    const title = "Request Completed";
    const content = `
      <p>Hello <b>${request.username}</b>,</p>
      <p>Your repair request has been completed successfully.</p>
      
      <div class="details">
        <p><span class="label">Request ID:</span> ${request._id}</p>
        <p><span class="label">Description:</span> ${request.description}</p>
        <p><span class="label">Completed By:</span> ${request.assignedTo || "Staff"}</p>
        <p><span class="label">Completion Date:</span> ${new Date().toLocaleString()}</p>
      </div>
      
      <p>Thank you for using our service.</p>
    `;

    return this.baseTemplate(subject, title, content);
  }

  // Request completed notification to project
  static completionToProject(request) {
    const subject = "✅ Repair Request Completed";
    const title = "Repair Request Completed";
    const content = `
      <p>A repair request has been completed.</p>
      
      <div class="details">
        <p><span class="label">Request ID:</span> ${request._id}</p>
        <p><span class="label">Requested By:</span> ${request.username}</p>
        <p><span class="label">Department:</span> ${request.department}</p>
        <p><span class="label">Description:</span> ${request.description}</p>
        <p><span class="label">Completed By:</span> ${request.assignedTo || "Staff"}</p>
        <p><span class="label">Completion Date:</span> ${new Date().toLocaleString()}</p>
      </div>
    `;

    return this.baseTemplate(subject, title, content);
  }

  // Request verified notification
  static verificationNotification(request) {
    const subject = "✅ Repair Request Verified by Admin";
    const title = "Repair Request Verified";
    const content = `
      <p>A repair request has been verified by an administrator.</p>
      
      <div class="details">
        <p><span class="label">Request ID:</span> ${request._id}</p>
        <p><span class="label">Requested By:</span> ${request.username}</p>
        <p><span class="label">Department:</span> ${request.department}</p>
        <p><span class="label">Description:</span> ${request.description}</p>
        <p><span class="label">Completed By:</span> ${request.assignedTo || "Not assigned"}</p>
        <p><span class="label">Completion Date:</span> ${request.completedAt ? new Date(request.completedAt).toLocaleString() : "Not completed"}</p>
        <p><span class="label">Verification Date:</span> ${new Date().toLocaleString()}</p>
        <p><span class="label">Verified By:</span> Admin</p>
      </div>
    `;

    return this.baseTemplate(subject, title, content);
  }

  // Request verified notification to requester
  static verificationToRequester(request) {
    const subject = "✅ Your Repair Request Has Been Verified";
    const title = "Request Verified";
    const content = `
      <p>Hello <b>${request.username}</b>,</p>
      <p>Your repair request has been verified by the administration.</p>
      
      <div class="details">
        <p><span class="label">Request ID:</span> ${request._id}</p>
        <p><span class="label">Description:</span> ${request.description}</p>
        <p><span class="label status-verified">Status:</span> Verified</p>
        <p><span class="label">Verification Date:</span> ${new Date().toLocaleString()}</p>
      </div>
      
      <p>Thank you for using our service.</p>
    `;

    return this.baseTemplate(subject, title, content);
  }

  // New remark added notification
  static newRemarkNotification(request, remark) {
    const subject = "💬 New Remark Added to Your Request";
    const title = "New Remark Added";
    const content = `
      <p>Hello <b>${request.username}</b>,</p>
      <p>A new remark has been added to your repair request.</p>
      
      <div class="details">
        <p><span class="label">Request ID:</span> ${request._id}</p>
        <p><span class="label">Description:</span> ${request.description}</p>
        <p><span class="label">Remark By:</span> ${remark.enteredBy}</p>
        <p><span class="label">Remark Date:</span> ${new Date(remark.date).toLocaleString()}</p>
        <p><span class="label">Remark:</span> ${remark.text}</p>
      </div>
      
      <p>Please log in to the system for more details.</p>
    `;

    return this.baseTemplate(subject, title, content);
  }
}