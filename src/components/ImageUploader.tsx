import { useState, useCallback } from 'react';
import React from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (url: string) => void;
}

export function ImageUploader({ isOpen, onClose, onUpload }: Props) {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImage(reader.result as string));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const [loading, setLoading] = useState(false);

  const saveCroppedImage = async () => {
    if (!image || !croppedAreaPixels) return;

    setLoading(true);
    try {
      // Convert cropped image to blob
      const img = new Image();
      img.src = image;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      // Resize logic to ensure small enough for Firestore
      const MAX_SIZE = 200; // px
      let width = croppedAreaPixels.width;
      let height = croppedAreaPixels.height;

      if (width > MAX_SIZE || height > MAX_SIZE) {
        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
        width *= ratio;
        height *= ratio;
      }

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = width;
      finalCanvas.height = height;
      const ctx = finalCanvas.getContext('2d');
      ctx?.drawImage(img, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, width, height);

      const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.7); // Use JPEG with quality to drastically reduce size
      onUpload(dataUrl);
      onClose();
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Failed to process image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Update Agent Profile Image</DialogTitle></DialogHeader>
        {!image ? (
          <input type="file" onChange={onFileChange} accept="image/*" />
        ) : (
          <div className="relative w-full h-64">
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={saveCroppedImage} disabled={!image || loading}>{loading ? 'Saving...' : 'Save & Upload'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
