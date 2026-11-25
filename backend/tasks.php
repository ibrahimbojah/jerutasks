<?php
// Tasks CRUD + sharing.
//   GET    ?user_id=U              -> all tasks the user owns or collaborates on
//   GET    ?id=T&user_id=U         -> one task (with shared_users)
//   POST   {title, description, due_date, status, user_id, shared_users:[ids]}
//   PUT    ?id=T&user_id=U  body as POST (owner: all fields + sharing; collaborator: fields only)
//   DELETE ?id=T&user_id=U  (owner only)
require_once 'helpers.php';
send_cors_headers('GET, POST, PUT, DELETE, OPTIONS');
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$allowed_status = ['pending', 'in_progress', 'completed'];

function clean_task_input($data, $allowed_status) {
    $title = trim($data['title'] ?? '');
    if ($title === '') fail('Task title is required');
    $status = $data['status'] ?? 'pending';
    if (!in_array($status, $allowed_status, true)) $status = 'pending';
    $due = !empty($data['due_date']) ? $data['due_date'] : null;
    return [$title, trim($data['description'] ?? ''), $due, $status];
}

function shared_users($conn, $task_id) {
    $stmt = $conn->prepare("SELECT u.id AS user_id, u.name, u.email, ts.status
                            FROM task_shared ts JOIN users u ON u.id = ts.user_id
                            WHERE ts.task_id = ? AND ts.status <> 'declined'");
    $stmt->bind_param("i", $task_id);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    return $rows;
}

// Share the task with new users (pending invite + notification); remove users no longer selected.
function sync_sharing($conn, $task_id, $owner, $title, $ids) {
    $ids = array_values(array_unique(array_filter(array_map('intval', (array)$ids),
        fn($id) => $id > 0 && $id !== (int)$owner['id'])));

    $current = array_map(fn($r) => (int)$r['user_id'], shared_users($conn, $task_id));

    foreach (array_diff($current, $ids) as $uid) {
        $stmt = $conn->prepare("DELETE FROM task_shared WHERE task_id = ? AND user_id = ?");
        $stmt->bind_param("ii", $task_id, $uid);
        $stmt->execute();
        $stmt->close();
    }

    foreach (array_diff($ids, $current) as $uid) {
        if (!get_user($conn, $uid)) continue;
        $stmt = $conn->prepare("INSERT INTO task_shared (task_id, user_id, status) VALUES (?, ?, 'pending')
                                ON DUPLICATE KEY UPDATE status = 'pending'");
        $stmt->bind_param("ii", $task_id, $uid);
        $stmt->execute();
        $stmt->close();
        add_notification($conn, $uid, "{$owner['name']} shared the task \"$title\" with you", 'task_share', $task_id);
    }
}

switch ($method) {
case 'GET':
    $user_id = (int)($_GET['user_id'] ?? 0);
    if (!$user_id) fail('user_id is required');

    if (isset($_GET['id'])) {
        $task_id = (int)$_GET['id'];
        $role = task_role($conn, $task_id, $user_id);
        if (!$role) fail('Task not found or access denied', 404);

        $stmt = $conn->prepare("SELECT t.*, u.name AS owner_name FROM tasks t JOIN users u ON u.id = t.user_id WHERE t.id = ?");
        $stmt->bind_param("i", $task_id);
        $stmt->execute();
        $task = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        $task['role'] = $role;
        $task['shared_users'] = shared_users($conn, $task_id);
        respond(['status' => 'success', 'task' => $task]);
    }

    $sql = "SELECT t.*, u.name AS owner_name,
                   CASE WHEN t.user_id = ? THEN 'owner' ELSE 'collaborator' END AS role,
                   (SELECT COUNT(*) FROM task_shared s WHERE s.task_id = t.id AND s.status = 'accepted') > 0 AS is_shared
            FROM tasks t
            JOIN users u ON u.id = t.user_id
            WHERE t.user_id = ?
               OR t.id IN (SELECT task_id FROM task_shared WHERE user_id = ? AND status = 'accepted')
            ORDER BY (t.due_date IS NULL), t.due_date, t.created_at DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iii", $user_id, $user_id, $user_id);
    $stmt->execute();
    $tasks = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    foreach ($tasks as &$t) $t['is_shared'] = (bool)$t['is_shared'];
    respond(['status' => 'success', 'tasks' => $tasks]);

case 'POST':
    $data = json_input();
    $user = get_user($conn, (int)($data['user_id'] ?? 0));
    if (!$user) fail('Valid user_id is required');
    [$title, $desc, $due, $status] = clean_task_input($data, $allowed_status);

    $stmt = $conn->prepare("INSERT INTO tasks (user_id, title, description, due_date, status) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("issss", $user['id'], $title, $desc, $due, $status);
    if (!$stmt->execute()) fail('Failed to create task', 500);
    $task_id = $conn->insert_id;
    $stmt->close();

    sync_sharing($conn, $task_id, $user, $title, $data['shared_users'] ?? []);
    respond(['status' => 'success', 'message' => 'Task created', 'task_id' => $task_id], 201);

case 'PUT':
    $task_id = (int)($_GET['id'] ?? 0);
    $user = get_user($conn, (int)($_GET['user_id'] ?? 0));
    if (!$task_id || !$user) fail('id and user_id are required');
    $role = task_role($conn, $task_id, $user['id']);
    if (!$role) fail('Task not found or access denied', 404);

    $data = json_input();
    [$title, $desc, $due, $status] = clean_task_input($data, $allowed_status);

    $stmt = $conn->prepare("UPDATE tasks SET title = ?, description = ?, due_date = ?, status = ? WHERE id = ?");
    $stmt->bind_param("ssssi", $title, $desc, $due, $status, $task_id);
    if (!$stmt->execute()) fail('Failed to update task', 500);
    $stmt->close();

    if ($role === 'owner') {
        sync_sharing($conn, $task_id, $user, $title, $data['shared_users'] ?? []);
    } else {
        $stmt = $conn->prepare("SELECT user_id FROM tasks WHERE id = ?");
        $stmt->bind_param("i", $task_id);
        $stmt->execute();
        $owner_id = (int)$stmt->get_result()->fetch_assoc()['user_id'];
        $stmt->close();
        add_notification($conn, $owner_id, "{$user['name']} updated the task \"$title\"", 'task_update', $task_id);
    }
    respond(['status' => 'success', 'message' => 'Task updated']);

case 'DELETE':
    $task_id = (int)($_GET['id'] ?? 0);
    $user_id = (int)($_GET['user_id'] ?? 0);
    if (task_role($conn, $task_id, $user_id) !== 'owner') fail('Only the task owner can delete it', 403);

    $stmt = $conn->prepare("DELETE FROM tasks WHERE id = ?");
    $stmt->bind_param("i", $task_id);
    $stmt->execute();
    $stmt->close();
    respond(['status' => 'success', 'message' => 'Task deleted']);

default:
    fail('Method not allowed', 405);
}
