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
// Include database connection
require_once 'db.php';
// Make sure we have a search query and user_id
$search_term = isset($_GET['search']) ? $_GET['search'] : '';
$user_id = isset($_GET['user_id']) ? $_GET['user_id'] : null;
if (empty($search_term) || strlen($search_term) < 2) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Search term should be at least 2 characters'
    ]);
    exit();
}
if (!$user_id) {
    echo json_encode([
        'status' => 'error',
        'message' => 'User ID is required'
    ]);
    exit();
}
// Prepare search term for LIKE query
$search_term = "%$search_term%";
// Find users by name or email, excluding the current user
$query = "SELECT id, name, email FROM users
          WHERE (name LIKE ? OR email LIKE ?)
          AND id != ?
          LIMIT 10";
$stmt = $conn->prepare($query);
$stmt->bind_param("ssi", $search_term, $search_term, $user_id);
$stmt->execute();
$result = $stmt->get_result();
$users = [];
while ($row = $result->fetch_assoc()) {
    $users[] = $row;
}
echo json_encode([
    'status' => 'success',
    'users' => $users
]);
$conn->close();
