// clinic-api/src/services/auth-service.ts
// Authentication service for credential-based auth with session management

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';

// Max session duration (8 hours regardless of environment)
const getMaxSessionHours = (): number => {
    return 8;
};

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '1h';

export interface UserPermission {
    therapistId: number;
    therapistName: string;
    therapistEmail: string;
    role: 'owner' | 'manager' | 'viewer' | 'super_admin';
    grantedAt: Date;
}

export interface SessionConfig {
    inactiveTimeoutMinutes: number;
    warningTimeoutMinutes: number;
    maxSessionHours: number;
    tokenRefreshMinutes: number;
}

export interface UserInfo {
    id: number;
    email: string;
    displayName: string;
    sessionId: number;
    permissions: UserPermission[];
}

/**
 * Get authentication configuration from database defaults (not hardcoded)
 */
export async function getAuthConfig(): Promise<SessionConfig> {
    try {
        // Get defaults from database column defaults (what session-config.sh sets)
        const defaultConfigQuery = await pool.query(`
            SELECT 
                column_default as timeout_default
            FROM information_schema.columns 
            WHERE table_name = 'user_sessions' 
            AND column_name = 'inactive_timeout_minutes'
        `);

        const defaultWarningQuery = await pool.query(`
            SELECT 
                column_default as warning_default
            FROM information_schema.columns 
            WHERE table_name = 'user_sessions' 
            AND column_name = 'warning_timeout_minutes'
        `);

        // Parse the database defaults
        const inactiveTimeoutMinutes = parseInt(
            (defaultConfigQuery.rows[0]?.timeout_default || '30').toString()
        );
        const warningTimeoutMinutes = parseInt(
            (defaultWarningQuery.rows[0]?.warning_default || '2').toString()
        );

        console.log('📊 Reading session config from database:', {
            inactiveTimeoutMinutes,
            warningTimeoutMinutes,
            source: 'database_column_defaults'
        });

        return {
            inactiveTimeoutMinutes: inactiveTimeoutMinutes,
            warningTimeoutMinutes: warningTimeoutMinutes,
            maxSessionHours: 8, // Keep this hardcoded - it's reasonable
            tokenRefreshMinutes: 55
        };
    } catch (error) {
        console.error('Error reading session config from database, using fallback:', error);
        // Fallback to reasonable defaults if database read fails
        return {
            inactiveTimeoutMinutes: 30,
            warningTimeoutMinutes: 2,
            maxSessionHours: 8,
            tokenRefreshMinutes: 55
        };
    }
}

/**
 * Create JWT token
 */
