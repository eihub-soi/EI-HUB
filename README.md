# EI HUB - Enterprise Laboratory Component Inventory & Management Platform

**KGISL Institute of Technology | Innovation SOI**

EI HUB is an enterprise-grade SaaS laboratory inventory and component management system. It provides end-to-end management of electronic hardware inventory (Arduino, ESP32, Raspberry Pi, Sensors, ICs, Servo Motors, Relay Modules), student borrowing workflows, faculty approvals, return tracking, security audit logs, real-time analytics, and PDF receipts with embedded QR code verification.

---

## 🌟 Key Architectural Features

- **Luxury UI Design**: Designed with glassmorphism, floating cards, ambient glows (Deep Navy, Royal Indigo, Warm Gold, Emerald), and 24px border radius.
- **Interactive 3D Hardware Canvas**: Landing page hero featuring floating hardware components (Arduino Uno R3, ESP32, Raspberry Pi, Sensors, Servos, IC Chips) with mouse parallax and lighting effects.
- **Role-Based Experiences**:
  - **Student Experience**: Welcome dashboard, KPI metrics, borrowing overview charts, component catalog with category filtering, borrowing request submission modal, receipt download, and return portal.
  - **Faculty Experience**: Executive dashboard, pending requests approval queue with one-click approve/reject actions, inventory management table with cabinet/shelf allocation, and restock modal.
  - **Admin Experience**: System overview multi-line chart, user & role management table with student/faculty provisioning, audit logs feed, system settings, and enterprise PDF report generator matching reference UI layout.
- **SQLite & Turso Security**:
  - DDL Schema in `turso/schema_turso.sql`.
- **Dual Sync Engine (Live Turso + Instant Mock Mode)**: Direct integration with `@libsql/client`, with built-in instant local storage synchronization so all features work seamlessly out of the box.
- **QR-Verified PDF Generation**: Generate formal student transaction receipts and administrative inventory reports using `jsPDF` and `autoTable`.

---

## 🚀 Quick Start Guide

### 1. Installation
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Quick Role Switcher
In the top floating navigation header, click the role badges to instantly switch between:
- **Student Mode**: Aravind R (Reg: 711721106001)
- **Faculty Mode**: Prof. Robert Chen (FAC-ECE-102)
- **Admin Mode**: Admin User (Innovation SOI System Administrator)

---

## 🗄️ Database Setup (Turso / libSQL)

Initialize your Turso database and import the backup tables:
1. Configure `VITE_TURSO_DATABASE_URL` and `VITE_TURSO_AUTH_TOKEN` in `.env`.
2. Run `node scratch/import_to_turso.js` to create the SQLite schema and seed the backup records.

