/**
 * Utility functions untuk standard API response format.
 * Konsisten dengan spesifikasi di Technical Assignment:
 *
 * Success: { success: true,  message: "...", data: {} }
 * Error  : { success: false, message: "...", errors: {} }
 */

/**
 * Kirim response sukses.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {any} data
 * @param {number} statusCode
 */
const sendSuccess = (res, message = 'Success', data = null, statusCode = 200) => {
    const body = { success: true, message };
    if (data !== null) body.data = data;
    return res.status(statusCode).json(body);
};

/**
 * Kirim response error (validasi, not found, dsb).
 * @param {import('express').Response} res
 * @param {string} message
 * @param {any} errors
 * @param {number} statusCode
 */
const sendError = (res, message = 'Error', errors = null, statusCode = 400) => {
    const body = { success: false, message };
    if (errors !== null) body.errors = errors;
    return res.status(statusCode).json(body);
};

module.exports = { sendSuccess, sendError };
