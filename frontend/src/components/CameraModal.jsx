import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, RefreshCw } from 'lucide-react';

const CameraModal = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [isFrontCamera, setIsFrontCamera] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const constraints = {
        video: { facingMode: isFrontCamera ? 'user' : 'environment' }
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError('');
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  }, [isFrontCamera]); // Removed stream from dependencies to avoid infinite loops

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      // Cleanup when closed
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, isFrontCamera]); // Intentionally omitting startCamera/stream to avoid loops

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video stream exactly
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (isFrontCamera) {
        // Flip image horizontally if using front camera
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          // Create a File object from the blob
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
          onClose();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const toggleCamera = () => {
    setIsFrontCamera(!isFrontCamera);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onClose} className="p-2 text-white hover:bg-white/20 rounded-full transition">
          <X className="w-6 h-6" />
        </button>
        <button onClick={toggleCamera} className="p-2 text-white hover:bg-white/20 rounded-full transition">
          <RefreshCw className="w-6 h-6" />
        </button>
      </div>

      {/* Video Viewfinder */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {error ? (
          <div className="text-white text-center p-6 bg-red-900/50 rounded-xl border border-red-500/50 mx-4">
            <p className="font-medium">{error}</p>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={`w-full h-full object-cover ${isFrontCamera ? 'scale-x-[-1]' : ''}`}
          />
        )}
        
        {/* Helper overlay for receipts */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
          <div className="w-full max-w-sm aspect-[3/4] border-2 border-white/30 rounded-2xl"></div>
        </div>
      </div>

      {/* Controls */}
      <div className="h-32 bg-black pb-8 flex items-center justify-center pb-safe">
        <button 
          onClick={handleCapture}
          disabled={!!error}
          className="w-20 h-20 rounded-full bg-white/20 p-2 flex items-center justify-center hover:bg-white/30 transition disabled:opacity-50"
        >
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-xl">
            <Camera className="w-8 h-8 text-black" />
          </div>
        </button>
      </div>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraModal;
