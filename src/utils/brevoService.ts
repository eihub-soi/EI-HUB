import { toast } from 'sonner';

/**
 * Sends a 6-digit OTP verification email to the user using Brevo SMTP API.
 */
export const sendBrevoOtp = async (email: string, code: string): Promise<void> => {
  const apiKey = import.meta.env.VITE_BREVO_API_KEY;
  
  if (!apiKey) {
    console.log('[Brevo Fallback Dev Mode] No Brevo API Key found. Generated OTP is:', code);
    return;
  }

  console.log(`[Brevo Tech] Attempting to send OTP via Brevo API to ${email}. Code is: ${code}`);

  const senderEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL || 'eihubsoi@gmail.com';
  const senderName = import.meta.env.VITE_BREVO_SENDER_NAME || 'EI HUB Admin';

  const response = await fetch('/api-brevo/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email }],
      subject: 'EI HUB - Student Verification OTP Code',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; text-align: center; margin-top: 0; font-size: 22px;">EI HUB Verification</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6; text-align: center;">Welcome to EI HUB! Use the following 6-digit one-time password (OTP) to complete your student self-registration. This OTP is valid for 10 minutes.</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #1e1b4b; background-color: #f1f5f9; padding: 12px 24px; border-radius: 12px; display: inline-block; border: 1px solid #e2e8f0;">${code}</span>
          </div>
          <p style="color: #64748b; font-size: 11px; text-align: center; margin-bottom: 0; border-top: 1px solid #f1f5f9; padding-top: 20px;">If you did not request this verification, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error('[Brevo Error Response]', errData);
    throw new Error(errData?.message || 'Brevo server rejected the send request.');
  }

  console.log('[Brevo Tech] OTP email successfully dispatched!');
};

/**
 * Sends a borrowing transaction alert and PDF attachment to the student's email.
 */
