import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { Platform } from 'react-native';

export const getFirebaseAuth = () => Platform.OS === 'web' ? ({} as any) : auth();
export const firebaseAuth = { signOut: async () => { if (Platform.OS !== 'web') await auth().signOut(); } };

let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;

export async function sendFirebaseOTP(phoneNumber: string) {
  try { 
    confirmationResult = await auth().signInWithPhoneNumber(phoneNumber);
    return true;
  } catch (error) {
    console.error('Error sending Firebase OTP:', error);
    throw error;
  }
}

export async function verifyFirebaseOTP(otp: string) {
  if (!confirmationResult) {
    throw new Error('No OTP requested. Please go back and request a new one.');
  }

  try {
    const userCredential = await confirmationResult.confirm(otp);
    if (!userCredential?.user) throw new Error('Verification failed.');
    
    // Return the actual JWT token to the backend
    return await userCredential.user.getIdToken();
  } catch (error) {
    console.error('Error verifying Firebase OTP:', error);
    throw error;
  }
}