export function createJWTToken(userId: number, sessionId: number): string {
    return jwt.sign(
        {
            userId,
            sessionId,
            type: 'session',
            iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Verify JWT token
 */
export function verifyJWTToken(token: string): { userId: number; sessionId: number } | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return {
            userId: decoded.userId,
            sessionId: decoded.sessionId
        };
    } catch (error) {
        return null;
    }
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
}

/**
 * Compare password
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Generate secure random token
 */
export function generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Create user session in database
 */
export async function createUserSession(
    userId: number,
    ipAddress: string,
    userAgent: string
): Promise<{ sessionId: number; sessionToken: string }> {
    const config = await getAuthConfig();

    // Create session in database
    const result = await pool.query(`
        INSERT INTO user_sessions (
            user_id, session_token, inactive_timeout_minutes, 
            warning_timeout_minutes, max_session_hours, 
            expires_at, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
    `, [
        userId,
        'temp', // Will update with real token
        config.inactiveTimeoutMinutes,
        config.warningTimeoutMinutes,
        config.maxSessionHours,
        new Date(Date.now() + (config.maxSessionHours || 8) * 60 * 60 * 1000),
        ipAddress,
        userAgent
    ]);

    const sessionId = result.rows[0].id;
    const sessionToken = createJWTToken(userId, sessionId);

    // Update with real token
    await pool.query(
        'UPDATE user_sessions SET session_token = $1 WHERE id = $2',
        [sessionToken, sessionId]
    );

    // Log session creation
    await pool.query(`
        INSERT INTO session_activity_log (session_id, user_id, activity_type, ip_address, user_agent)
        VALUES ($1, $2, 'login', $3, $4)
    `, [sessionId, userId, ipAddress, userAgent]);

    return { sessionId, sessionToken };
}

/**
 * Get user permissions
 */
export async function getUserPermissions(userId: number): Promise<UserPermission[]> {
    const result = await pool.query(`
        SELECT 
            t.id as therapist_id,
            t.nome as therapist_name,
            t.email as therapist_email,
            up.role,
            up.granted_at
        FROM user_permissions up
        JOIN therapists t ON up.therapist_id = t.id
        WHERE up.user_id = $1 
        AND up.is_active = true
        AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
        ORDER BY up.granted_at ASC
    `, [userId]);

    return result.rows.map(row => ({
        therapistId: row.therapist_id,
        therapistName: row.therapist_name,
        therapistEmail: row.therapist_email,
        role: row.role,
        grantedAt: row.granted_at
    }));
}

/**
 * Update session activity
 */
export async function updateSessionActivity(sessionId: number, endpoint?: string): Promise<void> {
    try {
        await pool.query(
            'UPDATE user_sessions SET last_activity_at = CURRENT_TIMESTAMP WHERE id = $1',
            [sessionId]
        );

        await pool.query(`
            INSERT INTO session_activity_log (session_id, activity_type, endpoint, timestamp)
            VALUES ($1, 'activity', $2, CURRENT_TIMESTAMP)
        `, [sessionId, endpoint || 'unknown']);
    } catch (error) {
        console.error('Error updating session activity:', error);
    }
}

/**
 * Validate session
 */
export async function validateSession(sessionId: number): Promise<boolean> {
    // First, mark any expired sessions
    await markExpiredSessions();

    const result = await pool.query(`
        SELECT 
            id, expires_at, last_activity_at, 
            inactive_timeout_minutes, status
        FROM user_sessions 
        WHERE id = $1 AND status = 'active'
    `, [sessionId]);

    if (result.rows.length === 0) {
        return false;
    }

    const session = result.rows[0];
    const now = new Date();

    // Check if session has expired
    if (session.expires_at < now) {
        await pool.query(
            `UPDATE user_sessions 
             SET status = 'expired', terminated_at = CURRENT_TIMESTAMP, 
                 termination_reason = 'max_time_exceeded'
             WHERE id = $1`,
            [sessionId]
        );
        return false;
    }

    // Check if session is inactive
    const inactiveLimit = new Date(
        session.last_activity_at.getTime() +
        session.inactive_timeout_minutes * 60 * 1000
    );

    if (now > inactiveLimit) {
        await pool.query(
            `UPDATE user_sessions 
             SET status = 'expired', terminated_at = CURRENT_TIMESTAMP,
                 termination_reason = 'inactivity_timeout'
             WHERE id = $1`,
            [sessionId]
        );
        return false;
    }

    return true;
}

/**
 * Authenticate user with email/password
 */
export async function authenticateUser(email: string, password: string): Promise<UserInfo | null> {
    try {
        // Get user from database
        const userResult = await pool.query(
            'SELECT id, email, password_hash, display_name, is_active, email_verified FROM user_credentials WHERE email = $1',
            [email.toLowerCase()]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
            return null;
        }

        const user = userResult.rows[0];

        // Verify password
        const validPassword = await comparePassword(password, user.password_hash);
        if (!validPassword) {
            return null;
        }

        // Check email verification if required
        const emailVerificationRequired = await pool.query(
            "SELECT value FROM app_configuration WHERE key = 'auth_require_email_verification'"
        );

        if (emailVerificationRequired.rows[0]?.value === 'true' && !user.email_verified) {
            throw new Error('EMAIL_NOT_VERIFIED');
        }

        // Get permissions
        const permissions = await getUserPermissions(user.id);

        return {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            sessionId: 0, // Will be set when session is created
            permissions
        };
    } catch (error) {
        if (error instanceof Error && error.message === 'EMAIL_NOT_VERIFIED') {
            throw error;
        }
        console.error('Authentication error:', error);
        return null;
    }
}

/**
 * Create new user account
 */
export async function createUser(
    email: string,
    password: string,
    displayName: string,
    invitationToken?: string
): Promise<{ id: number; email: string; displayName: string }> {
    // Validate input
    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }

    // Check if user exists
    const existingUser = await pool.query(
        'SELECT id FROM user_credentials WHERE email = $1',
        [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
        throw new Error('User already exists with this email');
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    const emailVerificationToken = generateSecureToken();

    // Create user
    const userResult = await pool.query(`
        INSERT INTO user_credentials (
            email, password_hash, display_name, email_verification_token, is_active
        ) VALUES ($1, $2, $3, $4, true)
        RETURNING id, email, display_name
    `, [email.toLowerCase(), passwordHash, displayName, emailVerificationToken]);

    const newUser = userResult.rows[0];

    // Handle invitation if provided
    if (invitationToken) {
        const invitationResult = await pool.query(`
            SELECT id, therapist_id, invited_role, invited_by
            FROM practice_invitations
            WHERE invitation_token = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
        `, [invitationToken]);

        if (invitationResult.rows.length > 0) {
            const invitation = invitationResult.rows[0];

            // Grant permission
            await pool.query(`
                INSERT INTO user_permissions (user_id, therapist_id, role, granted_by, notes)
                VALUES ($1, $2, $3, $4, 'Granted via invitation acceptance')
            `, [newUser.id, invitation.therapist_id, invitation.invited_role, invitation.invited_by]);

            // Mark invitation as accepted
            await pool.query(`
                UPDATE practice_invitations 
                SET status = 'accepted', responded_at = CURRENT_TIMESTAMP, accepted_by = $1
                WHERE id = $2
            `, [newUser.id, invitation.id]);
        }
    }

    return newUser;
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<string | null> {
    const userResult = await pool.query(
        'SELECT id FROM user_credentials WHERE email = $1 AND is_active = true',
        [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
        return null; // Don't reveal if user exists
    }

    const resetToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(`
        UPDATE user_credentials 
        SET password_reset_token = $1, password_reset_expires_at = $2
        WHERE id = $3
    `, [resetToken, expiresAt, userResult.rows[0].id]);

    return resetToken;
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
    if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }

    const userResult = await pool.query(`
        SELECT id FROM user_credentials 
        WHERE password_reset_token = $1 
        AND password_reset_expires_at > CURRENT_TIMESTAMP
        AND is_active = true
    `, [token]);

    if (userResult.rows.length === 0) {
        return false;
    }

    const passwordHash = await hashPassword(newPassword);
    const userId = userResult.rows[0].id;

    // Update password and clear reset token
    await pool.query(`
        UPDATE user_credentials 
        SET password_hash = $1, password_reset_token = NULL, password_reset_expires_at = NULL,
            email_verified = true
        WHERE id = $2
    `, [passwordHash, userId]);

    // Terminate all existing sessions for security
    await pool.query(`
        UPDATE user_sessions 
        SET status = 'terminated', terminated_at = CURRENT_TIMESTAMP, 
            termination_reason = 'password_reset'
        WHERE user_id = $1 AND status = 'active'
    `, [userId]);

    return true;
}

/**
 * Terminate session - IMPROVED with proper cleanup
 */
export async function terminateSession(sessionId: number, reason: string = 'logout'): Promise<boolean> {
    try {
        // First, mark session as terminated
        const result = await pool.query(`
            UPDATE user_sessions 
            SET status = 'terminated', terminated_at = CURRENT_TIMESTAMP, termination_reason = $1
            WHERE id = $2 AND status = 'active'
        `, [reason, sessionId]);

        // Log the termination
        await pool.query(`
            INSERT INTO session_activity_log (session_id, activity_type, metadata)
            VALUES ($1, 'logout', $2)
        `, [sessionId, JSON.stringify({ reason, terminated_at: new Date() })]);

        const wasTerminated = (result.rowCount ?? 0) > 0;

        if (wasTerminated) {
            console.log(`✅ Session ${sessionId} terminated: ${reason}`);
        } else {
            console.log(`⚠️ Session ${sessionId} was already terminated or not found`);
        }

        return wasTerminated;
    } catch (error) {
        console.error('Error terminating session:', error);
        return false;
    }
}

export async function extendSession(sessionToken: string): Promise<boolean> {
    try {
        // Verify token first
        const decoded = verifyJWTToken(sessionToken);
        if (!decoded) {
            console.log('❌ Invalid token for session extension');
            return false;
        }

        // Check if session exists and is active
        const sessionCheck = await pool.query(`
            SELECT status FROM user_sessions WHERE id = $1
        `, [decoded.sessionId]);

        if (sessionCheck.rows.length === 0 || sessionCheck.rows[0].status !== 'active') {
            console.log(`❌ Session ${decoded.sessionId} not found or not active`);
            return false;
        }

        // Extend the session
        const result = await pool.query(`
            UPDATE user_sessions 
            SET last_activity_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status = 'active'
        `, [decoded.sessionId]);

        const wasExtended = (result.rowCount ?? 0) > 0;

        if (wasExtended) {
            console.log(`✅ Session ${decoded.sessionId} extended successfully`);
        }

        return wasExtended;
    } catch (error) {
        console.error('Error extending session:', error);
        return false;
    }
}

/**
 * Get user by session token
 */
export async function getUserByToken(token: string): Promise<UserInfo | null> {
    const decoded = verifyJWTToken(token);
    if (!decoded) return null;

    // Mark expired sessions before validation
    await markExpiredSessions();

    const isValid = await validateSession(decoded.sessionId);
    if (!isValid) return null;

    const userResult = await pool.query(
        'SELECT id, email, display_name FROM user_credentials WHERE id = $1 AND is_active = true',
        [decoded.userId]
    );

    if (userResult.rows.length === 0) return null;

    const user = userResult.rows[0];
    const permissions = await getUserPermissions(user.id);

    return {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        sessionId: decoded.sessionId,
        permissions
    };
}

/**
 * Clean up old terminated sessions (optional - run periodically)
 */
export async function cleanupOldSessions(olderThanDays: number = 7): Promise<number> {
    try {
        const result = await pool.query(`
            DELETE FROM user_sessions 
            WHERE status IN ('terminated', 'expired') 
            AND terminated_at < CURRENT_TIMESTAMP - INTERVAL '${olderThanDays} days'
        `);

        const deletedCount = result.rowCount || 0;
        console.log(`🧹 Cleaned up ${deletedCount} old sessions older than ${olderThanDays} days`);
        return deletedCount;
    } catch (error) {
        console.error('Error cleaning up old sessions:', error);
        return 0;
    }
}

export async function cleanupExpiredSessions(): Promise<number> {
    try {
        // Mark expired sessions as terminated
        const expiredResult = await pool.query(`
            UPDATE user_sessions 
            SET status = 'expired', 
                terminated_at = CURRENT_TIMESTAMP,
                termination_reason = 'automatic_cleanup'
            WHERE status = 'active' 
            AND (
                expires_at < CURRENT_TIMESTAMP OR
                last_activity_at + (inactive_timeout_minutes * INTERVAL '1 minute') < CURRENT_TIMESTAMP
            )
        `);

        const expiredCount = expiredResult.rowCount || 0;

        if (expiredCount > 0) {
            console.log(`🧹 Automatically expired ${expiredCount} sessions during cleanup`);
        }

        return expiredCount;
    } catch (error) {
        console.error('Error cleaning up expired sessions:', error);
        return 0;
    }
}

// Optional: Add this to your server startup to clean up old sessions
export async function startupSessionMaintenance(): Promise<void> {
    console.log('🔧 Running startup session maintenance...');

    // Clean up old terminated sessions
    await cleanupOldSessions(7);

    // Mark very old active sessions as expired (safety cleanup)
    const expiredResult = await pool.query(`
        UPDATE user_sessions 
        SET status = 'expired', 
            terminated_at = CURRENT_TIMESTAMP,
            termination_reason = 'startup_cleanup'
        WHERE status = 'active' 
        AND created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
    `);

    const expiredCount = expiredResult.rowCount || 0;
    if (expiredCount > 0) {
        console.log(`🧹 Expired ${expiredCount} very old active sessions during startup`);
    }
}

/**
 * Mark expired sessions as expired (don't delete them - preserve audit trail)
 */
export async function markExpiredSessions(): Promise<number> {
    try {
        const result = await pool.query(`
            UPDATE user_sessions 
            SET 
                status = 'expired', 
                terminated_at = CURRENT_TIMESTAMP,
                termination_reason = 'automatic_expiry'
            WHERE status = 'active' 
            AND last_activity_at + (inactive_timeout_minutes * INTERVAL '1 minute') < NOW()
        `);

        const expiredCount = result.rowCount || 0;

        if (expiredCount > 0) {
            console.log(`⏰ Marked ${expiredCount} sessions as expired`);
        }

        return expiredCount;
    } catch (error) {
        console.error('Error marking expired sessions:', error);
        return 0;
    }
}

// =============================================================================
// MIDDLEWARE FUNCTIONS (Express middlewares using the service functions above)
// =============================================================================

import { Request, Response, NextFunction } from 'express';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            authUser?: UserInfo;
            sessionToken?: string;
        }
    }
}

