<?php
// Shared helpers for the REST endpoints.

function send_cors_headers($methods = 'GET, POST, PUT, DELETE, PATCH, OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: $methods");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Content-Type: application/json; charset=UTF-8");
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

function json_input() {
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function respond($payload, $code = 200) {
    http_response_code($code);
    echo json_encode($payload);
    exit();
}

function fail($message, $code = 400) {
    respond(['status' => 'error', 'message' => $message], $code);
}

function get_user($conn, $user_id) {
    $stmt = $conn->prepare("SELECT id, name, email, role FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $user;
}

function require_admin($conn, $admin_id) {
    $admin = get_user($conn, (int)$admin_id);
    if (!$admin || $admin['role'] !== 'admin') {
        fail('Access denied: admin only', 403);
    }
    return $admin;
}

function add_notification($conn, $user_id, $message, $type, $reference_id = null) {
    $stmt = $conn->prepare("INSERT INTO notifications (user_id, message, type, reference_id) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("issi", $user_id, $message, $type, $reference_id);
    $stmt->execute();
    $stmt->close();
}

// Returns 'owner', 'collaborator' or null.
function task_role($conn, $task_id, $user_id) {
    $stmt = $conn->prepare("SELECT user_id FROM tasks WHERE id = ?");
    $stmt->bind_param("i", $task_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) return null;
    if ((int)$row['user_id'] === (int)$user_id) return 'owner';

    $stmt = $conn->prepare("SELECT id FROM task_shared WHERE task_id = ? AND user_id = ? AND status = 'accepted'");
    $stmt->bind_param("ii", $task_id, $user_id);
    $stmt->execute();
    $shared = $stmt->get_result()->num_rows > 0;
    $stmt->close();
    return $shared ? 'collaborator' : null;
}
