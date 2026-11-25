<?php
// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");
// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}
// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] != 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit();
}
// Include database connection
require_once 'db.php';
// Get admin ID from query parameter
if (isset($_GET['admin_id'])) {
    $admin_id = $_GET['admin_id'];

    // Verify if the user is an admin
    $stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->bind_param("i", $admin_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0 || $result->fetch_assoc()['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized access']);
        exit();
    }

    $stmt->close();
} else {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Admin ID is required']);
    exit();
}
// Get statistics
$stats = [];
// Total users count
$stmt = $conn->prepare("SELECT COUNT(*) as total_users FROM users");
$stmt->execute();
$stats['total_users'] = $stmt->get_result()->fetch_assoc()['total_users'];
// Total tasks count
$stmt = $conn->prepare("SELECT COUNT(*) as total_tasks FROM tasks");
$stmt->execute();
$stats['total_tasks'] = $stmt->get_result()->fetch_assoc()['total_tasks'];
// Tasks by status
$stmt = $conn->prepare("SELECT status, COUNT(*) as count FROM tasks GROUP BY status");
$stmt->execute();
$result = $stmt->get_result();
$task_status = [];
while ($row = $result->fetch_assoc()) {
    $task_status[$row['status']] = $row['count'];
}
$stats['tasks_by_status'] = $task_status;
// Tasks created in the last 7 days
$stmt = $conn->prepare("SELECT COUNT(*) as recent_tasks FROM tasks WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
$stmt->execute();
$stats['tasks_last_7_days'] = $stmt->get_result()->fetch_assoc()['recent_tasks'];
// Users created in the last 30 days
$stmt = $conn->prepare("SELECT COUNT(*) as recent_users FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
$stmt->execute();
$stats['users_last_30_days'] = $stmt->get_result()->fetch_assoc()['recent_users'];
// Return statistics
echo json_encode([
    'status' => 'success',
    'stats' => $stats
]);
$conn->close();
