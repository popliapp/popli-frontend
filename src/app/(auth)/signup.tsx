/*eslint-disable*/
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useKYCStore, useAuthStore } from '../../store';
import { ChevronLeft } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../api/client';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { LinearGradient } from 'expo-linear-gradient';

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const kyc = useKYCStore();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');

  const [mobile, setMobile] = useState('');
  const [dob, setDob] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
 const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    username?: string;
    mobile?: string;
    dob?: string;
    agreeTerms?: string;
    api?: string;
  }>({});

   const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);

  const [isCheckingReferral, setIsCheckingReferral] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [referralInvalid, setReferralInvalid] = useState(false);

  useEffect(() => {
    const codeTrimmed = referralCode.trim();
    if (!codeTrimmed) {
      setReferrerName(null);
      setReferralInvalid(false);
      return;
    }

    setIsCheckingReferral(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/auth/referral/${codeTrimmed}`);
        if (res.data.valid) {
          setReferrerName(res.data.name);
          setReferralInvalid(false);
        } else {
          setReferrerName(null);
          setReferralInvalid(true);
        }
      } catch (error) {
        setReferrerName(null);
        setReferralInvalid(true);
      } finally {
        setIsCheckingReferral(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [referralCode]);

  useEffect(() => {
    const checkAvailability = async () => {
      const usernameTrimmed = username.trim().toLowerCase();
      if (usernameTrimmed.length < 3) {
        setUsernameAvailable(false);
        return;
      }
      
      setIsCheckingUsername(true);
      try {
        const res = await apiClient.post('/auth/check-user', { username: usernameTrimmed });
        if (res.data.exists && res.data.field === 'username') {
           setErrors(prev => ({ ...prev, username: 'Username is already taken.' }));
           setUsernameAvailable(false);
        } else {
           setErrors(prev => ({ ...prev, username: undefined }));
           setUsernameAvailable(true);
        }
      } catch (error) {
         setUsernameAvailable(false);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      if (username) {
        checkAvailability();
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [username]);

  const validateDOB = (dobStr: string): string | null => {
    if (!dobStr) return 'Please enter your DOB (DD/MM/YYYY).';
    const parts = dobStr.split('/');
    if (parts.length !== 3) return 'Invalid format. Use DD/MM/YYYY.';
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return 'Invalid date characters.';
    if (month < 1 || month > 12) return 'Month must be between 01 and 12.';
    if (day < 1 || day > 31) return 'Day must be between 01 and 31.';
    if (year < 1900 || year > new Date().getFullYear()) return 'Invalid year.';
    const dateObj = new Date(year, month - 1, day);
    if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
      return 'Date does not exist in the calendar.';
    }
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() - (month - 1);
    if (m < 0 || (m === 0 && today.getDate() < day)) {
      age--;
    }
    if (age < 13) {
      return 'You must be at least 13 years old to use Popli.';
    }
    return null;
  };

  const handleDOBChange = (text: string) => {
    const prevVal = dob;
    if (prevVal.length > text.length && prevVal.endsWith('/')) {
      setDob(text);
      return;
    }
    const cleanText = text.replace(/[^0-9]/g, '');
    let formatted = '';
    if (cleanText.length <= 2) {
      formatted = cleanText;
    } else if (cleanText.length <= 4) {
      formatted = `${cleanText.slice(0, 2)}/${cleanText.slice(2)}`;
    } else {
      formatted = `${cleanText.slice(0, 2)}/${cleanText.slice(2, 4)}/${cleanText.slice(4, 8)}`;
    }
    setDob(formatted);
    if (errors.dob) setErrors(prev => ({ ...prev, dob: undefined }));
  };

  // ... (keep validateDOB and handleDOBChange intact)

  const handleSignupSubmit = async () => {
    const newErrors: typeof errors = {};

    const nameTrimmed = fullName.trim();
    if (!nameTrimmed) {
      newErrors.fullName = 'Please enter your Full Name.';
    } else if (nameTrimmed.length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters.';
    } else if (!/^[a-zA-Z\s]+$/.test(nameTrimmed)) {
      newErrors.fullName = 'Name can only contain letters and spaces.';
    }

    const usernameTrimmed = username.trim().toLowerCase();
    if (!usernameTrimmed) {
      newErrors.username = 'Please enter a username.';
    } else if (usernameTrimmed.length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
    } else if (!/^[a-z0-9_]+$/.test(usernameTrimmed)) {
      newErrors.username = 'Username can only contain lowercase letters, numbers, and underscores.';
    }

   const mobileTrimmed = mobile.trim();
    if (!mobileTrimmed) {
      newErrors.mobile = 'Please enter your mobile number.';
    } else if (!/^[6-9]\d{9}$/.test(mobileTrimmed)) {
      newErrors.mobile = 'Please enter a valid 10-digit mobile number (starting with 6-9).';
    }



    const dobError = validateDOB(dob);
    if (dobError) {
      newErrors.dob = dobError;
    }

    if (!agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the Terms of Service & Privacy Policy.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const targetPhone = `+91${mobileTrimmed}`;
      
      // 1. Check if user already exists
  const checkRes = await apiClient.post('/auth/check-user', { 
        identifier: targetPhone,
        username: usernameTrimmed,
      });
      
      if (checkRes.data.exists) {
        setIsLoading(false);
        if (checkRes.data.field === 'username') {
          setErrors({ username: checkRes.data.message });
        } else {
          setErrors({ mobile: checkRes.data.message });
        }
        return;
      }
      // Route user to OTP confirmation
      setIsLoading(false);
     router.push({
        pathname: '/(auth)/otp',
        params: { 
          target: targetPhone, 
          isSignup: 'true',
          name: nameTrimmed,
          username: usernameTrimmed,
          phone: targetPhone,
          dob: dob,
          referredByCode: referralCode.trim(),
          intent: 'signup'
        }
      });
    } catch (error: any) {
      setIsLoading(false);
      console.error('Check User Error:', error);
      setErrors({ api: error?.response?.data?.message || 'Failed to connect to server. Please try again.' });
    }
  };

return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: '#0D0015' }}>
      <LinearGradient
        colors={['#1a0030', '#0D0015', '#0D0015']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 28 }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 22 }}>←</Text>
        </TouchableOpacity>

<View style={{ alignItems: 'center', marginBottom: 20, marginTop: -55 }}>
          <Image 
            source={require('../../../assets/images/Untitled design.png')} 
         style={{ width: 125, height: 125, resizeMode: 'contain' }}
          />
        </View>
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 6 }}>Create Your Username</Text>
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 32 }}>
          This will be your unique identity on Popli
        </Text>

        {/* Username input */}
        <View style={{ marginBottom: 8 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: errors.username ? '#FF4444' : 'rgba(255,255,255,0.12)',
            paddingHorizontal: 16,
            height: 54,
            marginBottom: 4,
          }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, marginRight: 6 }}>@</Text>
            <TextInput
              value={username}
              onChangeText={(val) => {
                setUsername(val.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                if (errors.username) setErrors(prev => ({ ...prev, username: undefined }));
              }}
              placeholder="yourusername"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="none"
              style={{ flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' }}
            />
            {isCheckingUsername ? (
              <ActivityIndicator size="small" color="#FF2D6B" />
            ) : usernameAvailable && !errors.username ? (
              <Text style={{ color: '#4ADE80', fontSize: 13, fontWeight: '700' }}>Available ✓</Text>
            ) : null}
          </View>
          {errors.username ? (
            <Text style={{ color: '#FF4444', fontSize: 12, paddingLeft: 4 }}>{errors.username}</Text>
          ) : null}
        </View>



        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 20 }} />

        {/* Full Name */}
        <View style={{ marginBottom: 12 }}>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: errors.fullName ? '#FF4444' : 'rgba(255,255,255,0.12)',
            paddingHorizontal: 16,
            height: 54,
            justifyContent: 'center',
          }}>
            <TextInput
              value={fullName}
              onChangeText={(val) => { setFullName(val); if (errors.fullName) setErrors(prev => ({ ...prev, fullName: undefined })); }}
              placeholder="Full Name"
              placeholderTextColor="rgba(255,255,255,0.25)"
              style={{ color: '#fff', fontSize: 15 }}
            />
          </View>
          {errors.fullName ? <Text style={{ color: '#FF4444', fontSize: 12, paddingLeft: 4, marginTop: 3 }}>{errors.fullName}</Text> : null}
        </View>



        {/* Mobile */}
        <View style={{ marginBottom: 12 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: errors.mobile ? '#FF4444' : 'rgba(255,255,255,0.12)',
            paddingHorizontal: 16,
            height: 54,
          }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginRight: 8 }}>+91</Text>
            <TextInput
              value={mobile}
              onChangeText={(val) => { setMobile(val.replace(/[^0-9]/g, '')); if (errors.mobile) setErrors(prev => ({ ...prev, mobile: undefined })); }}
              placeholder="Mobile Number"
              placeholderTextColor="rgba(255,255,255,0.25)"
              keyboardType="phone-pad"
              maxLength={10}
              style={{ flex: 1, color: '#fff', fontSize: 15 }}
            />
          </View>
          {errors.mobile ? <Text style={{ color: '#FF4444', fontSize: 12, paddingLeft: 4, marginTop: 3 }}>{errors.mobile}</Text> : null}
        </View>

        {/* DOB */}
        <View style={{ marginBottom: 12 }}>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: errors.dob ? '#FF4444' : 'rgba(255,255,255,0.12)',
            paddingHorizontal: 16,
            height: 54,
            justifyContent: 'center',
          }}>
            <TextInput
              value={dob}
              onChangeText={handleDOBChange}
              placeholder="Date of Birth (DD/MM/YYYY)"
              placeholderTextColor="rgba(255,255,255,0.25)"
              keyboardType="numeric"
              maxLength={10}
              style={{ color: '#fff', fontSize: 15 }}
            />
          </View>
          {errors.dob ? <Text style={{ color: '#FF4444', fontSize: 12, paddingLeft: 4, marginTop: 3 }}>{errors.dob}</Text> : null}
        </View>

        {/* Referral */}
        <View style={{ marginBottom: 24 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: referralInvalid ? '#FF4444' : 'rgba(255,255,255,0.12)',
            paddingHorizontal: 16,
            height: 54,
          }}>
            <TextInput
              value={referralCode}
              onChangeText={(val) => setReferralCode(val.toUpperCase())}
              placeholder="Referral Code (Optional)"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="characters"
              style={{ flex: 1, color: '#fff', fontSize: 15 }}
            />
            {isCheckingReferral ? (
              <ActivityIndicator size="small" color="#FF2D6B" />
            ) : referrerName ? (
              <Text style={{ color: '#4ADE80', fontSize: 12, fontWeight: '700' }}>✓ {referrerName}</Text>
            ) : null}
          </View>
          {referralInvalid ? (
            <Text style={{ color: '#FF4444', fontSize: 12, paddingLeft: 4, marginTop: 3 }}>Invalid referral code</Text>
          ) : null}
        </View>

        {/* Terms */}
        <Pressable
          onPress={() => { setAgreeTerms(!agreeTerms); if (errors.agreeTerms) setErrors(prev => ({ ...prev, agreeTerms: undefined })); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}
        >
          <View style={{
            width: 20, height: 20, borderRadius: 6,
            backgroundColor: agreeTerms ? '#FF2D6B' : 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            borderColor: errors.agreeTerms ? '#FF4444' : agreeTerms ? '#FF2D6B' : 'rgba(255,255,255,0.2)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {agreeTerms && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>}
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, flex: 1 }}>
            I agree to the <Text style={{ color: '#FF2D6B' }}>Terms of Service</Text> and <Text style={{ color: '#FF2D6B' }}>Privacy Policy</Text>
          </Text>
        </Pressable>
        {errors.agreeTerms ? <Text style={{ color: '#FF4444', fontSize: 12, marginBottom: 8 }}>{errors.agreeTerms}</Text> : null}

        {errors.api ? (
          <Text style={{ color: '#FF4444', fontSize: 13, textAlign: 'center', marginVertical: 8 }}>{errors.api}</Text>
        ) : null}

        <TouchableOpacity
          onPress={handleSignupSubmit}
          disabled={isLoading}
          style={{
            backgroundColor: '#FF2D6B',
            borderRadius: 14,
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 16,
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Continue</Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, gap: 4 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Already have an account?</Text>
          <Pressable onPress={() => router.push('/(auth)/login')}>
            <Text style={{ color: '#FF2D6B', fontSize: 13, fontWeight: '700' }}> Log in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
