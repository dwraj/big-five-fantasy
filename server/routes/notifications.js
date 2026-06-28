import express from 'express';
import { getSupabaseAdmin } from '../lib/supabase.js';

const router = express.Router();
const supabase = getSupabaseAdmin();

// GET /api/notifications/:userId - Get user notifications
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { unreadOnly } = req.query;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId);

    if (unreadOnly === 'true') {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(notifications || []);
  } catch (error) {
    console.error('Error fetching notifications:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/:notificationId/read - Mark as read
router.put('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(notification);
  } catch (error) {
    console.error('Error updating notification:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/:userId/read-all - Mark all as read
router.put('/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all as read:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/notifications/:notificationId - Delete notification
router.delete('/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
