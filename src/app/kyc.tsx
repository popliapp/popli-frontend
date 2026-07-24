import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Platform, Animated, Modal} from 'react-native';
import { useRouter } from 'expo-router';
import { useKYCStore } from '../store';
import { showError, showInfo } from '../store/toastStore';
import { 
  ChevronLeft, 
  HelpCircle, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Building, 
  Landmark,
  Music,
  Theater,
  Dumbbell,
  Palette,
  Gamepad2,
  Utensils,
  MapPin,
  Calendar,
  Zap,
  QrCode
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (e) {
    console.warn("Could not load datetimepicker");
  }
}

const CATEGORIES = [
  { id: 'music', label: 'Music', icon: Music },
  { id: 'comedy', label: 'Comedy', icon: Theater },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'art', label: 'Arts', icon: Palette },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'culinary', label: 'Culinary', icon: Utensils }
];

const MAJOR_CITIES = [
  'Bengaluru', 'Mumbai', 'Delhi', 'New Delhi', 'Kolkata', 'Chennai', 'Hyderabad', 
  'Pune', 'Ahmedabad', 'Surat', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 
  'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad', 
  'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Kalyan', 'Vasai',
  'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad',
  'Howrah', 'Ranchi', 'Gwalior', 'Jabalpur', 'Coimbatore', 'Vijayawada', 'Jodhpur', 'Madurai',
  'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Thiruvananthapuram', 'Mysuru', 'Gurugram', 'Noida'
];

export default function KYCScreen() {
  const router = useRouter();
  const kyc = useKYCStore();
  
  // Local verification loadings
  const [isVerifyingPan, setIsVerifyingPan] = useState(false);
  const [isVerifyingAadhar, setIsVerifyingAadhar] = useState(false);
  const [isVerifyingUpi, setIsVerifyingUpi] = useState(false);
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isAccountTypeDropdownOpen, setIsAccountTypeDropdownOpen] = useState(false);

  React.useEffect(() => {
    kyc.fetchKycStatus();
  }, []);

  // Local shake animations using native Animated API
  const [panShake] = useState(() => new Animated.Value(0));
  const [aadharShake] = useState(() => new Animated.Value(0));

  // Local validation errors
  const [panError, setPanError] = useState('');
  const [aadharError, setAadharError] = useState('');
  const [errors, setErrors] = useState<{
    fullName?: string;
    dob?: string;
    city?: string;
    address?: string;
    category?: string;
    upiId?: string;
    bankAccount?: string;
    ifscCode?: string;
  }>({});

  // DatePicker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObj, setDateObj] = useState(new Date());

  // City suggestions state
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDateObj(selectedDate);
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      kyc.updateKYCField({ dob: `${day}/${month}/${year}` });
      if (errors.dob) {
        setErrors(prev => ({ ...prev, dob: undefined }));
      }
    }
  };

  // Shake animation trigger
  const triggerShake = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleDOBChange = (text: string) => {
    const prevVal = kyc.dob;
    // Check if backspaced on a slash
    if (prevVal.length > text.length && prevVal.endsWith('/')) {
      kyc.updateKYCField({ dob: text });
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

    kyc.updateKYCField({ dob: formatted });
    if (errors.dob) {
      setErrors(prev => ({ ...prev, dob: undefined }));
    }
  };

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

    // Check calendar date existence (e.g. Feb 31)
    const dateObj = new Date(year, month - 1, day);
    if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
      return 'Date does not exist in the calendar.';
    }

    // Calculate age (must be >= 18)
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() - (month - 1);
    if (m < 0 || (m === 0 && today.getDate() < day)) {
      age--;
    }
    if (age < 18) {
      return 'You must be at least 18 years old to complete KYC.';
    }

    return null;
  };

  const handleStep1Submit = () => {
    const newErrors: typeof errors = {};

    const nameTrimmed = kyc.fullName.trim();
    if (!nameTrimmed) {
      newErrors.fullName = 'Please enter your legal name.';
    } else if (nameTrimmed.length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters.';
    } else if (!/^[a-zA-Z\s]+$/.test(nameTrimmed)) {
      newErrors.fullName = 'Name can only contain letters and spaces.';
    }

    const dobErrorMsg = validateDOB(kyc.dob.trim());
    if (dobErrorMsg) {
      newErrors.dob = dobErrorMsg;
    }

    if (!kyc.city.trim()) {
      newErrors.city = 'Please enter your location.';
    }

    const addressTrimmed = kyc.address.trim();
    if (!addressTrimmed) {
      newErrors.address = 'Please enter your residential address.';
    } else if (addressTrimmed.length < 10) {
      newErrors.address = 'Address must be at least 10 characters.';
    }

    if (!kyc.category) {
      newErrors.category = 'Please select a creator category.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    kyc.setKYCStep(2);
  };

  const handlePANChange = (val: string) => {
    const cleanVal = val.toUpperCase();
    kyc.updateKYCField({ panNumber: cleanVal });
    
    // Clear error automatically if valid
    if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanVal)) {
      setPanError('');
    } else if (panError) {
      setPanError('');
    }
  };

  const handleAadharChange = (val: string) => {
    const digits = val.replace(/[^0-9]/g, '');
    // Format as "0000 0000 0000"
    const match = digits.match(/.{1,4}/g);
    const formatted = match ? match.join(' ').substring(0, 14) : digits;
    
    kyc.updateKYCField({ aadharNumber: formatted });
    
    // Clear error automatically if valid
    if (digits.length === 12) {
      setAadharError('');
    } else if (aadharError) {
      setAadharError('');
    }
  };

  const handlePANVerify = async () => {
    const cleanPan = kyc.panNumber.trim().toUpperCase();
    if (!cleanPan) {
      setPanError('Please enter a PAN card number.');
      triggerShake(panShake);
      return;
    }

    const isValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan);
    if (!isValid) {
      setPanError('Invalid PAN format. Standard format: ABCDE1234F');
      triggerShake(panShake);
      return;
    }

    setPanError('');
    setIsVerifyingPan(true);
    const result = await kyc.verifyPAN();
    setIsVerifyingPan(false);
    
    if (!result) {
      setPanError('Verification failed. Invalid PAN details.');
      triggerShake(panShake);
    }
  };

  const handleAadharVerify = async () => {
    const rawAadhar = kyc.aadharNumber.replace(/\s/g, '');
    if (!rawAadhar) {
      setAadharError('Please enter Aadhar Number.');
      triggerShake(aadharShake);
      return;
    }

    const isValid = /^[0-9]{12}$/.test(rawAadhar);
    if (!isValid) {
      setAadharError('Invalid Aadhar format. Must be a 12-digit number.');
      triggerShake(aadharShake);
      return;
    }

    setAadharError('');
    setIsVerifyingAadhar(true);
    const result = await kyc.verifyAadhar();
    setIsVerifyingAadhar(false);
    
    if (!result) {
      setAadharError('Verification failed. Invalid Aadhar details.');
      triggerShake(aadharShake);
    }
  };

