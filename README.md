# Pose Detection App

This project is a React application that utilizes TensorFlow.js and the MoveNet model to perform real-time pose detection using your device's webcam. The application overlays detected keypoints and lines on a video feed to visualize the detected pose. The keypoints and lines turn green when the pose is considered "perfect" and red otherwise.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Features

- Real-time pose detection using MoveNet model.
- Visual overlay of detected keypoints and lines.
- Color-coded keypoints and lines to indicate the accuracy of the pose.
- Automatic handling of video feed mirroring.
- Comprehensive error handling for camera access.

## Installation

### Prerequisites

- Node.js (v14.x or higher)
- npm (v6.x or higher)

### Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/pose-detection-app.git
   cd pose-detection-app
