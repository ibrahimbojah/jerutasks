import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Notifications from './Notifications';
import { API_URL } from '../config';
const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');
  const [refreshMessage, setRefreshMessage] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(loggedInUser));
    fetchTasks();
  }, [navigate]);
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const loggedInUser = JSON.parse(localStorage.getItem('user'));
      const response = await axios.get(`${API_URL}/tasks.php?user_id=${loggedInUser.id}`);
     
      if (response.data.status === 'success') {
        console.log('Tasks received:', response.data.tasks);
        setTasks(response.data.tasks || []);
        if (!loading) {
          setRefreshMessage('Tasks refreshed successfully!');
          setTimeout(() => {
            setRefreshMessage('');
          }, 3000);
        }
      } else {
        setError('Failed to fetch tasks');
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Error fetching tasks: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };
  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    try {
      const loggedInUser = JSON.parse(localStorage.getItem('user'));
      const response = await axios.delete(`${API_URL}/tasks.php?id=${taskId}&user_id=${loggedInUser.id}`);
     
      if (response.data.status === 'success') {
        setTasks(tasks.filter(task => task.id !== taskId));
      } else {
        setError('Failed to delete task');
      }
    } catch (err) {
      setError('Error deleting task: ' + (err.response?.data?.message || err.message));
    }
  };
  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'in_progress':
        return 'status-in-progress';
      case 'completed':
        return 'status-completed';
      default:
        return '';
    }
  };
  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  const getFilteredTasks = () => {
    if (filter === 'all') {
      console.log('All tasks:', tasks);
      return tasks;
    } else if (filter === 'owned') {
      const ownedTasks = tasks.filter(task => task.role === 'owner');
      console.log('Owned tasks:', ownedTasks);
      return ownedTasks;
    } else if (filter === 'shared') {
      const sharedTasks = tasks.filter(task => task.role === 'collaborator');
      console.log('Shared tasks:', sharedTasks);
      return sharedTasks;
    }
    return tasks;
  };
  const filteredTasks = getFilteredTasks();
  const canEditTask = (task) => {
    return task.role === 'owner';
  };
  if (loading) {
    return <div className="container">Loading tasks...</div>;
  }
  return (
    <div className="container">
      <header>
        <h1>Task Manager</h1>
        {user && (
          <div className="user-controls">
            <Notifications />
            <span className="user-welcome">Welcome, {user.name}</span>
            {user.role === 'admin' && (
              <Link to="/admin" className="btn btn-admin">Admin Panel</Link>
            )}
            <button onClick={handleLogout} className="btn btn-logout">Logout</button>
          </div>
        )}
      </header>
      {error && <div className="alert alert-error">{error}</div>}
      {refreshMessage && <div className="alert alert-success">{refreshMessage}</div>}
      <div className="tasks-header">
        <div className="tasks-title-filters">
          <h2>Your Tasks</h2>
          <button
            onClick={fetchTasks}
            className="btn btn-refresh"
            title="Refresh tasks"
          >
            🔄 Refresh
          </button>
          <div className="task-filters">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${filter === 'owned' ? 'active' : ''}`}
              onClick={() => setFilter('owned')}
            >
              My Tasks
            </button>
            <button
              className={`filter-btn ${filter === 'shared' ? 'active' : ''}`}
              onClick={() => setFilter('shared')}
            >
              Shared With Me
            </button>
          </div>
        </div>
        <Link to="/task/new" className="btn btn-add-task">
          Add New Task
        </Link>
      </div>
      {filteredTasks.length === 0 ? (
        <div className="no-tasks">
          <p>
            {filter === 'all'
              ? "You don't have any tasks yet."
              : filter === 'owned'
                ? "You haven't created any tasks yet."
                : "No tasks have been shared with you yet."
            }
          </p>
          {filter !== 'owned' && (
            <Link to="/task/new" className="btn btn-secondary">Create your first task</Link>
          )}
        </div>
      ) : (
        <ul className="task-list">
          {filteredTasks.map((task) => (
            <li key={task.id} className="task-item" data-status={task.status}>
              <div className="task-info">
                <h3>{task.title}</h3>
                {task.description && <p className="task-description">{task.description}</p>}
                <div className="task-meta">
                  <span className={`task-status ${getStatusClass(task.status)}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className="task-due-date">Due: {formatDate(task.due_date)}</span>
                 
                  {task.is_shared && (
                    <span className="task-shared-badge">Shared</span>
                  )}
                 
                  {task.role === 'collaborator' && task.owner_name && (
                    <span className="task-owner">
                      Owner: {task.owner_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="task-actions">
                {canEditTask(task) ? (
                  <>
                    <Link to={`/task/edit/${task.id}`} className="btn">Edit</Link>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="btn btn-danger"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <Link to={`/task/edit/${task.id}`} className="btn">View</Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
export default TaskList;
