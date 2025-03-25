import React from 'react';
import { Grid, Container, Typography, Divider, Paper, Box } from '@mui/material';
import CertificateGenerator from '../CertificateGenerator';
import EmailSender from '../brevo/EmailSender';

const Home = () => {
  return (
    <Container 
      maxWidth="100%" 
      sx={{ 
        mt: 4, 
        mb: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        justifyContent: 'center',
        px: 3 // Añadido padding horizontal para mejor espaciado en móviles
      }}
    >
      <Typography 
        variant="h3" 
        component="h1" 
        align="center" 
        gutterBottom
        sx={{ fontWeight: 'bold', mb: 2 }} // Mejorado el estilo del título
      >
        Check Medicine - Sistema de Certificados
      </Typography>
      <Divider sx={{ mb: 5, width: '100%' }} /> {/* Aumentado el margen inferior */}
      
      <Grid 
        container 
        spacing={6} // Aumentado el espaciado entre contenedores
        justifyContent="center" 
        alignItems="stretch"
        sx={{ width: '100%', mx: 'auto' }} // Centrado horizontal mejorado
      >
        {/* Contenedor para el Generador de Certificados */}
        <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'center' }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, // Aumentado el padding interno
              height: '650px', // Ajustado la altura
              width: '100%', // Asegura que ocupe todo el ancho disponible
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2, // Bordes más redondeados
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)' // Sombra más suave y elegante
            }}
          >
            <Typography 
              variant="h4" 
              component="h2" 
              align="center" 
              gutterBottom
              sx={{ fontWeight: 'medium', mb: 3 }} // Mejorado el estilo
            >
              Generador de Certificados
            </Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
              <CertificateGenerator />
            </Box>
          </Paper>
        </Grid>
        
        {/* Contenedor para el Envío de Correos */}
        <Grid item xs={6}  sx={{ display: 'flex', justifyContent: 'center' }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, // Aumentado el padding interno
              height: '650px', // Ajustado la altura
              width: '100%', // Asegura que ocupe todo el ancho disponible
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2, // Bordes más redondeados
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)' // Sombra más suave y elegante
            }}
          >
            <Typography 
              variant="h4" 
              component="h2" 
              align="center" 
              gutterBottom
              sx={{ fontWeight: 'medium', mb: 3 }} // Mejorado el estilo
            >
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