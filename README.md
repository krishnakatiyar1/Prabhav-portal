# 🌱 Prabhav Portal

> **Smart City Waste Management & Civic Operations Platform**

Prabhav Portal is a full-stack civic operations platform designed to
connect citizens with municipal waste-management services. It provides a
unified interface for reporting waste-related grievances, tracking
complaint resolution, requesting doorstep bulky-waste pickup, viewing
civic activity on a live map, and receiving AI-assisted waste
classification guidance.

The platform also provides a dedicated **Admin Portal** for municipal
operators to manage complaints, update service status, assign pickup
vehicles, add progress remarks, and verify completed work with
resolution photographs.

------------------------------------------------------------------------

## ✨ Key Features

### 👤 Citizen Portal

-   **Citizen Registration & Login**
    -   Secure authentication using JWT.
    -   Password hashing with `bcryptjs`.
    -   Role-based access for citizens and administrators.
-   **Report Waste Grievances**
    -   Submit waste-related complaints with title, category,
        description, location, coordinates, and optional image.
    -   Supports anonymous reporting.
    -   Automatically generates a unique complaint ID such as `CP-1234`.
-   **Complaint Tracking**
    -   Track a grievance using its complaint ID.
    -   View the current complaint status and administrative updates.
-   **Geotagged Complaints**
    -   Complaints can include latitude and longitude.
    -   The system uses geographic distance calculations to identify
        nearby active complaints.
    -   A duplicate warning is generated when an unresolved complaint is
        detected within approximately 50 meters.
-   **Resolution Verification**
    -   Administrators must provide an **after/resolution photograph**
        before a complaint can be marked as resolved.
    -   Citizens can view the proof of completed work while tracking the
        complaint.
-   **Citizen Feedback**
    -   Citizens can submit a 1--5 rating and optional comment after a
        complaint is resolved.
-   **Swachhta Points**
    -   Citizens receive **10 Swachhta Points** when their complaint is
        successfully resolved.
    -   Points can be used as a discount toward eligible doorstep pickup
        requests.

### 🚛 Doorstep Waste Pickup

-   Schedule bulky-waste pickup requests.
-   Store pickup address, date, location, and waste type.
-   Track pickup status.
-   View assigned vehicle and driver information.
-   Display truck location, distance, speed, and estimated arrival time.
-   Redeem Swachhta Points toward the pickup fee.

### 🤖 AI Waste Classification

Prabhav includes an AI-assisted waste classification service.

Users can enter an item such as:

-   Plastic bottle
-   Vegetable waste
-   Battery
-   Newspaper
-   Electronic device

The service returns:

-   Waste category
-   Recommended bin color
-   Disposal guidance

The application can use the **Google Gemini API** and also includes a
local fallback classifier so the feature can continue providing basic
classifications when the AI API is unavailable.

### 🗺️ Civic Map & Geospatial View

-   City-wide complaint visualization.
-   Complaint status filters.
-   Geotagged complaint locations.
-   Resolved cleanup locations.
-   Leaflet-based interactive mapping.
-   Civic activity and sanitation information presented through a
    dashboard-style interface.

### 🛠️ Admin Portal

Administrators can:

-   View and manage citizen grievances.
-   Update complaint status.
-   Add administrative remarks.
-   Upload resolution proof.
-   Manage doorstep pickup requests.
-   Update pickup status.
-   Assign vehicles and drivers.
-   Update truck location information.
-   Monitor municipal operations from a centralized dashboard.

------------------------------------------------------------------------

## 🔄 Complaint Lifecycle

``` text
Citizen submits complaint
          │
          ▼
       Reported
          │
          ▼
       Assigned
          │
          ▼
      In-Progress
          │
          ▼
Admin uploads resolution proof
          │
          ▼
       Resolved
          │
          ▼
 Citizen receives 10 Swachhta Points
          │
          ▼
 Citizen can submit feedback
```

A complaint cannot be marked **Resolved** without resolution-photo
proof.

------------------------------------------------------------------------

## 🧰 Tech Stack

### Frontend

