import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Cropper from 'react-easy-crop';
import { 
  X, 
  Camera, 
  User, 
  Mail, 
  Lock, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  ZoomIn,
  Crop as CropIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { User as FirebaseUser, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { auth, db } from '../firebase';
import { cn } from '@/lib/utils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  onUpdate?: () => void;
}

export default function ProfileModal({ isOpen, onClose, user, onUpdate }: ProfileModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.photoURL || null);
  
  // Cropper state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchUserProfile();
    }
  }, [isOpen, user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    setIsLoadingProfile(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setCompanyName(data.companyName || '');
        if (data.photoURL) {
          setPhotoPreview(data.photoURL);
        }
      } else {
        // Fallback to display name if Firestore doc doesn't exist
        const names = (user.displayName || '').split(' ');
        setFirstName(names[0] || '');
        setLastName(names.slice(1).join(' ') || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image is too large. Please select an image under 5MB.' });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Set canvas size to the cropped area size
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw the cropped image onto the canvas
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // Resize if too large
    const MAX_SIZE = 400;
    if (canvas.width > MAX_SIZE || canvas.height > MAX_SIZE) {
      const scale = Math.min(MAX_SIZE / canvas.width, MAX_SIZE / canvas.height);
      const resizedCanvas = document.createElement('canvas');
      resizedCanvas.width = canvas.width * scale;
      resizedCanvas.height = canvas.height * scale;
      const resizedCtx = resizedCanvas.getContext('2d');
      if (resizedCtx) {
        resizedCtx.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
        return resizedCanvas.toDataURL('image/png'); // Use PNG to preserve transparency
      }
    }

    return canvas.toDataURL('image/png'); // Use PNG to preserve transparency
  };

  const handleApplyCrop = async () => {
    try {
      if (imageToCrop && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
        setPhotoPreview(croppedImage);
        setIsCropping(false);
        setImageToCrop(null);
      }
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Failed to crop image.' });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      // Update Firebase Auth Profile (only display name, photo is too long for Auth)
      await updateProfile(currentUser, {
        displayName: `${firstName} ${lastName}`.trim()
      });

      // Update Firestore Profile
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        firstName,
        lastName,
        companyName,
        photoURL: photoPreview,
        updatedAt: new Date().toISOString()
      });

      // Update Public Profile
      if (currentUser.email) {
        try {
          const publicRef = doc(db, 'public_profiles', currentUser.email.toLowerCase());
          await setDoc(publicRef, {
            uid: currentUser.uid,
            firstName,
            lastName,
            photoURL: photoPreview,
          }, { merge: true });
        } catch (e) {
          console.error("Failed to update public profile:", e);
        }
      }

      // Force a reload of the user data
      await currentUser.reload();
      if (onUpdate) onUpdate();
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) return;

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsUpdating(true);
    setMessage(null);

    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to change password. Make sure your current password is correct.' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Profile Settings</h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-200">
                <X className="w-5 h-5 text-gray-500" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={cn(
                    "p-4 rounded-xl flex items-start gap-3",
                    message.type === 'success' ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
                  )}
                >
                  {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                  <p className="text-sm font-medium">{message.text}</p>
                </motion.div>
              )}

                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className={cn(
                      "w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-inner overflow-hidden border-4 border-white ring-1 ring-gray-200",
                      !photoPreview && "bg-[#2E86C1]"
                    )}>
                      {photoPreview ? (
                        <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span>{firstName ? firstName[0].toUpperCase() : (user?.displayName ? user.displayName[0].toUpperCase() : 'U')}</span>
                      )}
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full text-white shadow-lg hover:bg-blue-700 transition-transform hover:scale-110"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-gray-900 text-lg">{firstName} {lastName}</h3>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>

                {/* Basic Info Form */}
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name" className="text-xs font-bold uppercase tracking-wider text-gray-500">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                          id="first-name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                          placeholder="First Name"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name" className="text-xs font-bold uppercase tracking-wider text-gray-500">Last Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                          id="last-name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                          placeholder="Last Name"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</Label>
                    <div className="relative opacity-60">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        value={user?.email || ''}
                        disabled
                        className="pl-10 h-11 bg-gray-100 border-gray-200 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 italic">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-name" className="text-xs font-bold uppercase tracking-wider text-gray-500">Company Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        id="company-name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                        placeholder="Enter company name"
                      />
                    </div>
                  </div>

                <Button 
                  type="submit" 
                  disabled={isUpdating}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-11 rounded-xl font-bold shadow-md shadow-blue-200 transition-all active:scale-[0.98]"
                >
                  {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Profile Changes'}
                </Button>
              </form>

              {/* Password Section - Only show if not a Google user (simplified check) */}
              <div className="pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-4 text-gray-900">
                  <Lock className="w-4 h-4" />
                  <h3 className="font-bold">Security</h3>
                </div>
                
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password text-gray-500">Current Password</Label>
                    <div className="relative">
                      <Input 
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-11 bg-gray-50 border-gray-200 focus:bg-white pr-10"
                        placeholder="••••••••"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password text-gray-500">New Password</Label>
                      <div className="relative">
                        <Input 
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="h-11 bg-gray-50 border-gray-200 focus:bg-white pr-10"
                          placeholder="••••••••"
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password text-gray-500">Confirm</Label>
                      <div className="relative">
                        <Input 
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="h-11 bg-gray-50 border-gray-200 focus:bg-white pr-10"
                          placeholder="••••••••"
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    variant="outline"
                    disabled={isUpdating}
                    className="w-full h-11 rounded-xl font-bold border-gray-200 hover:bg-gray-50"
                  >
                    Change Password
                  </Button>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Cropper Modal */}
      <AnimatePresence>
        {isCropping && imageToCrop && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CropIcon className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Crop Profile Photo</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsCropping(false)} className="rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </Button>
              </div>

              <div className="relative h-80 bg-gray-900">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  cropShape="round"
                  showGrid={false}
                />
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                    <div className="flex items-center gap-2">
                      <ZoomIn className="w-4 h-4" />
                      <span>Zoom</span>
                    </div>
                    <span>{Math.round(zoom * 100)}%</span>
                  </div>
                  <Slider
                    value={[zoom]}
                    min={1}
                    max={3}
                    step={0.1}
                    onValueChange={(value) => setZoom(value[0])}
                    className="py-4"
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCropping(false)}
                    className="flex-1 h-11 rounded-xl font-bold"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleApplyCrop}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 h-11 rounded-xl font-bold shadow-md shadow-blue-200"
                  >
                    Apply Crop
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
