import {openDB} from '../database';
import {success, failure} from '../utils/serviceResponse';

/**
 * Get appointments for a user.
 * Includes:
 * - appointments belonging to the user
 */
export async function getAppointments(userId) {
  try {
    if (!userId) {
      return failure('user_id is required', 'MISSING_USER_ID');
    }

    const parsedUserId = Number(userId);

    if (!Number.isInteger(parsedUserId)) {
      return failure('user_id must be a valid integer', 'INVALID_USER_ID');
    }

    const db = await openDB();

    const result = await db.execute(
      `
      SELECT *
      FROM appointments
      WHERE user_id = ?
      `,
      [parsedUserId],
    );

    const appointments = result.rows?._array ?? [];

    if (appointments.length === 0) {
      return failure('Appointment entries not found', 'APPOINTMENTS_NOT_FOUND');
    }

    return success(appointments);
  } catch (error) {
    console.error('getAppointments error:', error);

    return failure('Failed to fetch appointments', 'APPOINTMENTS_FETCH_ERROR');
  }
}

/**
 * Add a new appointment.
 */
export async function addAppointment(data) {
  try {
    if (!data) {
      return failure('No data provided', 'NO_DATA');
    }

    const required = [
      'title',
      'content',
      'appointment_date',
      'appointment_time',
      'appointment_location',
      'user_id',
    ];

    const missing = required.filter(field => !data[field]);

    if (missing.length > 0) {
      return failure(
        `Missing required fields: ${missing.join(', ')}`,
        'MISSING_FIELDS',
      );
    }

    const userId = Number(data.user_id);

    if (!Number.isInteger(userId)) {
      return failure('user_id must be a valid integer', 'INVALID_USER_ID');
    }

    const db = await openDB();

    // Check whether the user's profile exists
    const userResult = await db.execute('SELECT 1 FROM profile WHERE id = ?', [
      userId,
    ]);

    const userExists = userResult.rows?._array?.[0];

    if (!userExists) {
      return failure('User profile not found', 'USER_PROFILE_NOT_FOUND');
    }

    await db.execute(
      `
      INSERT INTO appointments (
        title,
        content,
        appointment_date,
        appointment_time,
        appointment_location,
        appointment_status,
        user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.title,
        data.content,
        data.appointment_date,
        data.appointment_time,
        data.appointment_location,
        'pending',
        userId,
      ],
    );

    return success({
      status: 'success',
      message: 'Appointment added successfully',
    });
  } catch (error) {
    console.error('addAppointment error:', error);

    return failure('Failed to add appointment', 'APPOINTMENT_ADD_ERROR');
  }
}

/**
 * Update an existing appointment.
 */
export async function updateAppointment(appointmentId, data) {
  try {
    if (!appointmentId) {
      return failure('appointment_id is required', 'MISSING_APPOINTMENT_ID');
    }

    const parsedAppointmentId = Number(appointmentId);

    if (!Number.isInteger(parsedAppointmentId)) {
      return failure(
        'appointment_id must be a valid integer',
        'INVALID_APPOINTMENT_ID',
      );
    }

    if (!data) {
      return failure('No data provided', 'NO_DATA');
    }

    if (!data.user_id) {
      return failure('user_id is required', 'MISSING_USER_ID');
    }

    const userId = Number(data.user_id);

    if (!Number.isInteger(userId)) {
      return failure('user_id must be a valid integer', 'INVALID_USER_ID');
    }

    const db = await openDB();

    // Get existing appointment
    const result = await db.execute('SELECT * FROM appointments WHERE id = ?', [
      parsedAppointmentId,
    ]);

    const existingAppointment = result.rows?._array?.[0];

    if (!existingAppointment) {
      return failure('Appointment entry not found', 'APPOINTMENT_NOT_FOUND');
    }

    if (existingAppointment.user_id !== userId) {
      return failure('Appointment entry not found', 'APPOINTMENT_NOT_FOUND');
    }

    const title = data.title ?? existingAppointment.title;

    const content = data.content ?? existingAppointment.content;

    const appointmentDate =
      data.appointment_date ?? existingAppointment.appointment_date;

    const appointmentTime =
      data.appointment_time ?? existingAppointment.appointment_time;

    const appointmentLocation =
      data.appointment_location ?? existingAppointment.appointment_location;

    const appointmentStatus =
      data.appointment_status ?? existingAppointment.appointment_status;

    await db.execute(
      `
      UPDATE appointments
      SET
        title = ?,
        content = ?,
        appointment_date = ?,
        appointment_time = ?,
        appointment_location = ?,
        appointment_status = ?
      WHERE id = ?
      `,
      [
        title,
        content,
        appointmentDate,
        appointmentTime,
        appointmentLocation,
        appointmentStatus,
        parsedAppointmentId,
      ],
    );

    return success({
      status: 'success',
      message: 'Appointment updated successfully',
    });
  } catch (error) {
    console.error('updateAppointment error:', error);

    return failure('Failed to update appointment', 'APPOINTMENT_UPDATE_ERROR');
  }
}

/**
 * Delete an appointment.
 */
export async function deleteAppointment(appointmentId, userId) {
  try {
    if (!appointmentId) {
      return failure('appointment_id is required', 'MISSING_APPOINTMENT_ID');
    }

    if (!userId) {
      return failure('user_id is required', 'MISSING_USER_ID');
    }

    const parsedAppointmentId = Number(appointmentId);
    const parsedUserId = Number(userId);

    if (!Number.isInteger(parsedAppointmentId)) {
      return failure(
        'appointment_id must be a valid integer',
        'INVALID_APPOINTMENT_ID',
      );
    }

    if (!Number.isInteger(parsedUserId)) {
      return failure('user_id must be a valid integer', 'INVALID_USER_ID');
    }

    const db = await openDB();

    // Check appointment exists
    const appointmentResult = await db.execute(
      'SELECT * FROM appointments WHERE id = ?',
      [parsedAppointmentId],
    );

    const appointment = appointmentResult.rows?._array?.[0];

    if (!appointment) {
      return failure('Appointment entry not found', 'APPOINTMENT_NOT_FOUND');
    }

    /*
     * Only allow the user to delete their own appointment.
     * Global appointments (user_id = 0) cannot be deleted
     * by this function.
     */
    if (appointment.user_id !== parsedUserId) {
      return failure('Appointment entry not found', 'APPOINTMENT_NOT_FOUND');
    }

    await db.execute(
      `
      DELETE FROM appointments
      WHERE id = ? AND user_id = ?
      `,
      [parsedAppointmentId, parsedUserId],
    );

    return success({
      status: 'success',
      message: 'Appointment deleted successfully',
    });
  } catch (error) {
    console.error('deleteAppointment error:', error);

    return failure('Failed to delete appointment', 'APPOINTMENT_DELETE_ERROR');
  }
}
