// Name of the cookie that remembers which doctor a signed-in doctor account
// is currently viewing. Kept in its own file so both server actions and the
// auth actions can import it without pulling in heavier modules.
export const DOCTOR_COOKIE = 'clinic_selected_doctor';