/**
 * Authentication middleware for new credential-based auth
 */
export const authenticateCredentials = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            res.status(401).json({ error: 'Access token required' });
            return;
        }

        const user = await getUserByToken(token);
        if (!user) {
            res.status(401).json({
                error: 'Invalid or expired token',
                code: 'SESSION_EXPIRED',
                action: 'redirect_to_login'
            });
            return;
        }

        // Attach user info to request
        req.authUser = user;
        req.sessionToken = token;

        // Update session activity
        await updateSessionActivity(user.sessionId, req.originalUrl);

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Internal authentication error' });
    }
};

/**
 * Check if user has specific permission for a therapist
 */
export const requirePermission = (
    requiredRole: 'viewer' | 'manager' | 'owner' | 'super_admin' = 'viewer'
) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.authUser) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const therapistId = req.query.therapistId || req.params.therapistId || req.body.therapistId;

        if (!therapistId) {
            res.status(400).json({ error: 'Therapist ID required' });
            return;
        }

        // Check permission
        const hasPermission = req.authUser.permissions.some(permission => {
            if (permission.role === 'super_admin') return true;
            if (permission.therapistId !== parseInt(therapistId)) return false;

            const roleHierarchy = { 'viewer': 1, 'manager': 2, 'owner': 3, 'super_admin': 4 };
            return roleHierarchy[permission.role] >= roleHierarchy[requiredRole];
        });

        if (!hasPermission) {
            res.status(403).json({
                error: 'Insufficient permissions',
                required: requiredRole,
                therapistId: therapistId
            });
            return;
        }

        next();
    };
};

