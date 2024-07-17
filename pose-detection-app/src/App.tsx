import React from 'react';
import PoseDetection from './components/PoseDetection';
import { Container, Typography } from '@mui/material';

const App: React.FC = () => {
  return (
    <Container>
      <Typography variant="h3" component="h1" gutterBottom >
        Pose Detection App
      </Typography>
      <PoseDetection />
    </Container>
  );
};

export default App;
