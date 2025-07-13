// clinic-api/src/routes/therapist-settings.ts
// API routes for therapist settings management

import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import pool from "../config/database.js";

const router: Router = Router();

// Types for settings
interface TherapistSetting {
    key: string;
    value: string;
    updated_at: string;
}

interface SettingsRequestBody {
    settings: Record<string, string>;
}

interface SettingsParams extends ParamsDictionary {
    therapistEmail: string;
}

// Type-safe async handler
const asyncHandler = (
    handler: (
        req: Request<SettingsParams, any, SettingsRequestBody>,
        res: Response
    ) => Promise<Response | void>
) => {
    return async (
        req: Request<SettingsParams, any, SettingsRequestBody>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            await handler(req, res);
        } catch (error) {
            console.error('Settings API error:', error);
            next(error);
        }
    };
};

// Helper function to get therapist ID by email
async function getTherapistIdByEmail(email: string): Promise<number | null> {
    const result = await pool.query(
        "SELECT id FROM therapists WHERE email = $1",
        [email]
    );
    return result.rows[0]?.id || null;
}

// GET /api/therapists/:therapistEmail/settings
// Load all settings for a therapist
router.get("/:therapistEmail/settings", asyncHandler(async (req, res) => {
    const { therapistEmail } = req.params;

    console.log(`📖 Loading settings for therapist: ${therapistEmail}`);

    // Get therapist ID
    const therapistId = await getTherapistIdByEmail(therapistEmail);
    if (!therapistId) {
        return res.status(404).json({
            error: "Therapist not found",
            email: therapistEmail
        });
    }

    // Get all settings for this therapist
    const result = await pool.query(
        `SELECT setting_key, setting_value, updated_at 
     FROM therapist_settings 
     WHERE therapist_id = $1 
     ORDER BY setting_key`,
        [therapistId]
    );

    // Convert to key-value object
    const settings: Record<string, string> = {};
    const metadata: Record<string, { updated_at: string }> = {};

    result.rows.forEach((row: any) => {
        settings[row.setting_key] = row.setting_value;
        metadata[row.setting_key] = { updated_at: row.updated_at };
    });

    console.log(`✅ Loaded ${Object.keys(settings).length} settings for ${therapistEmail}`);

    return res.json({
        therapistId,
        therapistEmail,
        settings,
        metadata,
        count: Object.keys(settings).length
    });
}));

// PUT /api/therapists/:therapistEmail/settings
// Update specific settings for a therapist
router.put("/:therapistEmail/settings", asyncHandler(async (req, res) => {
    const { therapistEmail } = req.params;
    const { settings } = req.body;

    console.log(`💾 Updating settings for therapist: ${therapistEmail}`);
    console.log(`📝 Settings to update:`, settings);

    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({
            error: "Settings object is required",
            received: typeof settings
        });
    }

    // Get therapist ID
    const therapistId = await getTherapistIdByEmail(therapistEmail);
    if (!therapistId) {
        return res.status(404).json({
            error: "Therapist not found",
            email: therapistEmail
        });
    }

    // Update each setting using the database function
    const updatedSettings: Record<string, string> = {};
    const errors: Record<string, string> = {};

    for (const [key, value] of Object.entries(settings)) {
        try {
            // Validate setting key and value
            if (typeof key !== 'string' || key.trim() === '') {
                errors[key] = 'Setting key must be a non-empty string';
                continue;
            }

            if (typeof value !== 'string') {
                errors[key] = 'Setting value must be a string';
                continue;
            }

            // Use the database function to set the setting
            await pool.query(
                'SELECT set_therapist_setting($1, $2, $3)',
                [therapistId, key.trim(), value]
            );

            updatedSettings[key] = value;
            console.log(`✅ Updated setting: ${key} = ${value}`);

        } catch (error: any) {
            console.error(`❌ Error updating setting ${key}:`, error);
            errors[key] = error.message || 'Failed to update setting';
        }
    }

    // Get the updated settings to return
    const result = await pool.query(
        `SELECT setting_key, setting_value, updated_at 
     FROM therapist_settings 
     WHERE therapist_id = $1 AND setting_key = ANY($2)
     ORDER BY setting_key`,
        [therapistId, Object.keys(updatedSettings)]
    );

    const finalSettings: Record<string, string> = {};
    const metadata: Record<string, { updated_at: string }> = {};

    result.rows.forEach((row: any) => {
        finalSettings[row.setting_key] = row.setting_value;
        metadata[row.setting_key] = { updated_at: row.updated_at };
    });

    const hasErrors = Object.keys(errors).length > 0;

    console.log(`✅ Settings update completed for ${therapistEmail}`);
    console.log(`📊 Updated: ${Object.keys(updatedSettings).length}, Errors: ${Object.keys(errors).length}`);

    return res.status(hasErrors ? 207 : 200).json({
        therapistId,
        therapistEmail,
        updated: finalSettings,
        metadata,
        errors: hasErrors ? errors : undefined,
        summary: {
            total: Object.keys(settings).length,
            successful: Object.keys(updatedSettings).length,
            failed: Object.keys(errors).length
        }
    });
}));

