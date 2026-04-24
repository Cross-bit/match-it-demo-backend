/* =============================================================
* DESCRIPTION
* ==============================================================
* Seeds main database with test data for integration testing.
*
*/



/*
* Create test users.
*/
INSERT INTO users (id, uuid, name, email, access_rights, authentication_method)
VALUES
(1, '550e8400-e29b-41d4-a716-446655440000', 'alice', 'alice@example.com', 'NORMAL', 'CREDENTIALS'),
(2, '550e8400-e29b-41d4-a716-446655440001', 'bob', 'bob@example.com', 'NORMAL', 'CREDENTIALS'),
(3, '550e8400-e29b-41d4-a716-446655440002', 'charlie', 'charlie@example.com', 'NORMAL', 'CREDENTIALS');

-- Insert test credentials with predefined IDs and user references
INSERT INTO users_credentials (id, user_id, password_hash, is_verified)
VALUES
(1, 1, 'hashed_password_1', true),
(2, 2, 'hashed_password_2', true),
(3, 3, 'hashed_password_3', true);