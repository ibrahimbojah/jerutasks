<?php
// Notifications.
//   GET ?user_id=U                                  -> {notifications, unread_count}
//   PUT ?notification_id=N&user_id=U  {action:'mark_read'}
//   PUT ?notification_id=N&user_id=U  {action:'respond_share', response:'accepted'|'declined'}
require_once 'helpers.php';
send_cors_headers('GET, PUT, OPTIONS');
require_once 'db.php';

switch ($_SERVER['REQUEST_METHOD']) {
case 'GET':
    $user_id = (int)($_GET['user_id'] ?? 0);
    if (!$user_id) fail('user_id is required');

    $stmt = $conn->prepare("SELECT id, message, type, reference_id, is_read, created_at
                            FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $unread = 0;
    foreach ($rows as &$n) {
        $n['is_read'] = (bool)$n['is_read'];
        if (!$n['is_read']) $unread++;
    }
    respond(['status' => 'success', 'notifications' => $rows, 'unread_count' => $unread]);

case 'PUT':
    $nid = (int)($_GET['notification_id'] ?? 0);
    $user_id = (int)($_GET['user_id'] ?? 0);
    $data = json_input();

    $stmt = $conn->prepare("SELECT * FROM notifications WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $nid, $user_id);
    $stmt->execute();
    $n = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$n) fail('Notification not found', 404);

    $action = $data['action'] ?? 'mark_read';

    if ($action === 'mark_read') {
        $stmt = $conn->prepare("UPDATE notifications SET is_read = TRUE WHERE id = ?");
        $stmt->bind_param("i", $nid);
        $stmt->execute();
        $stmt->close();
        respond(['status' => 'success']);
    }

    if ($action === 'respond_share') {
        $response = $data['response'] ?? '';
        if (!in_array($response, ['accepted', 'declined'], true)) fail('Invalid response');
        if ($n['type'] !== 'task_share') fail('Not a task share notification');
        $task_id = (int)$n['reference_id'];

        $stmt = $conn->prepare("UPDATE task_shared SET status = ? WHERE task_id = ? AND user_id = ? AND status = 'pending'");
        $stmt->bind_param("sii", $response, $task_id, $user_id);
        $stmt->execute();
        $changed = $stmt->affected_rows;
        $stmt->close();
        if ($changed === 0) fail('This invitation was already answered or removed');

        $suffix = $response === 'accepted' ? ' (Accepted)' : ' (Declined)';
        $stmt = $conn->prepare("UPDATE notifications SET is_read = TRUE, message = CONCAT(message, ?) WHERE id = ?");
        $stmt->bind_param("si", $suffix, $nid);
        $stmt->execute();
        $stmt->close();

        // Let the owner know.
        $stmt = $conn->prepare("SELECT t.user_id, t.title FROM tasks t WHERE t.id = ?");
        $stmt->bind_param("i", $task_id);
        $stmt->execute();
        $task = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $me = get_user($conn, $user_id);
        if ($task && $me) {
            add_notification($conn, (int)$task['user_id'], "{$me['name']} $response your task \"{$task['title']}\"", 'share_response', $task_id);
        }
        respond(['status' => 'success', 'message' => "Task $response"]);
    }
    fail('Unknown action');

default:
    fail('Method not allowed', 405);
}
