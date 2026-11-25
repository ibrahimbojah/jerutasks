import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/TaskComments.css';
import { API_URL } from '../config';
const TaskComments = ({ taskId, userId, userName }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  useEffect(() => {
    fetchComments();
  }, [taskId]);
  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/comments.php?task_id=${taskId}&user_id=${userId}`);
     
      if (response.data.status === 'success') {
        setComments(response.data.comments);
      } else {
        setError(response.data.message || 'Failed to fetch comments');
      }
    } catch (err) {
      setError('Error fetching comments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
   
    if (!newComment.trim()) {
      setError('Comment cannot be empty');
      return;
    }
   
    try {
      setSubmitting(true);
      setError('');
     
      const response = await axios.post(`${API_URL}/comments.php`, {
        task_id: taskId,
        user_id: userId,
        comment: newComment
      });
     
      if (response.data.status === 'success') {
        setComments([response.data.comment, ...comments]);
        setNewComment('');
        setSuccessMessage('Comment added successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.message || 'Failed to add comment');
      }
    } catch (err) {
      setError('Error adding comment');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };
  const handleDelete = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }
   
    try {
      const response = await axios.delete(`${API_URL}/comments.php`, {
        data: {
          comment_id: commentId,
          user_id: userId
        }
      });
     
      if (response.data.status === 'success') {
        setComments(comments.filter(comment => comment.id !== commentId));
        setSuccessMessage('Comment deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.message || 'Failed to delete comment');
      }
    } catch (err) {
      setError('Error deleting comment');
      console.error(err);
    }
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  return (
    <div className="task-comments">
      <h3>Comments</h3>
     
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
     
      <form onSubmit={handleSubmit} className="comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows="3"
          disabled={submitting}
        ></textarea>
        <button
          type="submit"
          className="submit-btn"
          disabled={submitting || !newComment.trim()}
        >
          {submitting ? 'Adding...' : 'Add Comment'}
        </button>
      </form>
     
      {loading ? (
        <div className="loading">Loading comments...</div>
      ) : comments.length > 0 ? (
        <div className="comments-list">
          {comments.map(comment => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <strong>{comment.user_name}</strong>
                <span className="comment-date">{formatDate(comment.created_at)}</span>
              </div>
              <div className="comment-body">{comment.comment}</div>
              {(userId === parseInt(comment.user_id)) && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="delete-btn"
                  title="Delete comment"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-comments">No comments yet. Be the first to add one!</div>
      )}
    </div>
  );
};
export default TaskComments;
