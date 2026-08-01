-- ====================================================================
-- EI HUB: KGISL Institute of Technology - Innovation SOI
-- Enterprise Laboratory Component Inventory & Management Platform
-- Database Schema Definition (SQLite / Turso)
-- ====================================================================

-- 1. Profiles Table (Extends Auth users)
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    firebase_uid TEXT,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student', -- 'student', 'faculty', 'admin'
    department TEXT,
    phone TEXT,
    register_number TEXT,
    avatar_url TEXT,
    email_verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    is_active INTEGER DEFAULT 1,
    email TEXT,
    faculty_id TEXT,
    roll_number TEXT,
    institution TEXT,
    password TEXT,
    year_of_study TEXT
);

-- 2. Components Table (Inventory items)
CREATE TABLE IF NOT EXISTS components (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Microcontrollers', 'Sensors', 'Modules', 'Passive', 'ICs', 'Others'
    description TEXT,
    total_stock INTEGER NOT NULL DEFAULT 0,
    available_stock INTEGER NOT NULL DEFAULT 0,
    location TEXT, -- e.g. "Lab A, Shelf 2"
    image_url TEXT,
    unit TEXT DEFAULT 'pcs',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. Requests Table (Borrowing workflows)
CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    component_id TEXT NOT NULL REFERENCES components(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'returned', 'overdue'
    notes TEXT,
    reject_reason TEXT,
    requested_at TEXT DEFAULT (datetime('now')),
    reviewed_by TEXT REFERENCES profiles(id),
    reviewed_at TEXT,
    return_requested_at TEXT,
    returned_at TEXT,
    return_reviewed_by TEXT REFERENCES profiles(id)
);

-- 4. Activity Logs Table (Audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT, -- Stringified JSON
    severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'danger'
    is_read INTEGER DEFAULT 0,
    link_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 6. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    po_number TEXT NOT NULL UNIQUE,
    supplier_name TEXT NOT NULL,
    component_id TEXT REFERENCES components(id) ON DELETE SET NULL,
    component_name TEXT NOT NULL,
    component_category TEXT NOT NULL DEFAULT 'Microcontrollers',
    quantity INTEGER NOT NULL,
    unit_cost REAL NOT NULL DEFAULT 0.00,
    total_cost REAL NOT NULL DEFAULT 0.00,
    purchased_by TEXT REFERENCES profiles(id),
    purchased_by_name TEXT,
    invoice_ref TEXT,
    cabinet TEXT,
    shelf TEXT,
    status TEXT NOT NULL DEFAULT 'delivered',
    purchased_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
);

-- 7. Internal Auth Users (used for SQLite-only local credentials fallback)
CREATE TABLE IF NOT EXISTS _auth_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);
