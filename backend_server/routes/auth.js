import express from 'express'
import Controller from '../models/controller_model.js'

const router = express.Router()

// POST /api/auth/login
// Purpose: Simple login check (no JWT/sessions for now, just testing)
// Body: { user_name: "HOD", password: "ise@hod" }
// Returns: { success: true, user: {...} } or { success: false, message: "Invalid credentials" }
router.post('/login', async (req, res) => {
  try {
    const { user_name, password } = req.body

    // Validate input
    if (!user_name || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      })
    }

    // Find user in Controllers collection
    const user = await Controller.findOne({ user_name })

    // Check if user exists
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      })
    }

    // Check password (plain text comparison for now)
    if (user.password !== password) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      })
    }

    // Success - return user data (excluding password)
    res.json({ 
      success: true, 
      user: {
        id: user._id,
        user_name: user.user_name
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    })
  }
})

export default router
