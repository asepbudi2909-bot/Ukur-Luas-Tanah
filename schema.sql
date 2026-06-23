-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Lands table
CREATE TABLE IF NOT EXISTS lands (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    points TEXT NOT NULL, -- JSON string
    scale_pixel_ratio REAL NOT NULL,
    notes TEXT,
    manual_triangle_configs TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert initial admin user (password: admin123 - this is just a placeholder,
-- in real scenario we should use a hashed password)
-- I will use a simple SHA-256 for now or just provide the structure.
-- Better yet, I'll implement a way to set the admin password on first run or via a specific function.
INSERT INTO users (id, username, password, role)
VALUES ('admin-id', 'admin', 'admin123', 'admin');