/**
 * Get therapist email from user permissions (for backward compatibility)
 */
export const getTherapistEmailFromAuth = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    const requestedEmail = req.query.therapistEmail || req.body.therapistEmail;

    if (requestedEmail) {
        // Validate user has permission for this email
        const hasPermission = req.authUser.permissions.some(permission => {
            return permission.role === 'super_admin' || permission.therapistEmail === requestedEmail;
        });

        if (!hasPermission) {
            res.status(403).json({
                error: 'No permission for requested therapist',
                requestedEmail
            });
            return;
        }
    } else {
        // Use first available therapist email
        if (req.authUser.permissions.length === 0) {
            res.status(403).json({ error: 'No therapist access permissions' });
            return;
        }

        const firstPermission = req.authUser.permissions[0];
        req.query.therapistEmail = firstPermission.therapistEmail;
        req.body.therapistEmail = firstPermission.therapistEmail;
    }

    next();
};


// Temporary test function - remove after testing
export async function testSessionConfig(): Promise<void> {
    console.log('🧪 Testing session configuration...');

    const config = await getAuthConfig();
    console.log('📋 Current session config:', {
        environment: process.env.NODE_ENV || 'development',
        inactiveTimeoutMinutes: config.inactiveTimeoutMinutes,
        warningTimeoutMinutes: config.warningTimeoutMinutes,
        maxSessionHours: config.maxSessionHours,
        tokenRefreshMinutes: config.tokenRefreshMinutes
    });
}