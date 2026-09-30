/**
 * Prabhav Portal - Smart City Civic Waste Management Platform
 * Vanilla JavaScript (UI Interactions & Dummy Data Handlers)
 * Pure JS - No frameworks, minimal & easy to understand for BCA students.
 */

document.addEventListener("DOMContentLoaded", () => {
  const TOKEN_KEY = "prabhav_token";
  function getStoredToken() {
    return localStorage.getItem("prabhav_token") || localStorage.getItem("cleanpulse_token");
  }

  /* ==========================================================================
     1. Navigation & Mobile Menu Toggle (Citizen App)
     ========================================================================== */
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("show");
    });

    // Close menu when a navigation link is clicked
    const navLinks = navMenu.querySelectorAll(".nav-link");
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("show");
        navLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");
      });
    });
  }

  /* ==========================================================================
     2. Report Waste: Location Detection & Dummy Photo Upload
     ========================================================================== */
  const detectLocationBtn = document.getElementById("detectLocationBtn");
  const reportLat = document.getElementById("reportLat");
  const reportLng = document.getElementById("reportLng");
  const locHint = document.getElementById("locHint");

  function handleGeolocation(latInput, lngInput, statusElement, fallbackLocationInput) {
    if (!navigator.geolocation) {
      if (statusElement) {
        statusElement.textContent = "Geolocation is not supported by your browser.";
        statusElement.style.color = "var(--color-red)";
      }
      return;
    }

    if (statusElement) {
      statusElement.textContent = "Detecting current GPS coordinates...";
      statusElement.style.color = "var(--color-cyan)";
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Validate latitude (-90 to 90) and longitude (-180 to 180)
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          if (statusElement) {
            statusElement.textContent = "Invalid GPS coordinates received.";
            statusElement.style.color = "var(--color-red)";
          }
          return;
        }

        if (latInput) latInput.value = lat.toFixed(6);
        if (lngInput) lngInput.value = lng.toFixed(6);
        if (fallbackLocationInput) {
          fallbackLocationInput.value = `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`;
        }

        // Display simple: ✓ Location detected
        if (statusElement) {
          statusElement.textContent = "✓ Location detected";
          statusElement.style.color = "var(--color-green)";
        }
      },
      (error) => {
        let errorMsg = "Unable to retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permission denied. Please allow location access in your browser.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Location request timed out. Please try again.";
        }

        if (statusElement) {
          statusElement.textContent = errorMsg;
          statusElement.style.color = "var(--color-red)";
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  if (detectLocationBtn) {
    detectLocationBtn.addEventListener("click", () => {
      handleGeolocation(reportLat, reportLng, locHint);
    });
  }

  const detectPickupLocationBtn = document.getElementById("detectPickupLocationBtn");
  const pickupLocation = document.getElementById("pickupLocation");
  const pickupLocHint = document.getElementById("pickupLocHint");

  if (detectPickupLocationBtn) {
    detectPickupLocationBtn.addEventListener("click", () => {
      handleGeolocation(null, null, pickupLocHint, pickupLocation);
    });
  }

  // Helper to read and optimize uploaded image to web-ready JPEG base64 Data URL
  function compressAndEncodeImage(file) {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith("image/")) {
        return resolve("");
      }
      const reader = new FileReader();
      reader.onerror = () => resolve("");
      reader.onload = (e) => {
        const rawDataUrl = e.target.result;
        const img = new Image();
        img.onerror = () => resolve(rawDataUrl);
        img.onload = () => {
          try {
            const MAX_DIM = 1200;
            let width = img.width;
            let height = img.height;
            if (width > MAX_DIM || height > MAX_DIM) {
              if (width > height) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              } else {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
            resolve(optimizedDataUrl);
          } catch (err) {
            resolve(rawDataUrl);
          }
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  // File upload state & preview elements
  let currentReportPhotoBase64 = "";
  const reportPhoto = document.getElementById("reportPhoto");
  const uploadText = document.getElementById("uploadText");
  const fileDummyLabel = document.getElementById("fileDummyLabel");
  const filePreviewWrap = document.getElementById("filePreviewWrap");
  const filePreviewThumb = document.getElementById("filePreviewThumb");
  const filePreviewName = document.getElementById("filePreviewName");
  const filePreviewSize = document.getElementById("filePreviewSize");
  const removePhotoBtn = document.getElementById("removePhotoBtn");

  function resetPhotoUploadUI() {
    currentReportPhotoBase64 = "";
    if (reportPhoto) reportPhoto.value = "";
    if (filePreviewWrap) filePreviewWrap.classList.add("hidden");
    if (fileDummyLabel) fileDummyLabel.classList.remove("hidden");
    if (uploadText) {
      uploadText.textContent = "Click or drag photo to upload (PNG, JPG, WebP)";
      uploadText.style.color = "var(--text-secondary)";
    }
  }

  if (reportPhoto) {
    reportPhoto.addEventListener("change", async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const sizeKb = Math.round(file.size / 1024);
        if (uploadText) {
          uploadText.textContent = `Optimizing: ${file.name}...`;
        }

        const dataUrl = await compressAndEncodeImage(file);
        currentReportPhotoBase64 = dataUrl;

        if (filePreviewThumb) filePreviewThumb.src = dataUrl;
        if (filePreviewName) filePreviewName.textContent = file.name;
        if (filePreviewSize) filePreviewSize.textContent = `${sizeKb} KB (Ready)`;

        if (filePreviewWrap) filePreviewWrap.classList.remove("hidden");
        if (fileDummyLabel) fileDummyLabel.classList.add("hidden");
      } else {
        resetPhotoUploadUI();
      }
    });
  }

  if (removePhotoBtn) {
    removePhotoBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      resetPhotoUploadUI();
    });
  }

  /* ==========================================================================
     3. Report Waste Form Submission Handler (Connected to POST /api/complaints)
     ========================================================================== */
  const reportWasteForm = document.getElementById("reportWasteForm");
  const reportSuccessAlert = document.getElementById("reportSuccessAlert");
  const generatedTicketId = document.getElementById("generatedTicketId");

  if (reportWasteForm && reportSuccessAlert) {
    reportWasteForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const token = getStoredToken();
      if (!token) {
        alert("Please sign in or register to submit a municipal waste report.");
        const authModal = document.getElementById("authModal");
        if (authModal) authModal.classList.remove("hidden");
        return;
      }

      const title = document.getElementById("reportTitle").value.trim();
      const category = document.getElementById("reportCategory").value;
      const description = document.getElementById("reportDesc").value.trim();

      // Ensure valid numbers for coordinates
      const rawLat = (reportLat.value || "").toString().replace(/[^0-9.-]/g, '');
      const rawLng = (reportLng.value || "").toString().replace(/[^0-9.-]/g, '');
      const lat = parseFloat(rawLat);
      const lng = parseFloat(rawLng);

      // Validate: latitude: -90 to 90, longitude: -180 to 180
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        alert("Please detect or enter valid coordinates (Latitude: -90 to 90, Longitude: -180 to 180).");
        return;
      }

      const isAnonymous = document.getElementById("reportAnon") ? document.getElementById("reportAnon").checked : false;

      // Ensure image is processed if user selected file right before submitting
      if (!currentReportPhotoBase64 && reportPhoto && reportPhoto.files && reportPhoto.files.length > 0) {
        currentReportPhotoBase64 = await compressAndEncodeImage(reportPhoto.files[0]);
      }
      const imageUrl = currentReportPhotoBase64 || '';

      try {
        const response = await fetch("/api/complaints", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            title,
            category,
            description,
            locationText: `Ward 12, Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`,
            coordinates: { lat, lng },
            isAnonymous,
            imageUrl
          })
        });

        const data = await response.json();

        if (!response.ok) {
          alert(data.error || "Failed to submit waste report.");
          return;
        }

        if (generatedTicketId) {
          generatedTicketId.textContent = data.complaint.complaintId;
        }

        // Show duplicate warning if returned from Haversine calculation
        let warningEl = document.getElementById("reportDuplicateWarning");
        if (data.warning) {
          if (!warningEl) {
            warningEl = document.createElement("div");
            warningEl.id = "reportDuplicateWarning";
            warningEl.style.color = "var(--color-amber)";
            warningEl.style.marginTop = "0.6rem";
            warningEl.style.fontSize = "0.85rem";
            reportSuccessAlert.appendChild(warningEl);
          }
          warningEl.textContent = `⚠️ ${data.warning}`;
          warningEl.classList.remove("hidden");
        } else if (warningEl) {
          warningEl.classList.add("hidden");
        }

        // Show confirmation box
        reportSuccessAlert.classList.remove("hidden");
        reportSuccessAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });

        // Reset input fields and photo preview
        reportWasteForm.reset();
        resetPhotoUploadUI();
        loadCitizenStats();
      } catch (err) {
        alert("Network error: Could not submit complaint to server.");
      }
    });
  }

  /* ==========================================================================
     4. Complaint Tracking (Connected to GET /api/complaints/:id)
     ========================================================================== */
  const trackForm = document.getElementById("trackForm");
  const trackInput = document.getElementById("trackInput");
  const trackTicketId = document.getElementById("trackTicketId");
  const trackCategory = document.getElementById("trackCategory");
  const trackLocation = document.getElementById("trackLocation");
  const trackUpdated = document.getElementById("trackUpdated");
  const stepperProgressBar = document.getElementById("stepperProgressBar");
  const stepReported = document.getElementById("step-reported");
  const stepAssigned = document.getElementById("step-assigned");
  const stepInprogress = document.getElementById("step-inprogress");
  const stepResolved = document.getElementById("step-resolved");
  const stepDetailBox = document.getElementById("stepDetailBox");
  const stepDetailMessage = document.getElementById("stepDetailMessage");

  let currentTrackedComplaint = null;

  async function updateTrackerUI(ticketId) {
    try {
      const response = await fetch(`/api/complaints/${encodeURIComponent(ticketId)}`);
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Complaint ID not found in municipal database.");
        return;
      }

      const complaint = data.complaint;
      currentTrackedComplaint = complaint;

      if (trackTicketId) trackTicketId.textContent = complaint.complaintId;
      if (trackCategory) trackCategory.textContent = complaint.category;
      if (trackLocation) trackLocation.textContent = complaint.locationText || `${complaint.coordinates.lat.toFixed(4)}, ${complaint.coordinates.lng.toFixed(4)}`;
      if (trackUpdated) trackUpdated.textContent = new Date(complaint.updatedAt || complaint.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Evidence Photo in Citizen Tracker
      const trackPhotoItem = document.getElementById("trackPhotoItem");
      const trackPhotoImg = document.getElementById("trackPhotoImg");
      const trackPhotoExpandBtn = document.getElementById("trackPhotoExpandBtn");
      if (trackPhotoItem && trackPhotoImg) {
        const hasPhoto = complaint.imageUrl && (complaint.imageUrl.startsWith("data:image") || complaint.imageUrl.startsWith("http") || complaint.imageUrl.length > 50);
        if (hasPhoto) {
          trackPhotoImg.src = complaint.imageUrl;
          trackPhotoItem.classList.remove("hidden");
          const viewPhotoPopup = () => {
            const w = window.open("");
            if (w) {
              w.document.write(`<title>Evidence Photo: ${complaint.complaintId}</title><body style="margin:0; background:#0b1120; display:flex; align-items:center; justify-content:center; min-height:100vh;"><img src="${complaint.imageUrl}" style="max-width:95%; max-height:95vh; object-fit:contain; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.5);" alt="Evidence"/></body>`);
            }
          };
          trackPhotoImg.onclick = viewPhotoPopup;
          if (trackPhotoExpandBtn) trackPhotoExpandBtn.onclick = viewPhotoPopup;
        } else {
          trackPhotoItem.classList.add("hidden");
        }
      }

      // Step mapping
      const statusStepMap = {
        'Reported': 1,
        'Assigned': 2,
        'In-Progress': 3,
        'Resolved': 4
      };
      const currentStep = statusStepMap[complaint.status] || 1;

      // Reset step styles
      const allSteps = [stepReported, stepAssigned, stepInprogress, stepResolved];
      allSteps.forEach((s) => {
        if (s) {
          s.classList.remove("completed", "active");
          const pulse = s.querySelector(".pulse-dot");
          if (pulse) pulse.remove();
        }
      });

      // Apply active/completed states based on current step index (1-4)
      if (currentStep >= 1 && stepReported) stepReported.classList.add(currentStep === 1 ? "active" : "completed");
      if (currentStep >= 2 && stepAssigned) stepAssigned.classList.add(currentStep === 2 ? "active" : "completed");
      if (currentStep >= 3 && stepInprogress) stepInprogress.classList.add(currentStep === 3 ? "active" : "completed");
      if (currentStep >= 4 && stepResolved) stepResolved.classList.add("completed");

      // Add pulse dot to whichever step is currently active
      const activeStepNode = allSteps[currentStep - 1];
      if (activeStepNode && currentStep < 4) {
        const circle = activeStepNode.querySelector(".step-circle");
        if (circle && !circle.querySelector(".pulse-dot")) {
          const dot = document.createElement("div");
          dot.className = "pulse-dot";
          circle.appendChild(dot);
        }
      }

      // Update progress line percentage
      if (stepperProgressBar) {
        const percentages = { 1: "0%", 2: "33%", 3: "66%", 4: "100%" };
        stepperProgressBar.style.width = percentages[currentStep] || "0%";
      }

      // Update details box text & badge
      if (stepDetailBox) {
        const badgeEl = stepDetailBox.querySelector(".detail-badge");
        if (badgeEl) {
          badgeEl.textContent = `Status: ${complaint.status}`;
          badgeEl.className = `detail-badge ${complaint.status === 'Resolved' ? 'badge-green' : complaint.status === 'In-Progress' ? 'in-progress-badge' : 'badge-amber'}`;
        }
      }
      if (stepDetailMessage) {
        if (complaint.status === 'Reported') {
          stepDetailMessage.innerHTML = `Complaint <strong>${complaint.complaintId}</strong> is registered. Awaiting municipal crew assignment.`;
        } else if (complaint.status === 'Assigned') {
          stepDetailMessage.innerHTML = `Task assigned to local ward sanitation supervisor. Mobilization underway.`;
        } else if (complaint.status === 'In-Progress') {
          stepDetailMessage.innerHTML = `Sanitation vehicle dispatched. Cleanup crew active on site.`;
        } else if (complaint.status === 'Resolved') {
          stepDetailMessage.innerHTML = `Municipal waste cleared successfully and area sanitized.`;
        }

        if (complaint.adminRemarks && complaint.adminRemarks.trim().length > 0) {
          stepDetailMessage.innerHTML += `
            <div class="admin-progress-live-note" style="margin-top:0.65rem; padding:0.5rem 0.75rem; background:var(--surface-soft, #f8fafc); border-left:3px solid var(--primary, #059669); border-radius:4px; font-size:0.88rem; color:var(--text, #1e293b);">
              <span style="font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--primary, #059669); display:block; margin-bottom:2px;">📢 Live Officer Progress Note:</span>
              "${complaint.adminRemarks}"
            </div>
          `;
        }
      }

      // Connect Municipal Action & Resolution Proof Showcase (Before & After Photos + Remarks)
      const resolutionCard = document.getElementById("resolutionShowcaseCard");
      const trackBeforeImg = document.getElementById("trackBeforeImg");
      const trackNoBeforeImg = document.getElementById("trackNoBeforeImg");
      const trackAfterImg = document.getElementById("trackAfterImg");
      const trackNoAfterImg = document.getElementById("trackNoAfterImg");
      const adminRemarksBox = document.getElementById("adminRemarksBox");
      const trackAdminRemarksText = document.getElementById("trackAdminRemarksText");
      const resolutionTimestamp = document.getElementById("resolutionTimestamp");

      if (resolutionCard) {
        const isResolved = complaint.status === 'Resolved';
        const hasAfterPhoto = complaint.resolvedImageUrl && (complaint.resolvedImageUrl.startsWith("data:image") || complaint.resolvedImageUrl.startsWith("http") || complaint.resolvedImageUrl.length > 50);
        const hasRemarks = complaint.adminRemarks && complaint.adminRemarks.trim().length > 0;

        if (isResolved || hasAfterPhoto || hasRemarks) {
          resolutionCard.classList.remove("hidden");

          if (resolutionTimestamp) {
            resolutionTimestamp.textContent = isResolved
              ? `Resolved & Site Cleared on ${new Date(complaint.updatedAt || complaint.createdAt).toLocaleDateString()} at ${new Date(complaint.updatedAt || complaint.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : `Dispatched & Active In Field`;
          }

          // Before Photo
          if (complaint.imageUrl && (complaint.imageUrl.startsWith("data:image") || complaint.imageUrl.startsWith("http") || complaint.imageUrl.length > 50)) {
            if (trackBeforeImg) {
              trackBeforeImg.src = complaint.imageUrl;
              trackBeforeImg.classList.remove("hidden");
              trackBeforeImg.onclick = () => {
                const w = window.open("");
                if (w) w.document.write(`<title>Before Photo: ${complaint.complaintId}</title><body style="margin:0; background:#0b1120; display:flex; align-items:center; justify-content:center; min-height:100vh;"><img src="${complaint.imageUrl}" style="max-width:95%; max-height:95vh; object-fit:contain; border-radius:8px;" alt="Before Evidence"/></body>`);
              };
            }
            if (trackNoBeforeImg) trackNoBeforeImg.classList.add("hidden");
          } else {
            if (trackBeforeImg) trackBeforeImg.classList.add("hidden");
            if (trackNoBeforeImg) trackNoBeforeImg.classList.remove("hidden");
          }

          // After Photo (Proof of Cleanup uploaded by Admin)
          if (hasAfterPhoto) {
            if (trackAfterImg) {
              trackAfterImg.src = complaint.resolvedImageUrl;
              trackAfterImg.classList.remove("hidden");
              trackAfterImg.onclick = () => {
                const w = window.open("");
                if (w) w.document.write(`<title>Resolution Proof (After): ${complaint.complaintId}</title><body style="margin:0; background:#0b1120; display:flex; align-items:center; justify-content:center; min-height:100vh;"><img src="${complaint.resolvedImageUrl}" style="max-width:95%; max-height:95vh; object-fit:contain; border-radius:8px;" alt="Resolution Proof"/></body>`);
              };
            }
            if (trackNoAfterImg) trackNoAfterImg.classList.add("hidden");
          } else {
            if (trackAfterImg) trackAfterImg.classList.add("hidden");
            if (trackNoAfterImg) trackNoAfterImg.classList.remove("hidden");
          }

          // Admin Action Remarks / Custom Text
          if (hasRemarks && adminRemarksBox && trackAdminRemarksText) {
            trackAdminRemarksText.textContent = `"${complaint.adminRemarks}"`;
            adminRemarksBox.classList.remove("hidden");
          } else if (adminRemarksBox) {
            adminRemarksBox.classList.add("hidden");
          }
        } else {
          resolutionCard.classList.add("hidden");
        }
      }

      // Connect Resolved Feedback Widget
      const feedbackBox = document.getElementById("complaintFeedbackContainer");
      const feedbackForm = document.getElementById("complaintFeedbackForm");
      const feedbackSubmittedView = document.getElementById("feedbackSubmittedView");
      const feedbackRatingDisplay = document.getElementById("feedbackRatingDisplay");
      const feedbackCommentDisplay = document.getElementById("feedbackCommentDisplay");

      // Show Swachhta Points Reward Banner for resolved complaints
      const rewardBanner = document.getElementById("complaintRewardBanner");
      if (rewardBanner) {
        if (complaint.status === 'Resolved') {
          rewardBanner.classList.remove("hidden");
        } else {
          rewardBanner.classList.add("hidden");
        }
      }

      if (feedbackBox) {
        if (complaint.status === 'Resolved') {
          feedbackBox.classList.remove("hidden");
          if (complaint.feedbackRating) {
            if (feedbackForm) feedbackForm.classList.add("hidden");
            if (feedbackSubmittedView) {
              feedbackSubmittedView.classList.remove("hidden");
              if (feedbackRatingDisplay) feedbackRatingDisplay.textContent = '★'.repeat(complaint.feedbackRating) + '☆'.repeat(5 - complaint.feedbackRating) + ` (${complaint.feedbackRating}/5)`;
              if (feedbackCommentDisplay) feedbackCommentDisplay.textContent = complaint.feedbackComment ? `"${complaint.feedbackComment}"` : 'No comment provided.';
            }
          } else {
            if (feedbackForm) feedbackForm.classList.remove("hidden");
            if (feedbackSubmittedView) feedbackSubmittedView.classList.add("hidden");
          }
        } else {
          feedbackBox.classList.add("hidden");
        }
      }
    } catch (err) {
      alert("Error contacting server for complaint tracking.");
    }
  }

  if (trackForm && trackInput) {
    trackForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const enteredId = trackInput.value.trim().toUpperCase();
      if (enteredId) {
        updateTrackerUI(enteredId);
      }
    });
  }

  // Handle Feedback Submission for Resolved Complaints
  const complaintFeedbackForm = document.getElementById("complaintFeedbackForm");
  if (complaintFeedbackForm) {
    complaintFeedbackForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const token = getStoredToken();
      if (!token) {
        alert("Please sign in as a citizen to submit feedback.");
        const authModal = document.getElementById("authModal");
        if (authModal) authModal.classList.remove("hidden");
        return;
      }

      if (!currentTrackedComplaint) return;

      const rating = Number(document.getElementById("feedbackRatingSelect").value);
      const comment = document.getElementById("feedbackCommentInput").value.trim();

      try {
        const response = await fetch(`/api/complaints/${currentTrackedComplaint.complaintId}/feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ rating, comment })
        });

        const data = await response.json();
        if (!response.ok) {
          alert(data.error || "Failed to submit feedback.");
          return;
        }

        alert("Thank you! Your resolution feedback has been recorded.");
        updateTrackerUI(currentTrackedComplaint.complaintId);
      } catch (err) {
        alert("Network error: Could not submit feedback.");
      }
    });
  }

  /* ==========================================================================
     4B. Doorstep Waste Pickup & Live Truck Radar Tracker
     ========================================================================== */
  const trackPickupForm = document.getElementById("trackPickupForm");
  const trackPickupInput = document.getElementById("trackPickupInput");
  const trackPickupId = document.getElementById("trackPickupId");
  const trackPickupWasteType = document.getElementById("trackPickupWasteType");
  const trackPickupAddress = document.getElementById("trackPickupAddress");
  const trackPickupDate = document.getElementById("trackPickupDate");
  const pickupStepperProgressBar = document.getElementById("pickupStepperProgressBar");
  const pickupStepRequested = document.getElementById("pickup-step-requested");
  const pickupStepScheduled = document.getElementById("pickup-step-scheduled");
  const pickupStepIntransit = document.getElementById("pickup-step-intransit");
  const pickupStepCollected = document.getElementById("pickup-step-collected");
  const pickupStatusBadge = document.getElementById("pickupStatusBadge");
  const pickupStepDetailMessage = document.getElementById("pickupStepDetailMessage");
  const pickupTruckName = document.getElementById("pickupTruckName");
  const pickupEtaValue = document.getElementById("pickupEtaValue");
  const pickupDriverName = document.getElementById("pickupDriverName");
  const pickupTruckPlate = document.getElementById("pickupTruckPlate");
  const pickupTelemetryText = document.getElementById("pickupTelemetryText");
  const pickupDriverCallBtn = document.getElementById("pickupDriverCallBtn");
  const pickupDriverPhone = document.getElementById("pickupDriverPhone");
  const pickupLiveStatusPill = document.getElementById("pickupLiveStatusPill");
  const pickupAdminProgressText = document.getElementById("pickupAdminProgressText");

  let currentTrackedPickup = null;

  async function updatePickupTrackerUI(pickupId) {
    if (!pickupId) return;
    try {
      const res = await fetch(`/api/pickups/${encodeURIComponent(pickupId)}`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Pickup ID not found in municipal registry.");
        return;
      }

      const p = data.pickup;
      currentTrackedPickup = p;

      if (trackPickupId) trackPickupId.textContent = p.pickupId;
      if (trackPickupWasteType) trackPickupWasteType.textContent = p.wasteType || 'Special Waste';
      if (trackPickupAddress) trackPickupAddress.textContent = p.address || 'Doorstep Address';
      if (trackPickupDate) {
        trackPickupDate.textContent = p.scheduledDate
          ? new Date(p.scheduledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
          : 'Pending schedule';
      }

      // 4-Step Stepper mapping
      // Steps: 1: Requested, 2: Scheduled, 3: In-Transit, 4: Collected/Completed
      const statusMap = {
        'Requested': 1,
        'Scheduled': 2,
        'In-Transit': 3,
        'Collected': 4,
        'Completed': 4
      };
      const currentStep = statusMap[p.status] || (p.status === 'Requested' ? 1 : 2);

      const allPickupSteps = [pickupStepRequested, pickupStepScheduled, pickupStepIntransit, pickupStepCollected];
      allPickupSteps.forEach((s) => {
        if (s) {
          s.classList.remove("completed", "active");
          const pulse = s.querySelector(".pulse-dot");
          if (pulse) pulse.remove();
        }
      });

      if (currentStep >= 1 && pickupStepRequested) pickupStepRequested.classList.add(currentStep === 1 ? "active" : "completed");
      if (currentStep >= 2 && pickupStepScheduled) pickupStepScheduled.classList.add(currentStep === 2 ? "active" : "completed");
      if (currentStep >= 3 && pickupStepIntransit) pickupStepIntransit.classList.add(currentStep === 3 ? "active" : "completed");
      if (currentStep >= 4 && pickupStepCollected) pickupStepCollected.classList.add("completed");

      const activePickupStepNode = allPickupSteps[currentStep - 1];
      if (activePickupStepNode && currentStep < 4) {
        const circle = activePickupStepNode.querySelector(".step-circle");
        if (circle && !circle.querySelector(".pulse-dot")) {
          const dot = document.createElement("div");
          dot.className = "pulse-dot";
          circle.appendChild(dot);
        }
      }

      if (pickupStepperProgressBar) {
        const pcts = { 1: "0%", 2: "33%", 3: "66%", 4: "100%" };
        pickupStepperProgressBar.style.width = pcts[currentStep] || "0%";
      }

      // Status Badge
      if (pickupStatusBadge) {
        pickupStatusBadge.textContent = `Status: ${p.status}`;
        pickupStatusBadge.className = `detail-badge ${p.status === 'Collected' || p.status === 'Completed' ? 'badge-green' : (p.status === 'In-Transit' || p.status === 'Scheduled') ? 'in-progress-badge' : 'badge-amber'}`;
      }

      // Custom Admin Progress Note & Detail Message
      const defaultPickupNotes = {
        'Requested': 'Pickup request logged. Dispatch team is preparing vehicle assignment.',
        'Scheduled': 'Vehicle scheduled for collection slot. Awaiting dispatch to your sector.',
        'In-Transit': 'The truck is dispatched and currently en route to your address.',
        'Collected': 'Special waste collected successfully from your doorstep.',
        'Completed': 'Special waste collected and transferred to recycling facility.'
      };

      const customPickupNote = (p.adminRemarks || p.progressNote || '').trim();
      const displayNote = customPickupNote || defaultPickupNotes[p.status] || 'The truck is dispatched and active.';

      const progressTextEl = document.getElementById("pickupAdminProgressText");
      if (progressTextEl) {
        progressTextEl.textContent = displayNote;
      }

      if (pickupStepDetailMessage) {
        if (p.status === 'Requested') {
          pickupStepDetailMessage.innerHTML = `Pickup request <strong>${p.pickupId}</strong> is logged. Dispatch team is assigning a specialized municipal vehicle.`;
        } else if (p.status === 'Scheduled') {
          pickupStepDetailMessage.innerHTML = `Collection vehicle <strong>${p.assignedVehicle || 'VAN-SPEC-02'}</strong> scheduled. Route preparation in progress for your slot.`;
        } else if (p.status === 'In-Transit') {
          pickupStepDetailMessage.innerHTML = `Municipal Sanitation Truck <strong>${p.assignedVehicle || 'VAN-SPEC-02'}</strong> is on the road and en route.`;
        } else if (p.status === 'Collected' || p.status === 'Completed') {
          pickupStepDetailMessage.innerHTML = `Special waste loaded and collected successfully from your doorstep by crew lead <strong>${p.driverName || 'Municipal Team'}</strong>.`;
        }

        if (customPickupNote) {
          pickupStepDetailMessage.innerHTML += `
            <div class="admin-progress-live-note" style="margin-top:0.65rem; padding:0.5rem 0.75rem; background:var(--surface-soft, #f8fafc); border-left:3px solid var(--primary, #059669); border-radius:4px; font-size:0.88rem; color:var(--text, #1e293b);">
              <span style="font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--primary, #059669); display:block; margin-bottom:2px;">📢 Live Officer Progress Note:</span>
              "${customPickupNote}"
            </div>
          `;
        }
      }

      // Telemetry & Crew details
      const vehicleName = p.assignedVehicle || 'VAN-SPEC-02';
      const plate = p.truckNumber || 'KA-01-EA-4920';
      if (pickupTruckName) pickupTruckName.textContent = `${vehicleName} (${plate})`;
      if (pickupTruckPlate) pickupTruckPlate.textContent = plate;
      if (pickupDriverName) pickupDriverName.textContent = p.driverName || 'Rajesh Kumar (Senior Crew Lead)';
      if (pickupDriverPhone) pickupDriverPhone.textContent = p.driverPhone || '+91 98450 12890';
      if (pickupDriverCallBtn) pickupDriverCallBtn.href = `tel:${(p.driverPhone || '+919845012890').replace(/\s+/g, '')}`;

      const eta = p.etaMinutes ?? 14;
      const dist = p.distanceKm ?? 1.8;
      if (pickupEtaValue) {
        if (p.status === 'Collected' || p.status === 'Completed') {
          pickupEtaValue.textContent = 'Collected & Cleared';
        } else if (p.status === 'Requested') {
          pickupEtaValue.textContent = 'Awaiting Dispatch';
        } else {
          pickupEtaValue.textContent = `${eta} mins (${dist} km away)`;
        }
      }

      if (pickupTelemetryText) {
        if (p.status === 'Collected' || p.status === 'Completed') {
          pickupTelemetryText.textContent = 'Waste was safely transferred to the regional sorting facility.';
        } else if (p.status === 'Requested') {
          pickupTelemetryText.textContent = 'Vehicle will be dispatched from Zonal Depot on the scheduled date.';
        } else {
          pickupTelemetryText.textContent = customPickupNote || `Cruising at ${p.truckLocation?.speedKmH || 26} km/h towards ${p.address || 'doorstep'}. Please keep bulky items accessible.`;
        }
      }

      if (pickupLiveStatusPill) {
        if (p.status === 'Collected' || p.status === 'Completed') {
          pickupLiveStatusPill.className = 'crew-status-pill badge-green';
          pickupLiveStatusPill.textContent = 'Pickup Completed';
        } else if (p.status === 'Requested') {
          pickupLiveStatusPill.className = 'crew-status-pill badge-amber';
          pickupLiveStatusPill.textContent = 'Awaiting Dispatch';
        } else if (p.status === 'In-Transit') {
          pickupLiveStatusPill.className = 'crew-status-pill badge-green';
          pickupLiveStatusPill.textContent = customPickupNote ? 'Updated by Admin' : 'The truck is dispatched';
        } else {
          pickupLiveStatusPill.className = 'crew-status-pill badge-blue';
          pickupLiveStatusPill.textContent = 'Scheduled';
        }
      }

    } catch (err) {
      console.warn("Error tracking pickup:", err);
    }
  }

  // Quick Chips & Form Event Listeners
  if (trackPickupForm && trackPickupInput) {
    trackPickupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const enteredId = trackPickupInput.value.trim().toUpperCase();
      if (enteredId) {
        updatePickupTrackerUI(enteredId);
      }
    });
  }

  document.querySelectorAll(".chip-pickup").forEach(btn => {
    btn.addEventListener("click", () => {
      const pid = btn.getAttribute("data-id");
      if (pid && trackPickupInput) {
        trackPickupInput.value = pid;
        updatePickupTrackerUI(pid);
      }
    });
  });

  document.querySelectorAll(".chip-complaint").forEach(btn => {
    btn.addEventListener("click", () => {
      const cid = btn.getAttribute("data-id");
      if (cid && trackInput) {
        trackInput.value = cid;
        updateTrackerUI(cid);
      }
    });
  });

  window.trackPickupRef = (pid) => {
    if (trackPickupInput) trackPickupInput.value = pid;
    updatePickupTrackerUI(pid);
    const sec = document.getElementById("track");
    if (sec) sec.scrollIntoView({ behavior: "smooth" });
  };

  /* ==========================================================================
     5. Doorstep Pickup Request Submission Handler (Connected to POST /api/pickups)
     ========================================================================== */
  const pickupForm = document.getElementById("pickupForm");
  const pickupSuccessAlert = document.getElementById("pickupSuccessAlert");
  const pickupBookingId = document.getElementById("pickupBookingId");

  if (pickupForm && pickupSuccessAlert) {
    pickupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        alert("Please sign in or register as a citizen to schedule a bulky waste pickup.");
        const authModal = document.getElementById("authModal");
        if (authModal) authModal.classList.remove("hidden");
        return;
      }

      const wasteType = document.getElementById("pickupWasteType").value;
      const address = document.getElementById("pickupAddress").value.trim();
      const scheduledDate = document.getElementById("pickupDate").value;

      try {
        const response = await fetch("/api/pickups", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            wasteType,
            address,
            scheduledDate
          })
        });

        const data = await response.json();

        if (!response.ok) {
          alert(data.error || "Failed to schedule pickup.");
          return;
        }

        if (pickupBookingId) {
          pickupBookingId.innerHTML = `${data.pickup.pickupId} &nbsp;&bull;&nbsp; <button type="button" class="btn btn-sm btn-ghost" style="text-decoration:underline; font-weight:700; color:var(--primary); padding:2px 8px; font-size:11px; margin-left:4px; cursor:pointer;" onclick="window.trackPickupRef && window.trackPickupRef('${data.pickup.pickupId}')">Track Van Live ➔</button>`;
        }

        pickupSuccessAlert.classList.remove("hidden");
        pickupSuccessAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
        pickupForm.reset();
        loadCitizenStats();

        // Also auto-load this newly requested pickup into the truck tracker column
        if (trackPickupInput) {
          trackPickupInput.value = data.pickup.pickupId;
        }
        if (typeof updatePickupTrackerUI === 'function') {
          updatePickupTrackerUI(data.pickup.pickupId);
        }
      } catch (err) {
        alert("Network error: Could not schedule pickup with server.");
      }
    });
  }

  /* ==========================================================================
     6. AI Waste Assistant (Connected to POST /api/ai/classify)
     ========================================================================== */
  const aiWasteInput = document.getElementById("aiWasteInput");
  const aiAnalyzeBtn = document.getElementById("aiAnalyzeBtn");
  const aiItemName = document.getElementById("aiItemName");
  const aiCategoryBadge = document.getElementById("aiCategoryBadge");
  const aiBinName = document.getElementById("aiBinName");
  const aiRecyclability = document.getElementById("aiRecyclability");
  const aiTip = document.getElementById("aiTip");
  const sampleChipButtons = document.querySelectorAll(".chip-btn");

  async function analyzeWasteItem(query) {
    if (!query) return;
    const cleanQuery = query.trim();

    // Visual feedback while fetching AI result
    if (aiAnalyzeBtn) {
      aiAnalyzeBtn.disabled = true;
      aiAnalyzeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
        Analyzing...
      `;
    }

    try {
      const response = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: cleanQuery })
      });

      const data = await response.json();

      if (aiItemName) {
        aiItemName.textContent = cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1);
      }

      const binColor = (data.binColor || "Blue").toLowerCase();
      let badgeClass = "badge-blue";
      let textClass = "text-blue";

      if (binColor.includes("green")) {
        badgeClass = "badge-green";
        textClass = "text-green";
      } else if (binColor.includes("red")) {
        badgeClass = "badge-red";
        textClass = "text-red";
      } else if (binColor.includes("yellow") || binColor.includes("amber")) {
        badgeClass = "badge-amber";
        textClass = "text-amber";
      }

      if (aiCategoryBadge) {
        aiCategoryBadge.textContent = data.category || "General Waste";
        aiCategoryBadge.className = `badge-status ${badgeClass}`;
      }

      if (aiBinName) {
        aiBinName.textContent = `${data.binColor || "Blue"} Bin`;
        aiBinName.className = `result-value ${textClass}`;
      }

      if (aiRecyclability) {
        if (binColor.includes("green")) {
          aiRecyclability.textContent = "100% Biodegradable & Compostable";
        } else if (binColor.includes("red")) {
          aiRecyclability.textContent = "Hazardous Material - Special Processing";
        } else {
          aiRecyclability.textContent = "Recyclable / Circular Material";
        }
      }

      if (aiTip) {
        aiTip.textContent = data.disposalTip || "Dispose as per local municipal waste segregation rules.";
      }
    } catch (err) {
      console.warn("Could not classify waste item:", err);
      if (aiTip) {
        aiTip.textContent = "Could not contact AI service. Please ensure the server is running.";
      }
    } finally {
      if (aiAnalyzeBtn) {
        aiAnalyzeBtn.disabled = false;
        aiAnalyzeBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          Analyze Waste
        `;
      }
    }
  }

  if (aiAnalyzeBtn && aiWasteInput) {
    aiAnalyzeBtn.addEventListener("click", () => {
      analyzeWasteItem(aiWasteInput.value);
    });

    aiWasteInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        analyzeWasteItem(aiWasteInput.value);
      }
    });
  }

  // Preset chips click
  sampleChipButtons.forEach((chip) => {
    chip.addEventListener("click", () => {
      const query = chip.getAttribute("data-query");
      if (aiWasteInput) aiWasteInput.value = query;
      analyzeWasteItem(query);
    });
  });

  /* ==========================================================================
     7. Admin Portal: Sidebar, Table Filters, KPIs, Pickups, Feedback & Leaflet Hotspot Map
     ========================================================================== */
  const sidebarToggle = document.getElementById("sidebarToggle");
  const adminSidebar = document.getElementById("adminSidebar");

  if (sidebarToggle && adminSidebar) {
    sidebarToggle.addEventListener("click", () => {
      adminSidebar.classList.toggle("show");
    });
  }

  const liveDate = document.getElementById("liveDate");
  if (liveDate) {
    const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    liveDate.textContent = new Date().toLocaleDateString(undefined, options);
  }

  // Complaints Table Status Filter Tabs
  const filterTabs = document.querySelectorAll(".filter-tab");
  const complaintsTable = document.getElementById("complaintsTable");

  if (filterTabs.length > 0 && complaintsTable) {
    filterTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        filterTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        const filterValue = tab.getAttribute("data-filter");
        const rows = complaintsTable.querySelectorAll("tbody tr");

        rows.forEach((row) => {
          const rowStatus = row.getAttribute("data-status");
          if (filterValue === "all" || rowStatus === filterValue) {
            row.style.display = "";
          } else {
            row.style.display = "none";
          }
        });
      });
    });
  }

  // Haversine distance in meters for grouping complaints into ~500m clusters
  function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // 1. KPI Cards Updater
  function updateAdminKPIs(complaints, pickups) {
    const totalEl = document.getElementById("kpiTotalComplaints");
    const reportedEl = document.getElementById("kpiReportedComplaints");
    const inprogressEl = document.getElementById("kpiInprogressComplaints");
    const resolvedEl = document.getElementById("kpiResolvedComplaints");
    const ratingEl = document.getElementById("kpiAverageRating");
    const ratingStarsEl = document.getElementById("kpiRatingStars");
    const ratingSubEl = document.getElementById("kpiRatingSub");
    const pickupsEl = document.getElementById("kpiTotalPickups");

    if (totalEl) totalEl.textContent = complaints.length;
    if (reportedEl) reportedEl.textContent = complaints.filter(c => c.status === 'Reported').length;
    if (inprogressEl) inprogressEl.textContent = complaints.filter(c => c.status === 'In-Progress' || c.status === 'Assigned').length;
    if (resolvedEl) resolvedEl.textContent = complaints.filter(c => c.status === 'Resolved').length;
    if (pickupsEl) pickupsEl.textContent = pickups ? pickups.length : 0;

    // Average rating from complaints with feedbackRating
    const ratedComplaints = complaints.filter(c => typeof c.feedbackRating === 'number' && c.feedbackRating > 0);
    if (ratingEl) {
      if (ratedComplaints.length > 0) {
        const avg = (ratedComplaints.reduce((acc, c) => acc + c.feedbackRating, 0) / ratedComplaints.length).toFixed(1);
        ratingEl.innerHTML = `${avg} <small>/ 5.0</small>`;
        if (ratingStarsEl) {
          const fullStars = Math.round(Number(avg));
          ratingStarsEl.textContent = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
        }
        if (ratingSubEl) {
          ratingSubEl.textContent = `Based on ${ratedComplaints.length} citizen review${ratedComplaints.length > 1 ? 's' : ''}`;
        }
      } else {
        ratingEl.innerHTML = `5.0 <small>/ 5.0</small>`;
        if (ratingSubEl) ratingSubEl.textContent = `Based on verified citizen feedback`;
      }
    }
  }

  // Cache loaded complaints for inspection & resolution modals
  let adminLoadedComplaints = [];

  // ==========================================================================
  // Resolution Proof Modal Logic (Required 'After' Photo + Custom Remarks)
  // ==========================================================================
  let currentResolveAfterPhotoBase64 = "";
  let activeResolveComplaintId = null;

  const resolveComplaintModal = document.getElementById("resolveComplaintModal");
  const closeResolveModalBtn = document.getElementById("closeResolveModalBtn");
  const cancelResolveBtn = document.getElementById("cancelResolveBtn");
  const resolveComplaintForm = document.getElementById("resolveComplaintForm");
  const resolveTargetId = document.getElementById("resolveTargetId");
  const resolveTargetCategory = document.getElementById("resolveTargetCategory");
  const resolveTargetLocation = document.getElementById("resolveTargetLocation");
  const resolveAfterPhotoInput = document.getElementById("resolveAfterPhotoInput");
  const afterPhotoDummyLabel = document.getElementById("afterPhotoDummyLabel");
  const afterPhotoPreviewWrap = document.getElementById("afterPhotoPreviewWrap");
  const afterPhotoPreviewThumb = document.getElementById("afterPhotoPreviewThumb");
  const afterPhotoPreviewName = document.getElementById("afterPhotoPreviewName");
  const afterPhotoPreviewSize = document.getElementById("afterPhotoPreviewSize");
  const removeAfterPhotoBtn = document.getElementById("removeAfterPhotoBtn");
  const resolveRemarksInput = document.getElementById("resolveRemarksInput");
  const resolveAlert = document.getElementById("resolveAlert");

  function resetResolveModalUI() {
    currentResolveAfterPhotoBase64 = "";
    activeResolveComplaintId = null;
    if (resolveAfterPhotoInput) resolveAfterPhotoInput.value = "";
    if (afterPhotoPreviewWrap) afterPhotoPreviewWrap.classList.add("hidden");
    if (afterPhotoDummyLabel) afterPhotoDummyLabel.classList.remove("hidden");
    if (resolveRemarksInput) resolveRemarksInput.value = "";
    if (resolveAlert) {
      resolveAlert.classList.add("hidden");
      resolveAlert.textContent = "";
    }
  }

  function openResolveComplaintModal(complaintId) {
    const c = adminLoadedComplaints.find(item => item.complaintId === complaintId);
    if (!c) return;

    resetResolveModalUI();
    activeResolveComplaintId = complaintId;

    if (resolveTargetId) resolveTargetId.textContent = c.complaintId;
    if (resolveTargetCategory) resolveTargetCategory.textContent = c.category;
    if (resolveTargetLocation) resolveTargetLocation.textContent = c.locationText || c.title || 'Geotagged Location';
    if (resolveRemarksInput) resolveRemarksInput.value = c.adminRemarks || '';

    // If complaint already has an After photo proof, preload it into the preview
    if (c.resolvedImageUrl && (c.resolvedImageUrl.startsWith("data:image") || c.resolvedImageUrl.startsWith("http") || c.resolvedImageUrl.length > 50)) {
      currentResolveAfterPhotoBase64 = c.resolvedImageUrl;
      if (afterPhotoPreviewThumb) afterPhotoPreviewThumb.src = c.resolvedImageUrl;
      if (afterPhotoPreviewName) afterPhotoPreviewName.textContent = "Current 'After' Proof";
      if (afterPhotoPreviewSize) afterPhotoPreviewSize.textContent = "Attached";
      if (afterPhotoPreviewWrap) afterPhotoPreviewWrap.classList.remove("hidden");
      if (afterPhotoDummyLabel) afterPhotoDummyLabel.classList.add("hidden");
    }

    if (resolveComplaintModal) resolveComplaintModal.classList.remove("hidden");
  }

  // Handle 'After' photo file selection
  if (resolveAfterPhotoInput) {
    resolveAfterPhotoInput.addEventListener("change", async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const sizeKb = Math.round(file.size / 1024);
        const dataUrl = await compressAndEncodeImage(file);
        currentResolveAfterPhotoBase64 = dataUrl;

        if (afterPhotoPreviewThumb) afterPhotoPreviewThumb.src = dataUrl;
        if (afterPhotoPreviewName) afterPhotoPreviewName.textContent = file.name;
        if (afterPhotoPreviewSize) afterPhotoPreviewSize.textContent = `${sizeKb} KB (Ready)`;
        if (afterPhotoPreviewWrap) afterPhotoPreviewWrap.classList.remove("hidden");
        if (afterPhotoDummyLabel) afterPhotoDummyLabel.classList.add("hidden");
      }
    });
  }

  if (removeAfterPhotoBtn) {
    removeAfterPhotoBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      currentResolveAfterPhotoBase64 = "";
      if (resolveAfterPhotoInput) resolveAfterPhotoInput.value = "";
      if (afterPhotoPreviewWrap) afterPhotoPreviewWrap.classList.add("hidden");
      if (afterPhotoDummyLabel) afterPhotoDummyLabel.classList.remove("hidden");
    });
  }

  if (closeResolveModalBtn && resolveComplaintModal) {
    closeResolveModalBtn.addEventListener("click", () => {
      resolveComplaintModal.classList.add("hidden");
      resetResolveModalUI();
    });
  }

  if (cancelResolveBtn && resolveComplaintModal) {
    cancelResolveBtn.addEventListener("click", () => {
      resolveComplaintModal.classList.add("hidden");
      resetResolveModalUI();
    });
  }

  if (resolveComplaintModal) {
    resolveComplaintModal.addEventListener("click", (e) => {
      if (e.target === resolveComplaintModal) {
        resolveComplaintModal.classList.add("hidden");
        resetResolveModalUI();
      }
    });
  }

  // Handle Resolution Form Submit (Upload After Photo + Custom Action Remarks)
  if (resolveComplaintForm) {
    resolveComplaintForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!activeResolveComplaintId) return;

      if (!currentResolveAfterPhotoBase64) {
        alert("Please upload an 'After' resolution photo proof before marking this complaint as Resolved.");
        return;
      }

      const adminRemarks = resolveRemarksInput ? resolveRemarksInput.value.trim() : "";
      const token = localStorage.getItem(TOKEN_KEY);

      try {
        const patchRes = await fetch(`/api/complaints/${activeResolveComplaintId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            status: "Resolved",
            resolvedImageUrl: currentResolveAfterPhotoBase64,
            adminRemarks: adminRemarks
          })
        });

        const patchData = await patchRes.json();
        if (!patchRes.ok) {
          alert(patchData.error || "Failed to resolve complaint.");
          return;
        }

        resolveComplaintModal.classList.add("hidden");
        if (imageVerifyModal) imageVerifyModal.classList.add("hidden");
        resetResolveModalUI();

        alert(`✓ Grievance resolved successfully! 'After' cleanup proof recorded and 10 Swachhta Points awarded to reporter.`);
        loadAdminDashboard();
      } catch (err) {
        alert("Network error: Could not complete resolution.");
      }
    });
  }

  // ==========================================================================
  // Open Evidence Photo Inspection Modal
  // ==========================================================================
  function openImageVerifyModal(complaintId) {
    const c = adminLoadedComplaints.find(item => item.complaintId === complaintId);
    if (!c) return;

    const modal = document.getElementById("imageVerifyModal");
    const modalTitle = document.getElementById("verifyModalTitle");
    const modalImg = document.getElementById("verifyModalImg");
    const modalNoImg = document.getElementById("verifyModalNoImg");
    const verifyBeforeSection = document.getElementById("verifyBeforeSection");
    const verifyAfterSection = document.getElementById("verifyAfterSection");
    const verifyModalAfterImg = document.getElementById("verifyModalAfterImg");
    const verifyRemarksItem = document.getElementById("verifyRemarksItem");
    const verifyRemarksText = document.getElementById("verifyRemarksText");
    const verifyOpenResolveBtn = document.getElementById("verifyOpenResolveBtn");

    const verifyId = document.getElementById("verifyComplaintId");
    const verifyCat = document.getElementById("verifyCategory");
    const verifyLoc = document.getElementById("verifyLocation");
    const verifyCoords = document.getElementById("verifyCoords");
    const verifyReporter = document.getElementById("verifyReporter");
    const verifyDesc = document.getElementById("verifyDescription");
    const verifyBadge = document.getElementById("verifyStatusBadge");

    if (!modal) return;

    if (modalTitle) modalTitle.textContent = `Evidence Verification — ${c.complaintId}`;
    if (verifyId) verifyId.textContent = c.complaintId;
    if (verifyCat) verifyCat.textContent = c.category;
    if (verifyLoc) verifyLoc.textContent = c.locationText || c.title || 'Geotagged Location';
    if (verifyCoords) {
      const latLngStr = (c.coordinates && typeof c.coordinates.lat === 'number')
        ? `${c.coordinates.lat.toFixed(5)}, ${c.coordinates.lng.toFixed(5)}`
        : 'N/A';
      verifyCoords.textContent = latLngStr;
    }
    if (verifyReporter) verifyReporter.textContent = c.isAnonymous ? 'Anonymous Citizen' : (c.reporterName || 'Citizen');
    if (verifyDesc) verifyDesc.textContent = c.description || 'No additional details entered.';
    if (verifyBadge) {
      verifyBadge.textContent = c.status;
      const statusClass = c.status === "Resolved" ? "badge-green" : (c.status === "In-Progress" || c.status === "Assigned") ? "badge-blue" : "badge-amber";
      verifyBadge.className = `badge-status ${statusClass}`;
    }

    // Citizen Evidence (Before Photo)
    const hasBefore = c.imageUrl && (c.imageUrl.startsWith("data:image") || c.imageUrl.startsWith("http") || c.imageUrl.length > 50);
    if (hasBefore) {
      if (modalImg) modalImg.src = c.imageUrl;
      if (verifyBeforeSection) verifyBeforeSection.classList.remove("hidden");
      if (modalNoImg) modalNoImg.classList.add("hidden");
    } else {
      if (verifyBeforeSection) verifyBeforeSection.classList.add("hidden");
      if (modalNoImg) modalNoImg.classList.remove("hidden");
    }

    // Municipal Proof (After Photo)
    const hasAfter = c.resolvedImageUrl && (c.resolvedImageUrl.startsWith("data:image") || c.resolvedImageUrl.startsWith("http") || c.resolvedImageUrl.length > 50);
    if (hasAfter && verifyAfterSection && verifyModalAfterImg) {
      verifyModalAfterImg.src = c.resolvedImageUrl;
      verifyAfterSection.classList.remove("hidden");
    } else if (verifyAfterSection) {
      verifyAfterSection.classList.add("hidden");
    }

    // Municipal Action Remarks (Custom text)
    if (c.adminRemarks && verifyRemarksItem && verifyRemarksText) {
      verifyRemarksText.textContent = `"${c.adminRemarks}"`;
      verifyRemarksItem.classList.remove("hidden");
    } else if (verifyRemarksItem) {
      verifyRemarksItem.classList.add("hidden");
    }

    // Wire up resolve button inside verification modal
    if (verifyOpenResolveBtn) {
      verifyOpenResolveBtn.textContent = c.status === "Resolved"
        ? "📷 Update 'After' Photo & Remarks"
        : "✓ Upload 'After' Photo & Resolve (+10 Pts)";
      verifyOpenResolveBtn.onclick = () => {
        modal.classList.add("hidden");
        openResolveComplaintModal(c.complaintId);
      };
    }

    modal.setAttribute("data-active-id", c.complaintId);
    modal.classList.remove("hidden");
  }

  window.inspectAdminComplaintPhoto = openImageVerifyModal;

  // Setup Verification Modal Listeners
  const imageVerifyModal = document.getElementById("imageVerifyModal");
  const closeVerifyModalBtn = document.getElementById("closeVerifyModalBtn");

  if (closeVerifyModalBtn && imageVerifyModal) {
    closeVerifyModalBtn.addEventListener("click", () => {
      imageVerifyModal.classList.add("hidden");
    });
  }

  if (imageVerifyModal) {
    imageVerifyModal.addEventListener("click", (e) => {
      if (e.target === imageVerifyModal) {
        imageVerifyModal.classList.add("hidden");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (resolveComplaintModal && !resolveComplaintModal.classList.contains("hidden")) {
          resolveComplaintModal.classList.add("hidden");
        } else if (imageVerifyModal && !imageVerifyModal.classList.contains("hidden")) {
          imageVerifyModal.classList.add("hidden");
        }
      }
    });

    // Wire up quick status update buttons inside modal
    const actionBtns = imageVerifyModal.querySelectorAll(".verify-action-btn");
    actionBtns.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const complaintId = imageVerifyModal.getAttribute("data-active-id");
        const newStatus = btn.getAttribute("data-status");
        if (!complaintId || !newStatus) return;

        const token = localStorage.getItem(TOKEN_KEY);
        try {
          const patchRes = await fetch(`/api/complaints/${complaintId}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
          });

          if (patchRes.ok) {
            imageVerifyModal.classList.add("hidden");
            alert(`✓ Status updated to ${newStatus}.`);
            loadAdminDashboard();
          } else {
            const errData = await patchRes.json();
            alert(errData.error || "Failed to update complaint status.");
          }
        } catch (err) {
          alert("Error updating complaint status.");
        }
      });
    });
  }

  // 2 & 3. Complaint Table & Status Update (PATCH /api/complaints/:id/status)
  function renderAdminComplaintsTable(complaints) {
    if (!complaintsTable) return;
    const tbody = complaintsTable.querySelector("tbody");
    if (!tbody) return;

    adminLoadedComplaints = complaints;

    if (complaints.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No citizen complaints recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    complaints.forEach((c) => {
      const tr = document.createElement("tr");
      tr.setAttribute("data-status", c.status);
      const statusClass = c.status === "Resolved" ? "badge-green" : (c.status === "In-Progress" || c.status === "Assigned") ? "badge-blue" : "badge-amber";
      const coordsText = (c.coordinates && typeof c.coordinates.lat === 'number')
        ? `${c.coordinates.lat.toFixed(4)}, ${c.coordinates.lng.toFixed(4)}`
        : 'N/A';

      const pointsTag = (c.status === "Resolved" || c.pointsAwarded)
        ? `<span class="badge-status badge-gold" style="font-size:0.68rem; display:block; margin-top:3px; background:#fefce8; color:#ca8a04; border:1px solid #fef08a;">⭐ +10 Pts Awarded</span>`
        : '';

      const hasBefore = c.imageUrl && (c.imageUrl.startsWith("data:image") || c.imageUrl.startsWith("http") || c.imageUrl.length > 50);
      const hasAfter = c.resolvedImageUrl && (c.resolvedImageUrl.startsWith("data:image") || c.resolvedImageUrl.startsWith("http") || c.resolvedImageUrl.length > 50);

      let photoHtml = "";
      if (hasBefore && hasAfter) {
        photoHtml = `
          <div class="evidence-dual-cell">
            <div class="evidence-thumb-wrap" title="Citizen Evidence (Before)">
              <img src="${c.imageUrl}" class="evidence-thumb" data-id="${c.complaintId}" />
              <span class="thumb-badge before-badge">Before</span>
            </div>
            <div class="evidence-thumb-wrap" title="Municipal Resolution (After)">
              <img src="${c.resolvedImageUrl}" class="evidence-thumb" data-id="${c.complaintId}" />
              <span class="thumb-badge after-badge">After</span>
            </div>
            <button type="button" class="btn-verify-photo" data-id="${c.complaintId}">Inspect</button>
          </div>
        `;
      } else if (hasBefore) {
        photoHtml = `
          <div class="evidence-cell">
            <div class="evidence-thumb-wrap" title="Citizen Evidence (Before)">
              <img src="${c.imageUrl}" class="evidence-thumb" data-id="${c.complaintId}" />
              <span class="thumb-badge before-badge">Before</span>
            </div>
            <button type="button" class="btn-verify-photo" data-id="${c.complaintId}">Inspect</button>
          </div>
        `;
      } else if (hasAfter) {
        photoHtml = `
          <div class="evidence-cell">
            <div class="evidence-thumb-wrap" title="Municipal Resolution (After)">
              <img src="${c.resolvedImageUrl}" class="evidence-thumb" data-id="${c.complaintId}" />
              <span class="thumb-badge after-badge">After</span>
            </div>
            <button type="button" class="btn-verify-photo" data-id="${c.complaintId}">Inspect</button>
          </div>
        `;
      } else {
        photoHtml = `
          <span class="no-photo-badge" title="No photo uploaded">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.6;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            No Photo
          </span>
        `;
      }

      const isResolved = c.status === "Resolved";
      const resolveButtonHtml = isResolved
        ? `<button type="button" class="btn btn-xs btn-outline btn-open-resolve" data-id="${c.complaintId}" title="View or update After photo proof">📷 Edit Proof</button>`
        : `<button type="button" class="btn btn-xs btn-primary btn-open-resolve" data-id="${c.complaintId}">✓ Resolve + Proof</button>`;

      tr.innerHTML = `
        <td><strong>${c.complaintId}</strong></td>
        <td><span class="category-pill">${c.category}</span></td>
        <td>${photoHtml}</td>
        <td>${c.locationText || c.title}</td>
        <td><code style="font-size: 0.78rem; color: var(--color-cyan);">${coordsText}</code></td>
        <td>
          <span class="badge-status ${statusClass}">${c.status}</span>
          ${pointsTag}
        </td>
        <td>${new Date(c.createdAt).toLocaleDateString()}</td>
        <td>
          <div class="action-column-wrap">
            <select class="form-control status-update-select" data-id="${c.complaintId}" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.78rem;">
              <option value="Reported" ${c.status === "Reported" ? "selected" : ""}>Reported</option>
              <option value="Assigned" ${c.status === "Assigned" ? "selected" : ""}>Assigned</option>
              <option value="In-Progress" ${c.status === "In-Progress" ? "selected" : ""}>In-Progress</option>
              <option value="Resolved" ${c.status === "Resolved" ? "selected" : ""}>Resolved</option>
            </select>
            ${resolveButtonHtml}
            <div class="action-remarks-row">
              <input type="text" class="form-control admin-action-input" data-id="${c.complaintId}" placeholder="Action note..." value="${c.adminRemarks || ''}" title="Enter custom action remarks and click save (💾)">
              <button type="button" class="btn-save-remarks" data-id="${c.complaintId}" title="Save Action Remarks">💾</button>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Wire up thumbnail and verify button clicks
    const verifyTriggers = tbody.querySelectorAll(".evidence-thumb, .btn-verify-photo");
    verifyTriggers.forEach((trigger) => {
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const cid = trigger.getAttribute("data-id");
        openImageVerifyModal(cid);
      });
    });

    // Wire up 'Resolve + Proof' buttons
    const resolveBtns = tbody.querySelectorAll(".btn-open-resolve");
    resolveBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const cid = btn.getAttribute("data-id");
        openResolveComplaintModal(cid);
      });
    });

    // Wire up saving action remarks (Custom text field)
    const saveRemarksBtns = tbody.querySelectorAll(".btn-save-remarks");
    saveRemarksBtns.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const cid = btn.getAttribute("data-id");
        const input = tbody.querySelector(`.admin-action-input[data-id="${cid}"]`);
        if (!input) return;
        const remarks = input.value.trim();
        const c = adminLoadedComplaints.find(item => item.complaintId === cid);
        if (!c) return;

        const token = localStorage.getItem(TOKEN_KEY);
        try {
          const patchRes = await fetch(`/api/complaints/${cid}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              status: c.status,
              resolvedImageUrl: c.resolvedImageUrl || '',
              adminRemarks: remarks
            })
          });

          if (patchRes.ok) {
            btn.textContent = "✓ Saved";
            btn.style.background = "#059669";
            btn.style.color = "#ffffff";
            c.adminRemarks = remarks;
            setTimeout(() => {
              btn.textContent = "Save";
              btn.disabled = false;
              btn.style.background = "";
              btn.style.color = "";
            }, 1200);
          } else {
            btn.textContent = "Save";
            btn.disabled = false;
            const err = await patchRes.json();
            alert(err.error || "Failed to save remarks.");
          }
        } catch (err) {
          btn.textContent = "Save";
          btn.disabled = false;
          alert("Error saving remarks.");
        }
      });
    });

    // Also support Enter key inside action remarks input
    const remarksInputs = tbody.querySelectorAll(".admin-action-input");
    remarksInputs.forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const cid = input.getAttribute("data-id");
          const saveBtn = tbody.querySelector(`.btn-save-remarks[data-id="${cid}"]`);
          if (saveBtn) saveBtn.click();
        }
      });
    });

    // Hook up status changes
    const selects = tbody.querySelectorAll(".status-update-select");
    selects.forEach((sel) => {
      sel.addEventListener("change", async () => {
        const complaintId = sel.getAttribute("data-id");
        const newStatus = sel.value;
        const c = adminLoadedComplaints.find(item => item.complaintId === complaintId);

        // If user changed status to 'Resolved', require the 'After' photo via the resolution modal
        if (newStatus === "Resolved") {
          openResolveComplaintModal(complaintId);
          if (c) sel.value = c.status; // Revert select until modal confirms
          return;
        }

        const input = tbody.querySelector(`.admin-action-input[data-id="${complaintId}"]`);
        const currentRemarks = input ? input.value.trim() : (c ? c.adminRemarks : '');

        const token = localStorage.getItem(TOKEN_KEY);
        try {
          const patchRes = await fetch(`/api/complaints/${complaintId}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              status: newStatus,
              adminRemarks: currentRemarks
            })
          });

          if (patchRes.ok) {
            loadAdminDashboard();
          } else {
            const errData = await patchRes.json();
            alert(errData.error || "Failed to update status.");
            if (c) sel.value = c.status;
          }
        } catch (err) {
          alert("Error updating complaint status.");
          if (c) sel.value = c.status;
        }
      });
    });
  }

  // 4. Pickup Table & Status Update (PATCH /api/pickups/:id/status)
  function renderAdminPickupsTable(pickups) {
    const pickupsTable = document.getElementById("pickupsTable");
    if (!pickupsTable) return;
    const tbody = pickupsTable.querySelector("tbody");
    if (!tbody) return;

    if (pickups.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No doorstep pickup requests booked yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    pickups.forEach((p) => {
      const tr = document.createElement("tr");
      const statusClass = (p.status === "Collected" || p.status === "Completed") ? "badge-green" : (p.status === "In-Transit" || p.status === "Scheduled") ? "badge-blue" : "badge-amber";
      const vehicleInfo = `${p.assignedVehicle || 'VAN-SPEC-02'} (${p.truckNumber || 'KA-01-EA-4920'})`;
      const currentNote = p.adminRemarks || p.progressNote || '';

      tr.innerHTML = `
        <td><strong>${p.pickupId}</strong></td>
        <td>${p.wasteType}</td>
        <td>${p.address}</td>
        <td>${new Date(p.scheduledDate).toLocaleDateString()}</td>
        <td><code>${vehicleInfo}</code></td>
        <td><span class="badge-status ${statusClass}">${p.status}</span></td>
        <td>
          <div class="action-column-wrap" style="display:flex; flex-direction:column; gap:0.35rem; min-width:260px;">
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <select class="form-control pickup-status-select" data-id="${p.pickupId}" style="flex:1; padding:0.25rem 0.5rem; font-size:0.78rem;">
                <option value="Requested" ${p.status === "Requested" ? "selected" : ""}>Requested</option>
                <option value="Scheduled" ${p.status === "Scheduled" ? "selected" : ""}>Scheduled</option>
                <option value="In-Transit" ${p.status === "In-Transit" ? "selected" : ""}>In-Transit (Dispatched)</option>
                <option value="Collected" ${p.status === "Collected" || p.status === "Completed" ? "selected" : ""}>Collected</option>
              </select>
              <a href="/#track" target="_blank" class="btn btn-xs btn-outline" style="padding:0.25rem 0.5rem; font-size:0.75rem; white-space:nowrap;" title="View Citizen Tracker">Track</a>
            </div>
            <div class="action-remarks-row" style="display:flex; gap:0.35rem; align-items:center;">
              <input type="text" class="form-control admin-pickup-progress-input" data-id="${p.pickupId}" placeholder="e.g. The truck is dispatched..." value="${currentNote}" title="Enter custom progress text (e.g. The truck is dispatched)" style="font-size:0.78rem; padding:0.25rem 0.5rem; flex:1;">
              <button type="button" class="btn btn-xs btn-primary btn-save-pickup-progress" data-id="${p.pickupId}" title="Save Progress Update">Save</button>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Save custom progress update for pickup
    const savePickupBtns = tbody.querySelectorAll(".btn-save-pickup-progress");
    savePickupBtns.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const pickupId = btn.getAttribute("data-id");
        const input = tbody.querySelector(`.admin-pickup-progress-input[data-id="${pickupId}"]`);
        const sel = tbody.querySelector(`.pickup-status-select[data-id="${pickupId}"]`);
        if (!input || !sel) return;

        const remarks = input.value.trim();
        const newStatus = sel.value;
        const token = localStorage.getItem(TOKEN_KEY);

        try {
          btn.textContent = "...";
          btn.disabled = true;
          const patchRes = await fetch(`/api/pickups/${pickupId}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              status: newStatus,
              adminRemarks: remarks,
              progressNote: remarks
            })
          });

          if (patchRes.ok) {
            btn.textContent = "✓ Saved";
            btn.style.background = "#059669";
            btn.style.color = "#ffffff";
            setTimeout(() => {
              btn.textContent = "Save";
              btn.disabled = false;
              btn.style.background = "";
              btn.style.color = "";
            }, 1200);
          } else {
            btn.textContent = "Save";
            btn.disabled = false;
            const errData = await patchRes.json();
            alert(errData.error || "Failed to update pickup progress.");
          }
        } catch (err) {
          btn.textContent = "Save";
          btn.disabled = false;
          alert("Error saving pickup progress.");
        }
      });
    });

    // Support Enter key inside pickup progress input
    const pickupInputs = tbody.querySelectorAll(".admin-pickup-progress-input");
    pickupInputs.forEach((inp) => {
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const pickupId = inp.getAttribute("data-id");
          const btn = tbody.querySelector(`.btn-save-pickup-progress[data-id="${pickupId}"]`);
          if (btn) btn.click();
        }
      });
    });

    // Status select change
    const selects = tbody.querySelectorAll(".pickup-status-select");
    selects.forEach((sel) => {
      sel.addEventListener("change", async () => {
        const pickupId = sel.getAttribute("data-id");
        const input = tbody.querySelector(`.admin-pickup-progress-input[data-id="${pickupId}"]`);
        const remarks = input ? input.value.trim() : "";
        const newStatus = sel.value;
        const token = localStorage.getItem(TOKEN_KEY);

        try {
          const patchRes = await fetch(`/api/pickups/${pickupId}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              status: newStatus,
              adminRemarks: remarks,
              progressNote: remarks
            })
          });

          if (patchRes.ok) {
            loadAdminDashboard();
          } else {
            const errData = await patchRes.json();
            alert(errData.error || "Failed to update pickup status.");
          }
        } catch (err) {
          alert("Error updating pickup status.");
        }
      });
    });
  }

  // 5. Feedback Display (Resolved complaint ratings & comments)
  function renderAdminFeedback(complaints) {
    const feedbackGrid = document.getElementById("adminFeedbackGrid");
    const overallRatingEl = document.getElementById("feedbackOverallRating");
    const overallStarsEl = document.getElementById("feedbackOverallStars");
    const overallCountEl = document.getElementById("feedbackOverallCount");

    if (!feedbackGrid) return;

    const ratedComplaints = complaints.filter(c => typeof c.feedbackRating === 'number' && c.feedbackRating > 0);

    if (ratedComplaints.length === 0) return;

    const avg = (ratedComplaints.reduce((acc, c) => acc + c.feedbackRating, 0) / ratedComplaints.length).toFixed(1);
    if (overallRatingEl) overallRatingEl.textContent = avg;
    if (overallStarsEl) {
      const fullStars = Math.round(Number(avg));
      overallStarsEl.textContent = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
    }
    if (overallCountEl) overallCountEl.textContent = `${ratedComplaints.length} Rating${ratedComplaints.length > 1 ? 's' : ''}`;

    feedbackGrid.innerHTML = "";
    ratedComplaints.forEach((c) => {
      const card = document.createElement("div");
      card.className = "feedback-card";
      const initials = c.reporterName ? c.reporterName.slice(0, 2).toUpperCase() : 'CZ';
      const stars = '★'.repeat(c.feedbackRating) + '☆'.repeat(5 - c.feedbackRating);

      card.innerHTML = `
        <div class="feedback-top">
          <div class="user-chip">
            <div class="user-avatar">${initials}</div>
            <div>
              <strong>${c.isAnonymous ? 'Anonymous Citizen' : (c.reporterName || 'Citizen')}</strong>
              <small>${c.locationText || 'Municipal Ward'}</small>
            </div>
          </div>
          <span class="feedback-stars">${stars}</span>
        </div>
        <p class="feedback-comment">"${c.feedbackComment || 'Civic waste reported was promptly cleared and sanitized.'}"</p>
        <div class="feedback-meta">Ticket: <strong>${c.complaintId}</strong> &bull; ${new Date(c.updatedAt || c.createdAt).toLocaleDateString()}</div>
      `;
      feedbackGrid.appendChild(card);
    });
  }

  // ==========================================================================
  // 6. Real Interactive Leaflet Maps (Citizen & Admin Portals)
  // ==========================================================================
  const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const OSM_TILE_OPTIONS = {
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  };

  // Generate crisp custom CSS/HTML pins for Leaflet
  function getCustomMapPin(status) {
    let color = '#ef4444'; // Red for Reported
    let symbol = '⚠️';
    if (status === 'Resolved') {
      color = '#10b981'; // Green
      symbol = '✓';
    } else if (status === 'In-Progress' || status === 'Assigned') {
      color = '#0284c7'; // Blue
      symbol = '⚡';
    }

    return L.divIcon({
      className: 'custom-complaint-pin',
      html: `
        <div style="
          position: relative;
          width: 32px;
          height: 32px;
          background: ${color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.28);
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <span style="
            transform: rotate(45deg);
            color: #ffffff;
            font-size: 13px;
            font-weight: 800;
            line-height: 1;
          ">${symbol}</span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  }

  // Generate standard rich popup markup
  function getMapPopupHtml(c) {
    const isResolved = c.status === 'Resolved';
    const statusColor = isResolved ? '#059669' : (c.status === 'In-Progress' || c.status === 'Assigned') ? '#0284c7' : '#d97706';
    const statusBg = isResolved ? '#ecfdf5' : (c.status === 'In-Progress' || c.status === 'Assigned') ? '#f0f9ff' : '#fffbeb';
    const coordsStr = (c.coordinates && typeof c.coordinates.lat === 'number')
      ? `${c.coordinates.lat.toFixed(5)}, ${c.coordinates.lng.toFixed(5)}`
      : 'N/A';

    const hasBeforePhoto = c.imageUrl && (c.imageUrl.startsWith('data:image') || c.imageUrl.startsWith('http') || c.imageUrl.length > 50);
    const hasAfterPhoto = c.resolvedImageUrl && (c.resolvedImageUrl.startsWith('data:image') || c.resolvedImageUrl.startsWith('http') || c.resolvedImageUrl.length > 50);

    return `
      <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #0f172a; min-width: 240px; max-width: 280px; padding: 2px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
          <span style="font-weight:800; font-size:14px; color:#065f46;">${c.complaintId}</span>
          <span style="font-size:11px; font-weight:700; background:${statusBg}; color:${statusColor}; padding:2px 8px; border-radius:12px; border:1px solid ${statusColor}33;">${c.status}</span>
        </div>
        ${(hasBeforePhoto || hasAfterPhoto) ? `
          <div style="display:grid; grid-template-columns:${(hasBeforePhoto && hasAfterPhoto) ? '1fr 1fr' : '1fr'}; gap:6px; margin-bottom:8px;">
            ${hasBeforePhoto ? `
              <div>
                <div style="font-size:10px; font-weight:700; color:#dc2626; text-transform:uppercase; margin-bottom:2px;">Before</div>
                <div style="border-radius:6px; overflow:hidden; border:1px solid #cbd5e1; height:80px; background:#0f172a; text-align:center;">
                  <img src="${c.imageUrl}" alt="Before" style="width:100%; height:100%; object-fit:cover; display:block; cursor:pointer;" onclick="window.inspectAdminComplaintPhoto && window.inspectAdminComplaintPhoto('${c.complaintId}')" title="Initial Evidence"/>
                </div>
              </div>
            ` : ''}
            ${hasAfterPhoto ? `
              <div>
                <div style="font-size:10px; font-weight:700; color:#059669; text-transform:uppercase; margin-bottom:2px;">After</div>
                <div style="border-radius:6px; overflow:hidden; border:1px solid #10b981; height:80px; background:#0f172a; text-align:center;">
                  <img src="${c.resolvedImageUrl}" alt="After" style="width:100%; height:100%; object-fit:cover; display:block; cursor:pointer;" onclick="window.inspectAdminComplaintPhoto && window.inspectAdminComplaintPhoto('${c.complaintId}')" title="Resolution Proof"/>
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}
        <div style="font-weight:700; font-size:13px; margin-bottom:4px; color:#1e293b;">${c.title}</div>
        <div style="font-size:12px; color:#475569; margin-bottom:4px;"><b>Category:</b> ${c.category}</div>
        <div style="font-size:12px; color:#475569; margin-bottom:4px;"><b>Location:</b> ${c.locationText || 'Geotagged'}</div>
        <div style="font-size:11px; color:#64748b; margin-bottom:4px;"><b>GPS:</b> <code>${coordsStr}</code></div>
        <div style="font-size:11px; color:#64748b; margin-bottom:4px;"><b>Reported:</b> ${new Date(c.createdAt).toLocaleDateString()} by ${c.isAnonymous ? 'Anonymous Citizen' : (c.reporterName || 'Citizen')}</div>
        ${c.adminRemarks ? `
          <div style="margin-top:6px; padding:6px 8px; background:#f0fdf4; border-left:3px solid #10b981; border-radius:3px; font-size:11px; color:#166534; line-height:1.4;">
            <strong>Officer Action:</strong> ${c.adminRemarks}
          </div>
        ` : ''}
        ${isResolved ? '<div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:4px; padding:4px 8px; font-size:11px; color:#065f46; font-weight:600; margin-top:6px;">⭐ +10 Swachhta Points Awarded</div>' : ''}
        ${c.description ? `<div style="margin-top:6px; padding:6px; background:#f8fafc; border-radius:4px; font-size:11px; color:#334155; line-height:1.4;">${c.description}</div>` : ''}
      </div>
    `;
  }

  // --- A. Admin Hotspot Radar Map ---
  let adminMap = null;
  let adminMapLayerGroup = null;

  function renderAdminMap(complaints) {
    const mapContainer = document.getElementById("adminHotspotMap");
    if (!mapContainer || typeof L === 'undefined') return;

    if (!adminMap) {
      adminMap = L.map('adminHotspotMap').setView([12.9716, 77.5946], 12);
      L.tileLayer(OSM_TILE_URL, OSM_TILE_OPTIONS).addTo(adminMap);
      adminMapLayerGroup = L.layerGroup().addTo(adminMap);

      setTimeout(() => {
        adminMap.invalidateSize();
      }, 300);
      window.addEventListener('resize', () => adminMap && adminMap.invalidateSize());
    } else {
      adminMapLayerGroup.clearLayers();
    }

    const valid = complaints.filter(c => c.coordinates && typeof c.coordinates.lat === 'number' && typeof c.coordinates.lng === 'number');
    if (valid.length === 0) return;

    // Group complaints into ~500m clusters
    const clusters = [];
    const visited = new Set();

    for (let i = 0; i < valid.length; i++) {
      if (visited.has(i)) continue;
      const group = [valid[i]];
      visited.add(i);

      for (let j = i + 1; j < valid.length; j++) {
        if (visited.has(j)) continue;
        const dist = haversineDistanceMeters(
          valid[i].coordinates.lat, valid[i].coordinates.lng,
          valid[j].coordinates.lat, valid[j].coordinates.lng
        );
        if (dist <= 500) {
          group.push(valid[j]);
          visited.add(j);
        }
      }
      clusters.push(group);
    }

    const bounds = [];

    // Hotspot Rule: 1-3 = Low (#10b981), 4-9 = Medium (#f59e0b), 10+ = High (#ef4444)
    clusters.forEach((group) => {
      const count = group.length;
      let tier = 'Low';
      let color = '#10b981';

      if (count >= 10) {
        tier = 'High';
        color = '#ef4444';
      } else if (count >= 4) {
        tier = 'Medium';
        color = '#f59e0b';
      }

      const avgLat = group.reduce((s, c) => s + c.coordinates.lat, 0) / count;
      const avgLng = group.reduce((s, c) => s + c.coordinates.lng, 0) / count;

      const circle = L.circle([avgLat, avgLng], {
        radius: 280,
        color: color,
        fillColor: color,
        fillOpacity: 0.22,
        weight: 2
      }).addTo(adminMapLayerGroup);

      circle.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; color: #0f172a;">
          <strong style="color: ${color}; font-size: 14px;">● ${tier} Intensity Hotspot</strong><br/>
          <b>${count}</b> complaint${count > 1 ? 's' : ''} reported in this ~500m cluster sector.
        </div>
      `);
    });

    // Add individual markers with popup details
    valid.forEach((c) => {
      const lat = c.coordinates.lat;
      const lng = c.coordinates.lng;
      bounds.push([lat, lng]);

      const pinIcon = getCustomMapPin(c.status);
      const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(adminMapLayerGroup);
      marker.bindPopup(getMapPopupHtml(c));
    });

    if (bounds.length > 0) {
      adminMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }

  // --- B. Citizen Live City Map (index.html) ---
  let citizenMap = null;
  let citizenMapLayerGroup = null;
  let allCitizenComplaints = [];
  let currentMapFilter = 'all';

  function renderCitizenMap(complaints) {
    const mapContainer = document.getElementById("citizenComplaintsMap");
    if (!mapContainer || typeof L === 'undefined') return;

    allCitizenComplaints = complaints;

    if (!citizenMap) {
      citizenMap = L.map('citizenComplaintsMap').setView([12.9716, 77.5946], 12);
      L.tileLayer(OSM_TILE_URL, OSM_TILE_OPTIONS).addTo(citizenMap);
      citizenMapLayerGroup = L.layerGroup().addTo(citizenMap);

      setTimeout(() => {
        citizenMap.invalidateSize();
      }, 300);
      window.addEventListener('resize', () => citizenMap && citizenMap.invalidateSize());

      // Filter button listeners
      const filterBtns = document.querySelectorAll(".map-filter-btn");
      filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          filterBtns.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          currentMapFilter = btn.getAttribute("data-map-filter") || 'all';
          applyCitizenMapFilter();
        });
      });
    }

    applyCitizenMapFilter();
  }

  function applyCitizenMapFilter() {
    if (!citizenMap || !citizenMapLayerGroup) return;

    citizenMapLayerGroup.clearLayers();

    const valid = allCitizenComplaints.filter(c => c.coordinates && typeof c.coordinates.lat === 'number' && typeof c.coordinates.lng === 'number');
    const filtered = valid.filter((c) => {
      if (currentMapFilter === 'all') return true;
      if (currentMapFilter === 'In-Progress') return c.status === 'In-Progress' || c.status === 'Assigned';
      return c.status === currentMapFilter;
    });

    const badgeEl = document.getElementById("citizenMapTotalBadge");
    if (badgeEl) {
      badgeEl.textContent = `Showing ${filtered.length} of ${valid.length} geotagged complaints`;
    }

    const bounds = [];
    filtered.forEach((c) => {
      const lat = c.coordinates.lat;
      const lng = c.coordinates.lng;
      bounds.push([lat, lng]);

      const pinIcon = getCustomMapPin(c.status);
      const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(citizenMapLayerGroup);
      marker.bindPopup(getMapPopupHtml(c));
    });

    if (bounds.length > 0) {
      citizenMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }

  // Master Dashboard Loader
  async function loadAdminDashboard() {
    const token = getStoredToken();
    if (!token) return;

    try {
      const [compRes, pickRes] = await Promise.all([
        fetch("/api/complaints"),
        fetch("/api/pickups", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      let complaints = [];
      let pickups = [];

      if (compRes.ok) {
        const compData = await compRes.json();
        complaints = compData.complaints || [];
      }

      if (pickRes.ok) {
        const pickData = await pickRes.json();
        pickups = pickData.pickups || [];
      }

      updateAdminKPIs(complaints, pickups);
      renderAdminComplaintsTable(complaints);
      renderAdminPickupsTable(pickups);
      renderAdminFeedback(complaints);
      renderAdminMap(complaints);
    } catch (err) {
      console.warn("Could not load admin dashboard data from API:", err);
    }
  }

  // TOKEN_KEY and getStoredToken defined at start of DOMContentLoaded
  const openAuthModalBtn = document.getElementById("openAuthModalBtn");
  const closeAuthModalBtn = document.getElementById("closeAuthModalBtn");
  const authModal = document.getElementById("authModal");
  const tabLoginBtn = document.getElementById("tabLoginBtn");
  const tabRegisterBtn = document.getElementById("tabRegisterBtn");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const authAlert = document.getElementById("authAlert");
  const userProfileNav = document.getElementById("userProfileNav");
  const navUserName = document.getElementById("navUserName");
  const navUserRole = document.getElementById("navUserRole");
  const logoutBtn = document.getElementById("logoutBtn");
  const adminLogoutBtn = document.getElementById("adminLogoutBtn");
  const adminPortalLink = document.getElementById("adminPortalLink");
  const adminAuthGate = document.getElementById("adminAuthGate");
  const adminOfficerName = document.getElementById("adminOfficerName");

  let currentUser = null;

  function showAuthAlert(message, isError = true) {
    if (!authAlert) return;
    authAlert.textContent = message;
    authAlert.className = `auth-alert ${isError ? "error" : "success"}`;
    authAlert.classList.remove("hidden");
  }

  function clearAuthAlert() {
    if (authAlert) {
      authAlert.textContent = "";
      authAlert.className = "auth-alert hidden";
    }
  }

  // Modal open & close
  if (openAuthModalBtn && authModal) {
    openAuthModalBtn.addEventListener("click", () => {
      clearAuthAlert();
      authModal.classList.remove("hidden");
    });
  }

  if (closeAuthModalBtn && authModal) {
    closeAuthModalBtn.addEventListener("click", () => {
      authModal.classList.add("hidden");
    });
  }

  if (authModal) {
    authModal.addEventListener("click", (e) => {
      if (e.target === authModal) {
        authModal.classList.add("hidden");
      }
    });
  }

  // Tab switching (Sign In vs Register)
  if (tabLoginBtn && tabRegisterBtn && loginForm && registerForm) {
    tabLoginBtn.addEventListener("click", () => {
      clearAuthAlert();
      tabLoginBtn.classList.add("active");
      tabRegisterBtn.classList.remove("active");
      loginForm.classList.remove("hidden");
      registerForm.classList.add("hidden");
    });

    tabRegisterBtn.addEventListener("click", () => {
      clearAuthAlert();
      tabRegisterBtn.classList.add("active");
      tabLoginBtn.classList.remove("active");
      registerForm.classList.remove("hidden");
      loginForm.classList.add("hidden");
    });
  }

  // Update navbar user status
  function setNavUserState(user) {
    currentUser = user;
    const navSwachhtaPointsVal = document.getElementById("navSwachhtaPointsVal");
    const citizenSwachhtaPoints = document.getElementById("citizenSwachhtaPoints");

    if (user) {
      if (openAuthModalBtn) openAuthModalBtn.classList.add("hidden");
      if (userProfileNav) {
        userProfileNav.classList.remove("hidden");
        if (navUserName) navUserName.textContent = user.name;
        if (navUserRole) {
          navUserRole.textContent = user.role;
          if (user.role === "admin") {
            navUserRole.classList.add("admin-role");
          } else {
            navUserRole.classList.remove("admin-role");
          }
        }
        if (navSwachhtaPointsVal) navSwachhtaPointsVal.textContent = user.swachhtaPoints || 0;
      }
      if (citizenSwachhtaPoints) citizenSwachhtaPoints.textContent = user.swachhtaPoints || 0;
    } else {
      if (openAuthModalBtn) openAuthModalBtn.classList.remove("hidden");
      if (userProfileNav) userProfileNav.classList.add("hidden");
      if (citizenSwachhtaPoints) citizenSwachhtaPoints.textContent = "0";
      if (navSwachhtaPointsVal) navSwachhtaPointsVal.textContent = "0";
    }
  }

  // Helper to safely parse API responses even if server returns HTML error pages (404, 500, 504)
  async function parseResponsePayload(response) {
    const contentType = (response.headers && response.headers.get("content-type")) || "";
    if (contentType.includes("application/json")) {
      try {
        return await response.json();
      } catch (e) {
        return { error: "Failed to parse JSON response from server." };
      }
    }
    const rawText = await response.text().catch(() => "");
    if (response.status === 404) {
      return { error: "Route not found (404). Please verify Vercel serverless routing." };
    } else if (response.status === 504) {
      return { error: "Gateway Timeout (504): MongoDB connection timed out.", hint: "Please whitelist 0.0.0.0/0 in MongoDB Atlas Network Access." };
    } else if (response.status === 503) {
      return { error: "Service Unavailable (503): Database connection failed.", hint: "Please ensure MongoDB Atlas allows 0.0.0.0/0." };
    } else if (response.status === 500) {
      return { error: `Server Error (500): ${rawText.slice(0, 100) || "Internal server error"}` };
    }
    return { error: `Server returned HTTP ${response.status}: ${rawText.slice(0, 80) || response.statusText}` };
  }

  // Register Form Submit
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAuthAlert();

      const name = document.getElementById("registerName").value.trim();
      const email = document.getElementById("registerEmail").value.trim();
      const password = document.getElementById("registerPassword").value;

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });

        const data = await parseResponsePayload(response);

        if (!response.ok) {
          const errMsg = data.error || (data.message ? data.message : "Registration failed.");
          showAuthAlert(data.hint ? `${errMsg} • ${data.hint}` : errMsg, true);
          return;
        }

        // Store token & set user
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem("cleanpulse_token", data.token);
        setNavUserState(data.user);
        showAuthAlert("Registration successful! Welcome to Prabhav Portal.", false);

        registerForm.reset();
        setTimeout(() => {
          if (authModal) authModal.classList.add("hidden");
        }, 1200);
      } catch (err) {
        showAuthAlert(`Network error: ${err.message || "Could not connect to server."}`, true);
      }
    });
  }

  // Login Form Submit
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAuthAlert();

      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = await parseResponsePayload(response);

        if (!response.ok) {
          const errMsg = data.error || data.message || "Login failed.";
          showAuthAlert(data.hint ? `${errMsg} • ${data.hint}` : errMsg, true);
          return;
        }

        // Store token & set user
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem("cleanpulse_token", data.token);
        setNavUserState(data.user);
        showAuthAlert(`Welcome back, ${data.user.name}!`, false);

        loginForm.reset();
        setTimeout(() => {
          if (authModal) authModal.classList.add("hidden");
          // If admin logged in, provide smooth redirect or reload
          if (data.user.role === "admin" && window.location.pathname.includes("admin.html")) {
            window.location.reload();
          }
        }, 1000);
      } catch (err) {
        showAuthAlert(`Network error: ${err.message || "Could not connect to server."}`, true);
      }
    });
  }

  // Logout handlers
  function logoutUser() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("cleanpulse_token");
    currentUser = null;
    setNavUserState(null);
    if (window.location.pathname.includes("admin.html")) {
      window.location.reload();
    }
  }

  if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);
  if (adminLogoutBtn) adminLogoutBtn.addEventListener("click", logoutUser);

  // Dedicated Admin Login Handler on admin.html
  const adminLoginForm = document.getElementById("adminLoginForm");
  const adminLoginAlert = document.getElementById("adminLoginAlert");
  const adminEmailInput = document.getElementById("adminEmailInput");
  const adminPasswordInput = document.getElementById("adminPasswordInput");

  if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (adminLoginAlert) adminLoginAlert.classList.add("hidden");

      const email = adminEmailInput ? adminEmailInput.value.trim() : "";
      const password = adminPasswordInput ? adminPasswordInput.value : "";

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = await parseResponsePayload(response);

        if (!response.ok) {
          if (adminLoginAlert) {
            const errMsg = data.error || data.message || "Authentication failed.";
            adminLoginAlert.textContent = data.hint ? `${errMsg} • ${data.hint}` : errMsg;
            adminLoginAlert.className = "auth-alert error";
            adminLoginAlert.classList.remove("hidden");
          }
          return;
        }

        if (data.user.role !== "admin") {
          if (adminLoginAlert) {
            adminLoginAlert.textContent = "Access Denied: You are logged in as a Citizen. Municipal Admin credentials required.";
            adminLoginAlert.className = "auth-alert error";
            adminLoginAlert.classList.remove("hidden");
          }
          return;
        }

        // Store token & unlock admin dashboard
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem("cleanpulse_token", data.token);
        currentUser = data.user;
        if (adminAuthGate) adminAuthGate.classList.add("hidden");
        if (adminOfficerName) adminOfficerName.textContent = data.user.name;
        const adminAvatar = document.getElementById("adminAvatar");
        if (adminAvatar) adminAvatar.textContent = "AD";
        loadAdminDashboard();
      } catch (err) {
        if (adminLoginAlert) {
          adminLoginAlert.textContent = `Network error: ${err.message || "Could not connect to server."}`;
          adminLoginAlert.className = "auth-alert error";
          adminLoginAlert.classList.remove("hidden");
        }
      }
    });
  }

  // Validate Token on Page Load
  async function checkSession() {
    const token = getStoredToken();
    const isAdminPage = window.location.pathname.includes("admin.html");

    if (!token) {
      setNavUserState(null);
      if (isAdminPage && adminAuthGate) {
        adminAuthGate.classList.remove("hidden");
      }
      return;
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setNavUserState(data.user);

        if (isAdminPage) {
          if (data.user.role === "admin") {
            if (adminAuthGate) adminAuthGate.classList.add("hidden");
            if (adminOfficerName) adminOfficerName.textContent = data.user.name;
            loadAdminDashboard();
          } else {
            // Citizen trying to access admin.html
            if (adminAuthGate) adminAuthGate.classList.remove("hidden");
            if (adminLoginAlert) {
              adminLoginAlert.textContent = `Logged in as Citizen (${data.user.email}). Please enter Admin credentials below to unlock operations.`;
              adminLoginAlert.className = "auth-alert error";
              adminLoginAlert.classList.remove("hidden");
            }
          }
        }
      } else {
        // Expired or invalid token
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem("cleanpulse_token");
        setNavUserState(null);
        if (isAdminPage && adminAuthGate) {
          adminAuthGate.classList.remove("hidden");
        }
      }
    } catch (err) {
      console.warn("Could not verify session with server.");
    }
  }

  // 9. Citizen Dashboard Stats Loader (Real-time live count on index.html)
  async function loadCitizenStats() {
    const activeEl = document.getElementById("citizenActiveCount");
    const pickupsEl = document.getElementById("citizenPendingPickupsCount");
    const resolvedEl = document.getElementById("citizenResolvedCount");
    const swachhtaEl = document.getElementById("citizenSwachhtaPoints");
    const navSwachhtaPointsVal = document.getElementById("navSwachhtaPointsVal");
    const mapEl = document.getElementById("citizenComplaintsMap");
    if (!activeEl && !pickupsEl && !resolvedEl && !swachhtaEl && !mapEl) return;

    try {
      const res = await fetch("/api/complaints");
      if (res.ok) {
        const data = await res.json();
        const complaints = data.complaints || [];
        const activeCount = complaints.filter(c => c.status === "Reported" || c.status === "In-Progress" || c.status === "Assigned").length;
        const resolvedCount = complaints.filter(c => c.status === "Resolved").length;
        if (activeEl) activeEl.textContent = activeCount;
        if (resolvedEl) resolvedEl.textContent = resolvedCount;

        // Render real Live Map on citizen portal
        renderCitizenMap(complaints);
      }

      const token = getStoredToken();
      if (token) {
        // Fetch current user profile to update Swachhta Points live
        const meRes = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user) {
            currentUser = meData.user;
            const pts = meData.user.swachhtaPoints || 0;
            if (swachhtaEl) swachhtaEl.textContent = pts;
            if (navSwachhtaPointsVal) navSwachhtaPointsVal.textContent = pts;
          }
        }

        if (pickupsEl) {
          const pRes = await fetch("/api/pickups", { headers: { Authorization: `Bearer ${token}` } });
          if (pRes.ok) {
            const pData = await pRes.json();
            const pickups = pData.pickups || [];
            const pendingPickups = pickups.filter(p => p.status === "Requested" || p.status === "Scheduled" || p.status === "In-Transit").length;
            pickupsEl.textContent = pendingPickups;

            // If citizen has their own pickup, track their latest pickup
            if (pickups.length > 0 && typeof updatePickupTrackerUI === 'function') {
              const myLatest = pickups.find(p => p.status === 'In-Transit' || p.status === 'Scheduled') || pickups[0];
              if (myLatest && trackPickupInput) {
                trackPickupInput.value = myLatest.pickupId;
                updatePickupTrackerUI(myLatest.pickupId);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Could not load citizen stats:", e);
    }
  }

  checkSession();
  loadCitizenStats();

  // Auto-initialize dual column trackers with live demonstration data
  setTimeout(() => {
    if (typeof updateTrackerUI === 'function' && trackInput && trackInput.value) {
      updateTrackerUI(trackInput.value.trim());
    }
    if (typeof updatePickupTrackerUI === 'function' && trackPickupInput && trackPickupInput.value) {
      updatePickupTrackerUI(trackPickupInput.value.trim());
    }
  }, 400);
});