-   HTML5
-   CSS3
-   Vanilla JavaScript
-   Leaflet.js
-   Google Fonts
-   Responsive UI
-   Glass-style dashboard components

### Backend

-   Node.js
-   Express.js
-   REST APIs
-   CommonJS modules
-   CORS
-   Environment-based configuration

### Database

-   MongoDB
-   MongoDB Atlas
-   Mongoose ODM

### Authentication & Security

-   JSON Web Tokens (JWT)
-   bcryptjs password hashing
-   Role-based authorization
-   Environment variables for application secrets

### AI

-   Google Gemini API
-   Rule-based fallback waste classifier

### Deployment

-   Vercel-compatible Node.js deployment
-   MongoDB Atlas for cloud database hosting

------------------------------------------------------------------------

## 📁 Project Structure

``` text
Prabhav-portal/
│
├── api/
│   └── ...
│
├── middleware/
│   └── auth.js
│
├── models/
│   ├── User.js
│   ├── Complaint.js
│   └── Pickup.js
│
├── public/
│   ├── index.html
│   ├── admin.html
│   ├── styles.css
│   ├── script.js
│   └── ...
│
├── routes/
│   ├── auth.js
│   ├── complaints.js
│   ├── pickups.js
│   └── ai.js
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── server.js
└── vercel.json
```

------------------------------------------------------------------------

## 🚀 Getting Started

### 1. Clone the repository

``` bash
git clone https://github.com/krishnakatiyar1/Prabhav-portal.git
cd Prabhav-portal
```

### 2. Install dependencies

``` bash
npm install
```

### 3. Configure environment variables

Create a `.env` file from the provided template:

``` bash
cp .env.example .env
```

On Windows PowerShell:

``` powershell
Copy-Item .env.example .env
```

Configure the required values:

``` env
PORT=3000
MONGO_URI=your_mongodb_connection_uri
JWT_SECRET=your_secure_jwt_secret
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_secure_admin_password
ADMIN_CREDENTIAL_ID=your_admin_credential_id
GEMINI_API_KEY=your_gemini_api_key
```

> **Important:** Never commit your real `.env` file, database
> credentials, JWT secrets, or API keys to GitHub.

### 4. Start the application

``` bash
npm start
```

Or:

``` bash
npm run dev
```

The application runs by default at:

``` text
http://localhost:3000
```

------------------------------------------------------------------------

## 🔐 Authentication

Prabhav Portal uses JWT-based authentication.

The application supports:

-   Citizen accounts
-   Administrator accounts
-   Protected API routes
-   Role-based admin authorization
-   Secure password hashing

The server can seed the configured default administrator account when
the database connection is established and the account does not already
exist.

For production deployments, always use strong, unique credentials
through environment variables.

------------------------------------------------------------------------

## 📡 API Overview

### Authentication

``` text
POST   /api/auth/...
```

Handles user registration, login, and authentication-related operations.

### Complaints

``` text
POST   /api/complaints
GET    /api/complaints
GET    /api/complaints/:id
PATCH  /api/complaints/:id/status
POST   /api/complaints/:id/feedback
```

### Doorstep Pickups

``` text
POST   /api/pickups
GET    /api/pickups
GET    /api/pickups/:id
PATCH  /api/pickups/:id/status
```

### AI Waste Classification

``` text
POST   /api/ai/classify
```

### Health Check

``` text
GET    /api/health
```

The health endpoint reports application/database connectivity
information useful for deployment diagnostics.

------------------------------------------------------------------------

## 💰 Swachhta Points

Prabhav introduces a reward mechanism for civic participation.

### Earning Points

When a citizen's complaint is resolved:

``` text
+10 Swachhta Points
```

Points are awarded once per resolved complaint.

### Redeeming Points

Doorstep bulky-waste pickup uses a base fee of:

``` text
₹200
```

Citizens can redeem eligible points for a discount, subject to the
application's redemption limit.

``` text
1 Swachhta Point = ₹1 discount
```

The current implementation allows up to 100 points to be redeemed on a
pickup request.

------------------------------------------------------------------------

## 🚛 Pickup Status Flow

