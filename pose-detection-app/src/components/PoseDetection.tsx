import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as posedetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs-core';
import { Typography, Button } from '@mui/material';

const PoseDetection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((error: any) => {
    let errorMessage = 'An error occurred while accessing the camera.';
    if (error.name === 'NotAllowedError') {
      errorMessage = 'Camera access was denied. Please allow camera access and try again.';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera device found. Please ensure a camera is connected and try again.';
    } else if (error.name === 'AbortError') {
      errorMessage = 'The fetching process for the media resource was aborted. Please try again.';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'The media device is not readable. Please check your camera and try again.';
    } else if (error.name === 'OverconstrainedError') {
      errorMessage = 'The constraints specified are not supported by the device. Please check your camera settings and try again.';
    } else if (error.name === 'SecurityError') {
      errorMessage = 'Security error while accessing the camera. Please check your browser settings and try again.';
    }
    setError(errorMessage);
    console.error('Error accessing the webcam:', error);
  }, []);

  const isPerfectAngle = useCallback((pose: posedetection.Pose) => {
    const leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder = pose.keypoints.find(kp => kp.name === 'right_shoulder');
    const leftHip = pose.keypoints.find(kp => kp.name === 'left_hip');
    const rightHip = pose.keypoints.find(kp => kp.name === 'right_hip');

    if (leftShoulder && rightShoulder && leftHip && rightHip) {
      const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
      const hipDiff = Math.abs(leftHip.y - rightHip.y);
      return shoulderDiff < 20 && hipDiff < 20;
    }
    return false;
  }, []);

  const startVideoStream = useCallback(async (detector: posedetection.PoseDetector) => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        handleError(new Error('Failed to get canvas context'));
        return;
      }

      try {
        console.log('Attempting to access user media...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        await video.play();

        const drawLine = (ctx: CanvasRenderingContext2D, from: posedetection.Keypoint, to: posedetection.Keypoint, color: string) => {
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        };

        const detectPose = async () => {
          if (video.readyState === 4) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            ctx.save();
            ctx.scale(-1, 1);  // Flip horizontally
            ctx.translate(-canvas.width, 0);  // Translate to the mirrored position

            const poses = await detector.estimatePoses(video);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            poses.forEach(pose => {
              const isPerfect = isPerfectAngle(pose);
              const color = isPerfect ? 'green' : 'red';

              // Draw keypoints
              pose.keypoints.forEach(keypoint => {
                if (keypoint.score !== undefined && keypoint.score > 0.5) {
                  ctx.beginPath();
                  ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                  ctx.fillStyle = color;
                  ctx.fill();
                }
              });

              // Draw lines between keypoints
              const keypointPairs: [string, string][] = [
                ['left_shoulder', 'right_shoulder'],
                ['left_hip', 'right_hip'],
                ['left_shoulder', 'left_elbow'],
                ['left_elbow', 'left_wrist'],
                ['right_shoulder', 'right_elbow'],
                ['right_elbow', 'right_wrist'],
                ['left_hip', 'left_knee'],
                ['left_knee', 'left_ankle'],
                ['right_hip', 'right_knee'],
                ['right_knee', 'right_ankle'],
              ];

              keypointPairs.forEach(([fromName, toName]) => {
                const fromKeypoint = pose.keypoints.find(kp => kp.name === fromName);
                const toKeypoint = pose.keypoints.find(kp => kp.name === toName);
                if (fromKeypoint && toKeypoint && fromKeypoint.score !== undefined && fromKeypoint.score > 0.5 && toKeypoint.score !== undefined && toKeypoint.score > 0.5) {
                  drawLine(ctx, fromKeypoint, toKeypoint, color);
                }
              });
            });

            ctx.restore();

            requestAnimationFrame(detectPose);
          }
        };

        detectPose();
      } catch (error) {
        handleError(error);
      }
    }
  }, [handleError, isPerfectAngle]);

  const loadModel = useCallback(async () => {
    try {
      await tf.setBackend('webgl'); // Set the backend to 'webgl'
      await tf.ready(); // Ensure the backend is ready
      const detectorConfig = { modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
      const detector = await posedetection.createDetector(posedetection.SupportedModels.MoveNet, detectorConfig);
      await startVideoStream(detector);
    } catch (error) {
      setError('Error loading the MoveNet model.');
      console.error('Error loading the MoveNet model:', error);
    }
  }, [startVideoStream]);

  useEffect(() => {
    // Check for camera permissions first
    navigator.permissions.query({ name: 'camera' as PermissionName }).then((permissionStatus) => {
      if (permissionStatus.state === 'granted') {
        loadModel();
      } else if (permissionStatus.state === 'prompt') {
        navigator.mediaDevices.getUserMedia({ video: true }).then(
          (stream) => {
            // Stop the stream after getting permission
            stream.getTracks().forEach((track) => track.stop());
            loadModel();
          },
          (err) => handleError(err)
        );
      } else {
        setError('Camera access is denied. Please enable camera permissions in your browser settings.');
      }
    }).catch((err) => {
      console.error('Error checking camera permissions:', err);
      setError('Unable to check camera permissions. Please try again.');
    });
  }, [loadModel, handleError]);

  const retry = () => {
    setError(null);
    loadModel();
  };

  return (
    <div style={{ position: 'relative', textAlign: 'center' }}>
      {error && (
        <div>
          <Typography variant="h6" color="error">
            {error}
          </Typography>
          <Button variant="contained" color="primary" onClick={retry}>
            Retry
          </Button>
        </div>
      )}
      <video ref={videoRef} style={{ width: '100%', maxWidth: '800px', transform: 'scaleX(-1)', display: error ? 'none' : 'block' }} />
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
    </div>
  );
};

export default PoseDetection;
