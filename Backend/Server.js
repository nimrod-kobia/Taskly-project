// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY 
);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Middleware to verify authentication
const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// ==================== AUTH ROUTES ====================

// Sign up
app.post('/auth/signup', async (req, res) => {
  const { email, password, fullName } = req.body;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: 'User created successfully',
      user: data.user,
      session: data.session
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during sign up' });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      message: 'Login successful',
      user: data.user,
      session: data.session
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Password reset request
app.post('/auth/reset-password', async (req, res) => {
  const { email } = req.body;

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during password reset' });
  }
});

// Update password
app.post('/auth/update-password', authenticateUser, async (req, res) => {
  const { newPassword } = req.body;

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during password update' });
  }
});

// Logout
app.post('/auth/logout', authenticateUser, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during logout' });
  }
});

// Get current user
app.get('/auth/user', authenticateUser, async (req, res) => {
  res.json({ user: req.user });
});

// ==================== TASK ROUTES ====================

// Create task
app.post('/createTask', authenticateUser, async (req, res) => {
  const { title, description, priority, dueDate, category, status } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          user_id: req.user.id,
          title,
          description: description || null,
          priority: priority || 'medium',
          due_date: dueDate || null,
          category: category || null,
          status: status || 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Task created successfully',
      task: data[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error creating task' });
  }
});

// Get all tasks for user
app.get('/getTasks', authenticateUser, async (req, res) => {
  const { status, priority, category, sortBy } = req.query;

  try {
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', req.user.id);

    // Apply filters
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (category) query = query.eq('category', category);

    // Apply sorting
    if (sortBy === 'priority') {
      query = query.order('priority', { ascending: false });
    } else if (sortBy === 'dueDate') {
      query = query.order('due_date', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      tasks: data,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching tasks' });
  }
});

// Get single task
app.get('/getTasks/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task: data });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching task' });
  }
});

// Update task
app.put('/updateTask/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { title, description, priority, dueDate, category, status } = req.body;

  try {
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.due_date = dueDate;
    if (category !== undefined) updateData.category = category;
    if (status !== undefined) updateData.status = status;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }

    res.json({
      message: 'Task updated successfully',
      task: data[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating task' });
  }
});

// Delete task
app.delete('/deleteTask/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting task' });
  }
});

// ==================== PRIORITIZATION ALGORITHM ====================

app.get('/prioritizeTasks', authenticateUser, async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'pending');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Prioritization algorithm
    const prioritizedTasks = tasks.map(task => {
      let score = 0;
      
      // Priority weight
      const priorityWeights = { high: 10, medium: 5, low: 2 };
      score += priorityWeights[task.priority] || 0;
      
      // Due date urgency
      if (task.due_date) {
        const daysUntilDue = Math.floor(
          (new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysUntilDue < 0) score += 20; // Overdue
        else if (daysUntilDue === 0) score += 15; // Due today
        else if (daysUntilDue <= 3) score += 10; // Due soon
        else if (daysUntilDue <= 7) score += 5;
      }
      
      return { ...task, priorityScore: score };
    });

    prioritizedTasks.sort((a, b) => b.priorityScore - a.priorityScore);

    res.json({ tasks: prioritizedTasks });
  } catch (error) {
    res.status(500).json({ error: 'Server error prioritizing tasks' });
  }
});

// ==================== REMINDERS ====================

app.get('/getReminders', authenticateUser, async (req, res) => {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'pending')
      .lte('due_date', tomorrow.toISOString())
      .order('due_date', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const reminders = tasks.map(task => {
      const dueDate = new Date(task.due_date);
      const isOverdue = dueDate < now;
      const isDueToday = dueDate.toDateString() === now.toDateString();
      
      return {
        ...task,
        reminderType: isOverdue ? 'overdue' : isDueToday ? 'due_today' : 'upcoming',
        message: isOverdue 
          ? `Task "${task.title}" is overdue!`
          : isDueToday
          ? `Task "${task.title}" is due today!`
          : `Task "${task.title}" is due soon!`
      };
    });

    res.json({ reminders });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching reminders' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Taskly API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Taskly backend running on port ${PORT}`);
});
