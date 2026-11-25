<?php
// Task comments.
//   GET    ?task_id=T&user_id=U
//   POST   {task_id, user_id, comment}
//   DELETE {comment_id, user_id}   (comment author or task owner)
require_once 'helpers.php';
send_cors_headers('GET, POST, DELETE, OPTIONS');
require_once 'db.php';

switch ($_SERVER['REQUEST_METHOD']) {
case 'GET':
    $task_id = (int)($_GET['task_id'] ?? 0);
    $user_id = (int)($_GET['user_id'] ?? 0);
    if (!task_role($conn, $task_id, $user_id)) fail('Access denied', 403);

    $stmt = $conn->prepare("SELECT c.id, c.user_id, u.name AS user_name, c.comment, c.created_at
                            FROM task_comments c JOIN users u ON u.id = c.user_id
                            WHERE c.task_id = ? ORDER BY c.created_at DESC, c.id DESC");
    $stmt->bind_param("i", $task_id);
    $stmt->execute();
    $comments = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    respond(['status' => 'success', 'comments' => $comments]);

case 'POST':
    $data = json_input();
    $task_id = (int)($data['task_id'] ?? 0);
    $user = get_user($conn, (int)($data['user_id'] ?? 0));
    $text = trim($data['comment'] ?? '');
    if (!$user || $text === '') fail('user_id and comment are required');
    if (!task_role($conn, $task_id, $user['id'])) fail('Access denied', 403);

    $stmt = $conn->prepare("INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)");
    $stmt->bind_param("iis", $task_id, $user['id'], $text);
    if (!$stmt->execute()) fail('Failed to add comment', 500);
    $comment_id = $conn->insert_id;
    $stmt->close();

    // Notify the other participants (owner + accepted collaborators).
    $stmt = $conn->prepare("SELECT t.title, t.user_id FROM tasks t WHERE t.id = ?");
    $stmt->bind_param("i", $task_id);
    $stmt->execute();
    $task = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $participants = [(int)$task['user_id']];
    $stmt = $conn->prepare("SELECT user_id FROM task_shared WHERE task_id = ? AND status = 'accepted'");
    $stmt->bind_param("i", $task_id);
    $stmt->execute();
    foreach ($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $r) $participants[] = (int)$r['user_id'];
    $stmt->close();
    foreach (array_unique($participants) as $pid) {
        if ($pid !== (int)$user['id']) {
            add_notification($conn, $pid, "{$user['name']} commented on \"{$task['title']}\"", 'task_comment', $task_id);
        }
    }

    $stmt = $conn->prepare("SELECT c.id, c.user_id, u.name AS user_name, c.comment, c.created_at
                            FROM task_comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?");
    $stmt->bind_param("i", $comment_id);
    $stmt->execute();
    $comment = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    respond(['status' => 'success', 'comment' => $comment], 201);

case 'DELETE':
    $data = json_input();
    $comment_id = (int)($data['comment_id'] ?? 0);
    $user_id = (int)($data['user_id'] ?? 0);

    $stmt = $conn->prepare("SELECT user_id, task_id FROM task_comments WHERE id = ?");
    $stmt->bind_param("i", $comment_id);
    $stmt->execute();
    $c = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$c) fail('Comment not found', 404);
    if ((int)$c['user_id'] !== $user_id && task_role($conn, (int)$c['task_id'], $user_id) !== 'owner') {
        fail('You can only delete your own comments', 403);
    }

    $stmt = $conn->prepare("DELETE FROM task_comments WHERE id = ?");
    $stmt->bind_param("i", $comment_id);
    $stmt->execute();
    $stmt->close();
    respond(['status' => 'success', 'message' => 'Comment deleted']);

default:
    fail('Method not allowed', 405);
}
