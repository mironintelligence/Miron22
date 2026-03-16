UPDATE users
SET role = 'admin', is_active = TRUE
WHERE LOWER(email) = 'cdtmiron@gmail.com';