// GET /api/therapists/:therapistEmail/settings/:settingKey
// Get a specific setting value
router.get("/:therapistEmail/settings/:settingKey", asyncHandler(async (req, res) => {
    const { therapistEmail, settingKey } = req.params;

    console.log(`🔍 Getting setting '${settingKey}' for therapist: ${therapistEmail}`);

    // Get therapist ID
    const therapistId = await getTherapistIdByEmail(therapistEmail);
    if (!therapistId) {
        return res.status(404).json({
            error: "Therapist not found",
            email: therapistEmail
        });
    }

    // Use the database function to get the setting
    const result = await pool.query(
        'SELECT get_therapist_setting($1, $2, $3) as value',
        [therapistId, settingKey, null] // null = no default, will return null if not found
    );

    const value = result.rows[0]?.value;

    if (value === null) {
        return res.status(404).json({
            error: "Setting not found",
            therapistEmail,
            settingKey
        });
    }

    // Get metadata
    const metadataResult = await pool.query(
        `SELECT updated_at FROM therapist_settings 
     WHERE therapist_id = $1 AND setting_key = $2`,
        [therapistId, settingKey]
    );

    console.log(`✅ Found setting '${settingKey}' = '${value}'`);

    return res.json({
        therapistId,
        therapistEmail,
        settingKey,
        value,
        updated_at: metadataResult.rows[0]?.updated_at
    });
}));

// DELETE /api/therapists/:therapistEmail/settings/:settingKey
// Delete a specific setting
router.delete("/:therapistEmail/settings/:settingKey", asyncHandler(async (req, res) => {
    const { therapistEmail, settingKey } = req.params;

    console.log(`🗑️ Deleting setting '${settingKey}' for therapist: ${therapistEmail}`);

    // Get therapist ID
    const therapistId = await getTherapistIdByEmail(therapistEmail);
    if (!therapistId) {
        return res.status(404).json({
            error: "Therapist not found",
            email: therapistEmail
        });
    }

    // Delete the setting
    const result = await pool.query(
        `DELETE FROM therapist_settings 
     WHERE therapist_id = $1 AND setting_key = $2 
     RETURNING setting_key, setting_value`,
        [therapistId, settingKey]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            error: "Setting not found",
            therapistEmail,
            settingKey
        });
    }

    const deletedSetting = result.rows[0];
    console.log(`✅ Deleted setting '${settingKey}'`);

    return res.json({
        message: "Setting deleted successfully",
        therapistId,
        therapistEmail,
        deleted: {
            key: deletedSetting.setting_key,
            value: deletedSetting.setting_value
        }
    });
}));

// POST /api/therapists/:therapistEmail/settings/reset
// Reset all settings to defaults
router.post("/:therapistEmail/settings/reset", asyncHandler(async (req, res) => {
    const { therapistEmail } = req.params;

    console.log(`🔄 Resetting all settings for therapist: ${therapistEmail}`);

    // Get therapist ID
    const therapistId = await getTherapistIdByEmail(therapistEmail);
    if (!therapistId) {
        return res.status(404).json({
            error: "Therapist not found",
            email: therapistEmail
        });
    }

    // Default settings
    const defaultSettings = {
        'payment_mode': 'simple',
        'view_mode': 'card',
        'auto_check_in_mode': 'false',
        'theme': 'light',
        'language': 'pt-BR',
        'notifications_enabled': 'true',
        'default_session_duration': '60',
        'currency_format': 'BRL'
    };

    // Delete all existing settings for this therapist
    await pool.query(
        'DELETE FROM therapist_settings WHERE therapist_id = $1',
        [therapistId]
    );

    // Insert default settings
    for (const [key, value] of Object.entries(defaultSettings)) {
        await pool.query(
            'SELECT set_therapist_setting($1, $2, $3)',
            [therapistId, key, value]
        );
    }

    console.log(`✅ Reset ${Object.keys(defaultSettings).length} settings to defaults`);

    return res.json({
        message: "Settings reset to defaults",
        therapistId,
        therapistEmail,
        resetSettings: defaultSettings,
        count: Object.keys(defaultSettings).length
    });
}));

export default router;