``` text
Requested
    │
    ▼
Scheduled
    │
    ▼
In-Transit
    │
    ▼
Collected
    │
    ▼
Completed
```

A request can also be marked:

``` text
Cancelled
```

Administrators can update vehicle assignment, truck details, driver
information, location, and progress remarks.

------------------------------------------------------------------------

## 🧠 AI Fallback

The AI classification endpoint is designed with graceful degradation.

If the Gemini API is unavailable or no valid API key is configured, the
server uses a built-in rule-based classifier for common waste
categories.

This provides basic functionality without making the entire
waste-classification feature dependent on an external AI service.

------------------------------------------------------------------------

## 🗺️ Mapping

The citizen interface uses **Leaflet.js** for interactive maps.

The platform can visualize:

-   Complaint locations
-   Complaint status
-   Sanitation activity
-   Resolved locations
-   Pickup/truck tracking information

Geographic coordinates are stored with relevant complaint and pickup
records.

------------------------------------------------------------------------

## 📸 Resolution Proof

One of the core transparency features of Prabhav Portal is **visual
resolution verification**.

When an administrator attempts to resolve a grievance, the system
requires an after-work photograph.

``` text
Before
  ↓
Complaint Reported
  ↓
Municipal Action
  ↓
After Photo Uploaded
  ↓
Complaint Resolved
```

This gives citizens a visual indication that the reported issue has been
addressed.

------------------------------------------------------------------------

## 🌐 Live Demo

**Prabhav Portal:**\
https://prabhav-portal.vercel.app/

------------------------------------------------------------------------

## 📷 Screenshots

Add project screenshots here:

``` md
![Citizen Dashboard](screenshots/citizen-dashboard.png)

![Complaint Tracking](screenshots/complaint-tracking.png)

![Admin Dashboard](screenshots/admin-dashboard.png)

![Live Civic Map](screenshots/live-map.png)
```

------------------------------------------------------------------------

## 🧪 Development

Run the project locally:

``` bash
npm install
npm run dev
```

The current package configuration uses Node.js with Express and
MongoDB/Mongoose.

------------------------------------------------------------------------

## 🔒 Security Notes

Before deploying to production:

-   Use a strong `JWT_SECRET`.
-   Use a strong MongoDB password.
-   Keep `.env` out of version control.
-   Never expose Gemini or database credentials in frontend code.
-   Restrict MongoDB Atlas network access where practical.
-   Replace development/default administrator credentials.
-   Review all API authorization rules before production deployment.
-   Use HTTPS in production.

------------------------------------------------------------------------

## 🛣️ Future Enhancements

Potential improvements include:

-   📱 Progressive Web App (PWA) support
-   🔔 Push notifications for complaint updates
-   📧 Email/SMS notifications
-   📍 More advanced real-time vehicle tracking
-   📊 Advanced municipal analytics
-   🏆 Swachhta leaderboard and civic rewards
-   🌐 Multi-language citizen interface
-   📸 Cloud image storage with optimized uploads
-   🧠 Improved AI-based complaint categorization
-   🏙️ Ward-level performance dashboards
-   📈 SLA and response-time analytics
-   🔎 Advanced complaint search and filtering

------------------------------------------------------------------------

## 🤝 Contributing

Contributions are welcome.

1.  Fork the repository.
2.  Create a feature branch:

``` bash
git checkout -b feature/your-feature
```

3.  Make your changes.
4.  Commit your changes:

``` bash
git commit -m "feat: add your feature"
```

5.  Push the branch:

``` bash
git push origin feature/your-feature
```

6.  Open a Pull Request.

------------------------------------------------------------------------

## 📄 License

This project currently uses the **ISC License** as specified in
`package.json`.

------------------------------------------------------------------------

## 👨‍💻 Author

**IND SQUAD**

GitHub:\
https://github.com/krishnakatiyar1

Project Repository:\
https://github.com/krishnakatiyar1/Prabhav-portal

------------------------------------------------------------------------

## ⭐ Support

If you find Prabhav Portal useful or interesting, consider giving the
repository a ⭐ on GitHub.

> **Prabhav Portal --- Cleaner City. Smarter Tomorrow.**