const handleStep2Submit = () => {
    if (!kyc.isPanVerified || !kyc.isAadharVerified) {
      showError('Please verify both PAN and Aadhaar cards first');
      return;
    }
    kyc.setKYCStep(3);
  };
  const handleBankSetupComplete = async () => {
    const newErrors: typeof errors = {};

    const upi = kyc.upiId.trim();
    const bankAcc = kyc.bankAccount.trim();
    const ifsc = kyc.ifscCode.trim();

    if (!upi && !bankAcc && !ifsc) {
      newErrors.upiId = 'Please enter a UPI ID or Bank details.';
      newErrors.bankAccount = 'Please enter a UPI ID or Bank details.';
      setErrors(newErrors);
      return;
    }

    let hasError = false;

    // Validate UPI if provided
    if (upi) {
      const isValid = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi);
      if (!isValid) {
        newErrors.upiId = 'Invalid UPI ID format. Standard: username@bank';
        hasError = true;
      }
    }

    // Validate Bank Details if any part is provided, OR if UPI is not provided
    if (bankAcc || ifsc || !upi) {
      if (!bankAcc) {
        newErrors.bankAccount = 'Please enter bank account number.';
        hasError = true;
      } else if (bankAcc.length < 9 || bankAcc.length > 18) {
        newErrors.bankAccount = 'Account number must be 9-18 digits.';
        hasError = true;
      }

      if (!ifsc) {
        newErrors.ifscCode = 'Please enter bank IFSC code.';
        hasError = true;
      } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) {
        newErrors.ifscCode = 'Invalid IFSC format. Standard: HDFC0001234';
        hasError = true;
      }
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    
    // Proceed with linking (prefer UPI if valid, else Bank)
    if (upi && !newErrors.upiId) {
      setIsVerifyingUpi(true);
      const result = await kyc.linkUPI();
      setIsVerifyingUpi(false);
      
      if (result) {
        await kyc.submitKYCToBackend();
        kyc.updateKYCField({ isBankLinked: true, kycCompleted: true });
        setShowSuccessModal(true);
      } else {
        setErrors({ upiId: 'Verification failed. Please review your UPI ID.' });
      }
    } else if (bankAcc && ifsc && !newErrors.bankAccount && !newErrors.ifscCode) {
      setIsVerifyingBank(true);
      const result = await kyc.linkBank();
      setIsVerifyingBank(false);
      
     if (result) {
        await kyc.submitKYCToBackend();
        kyc.updateKYCField({ isBankLinked: true, kycCompleted: true });
        setShowSuccessModal(true);
      } else {
        setErrors(prev => ({ ...prev, bankAccount: 'Verification failed. Please review your banking details.' }));
      }
    }
  };

  const handleHeaderBack = () => {
    if (kyc.currentStep === 1) {
      router.replace('/(tabs)');
    } else {
      kyc.setKYCStep((kyc.currentStep - 1) as any);
    }
  };

