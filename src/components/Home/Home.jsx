import React from 'react';
import { Grid, Container, Typography, Divider, Paper, Box } from '@mui/material';
import CertificateGenerator from '../CertificateGenerator';
import EmailSender from '../brevo/EmailSender';

const Home = () => {
  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        mt: 4, 
        mb: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center', // Centra horizontalmente los elementos
        minHeight: '100vh',   // Usa toda la altura de la ventana
        justifyContent: 'flex-start' // Alinea desde arriba
      }}
    >
      <Typography variant="h3" component="h1" align="center" gutterBottom>
        Check Medicine - Sistema de Certificados
      </Typography>
      <Divider sx={{ mb: 4, width: '100%' }} />
      
      <Grid 
        container 
        spacing={4} 
        justifyContent="center" 
        alignItems="stretch"
        sx={{ maxWidth: '100%' }} // Limita el ancho máximo
      >
        {/* Contenedor para el Generador de Certificados */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              height: '600px', // Reducido de 800px a 600px
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography variant="h4" component="h2" align="center" gutterBottom>
              Generador de Certificados
            </Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
              <CertificateGenerator />
            </Box>
          </Paper>
        </Grid>
        
        {/* Contenedor para el Envío de Correos */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              height: '600px', // Reducido de 800px a 600px
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography variant="h4" component="h2" align="center" gutterBottom>
              Envío de Correos
            </Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
              <EmailSender />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Home;