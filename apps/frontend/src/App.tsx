import { Box, Container, Stack, Typography } from "@mui/material";
import { ProfilePreferencesForm } from "./components/ProfilePreferencesForm";

function App() {
  return (
    <Box sx={{ minHeight: "100vh", py: 6 }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight={700}>
              Split-Bill
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Frontend now consumes the generated OpenAPI TypeScript client.
            </Typography>
          </Box>
          <ProfilePreferencesForm />
        </Stack>
      </Container>
    </Box>
  );
}

export default App;