export const sendBrevoAlertAndPdf = async (
  email: string,
  request: any,
  status: 'approved' | 'rejected' | 'pending' | 'returned' | 'reminder',
  pdfBase64?: string
): Promise<void> => {
  const apiKey = import.meta.env.VITE_BREVO_API_KEY;

  if (!apiKey) {
    console.log(`[Brevo Fallback Dev Mode] No Brevo API Key. Emailed alert simulated for request ${request.request_code} (Status: ${status}).`);
    return;
  }

  console.log(`[Brevo Tech] Sending borrow request email alert (${status}) to ${email}`);

  let subject = `EI HUB - Borrowing Request ${status.toUpperCase()} (${request.request_code})`;
  let statusColor = '#4f46e5';
  let statusText = 'Pending Approval';
  let dynamicDetails = '';

  if (status === 'reminder') {
    subject = `EI HUB - Return Deadline Reminder: ${request.request_code}`;
    statusColor = '#f59e0b';
    statusText = 'Return Deadline Reminder';
    const formattedDate = request.expected_return_at ? new Date(request.expected_return_at).toLocaleDateString() : 'N/A';
    dynamicDetails = `
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        This is a friendly reminder that the borrowing period for your lab component <strong>${request.component_name}</strong> is set to expire in <strong>3 days</strong> (expected return date: <strong>${formattedDate}</strong>).
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.6; background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px; border-radius: 4px;">
        Please make arrangements to return the component to the Innovation SOI lab in proper working condition to avoid overdue flags.
      </p>
    `;
  } else if (status === 'approved') {
    statusColor = '#10b981';
    statusText = 'Approved & Verified';
    dynamicDetails = `
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Your component borrowing request has been approved by <strong>${request.approved_by_name || 'Prof. Robert Chen'}</strong>. 
        Please visit the Innovation SOI laboratory to collect your component.
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.6; background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 10px; border-radius: 4px;">
        Your official transaction receipt PDF is attached to this email.
      </p>
    `;
  } else if (status === 'rejected') {
    statusColor = '#ef4444';
    statusText = 'Rejected';
    dynamicDetails = `
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Your component borrowing request was unfortunately rejected by our laboratory supervisors.
      </p>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; border-radius: 4px; margin: 15px 0;">
        <p style="color: #991b1b; font-size: 13px; font-weight: bold; margin: 0 0 5px 0;">Rejection Reason:</p>
        <p style="color: #7f1d1d; font-size: 13px; margin: 0; font-style: italic;">"${request.rejection_reason || 'Stock allocated for advanced research lab session'}"</p>
      </div>
    `;
  } else if (status === 'returned') {
    statusColor = '#6366f1';
    statusText = 'Returned';
    dynamicDetails = `
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Your return of <strong>${request.quantity}x ${request.component_name}</strong> has been successfully processed and verified by the laboratory coordinator.
      </p>
      <p style="color: #64748b; font-size: 13px; margin: 5px 0 0 0;">
        Returned Condition: <strong>${request.return_condition || 'Good / Fully Functional'}</strong>
      </p>
    `;
  } else {
    // pending
    dynamicDetails = `
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Your request to borrow <strong>${request.quantity}x ${request.component_name}</strong> has been logged in our system and is pending faculty authorization. You will receive an email notification as soon as it is approved.
      </p>
    `;
  }

  const senderEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL || 'eihubsoi@gmail.com';
  const senderName = import.meta.env.VITE_BREVO_SENDER_NAME || 'EI HUB Support';

  const payload: any = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [{ email }],
    subject,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px;">
          <span style="font-size: 18px; font-weight: 800; color: #1e1b4b; tracking-wider: 1px;">EI HUB | KITE</span>
          <p style="color: #64748b; font-size: 11px; margin: 4px 0 0 0;">Department of Electronics & Communication Engineering</p>
        </div>
        
        <div style="margin-bottom: 25px;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b;">Transaction Status</span>
          <div style="font-size: 18px; font-weight: 700; color: ${statusColor}; margin-top: 2px;">${statusText}</div>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 20px; font-size: 13px;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Request Code:</td>
              <td style="color: #1e1b4b; font-weight: bold; padding: 4px 0; font-family: monospace;">${request.request_code}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Component:</td>
              <td style="color: #1e1b4b; font-weight: bold; padding: 4px 0;">${request.component_name}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Quantity:</td>
              <td style="color: #1e1b4b; font-weight: bold; padding: 4px 0;">${request.quantity} Units</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Purpose:</td>
              <td style="color: #1e1b4b; padding: 4px 0;">${request.purpose || 'Lab Experimentation'}</td>
            </tr>
          </table>
        </div>

        ${dynamicDetails}

        <p style="color: #64748b; font-size: 11px; text-align: center; margin-bottom: 0; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 25px;">
          This is an automated institutional transaction update. Please do not reply directly to this email.
        </p>
      </div>
    `,
  };

  if (pdfBase64) {
    payload.attachment = [
      {
        name: `EI_HUB_Receipt_${request.request_code}.pdf`,
        content: pdfBase64,
      },
    ];
  }

  const response = await fetch('/api-brevo/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error('[Brevo Alert Error Response]', errData);
    throw new Error(errData?.message || 'Brevo server rejected the transaction alert email.');
  }

  console.log('[Brevo Tech] Transaction status email alert successfully sent!');
};

/**
 * Sends a generated laboratory report PDF to the supervisor's (faculty/admin) email.
 */
export const sendBrevoReportEmail = async (
  email: string,
  reportType: string,
  pdfBase64: string
): Promise<void> => {
  const apiKey = import.meta.env.VITE_BREVO_API_KEY;

  if (!apiKey) {
    console.log(`[Brevo Fallback Dev Mode] No Brevo API Key. Simulated email of ${reportType} to ${email}.`);
    return;
  }

  console.log(`[Brevo Tech] Sending ${reportType} email report to ${email}`);

  const senderEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL || 'eihubsoi@gmail.com';
  const senderName = import.meta.env.VITE_BREVO_SENDER_NAME || 'EI HUB Support';

  const payload: any = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [{ email }],
    subject: `EI HUB - Official Laboratory Report: ${reportType}`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px;">
          <span style="font-size: 18px; font-weight: 800; color: #1e1b4b; tracking-wider: 1px;">EI HUB | KITE</span>
          <p style="color: #64748b; font-size: 11px; margin: 4px 0 0 0;">Innovation SOI Laboratory Management Console</p>
        </div>
        
        <div style="margin-bottom: 25px;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b;">Laboratory Report Dispatch</span>
          <div style="font-size: 18px; font-weight: 700; color: #4338ca; margin-top: 2px;">${reportType}</div>
        </div>

        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Please find attached the official comprehensive laboratory report PDF for <strong>${reportType}</strong>, compiled dynamically on <strong>${new Date().toLocaleString()}</strong>.
        </p>

        <p style="color: #64748b; font-size: 11px; text-align: center; margin-bottom: 0; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 25px;">
          This is an automated institutional administrative report email.
        </p>
      </div>
    `,
    attachment: [
      {
        name: `EI_HUB_Report_${reportType.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        content: pdfBase64,
      },
    ],
  };

  const response = await fetch('/api-brevo/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error('[Brevo Report Error Response]', errData);
    throw new Error(errData?.message || 'Brevo server rejected the report email.');
  }

  console.log('[Brevo Tech] Report email successfully sent!');
};

/**
 * Sends a consolidated borrowing return deadline reminder email listing all approaching items.
 */
export const sendBrevoConsolidatedReminder = async (
  email: string,
  studentName: string,
  requests: any[]
): Promise<void> => {
  const apiKey = import.meta.env.VITE_BREVO_API_KEY;

  if (!apiKey) {
    console.log(`[Brevo Fallback Dev Mode] No Brevo API Key. Consolidated reminder email simulated for ${studentName} (${email}) with ${requests.length} items.`);
    return;
  }

  console.log(`[Brevo Tech] Sending consolidated return reminder email to ${email} for ${requests.length} items`);

  const senderEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL || 'eihubsoi@gmail.com';
  const senderName = import.meta.env.VITE_BREVO_SENDER_NAME || 'EI HUB Admin';

  // Build the list of components in HTML
  let itemsHtml = '<table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px;">';
  itemsHtml += `
    <thead>
      <tr style="border-bottom: 2px solid #e2e8f0; background-color: #f8fafc; text-align: left;">
        <th style="padding: 8px; font-weight: bold; color: #475569;">Request Code</th>
        <th style="padding: 8px; font-weight: bold; color: #475569;">Component</th>
        <th style="padding: 8px; font-weight: bold; color: #475569; text-align: center;">Qty</th>
        <th style="padding: 8px; font-weight: bold; color: #475569;">Due Date</th>
      </tr>
    </thead>
    <tbody>
  `;

  requests.forEach((req, idx) => {
    const formattedDate = req.expected_return_at ? new Date(req.expected_return_at).toLocaleDateString() : 'N/A';
    itemsHtml += `
      <tr style="border-bottom: 1px solid #f1f5f9; ${idx % 2 === 0 ? 'background-color: #fafafa;' : ''}">
        <td style="padding: 8px; font-family: monospace; color: #4f46e5; font-weight: bold;">${req.request_code}</td>
        <td style="padding: 8px; color: #334155; font-weight: 500;">${req.component_name}</td>
        <td style="padding: 8px; color: #334155; text-align: center;">${req.quantity}</td>
        <td style="padding: 8px; color: #ef4444; font-weight: 600;">${formattedDate}</td>
      </tr>
    `;
  });

  itemsHtml += '</tbody></table>';

  const response = await fetch('/api-brevo/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email }],
      subject: `EI HUB - Return Deadline Reminder: You have ${requests.length} borrowed items due`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 11px; font-weight: 800; background-color: #fef3c7; color: #d97706; padding: 6px 12px; border-radius: 9999px; text-transform: uppercase; border: 1px solid #fde68a;">Consolidated Deadline Alert</span>
          </div>
          <h2 style="color: #1e1b4b; text-align: center; margin-top: 10px; font-size: 20px;">Return Deadline Reminder</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-top: 15px;">
            Dear <strong>${studentName}</strong>,
          </p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            This is a consolidated warning that the borrowing period for the following laboratory hardware components issued to you is set to expire soon.
          </p>
          
          ${itemsHtml}
          
          <div style="margin-top: 25px; background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 8px;">
            <p style="color: #78350f; font-size: 13px; line-height: 1.5; margin: 0; font-weight: 600;">
              Important Instructions:
            </p>
            <p style="color: #78350f; font-size: 12px; line-height: 1.5; margin: 5px 0 0 0;">
              Please return all listed components to the Innovation SOI lab coordinator in functional working condition to avoid account suspension or catalog borrowing restrictions.
            </p>
          </div>
          <p style="color: #64748b; font-size: 11px; text-align: center; margin-top: 25px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
            EI HUB Laboratory Management Systems • KGISL Institute of Technology
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error('[Brevo Error Response]', errData);
    throw new Error(errData?.message || 'Brevo server rejected the consolidated email.');
  }

  console.log('[Brevo Tech] Consolidated reminder email successfully dispatched!');
};

/**
 * Sends the user's User ID (Email) and New Password details to the user's registered email using Brevo.
 */
export const sendBrevoPasswordReset = async (email: string, fullName: string, newPassword: string, isSyncedDirectly: boolean): Promise<void> => {
  const apiKey = import.meta.env.VITE_BREVO_API_KEY;

  if (!apiKey) {
    console.log(`[Brevo Fallback Dev Mode] No Brevo API Key found. Password reset details for ${email} (Password: ${newPassword}, Synced: ${isSyncedDirectly}) logged here.`);
    return;
  }

  console.log(`[Brevo Tech] Attempting to send password credentials email via Brevo to ${email}. Synced directly: ${isSyncedDirectly}`);

  const senderEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL || 'eihubsoi@gmail.com';
  const senderName = import.meta.env.VITE_BREVO_SENDER_NAME || 'EI HUB Admin';

  const statusAlertHtml = isSyncedDirectly 
    ? `
      <p style="color: #10b981; font-size: 12px; line-height: 1.6; background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 12px; border-radius: 8px;">
        <strong>Password Update Synced:</strong> Your new password has been successfully configured directly in your Firebase account login credentials. You can log in immediately.
      </p>
    `
    : `
      <p style="color: #d97706; font-size: 12px; line-height: 1.6; background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 8px;">
        <strong>Action Required (Firebase Sync):</strong> An offline reset has occurred. An email from Firebase with a password reset confirmation link has also been sent to your inbox. Please click that link to sync your Firebase login credentials.
      </p>
    `;

  const response = await fetch('/api-brevo/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email }],
      subject: 'EI HUB - Your Account Credentials and Reset Password Update',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; text-align: center; margin-top: 0; font-size: 22px;">EI HUB Password Reset</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Hello ${fullName},</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Your administrator has updated your password. Here are your account login credentials:</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin: 20px 0; font-size: 14px; font-family: monospace;">
            <p style="margin: 0 0 8px 0; color: #475569;"><strong>User ID (Email):</strong> <span style="color: #0f172a;">${email}</span></p>
            <p style="margin: 0; color: #475569;"><strong>New Password:</strong> <span style="color: #0f172a; font-weight: bold; background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${newPassword}</span></p>
          </div>

          ${statusAlertHtml}

          <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-top: 20px;">Use these credentials to log in to the student/faculty portal of the EI HUB application.</p>
          
          <p style="color: #64748b; font-size: 11px; text-align: center; margin-top: 25px; border-top: 1px solid #f1f5f9; padding-top: 20px;">This is an automated administrative notification. Please do not reply to this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error('[Brevo Error Response]', errData);
    throw new Error(errData?.message || 'Brevo server rejected the credentials email request.');
  }

  console.log('[Brevo Tech] Account credentials email successfully dispatched!');
};

/**
 * Sends a custom password reset link email using Brevo.
 */
export const sendBrevoPasswordResetLink = async (
  email: string,
  fullName: string,
  resetLink: string
): Promise<void> => {
  const apiKey = import.meta.env.VITE_BREVO_API_KEY;

  if (!apiKey) {
    console.log(`[Brevo Fallback Dev Mode] No Brevo API Key found. Reset link for ${email}: ${resetLink}`);
    return;
  }

  console.log(`[Brevo Tech] Attempting to send custom reset link email via Brevo to ${email}`);

  const senderEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL || 'eihubsoi@gmail.com';
  const senderName = import.meta.env.VITE_BREVO_SENDER_NAME || 'EI HUB Admin';

  const response = await fetch('/api-brevo/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email }],
      subject: 'EI HUB - Reset Your Account Password',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; text-align: center; margin-top: 0; font-size: 22px;">EI HUB Password Reset</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Hello ${fullName},</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">We received a request to reset the password for your EI HUB account. Click the button below to securely set a new password. This link is valid for 15 minutes.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Reset Password</a>
          </div>

          <p style="color: #64748b; font-size: 12px; line-height: 1.6; background-color: #f8fafc; padding: 10px; border-radius: 8px; font-family: monospace; word-break: break-all;">
            If the button doesn't work, copy and paste this URL into your browser:<br/>
            <a href="${resetLink}" style="color: #4f46e5;">${resetLink}</a>
          </p>
          
          <p style="color: #64748b; font-size: 11px; text-align: center; margin-top: 25px; border-top: 1px solid #f1f5f9; padding-top: 20px;">If you did not request this update, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error('[Brevo Reset Link Error Response]', errData);
    throw new Error(errData?.message || 'Brevo server rejected the reset link email request.');
  }

  console.log('[Brevo Tech] Custom reset link email successfully dispatched!');
};

