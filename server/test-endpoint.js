// Simple test to verify the user response creation
import AuthUtils from './src/utils/auth.js';
import UserService from './src/services/userService.js';

async function testUserResponse() {
  try {
    console.log('Testing user response creation...');
    
    // Get the Google user from database
    const user = await UserService.findUserById(6); // The Google user we found
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('Raw user from database:', {
      id: user.id,
      username: user.username,
      google_id: user.google_id,
      profile_picture: user.profile_picture
    });
    
    // Test the createUserResponse function
    const userResponse = AuthUtils.createUserResponse(user);
    console.log('User response after createUserResponse:', {
      id: userResponse.id,
      username: userResponse.username,
      google_id: userResponse.google_id,
      profile_picture: userResponse.profile_picture
    });
    
  } catch (error) {
    console.error('Error testing user response:', error);
  }
}

testUserResponse();