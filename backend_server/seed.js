import mongoose from 'mongoose'
import Controller from './models/controller_model.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

/**
 * Database Seed Script
 * Creates default HOD admin user for first-time setup
 * 
 * Usage: node seed.js
 */

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...\n')
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB successfully\n')

    // Check if HOD user already exists
    console.log('🔍 Checking for existing HOD user...')
    const existingUser = await Controller.findOne({ user_name: 'HOD' })
    
    if (existingUser) {
      console.log('⚠️  HOD user already exists in database')
      console.log('   No action needed - you can login with existing credentials\n')
      console.log('📋 Login Credentials:')
      console.log('   Username: HOD')
      console.log('   Password: ise@hod\n')
      await mongoose.disconnect()
      console.log('✅ Seed script completed')
      process.exit(0)
    }

    // Create default HOD user
    console.log('➕ Creating default HOD admin user...')
    await Controller.create({
      user_name: 'HOD',
      password: 'ise@hod'  // Note: Plain text for testing purposes
    })

    console.log('✅ Default HOD user created successfully!\n')
    console.log('📋 Login Credentials:')
    console.log('   Username: HOD')
    console.log('   Password: ise@hod\n')
    console.log('⚠️  Note: Change these credentials for production use\n')
    
    await mongoose.disconnect()
    console.log('✅ Seed script completed successfully')
    process.exit(0)
    
  } catch (error) {
    console.error('❌ Seed script failed:', error.message)
    console.error('\n💡 Troubleshooting:')
    console.error('   1. Ensure MONGODB_URI is set in .env file')
    console.error('   2. Check if MongoDB Atlas cluster is running')
    console.error('   3. Verify network access (IP whitelist)')
    process.exit(1)
  }
}

// Run seed function
seedDatabase()