const handleOpenHelp = () => {
    showInfo('KYC activates view-to-cash payouts (₹5/1,000 views) and fan gifting.', { duration: 5000 });
  };
  // Render different header indicators for step progression matching Figma
  const renderStepLabels = () => {
    switch (kyc.currentStep) {
      case 1:
        return {
          leftLabel: 'STEP 1 OF 3',
          mainLabel: 'Personal Profile',
          rightLabel: 'Next: Identity Check',
        };
      case 2:
        return {
          leftLabel: 'STEP 2 OF 3',
          mainLabel: 'Identity Check',
          rightLabel: 'Next: Payment Link',
        };
      case 3:
        return {
          leftLabel: 'STEP 3 OF 3',
          mainLabel: 'Payment Linking',
          rightLabel: 'Finalising setup',
        };
      default:
        return { leftLabel: '', mainLabel: '', rightLabel: '' };
    }
  };

  const stepMeta = renderStepLabels();

  return (
    <KeyboardAvoidingView 
      behavior="padding"
      className="flex-1 bg-[#0B001A]" 
      style={{ paddingTop: Platform.OS === 'ios' ? 60 : 40 }}
    >
      {/* 1. HEADER ROW */}
      <View className="flex-row items-center justify-between px-6 pb-4">
        <Pressable 
          onPress={handleHeaderBack}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/5 items-center justify-center active:scale-[0.9]"
        >
          <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
        
        <Pressable 
          onPress={handleOpenHelp}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/5 items-center justify-center active:scale-[0.9]"
        >
          <HelpCircle size={20} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
      </View>

      {/* 2. PROGRESS SEGMENTS & LABELS */}
      <View className="px-6 mb-2">
        <View className="flex-row justify-between items-baseline mb-2">
          <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wider">{stepMeta.leftLabel}</Text>
          <Text className="text-primary-pink text-[10px] font-bold tracking-tight">{stepMeta.rightLabel}</Text>
        </View>
        <Text className="text-white font-extrabold text-3xl mb-3 tracking-tight">{stepMeta.mainLabel}</Text>
        
        {/* Progress indicators matching Figma exactly */}
        <View className="flex-row gap-1">
          {[1, 2, 3].map((step) => {
            const isDone = kyc.currentStep > step || kyc.kycCompleted;
            const isActive = kyc.currentStep === step;
            return (
              <View 
                key={step}
                className={`flex-1 h-[3px] rounded-full ${
                  isDone || isActive ? 'bg-primary-pink' : 'bg-white/10'
                }`}
              />
            );
          })}
        </View>
      </View>

      {/* 3. SCROLLABLE FORM BLOCK */}
      <ScrollView 
        className="flex-1 px-6 mt-4" 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        
        {/* ==========================================
            STEP 1: PERSONAL PROFILE FORM
            ========================================== */}
        {kyc.currentStep === 1 && (
          <MotiView
            key="step-1"
            from={{ opacity: 0, translateX: 30 }}
            animate={{ opacity: 1, translateX: 0 }}
          >
            <View className="space-y-6">
            {/* Grouped Container */}
            <View className="bg-[#190C2C]/50 border border-white/5 rounded-[32px] overflow-hidden">
              {/* Identity details wrapper */}
              <View className="p-5 border-b border-white/5">
                <Text className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-4 flex-row items-center">
                  🛡️ IDENTITY DETAILS
                </Text>
                
                <View className="mb-4">
                  <Text className="text-white/60 text-[10px] font-bold uppercase pl-1 mb-2">Full Name</Text>
                  <TextInput
                    value={kyc.fullName}
                    onChangeText={(val) => {
                      kyc.updateKYCField({ fullName: val });
                      if (errors.fullName) setErrors(prev => ({ ...prev, fullName: undefined }));
                    }}
                    placeholder="Legal name as on ID"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    className={`bg-[#110125] border text-white rounded-2xl px-4 h-12 text-xs font-normal ${errors.fullName ? 'border-red-500' : 'border-white/5'}`}
                  />
                  {errors.fullName && (
                    <Text className="text-red-500 text-[10px] pl-1 mt-1 font-semibold">{errors.fullName}</Text>
                  )}
                </View>

                <View className="flex-row mb-4">
                  <View className="flex-1 mr-2">
                    <Text className="text-white/60 text-[10px] font-bold uppercase pl-1 mb-2">DOB</Text>
                    <View className="relative justify-center">
                      <TextInput
                        value={kyc.dob}
                        onChangeText={handleDOBChange}
                        placeholder="dd/mm/yyyy"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        keyboardType="number-pad"
                        maxLength={10}
                        className={`bg-[#110125] border text-white rounded-2xl pl-4 pr-10 h-12 text-xs font-normal ${errors.dob ? 'border-red-500' : 'border-white/5'}`}
                      />
                      <Pressable 
                        onPress={() => {
                          if (kyc.dob) {
                            const parts = kyc.dob.split('/');
                            if (parts.length === 3) {
                              const d = parseInt(parts[0], 10);
                              const m = parseInt(parts[1], 10) - 1;
                              const y = parseInt(parts[2], 10);
                              if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
                                setDateObj(new Date(y, m, d));
                              }
                            }
                          }
                          setShowDatePicker(true);
                        }}
                        className="absolute right-3 p-1"
                      >
                        <Calendar size={16} color="rgba(255, 255, 255, 0.4)" />
                      </Pressable>
                    </View>
                    {errors.dob && (
                      <Text className="text-red-500 text-[10px] pl-1 mt-1 font-semibold">{errors.dob}</Text>
                    )}
                    {showDatePicker && Platform.OS === 'ios' && (
                      <Modal transparent={true} animationType="slide" visible={showDatePicker}>
                        <View className="flex-1 justify-end bg-black/60">
                          <View className="bg-[#1D1037] p-5 rounded-t-[32px] border-t border-white/10">
                            <View className="flex-row justify-between items-center mb-4">
                              <Text className="text-white/60 font-bold text-xs uppercase tracking-wider">Select Date of Birth</Text>
                              <Pressable onPress={() => setShowDatePicker(false)}>
                                <Text className="text-[#A78BFA] font-bold text-base">Done</Text>
                              </Pressable>
                            </View>
                            <DateTimePicker
                              value={dateObj}
                              mode="date"
                              display="spinner"
                              maximumDate={new Date()}
                              minimumDate={new Date(1900, 0, 1)}
                              onChange={onDateChange}
                              textColor="white"
                              themeVariant="dark"
                            />
                          </View>
                        </View>
                      </Modal>
                    )}
                    {showDatePicker && Platform.OS !== 'ios' && (
                      <DateTimePicker
                        value={dateObj}
                        mode="date"
                        display="default"
                        maximumDate={new Date()}
                        minimumDate={new Date(1900, 0, 1)}
                        onChange={onDateChange}
                      />
                    )}
                  </View>
                  
                  <View className="flex-1 ml-2 z-50">
                    <Text className="text-white/60 text-[10px] font-bold uppercase pl-1 mb-2">Location</Text>
                    <View className="relative justify-center z-50">
                      <TextInput
                        value={kyc.city}
                        onChangeText={(val) => {
                          kyc.updateKYCField({ city: val });
                          if (errors.city) setErrors(prev => ({ ...prev, city: undefined }));
                          
                          if (val.length > 0) {
                            const filtered = MAJOR_CITIES.filter(city => city.toLowerCase().includes(val.toLowerCase()) && city.toLowerCase() !== val.toLowerCase());
                            setCitySuggestions(filtered);
                            setShowCitySuggestions(filtered.length > 0);
                          } else {
                            setShowCitySuggestions(false);
                          }
                        }}
                        onFocus={() => {
                          if (kyc.city.length > 0) {
                            const filtered = MAJOR_CITIES.filter(city => city.toLowerCase().includes(kyc.city.toLowerCase()) && city.toLowerCase() !== kyc.city.toLowerCase());
                            setCitySuggestions(filtered);
                            setShowCitySuggestions(filtered.length > 0);
                          }
                        }}
                        onBlur={() => {
                          // Small delay to allow tap on suggestion
                          setTimeout(() => setShowCitySuggestions(false), 200);
                        }}
                        placeholder="Bengaluru"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        className={`bg-[#110125] border text-white rounded-2xl pl-10 pr-4 h-12 text-xs font-normal ${errors.city ? 'border-red-500' : 'border-white/5'}`}
                      />
                      <View className="absolute left-3.5">
                        <MapPin size={14} color="rgba(255, 255, 255, 0.4)" />
                      </View>
                      
                      {/* Dropdown Suggestions */}
                      {showCitySuggestions && (
                        <View className="absolute top-14 left-0 right-0 bg-[#2D1B4E] border border-white/10 rounded-xl max-h-36 overflow-hidden shadow-xl" style={{ elevation: 5, zIndex: 999 }}>
                          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
                            {citySuggestions.map((city) => (
                              <Pressable
                                key={city}
                                onPress={() => {
                                  kyc.updateKYCField({ city });
                                  setShowCitySuggestions(false);
                                  if (errors.city) setErrors(prev => ({ ...prev, city: undefined }));
                                }}
                                className="px-4 py-3 border-b border-white/5 active:bg-white/10"
                              >
                                <Text className="text-white text-xs">{city}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                    {errors.city && (
                      <Text className="text-red-500 text-[10px] pl-1 mt-1 font-semibold">{errors.city}</Text>
                    )}
                  </View>
                </View>

                <View>
                  <Text className="text-white/60 text-[10px] font-bold uppercase pl-1 mb-2">Full Address</Text>
                  <TextInput
                    value={kyc.address}
                    onChangeText={(val) => {
                      kyc.updateKYCField({ address: val });
                      if (errors.address) setErrors(prev => ({ ...prev, address: undefined }));
                    }}
                    placeholder="Residential street address"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    className={`bg-[#110125] border text-white rounded-2xl px-4 py-3 text-xs font-normal h-24 ${errors.address ? 'border-red-500' : 'border-white/5'}`}
                    multiline
                    numberOfLines={3}
                    style={{ textAlignVertical: 'top' }}
                  />
                  {errors.address && (
                    <Text className="text-red-500 text-[10px] pl-1 mt-1 font-semibold">{errors.address}</Text>
                  )}
                </View>
              </View>

              {/* Creator Category Card Grid */}
              <View className="p-5">
                <Text className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">
                  🎭 CREATOR CATEGORY
                </Text>
                <Text className="text-[#9CA3AF] text-[10px] leading-4 mb-4">
                  Select the niche that best describes your content portfolio.
                </Text>
                
                <View className="flex-row flex-wrap justify-between gap-y-3">
                  {CATEGORIES.map((c) => {
                    const selectedCategories = kyc.category ? kyc.category.split(',') : [];
                    const isSel = selectedCategories.includes(c.id);
                    const IconComponent = c.icon;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => {
                          let newCategories = [...selectedCategories];
                          if (isSel) {
                            newCategories = newCategories.filter(cat => cat !== c.id);
                          } else {
                            newCategories.push(c.id);
                          }
                          kyc.updateKYCField({ category: newCategories.join(',') });
                          if (errors.category) setErrors(prev => ({ ...prev, category: undefined }));
                        }}
                        className={`w-[48%] h-24 rounded-2xl border items-center justify-center mb-1 active:scale-[0.97] transition-all ${
                          isSel 
                            ? 'bg-primary-purple/15 border-primary-pink shadow shadow-primary-pink/25' 
                            : errors.category 
                              ? 'bg-[#110125] border-red-500'
                              : 'bg-[#110125] border-white/10'
                        }`}
                      >
                        <View className="mb-2">
                          <IconComponent size={22} color={isSel ? '#EC4899' : 'rgba(255,255,255,0.4)'} />
                        </View>
                        <Text className={`text-[10px] font-black tracking-widest uppercase ${isSel ? 'text-white' : 'text-[#9CA3AF]'}`}>
                          {c.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {errors.category && (
                  <Text className="text-red-500 text-[10px] pl-1 mt-2 font-semibold">{errors.category}</Text>
                )}
              </View>
            </View>

            {/* Step 1 Submit Action */}
            <Pressable
              onPress={handleStep1Submit}
              className="bg-primary-purple h-14 rounded-full items-center justify-center shadow-lg shadow-primary-purple/40 flex-row mt-4 gap-2"
            >
              <Text className="text-white text-sm font-bold uppercase tracking-wider">Proceed to Identity Check</Text>
              <Text className="text-white text-sm font-bold">→</Text>
            </Pressable>
            </View>
          </MotiView>
        )}

        {/* ==========================================
            STEP 2: IDENTITY CARD CHECK FORM
            ========================================== */}
        {kyc.currentStep === 2 && (
          <MotiView
            key="step-2"
            from={{ opacity: 0, translateX: 30 }}
            animate={{ opacity: 1, translateX: 0 }}
            className="space-y-6"
          >
            {/* Grouped Container Step 2 */}
            <View className="bg-[#190C2C]/50 border border-white/5 rounded-[32px] overflow-hidden">
              {/* PAN card block */}
              <Animated.View style={{ transform: [{ translateX: panShake }] }}>
                <View className={`p-5 relative transition-all border-b ${
                  kyc.isPanVerified
                    ? 'border-[#10B981]/20'
                    : panError
                      ? 'border-[#EF4444]/30 bg-[#EF4444]/5'
                      : 'border-white/5'
                }`}>
                <View className="flex-row items-center justify-between pb-1">
                  <Text className="text-white font-bold text-base">PAN Card</Text>
                  {kyc.isPanVerified ? (
                    <View className="flex-row items-center gap-1">
                      <Check size={14} color="#10B981" strokeWidth={3} />
                      <Text className="text-[#10B981] text-xs font-bold">Verified</Text>
                    </View>
                  ) : (
                    <Building size={16} color="rgba(255,255,255,0.4)" />
                  )}
                </View>
                <Text className="text-white/40 text-[10px] pb-3">Permanent Account Number</Text>
                
                <TextInput
                  value={kyc.panNumber}
                  onChangeText={handlePANChange}
                  placeholder="ABCDE1234F"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  editable={!kyc.isPanVerified}
                  autoCapitalize="characters"
                  maxLength={10}
                  className={`bg-[#110125] border text-white rounded-2xl px-4 h-12 text-xs font-semibold uppercase tracking-widest ${
                    kyc.isPanVerified
                      ? 'border-[#10B981]/30 opacity-60'
                      : panError
                        ? 'border-red-500/50 shadow-md shadow-red-500/10'
                        : 'border-white/5'
                  } ${!kyc.isPanVerified ? 'mb-4' : ''}`}
                />

                {panError ? (
                  <Text className="text-red-500 text-[10px] pl-1 pb-3 font-semibold">{panError}</Text>
                ) : null}

                {!kyc.isPanVerified && (
                  <Pressable
                    onPress={handlePANVerify}
                    disabled={isVerifyingPan}
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.98 : 1 }]
                    })}
                    className="bg-primary-purple h-11 rounded-xl items-center justify-center active:scale-[0.98]"
                  >
                    {isVerifyingPan ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-white text-xs font-bold uppercase">Verify</Text>
                    )}
                  </Pressable>
                )}
              </View>
            </Animated.View>

              {/* Aadhaar card block */}
              <Animated.View style={{ transform: [{ translateX: aadharShake }] }}>
                <View className={`p-5 relative transition-all border-b ${
                  kyc.isAadharVerified
                    ? 'border-[#10B981]/20'
                    : aadharError
                      ? 'border-[#EF4444]/30 bg-[#EF4444]/5'
                      : 'border-white/5'
                }`}>
                <View className="flex-row items-center justify-between pb-1">
                  <Text className="text-white font-bold text-base">Aadhar Card</Text>
                  {kyc.isAadharVerified ? (
                    <View className="flex-row items-center gap-1">
                      <Check size={14} color="#10B981" strokeWidth={3} />
                      <Text className="text-[#10B981] text-xs font-bold">Verified</Text>
                    </View>
                  ) : (
                    <Landmark size={16} color="rgba(255,255,255,0.4)" />
                  )}
                </View>
                <Text className="text-white/40 text-[10px] pb-3">12-digit UIDAI Number</Text>
                
                <TextInput
                  value={kyc.aadharNumber}
                  onChangeText={handleAadharChange}
                  placeholder="0000 0000 0000"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  keyboardType="numeric"
                  maxLength={14} // 12 digits + 2 spaces
                  editable={!kyc.isAadharVerified}
                  className={`bg-[#110125] border text-white rounded-2xl px-4 h-12 text-xs font-semibold tracking-widest ${
                    kyc.isAadharVerified
                      ? 'border-[#10B981]/30 opacity-60'
                      : aadharError
                        ? 'border-red-500/50 shadow-md shadow-red-500/10'
                        : 'border-white/5'
                  } ${!kyc.isAadharVerified ? 'mb-4' : ''}`}
                />

                {aadharError ? (
                  <Text className="text-red-500 text-[10px] pl-1 pb-3 font-semibold">{aadharError}</Text>
                ) : null}

                {!kyc.isAadharVerified && (
                  <Pressable
                    onPress={handleAadharVerify}
                    disabled={isVerifyingAadhar}
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.98 : 1 }]
                    })}
                    className="bg-[#FCD34D] h-11 rounded-xl items-center justify-center active:scale-[0.98]"
                  >
                    {isVerifyingAadhar ? (
                      <ActivityIndicator size="small" color="#1D1037" />
                    ) : (
                      <Text className="text-[#1D1037] text-xs font-black uppercase">Verify</Text>
                    )}
                  </Pressable>
                )}
              </View>
            </Animated.View>

              {/* Warning disclosure card */}
              <View className="bg-red-950/20 p-4 flex-row gap-3">
                <AlertCircle size={18} color="#EF4444" className="mt-0.5" />
                <Text className="text-[#F87171] text-[10px] leading-4 flex-1">
                  Withdrawals enabled only after verification is complete. Please ensure the documents belong to the primary account holder for successful processing.
                </Text>
              </View>
            </View>

            {/* Step 2 Submit Action - dynamically renders only when both are verified */}
            {kyc.isPanVerified && kyc.isAadharVerified && (
              <MotiView
                key="step-2-submit"
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 350 }}
              >
                <Pressable
                  onPress={handleStep2Submit}
                  style={({ pressed }) => ({
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    opacity: pressed ? 0.9 : 1
                  })}
                  className="bg-primary-purple h-14 rounded-full items-center justify-center shadow-lg shadow-primary-purple/40 mt-4"
                >
                  <Text className="text-white text-sm font-bold uppercase tracking-wider">Next</Text>
                </Pressable>
              </MotiView>
            )}
          </MotiView>
        )}

        {/* ==========================================
            STEP 3: BANK & UPI LINKING FORM
            ========================================== */}
        {kyc.currentStep === 3 && (
          <MotiView
            key="step-3"
            from={{ opacity: 0, translateX: 30 }}
            animate={{ opacity: 1, translateX: 0 }}
            className="gap-4"
          >
            {/* UPI ID Link Card */}
            <View className="bg-[#190C2C] border border-white/5 rounded-[24px] p-5">
              <View className="flex-row items-center justify-between pb-2">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl bg-[#2D1B4E] items-center justify-center">
                    <Zap size={20} color="#A855F7" />
                  </View>
                  <Text className="text-white font-bold text-[18px]">UPI Link</Text>
                </View>
                <QrCode size={32} color="#3E2B5C" />
              </View>
              <View className="gap-2 mt-4">
                <Text className="text-white/50 text-[10px] font-bold uppercase pl-1">VPA / UPI ID</Text>
                <TextInput
                  value={kyc.upiId}
                  onChangeText={(val) => {
                    kyc.updateKYCField({ upiId: val });
                    if (errors.upiId) setErrors(prev => ({ ...prev, upiId: undefined }));
                  }}
                  placeholder="username@bank"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  className={`bg-[#110125] border text-white rounded-2xl px-4 h-12 text-xs font-semibold ${errors.upiId ? 'border-red-500' : 'border-white/5'}`}
                  autoCapitalize="none"
                />
                {errors.upiId ? (
                  <Text className="text-red-500 text-[10px] pl-1 font-semibold">{errors.upiId}</Text>
                ) : (
                  <Text className="text-[#9CA3AF] text-[9px] pl-1 pt-0.5">Example: creator_name@upi</Text>
                )}
              </View>
            </View>

            {/* Bank Card Container */}
            <View className="bg-[#190C2C] border border-white/5 rounded-[24px] p-5">
              <View className="flex-row items-center gap-3 pb-2">
                <View className="w-10 h-10 rounded-xl bg-[#FBBF24]/20 items-center justify-center">
                  <Landmark size={20} color="#FBBF24" />
                </View>
                <Text className="text-white font-bold text-[18px]">Bank Transfer</Text>
              </View>

              <View className="gap-4 mt-4">
                <View className="gap-2">
                  <Text className="text-white/50 text-[10px] font-bold uppercase pl-1">Account Number</Text>
                  <TextInput
                    value={kyc.bankAccount}
                    onChangeText={(val) => {
                      const digits = val.replace(/[^0-9]/g, '');
                      kyc.updateKYCField({ bankAccount: digits });
                      if (digits.length > 0 && (digits.length < 9 || digits.length > 18)) {
                        setErrors(prev => ({ ...prev, bankAccount: 'Account number must be 9-18 digits' }));
                      } else {
                        setErrors(prev => ({ ...prev, bankAccount: undefined }));
                      }
                    }}
                    placeholder="•••• •••• •••• 4242"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    keyboardType="numeric"
                    maxLength={18}
                    className={`bg-[#110125] border text-white rounded-2xl px-4 h-12 text-xs font-semibold ${errors.bankAccount ? 'border-red-500' : 'border-white/5'}`}
                  />
                  {errors.bankAccount && (
                    <Text className="text-red-500 text-[10px] pl-1 font-semibold">{errors.bankAccount}</Text>
                  )}
                </View>

                <View className="gap-2">
                  <Text className="text-white/50 text-[10px] font-bold uppercase pl-1">IFSC Code</Text>
                  <TextInput
                    value={kyc.ifscCode}
                    autoCapitalize="characters"
                    onChangeText={(val) => {
                      const upper = val.toUpperCase();
                      kyc.updateKYCField({ ifscCode: upper });
                      if (upper.length > 0 && upper.length !== 11) {
                         setErrors(prev => ({ ...prev, ifscCode: 'IFSC code must be 11 characters' }));
                      } else if (upper.length === 11 && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(upper)) {
                         setErrors(prev => ({ ...prev, ifscCode: 'Invalid IFSC format' }));
                      } else {
                         setErrors(prev => ({ ...prev, ifscCode: undefined }));
                      }
                    }}
                    placeholder="HDFC0001234"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    maxLength={11}
                    className={`bg-[#110125] border text-white rounded-2xl px-4 h-12 text-xs font-semibold uppercase ${errors.ifscCode ? 'border-red-500' : 'border-white/5'}`}
                  />
                  {errors.ifscCode && (
                    <Text className="text-red-500 text-[10px] pl-1 font-semibold">{errors.ifscCode}</Text>
                  )}
                </View>

                <View className="gap-2 relative z-50">
                  <Text className="text-white/50 text-[10px] font-bold uppercase pl-1">Account Type</Text>
                  <Pressable 
                    onPress={() => setIsAccountTypeDropdownOpen(!isAccountTypeDropdownOpen)}
                    className="bg-[#110125] border border-white/5 rounded-2xl px-4 h-12 flex-row items-center justify-between"
                  >
                    <Text className="text-white text-xs font-semibold">{kyc.accountType}</Text>
                    <Text className="text-white/40 text-xs">{isAccountTypeDropdownOpen ? '▲' : '▼'}</Text>
                  </Pressable>
                  
                  {isAccountTypeDropdownOpen && (
                    <View className="absolute top-[65px] left-0 right-0 bg-[#2D1B4E] border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">
                      <Pressable 
                        onPress={() => {
                          kyc.updateKYCField({ accountType: 'Savings' });
                          setIsAccountTypeDropdownOpen(false);
                        }}
                        className={`p-4 border-b border-white/5 ${kyc.accountType === 'Savings' ? 'bg-[#A855F7]/20' : ''}`}
                      >
                        <Text className={`text-xs font-semibold ${kyc.accountType === 'Savings' ? 'text-[#A855F7]' : 'text-white'}`}>Savings Account</Text>
                      </Pressable>
                      <Pressable 
                        onPress={() => {
                          kyc.updateKYCField({ accountType: 'Current' });
                          setIsAccountTypeDropdownOpen(false);
                        }}
                        className={`p-4 ${kyc.accountType === 'Current' ? 'bg-[#A855F7]/20' : ''}`}
                      >
                        <Text className={`text-xs font-semibold ${kyc.accountType === 'Current' ? 'text-[#A855F7]' : 'text-white'}`}>Current Account</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* End-to-End security card */}
            <View className="bg-[#190C2C]/40 border border-white/5 rounded-[20px] p-4 flex-row gap-3 items-start">
              <ShieldCheck size={18} color="#A855F7" className="mt-0.5" />
              <View className="flex-1 gap-1">
                <Text className="text-white text-[11px] font-bold">End-to-End Encrypted</Text>
                <Text className="text-white/60 text-[10px] leading-4">
                  Your financial data is never stored on our servers and is processed via PCI-DSS compliant partners.
                </Text>
              </View>
            </View>

            {/* Step 3 Complete Launch button styled with Rocket */}
            <Pressable
              onPress={handleBankSetupComplete}
              disabled={isVerifyingUpi || isVerifyingBank}
              className="bg-primary-purple h-14 rounded-full items-center justify-center shadow-lg shadow-primary-purple/40 flex-row mt-4 space-x-2"
            >
              {isVerifyingUpi || isVerifyingBank ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text className="text-white text-sm font-bold uppercase tracking-wider">Complete Setup 🚀</Text>
                </>
              )}
            </Pressable>
          </MotiView>
        )}
      </ScrollView>

      {/* SUCCESS MODAL */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center px-6">
          <MotiView
            from={{ opacity: 0, scale: 0.9, translateY: 20 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            className="bg-[#190C2C] w-full rounded-[32px] border border-white/10 p-6 items-center shadow-2xl shadow-[#A855F7]/30"
          >
            <View className="w-20 h-20 bg-[#10B981]/20 rounded-full items-center justify-center border-4 border-[#10B981]/30 mb-5 relative">
              <Check size={40} color="#10B981" strokeWidth={3} />
              <View className="absolute -top-1 -right-1">
                <Sparkles size={20} color="#FBBF24" fill="#FBBF24" />
              </View>
            </View>

            <Text className="text-white text-xl font-extrabold mb-2 text-center">Verification Complete!</Text>
            
            <Text className="text-white/60 text-xs text-center leading-5 mb-6 px-2">
              Your identity and payment methods have been securely linked. The <Text className="text-[#FBBF24] font-bold">Golden Creator Verified</Text> badge is now unlocked on your profile.
            </Text>

            <Pressable
              onPress={() => {
                setShowSuccessModal(false);
                router.replace('/(tabs)');
              }}
              className="bg-primary-purple w-full h-14 rounded-full items-center justify-center active:scale-[0.98] flex-row gap-2"
            >
              <Text className="text-white text-sm font-bold uppercase tracking-widest">Launch App</Text>
              <Text className="text-white text-sm font-bold">→</Text>
            </Pressable>
          </MotiView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
