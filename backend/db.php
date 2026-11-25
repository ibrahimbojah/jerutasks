<?php
// Database connection (mysqli). Credentials come from config.php (not committed).
$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    http_response_code(500);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode(['status' => 'error', 'message' => 'Missing backend/config.php (copy config.sample.php)']);
    exit();
}
$config = require $configFile;

mysqli_report(MYSQLI_REPORT_OFF);
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    http_response_code(500);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit();
}
$conn->set_charset('utf8mb4');
