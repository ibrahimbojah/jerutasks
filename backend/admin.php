<?php
// Admin user management (all actions require an admin_id with role 'admin').
//   GET    ?admin_id=A                         -> list users
//   PUT    {admin_id, user_id, role}           -> change role
//   DELETE {admin_id, user_id}                 -> delete user (cascades)
//   POST   {admin_id, user_id, new_password}   -> reset password
//   PATCH  {admin_id, user_id, new_email}      -> change email
require_once 'helpers.php';
send_cors_headers('GET, POST, PUT, DELETE, PATCH, OPTIONS');
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = $method === 'GET' ? $_GET : json_input();
$admin = require_admin($conn, $data['admin_id'] ?? 0);

if ($method === 'GET') {
    $result = $conn->query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC");
    respond(['status' => 'success', 'users' => $result->fetch_all(MYSQLI_ASSOC)]);
}

$target_id = (int)($data['user_id'] ?? 0);
if (!get_user($conn, $target_id)) fail('User not found', 404);
if ($target_id === (int)$admin['id'] && in_array($method, ['PUT', 'DELETE'], true)) {
    fail('You cannot change or delete your own admin account');
}

switch ($method) {
case 'PUT':
    $role = $data['role'] ?? '';
    if (!in_array($role, ['user', 'admin'], true)) fail('Invalid role');
    $stmt = $conn->prepare("UPDATE users SET role = ? WHERE id = ?");
    $stmt->bind_param("si", $role, $target_id);
    $stmt->execute();
    respond(['status' => 'success', 'message' => 'Role updated']);

case 'DELETE':
    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $target_id);
    $stmt->execute();
    respond(['status' => 'success', 'message' => 'User deleted']);

case 'POST':
    $pass = $data['new_password'] ?? '';
    if (strlen($pass) < 6) fail('Password must be at least 6 characters');
    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->bind_param("si", $hash, $target_id);
    $stmt->execute();
    respond(['status' => 'success', 'message' => 'Password reset']);

case 'PATCH':
    $email = trim($data['new_email'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Invalid email');
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id <> ?");
    $stmt->bind_param("si", $email, $target_id);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) fail('Email already in use');
    $stmt->close();
    $stmt = $conn->prepare("UPDATE users SET email = ? WHERE id = ?");
    $stmt->bind_param("si", $email, $target_id);
    $stmt->execute();
    respond(['status' => 'success', 'message' => 'Email updated']);

default:
    fail('Method not allowed', 405);
}
