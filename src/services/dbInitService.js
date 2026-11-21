import bcrypt from 'bcryptjs';
import { query, queryOne } from '../config/db.js';
import { config } from '../config/index.js';

export async function initDatabaseExtensions() {
  try {
    // 1. Create enquiries table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS enquiries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(120) NOT NULL,
        phone VARCHAR(20),
        room_id INT NULL,
        subject VARCHAR(160),
        message TEXT NOT NULL,
        status ENUM('new', 'responded', 'archived') DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_enquiries_status (status),
        INDEX idx_enquiries_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Create admin_users table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(60) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(120) NOT NULL,
        role VARCHAR(30) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Ensure default admin user exists
    const adminUsername = config.admin?.defaultUsername || 'admin';
    const adminPassword = config.admin?.defaultPassword || 'AncestralAbode@2026';
    const adminEmail = config.email?.adminEmail || 'ancestralabodehomestay@gmail.com';

    const existingAdmin = await queryOne('SELECT id FROM admin_users WHERE username = ?', [adminUsername]);
    if (!existingAdmin) {
      const passwordHash = bcrypt.hashSync(adminPassword, 10);
      await query(
        'INSERT INTO admin_users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
        [adminUsername, passwordHash, adminEmail, 'admin']
      );
      console.log(`[admin] Created default admin account: ${adminUsername}`);
    }
  } catch (err) {
    console.error('[admin:init] Error initializing admin extensions:', err.message);
  }
}
